"use strict";

const NICGAG = "\uD835\uDC27\uD835\uDC22\uD835\uDC1CGAG";
const SWITCH_TOGGLE = "switch-toggle";
const GAG = "gag";
const HOME = "home";
const REPLY = "reply";
const THREAD = "thread";
const FULLPREVIEW = "fullpreview";
const HOMESEARCH = "homesearch";

const OLD_FIREFOX = isOldFirefox();
const slideout_menu = document.getElementById("slideout-menu");

var snackbarUser;
var switchDarkmode;

if (OLD_FIREFOX) {
    HTMLElement.prototype.__animate = HTMLElement.prototype.animate;
    HTMLElement.prototype.animate = function(keyframes, options) {
        for (let keyframe of keyframes) {
            let keys = Object.keys(keyframe);
            for (let prop of keys) {
                if (prop != "translate") continue;
                keyframe["transform"] = prop + "(" + keyframe[prop].replace(" ", ",") + ")";
                delete keyframe[prop];
            }
        }
        return HTMLElement.prototype.__animate.apply(this, arguments);
    };
}

setTimeout(killWebWorkers, 1);

if (NODEID("fatal-error")) {
    let a_list = document.querySelectorAll("#fatal-error a");
    for (let a of a_list) a.remove();

    let a = document.createElement("a");
        a.textContent = "Go to home";
        a.href = "/";
    document.querySelector("#fatal-error div").appendChild(a);

    show_error(null);
    throw new Error("External error found");
}

i18n_process();

init9GAG()
.then(function() {
    navbar_user_set();

    NODECLASSSWITCH(NODEQUERY("#slideout-menu .customize"), HIDDEN, !userId);
    NODEQUERY("#navbar .sidebar-menu").addEventListener("click", animate_slideout_menu, false);

    if (nicgagSettings.headerExtraPadding) {
        homeHeaderHeight = 120;
        document.body.classList.add("extra-padding");
    }

    setInterval(future_refresh_upload_date, 60000);// refresh any upload date every min
    init_darkmode_switch();
    init_snackbar_user();
    init_slideout_menu();
    load_page();
})
.catch(function(err) {
    console.error(err);
    show_error(`Fatal error during ${NICGAG} init:\n ${err.message}\nmore details in the web console.`);
}).finally(function() {
    let splash = document.getElementById("splash");
    if (splash) splash.remove();
});

function load_page() {
    let path = location.pathname.substr(1).split("/");

    switch (path[0]) {
        case "tag":
            return load_search(null);
        case "search":
            return load_search(location.search);
        case "":
        case HOT:
        case TRENDING:
        case FRESH:
            return load_home(path);
        case GAG:
            return load_gag(path);
    }

    for (let section in databaseSectionsLocal)
        if (section == path[0]) return load_home(path);
    for (let section in databaseSections)
        if (section == path[0]) return load_home(path);

    //
    //   Page not implemented, should be not hooked
    //
    // u (user)
    // pro
    // settings
    // notifications
    // submit
    // apps
    // advertise
    // rules
    // tips
    // faq
    // tos
    // privacy
    // report-bad-ads
    // feedback
    // contact
    // jobs
    // copyright
    // or any other in 9gag domain

    show_error(LANG.nicgag_init_failed.replace('@', NICGAG));
}

function load_home(path) {
    let section = null;
    let antiquity = HOT;
    let flag = false;

    if (path.length > 1) {
        section = path[0];
        antiquity = path[1];
    } else {
        switch (path[0]) {
            case "":
                flag = true;
                antiquity = HOT;
                break;
            case HOT:
            case TRENDING:
            case FRESH:
                antiquity = path[0];
                break;
            default:
                section = path[0];
        }
    }

    home_init(section, antiquity, null, false, flag ? "from-main" : false);
}

function load_gag(path) {
    let post_id = path[1];
    let scroll_to_comments = false;
    let see_thread = false;
    let do_reply = false;

    if (location.hash == "#comment" || location.hash == "#comments") {
        scroll_to_comments = true;
    } else if (location.hash.startsWith("#cs_comment_id=")) {
        try {
            let params = new URLSearchParams(location.hash.substring(1));
            see_thread = params.get("cs_comment_id");
        } catch (err) {
            console.error(err);
        }
    } else if (location.hash.startsWith("#composer")) {
        if (userId)
            do_reply = true;
        else
            main_show_snackbar(LANG.reply_login);
    }

    if (!currentData) throw new Error("missing post info");

    gag_init(currentData.post, null, scroll_to_comments).then(function() {
        if (see_thread) gag_show_thread({id: see_thread, emptyInfo: true}, null);
        else if (do_reply) gag_reply_only();
    });
}

function load_search(query) {
    let value;

    if (query != null) {
        value = new URLSearchParams(location.search);
        value = value.get("query");
    } else {
        value = apiExtractIdFromURL(location.href);
    }

    if (value)
        home_browse_tag_or_search(value, location.href.substr(location.origin.length), "", !query);
    else
        homesearch_init();
}

function show_error(content) {
    let error = NODEID("fatal-error");
    if (!error) error = makeDOM(["div", {'id': "fatal-error"}]);

    error.appendChild(makeDOM(["video", {
        'id': "error-background",
        'autoplay': "",
        'muted': "",
        'loop': "",
        'src': NODEQUERY("meta[name=nicgag-error-background]").content
    }]));

    if (content instanceof Node) {
        error.appendChild(content);
    } else if (content) {
        let tmp = document.createElement("div");
            tmp.className = "message";
        error.appendChild(tmp);

        content = content.toString().split("\n");
        for (let str of content) {
            let h2 = document.createElement("h2");
            h2.textContent = str;
            tmp.appendChild(h2);
        }
    }

    NODEREMOVEALLCHILDRENS(document.body);
    document.body.appendChild(document.createElement("div")).id = "error-background";
    document.body.appendChild(error);
}



var notiIconUnreadBadge = NODEQUERY("#navbar .icon-noti .unread-badge");
var notiIconUnreadCount = NODEQUERY("#navbar .icon-noti .unread-count");
function navbar_user_set() {
    let navbarUser = document.querySelector("#navbar .icon-user");
    let userPic = navbarUser.querySelector("img");

    NODECLASSSWITCH(notiIconUnreadBadge.parentNode, HIDDEN, !userId);
    NODECLASSSWITCH(NODEQUERY("#snackbar-user li.login"), HIDDEN, userId);
    NODECLASSSWITCH(NODEQUERY("#snackbar-user li.user"), HIDDEN, !userId);

    if (userId) {
        userPic.src = userInfo.avatar;
        userPic.parentElement.href = userInfo.profile;

        future_notification_check();// first check
        future_notification_init(true);

        NODEQUERY("#navbar .icon-noti").addEventListener("click", function() {
            notiIconUnreadBadge.classList.add(HIDDEN);
            notiIconUnreadCount.textContent = "";
        }, false);
    } else {
        userPic.removeAttribute("href");
    }

    navbarUser.addEventListener("click", navbar_user_click, false);
}


var notificationsSocket = undefined;

function future_notification_init(self_recover) {
    if (notificationsSocket) return;

    let socket = getNotificationChannel();
    if (!socket) {
        console.warn("failed to call getNotificationChannel() using http version instead");
        notificationsSocket = true;
        setInterval(future_notification_check, 60000);// check for notifications every minute
        return;
    }

    var first_init = notificationsSocket === undefined;
    notificationsSocket = socket;
    notificationsSocket._checking = false;
    notificationsSocket.onopen = function() {
        if (!first_init) console.info("Notifications check restored, " + notificationsSocket.url);
        first_init = false;
    };
    notificationsSocket.onerror = function(evt) {
        if (first_init) {
            console.error("Notifications check failed, WebSocket init failed. ¿wrong host?", evt);
            notificationApiHost = false;
            future_notification_init(false);// fallback
            return;
        }

        console.error("Notifications check failed, connection error", evt);
        if (this == notificationsSocket) notificationsSocket = false;

        if (self_recover && "onLine" in navigator && navigator.onLine) {
            setInterval(future_notification_init, 30000, self_recover);
        }
    };
    notificationsSocket.onmessage = function(evt) {
        let data = JSON.parse(evt.data);
        if (data.channel == notificationChannel && !this._checking) {
            this._checking = true;
            future_notification_check();
        }
    };
}

async function future_notification_check() {
    try {
        let data = await notificationsCheck();
        if (notiIconUnreadBadge.classList.contains(HIDDEN) && data.unreadCount > 0) {
            // main_show_snackbar("¡You have new notifications!", false);
            if (data.unreadCount < 1 || data.unreadCount >= 100)
                notiIconUnreadCount.textContent = "";
            else
                notiIconUnreadCount.textContent = data.unreadCount;
        }
        NODECLASSSWITCH(notiIconUnreadBadge, HIDDEN, data.unreadCount < 1);
    } catch(err) {
        console.error("Background notifications check failed", err);
    } finally {
        if (notificationsSocket instanceof WebSocket) notificationsSocket._checking = false;
    }
}

function future_refresh_upload_date(view) {
    if (arguments.length < 1) {
        future_refresh_upload_date(homeView);
        future_refresh_upload_date(gagCommentsView);
        future_refresh_upload_date(threadCommentsView);
        return;
    }

    for (let page of view.list.getPages()) {
        if (!page.extra || !page.extra.map) continue;
        for (let bind of page.extra.map) {
            bind.refreshCreationDate();
        }
    }
}


function animate_slideout_menu(show) {
    if (!!show == slideout_menu.slideoutShowing) return;
    if (show.type == "click") show.stopImmediatePropagation();

    toggle_shade(show);

    if (show)
        document.body.addEventListener("click", hide_slideout_menu_unfocus, false);
    else
        document.body.removeEventListener("click", hide_slideout_menu_unfocus);

    slideout_menu.slideoutShowing = show;
    homeFeaturedTags.style.overflowX = show ? HIDDEN : null;// scrollbar glitch

    if (show) slideout_menu.classList.remove(HIDDEN);

    slideout_menu.animate([
        {translate: "-100% 0"},
        {translate: "0 0"}
    ], {
        duration: 500,
        easing: "ease",
        direction: show ? "normal" : "reverse"
    })
    .onfinish = function() {
        if (!show) slideout_menu.classList.add(HIDDEN);
    };
}

function init_slideout_menu() {
    let builder;
    let target = NODEID("user-defined-sections");

    NODEREMOVEALLCHILDRENS(target);

    NODECLASSSWITCH(NODEQUERY(".new-post"), HIDDEN, !userId);

    NODEQUERY(".error-feedback").addEventListener("click", function() {
        this.classList.add(HIDDEN);
        NODEQUERY(".error-modal").classList.remove(HIDDEN);
        animate_slideout_menu(false);
        toggle_shade(true);
    }, false);
    NODEQUERY(".error-modal button").addEventListener("click", function() {
        this.parentNode.classList.add(HIDDEN);
        this.parentNode.querySelector("textarea").value = "";
        toggle_shade(false);
    }, false);


    if (userId && databaseSectionsFavorites.length > 0) {
        builder = new SlideoutListFactory(LANG.favorites);

        for (let i=0 ; i<databaseSectionsFavorites.length ; i++) {
            let section = databaseSections[databaseSectionsFavorites[i]];
            if (section.nsfw) continue;
            builder.add(section.icon, section.name, section.url);
        }
        builder.build(target);
    }

    let location_code;
    if (userId) {
        location_code = userInfo.location;
    } else {
        try {
            var params = new URLSearchParams(document.cookie.replace(/;\s?/g, "&"));
            location_code = params.get("____lo").toLowerCase();
        } catch(e) {
            console.error("can not parse cookie ____lo or all cookies", e);
            location_code = null;
        }
        if (!location_code) {
            let lang = navigator.language.split("-");
            if (lang.length > 1) location_code = lang[1].toLowerCase();
        }
    }

    let hide_nsfw = !apiSettings.showSensitiveContent;

    if (databaseSectionsFeatured.length > 0) {
        builder = new SlideoutListFactory(LANG.popular);

        if (location_code) {
            for (let section in databaseSectionsLocal) {
                if (location_code != databaseSectionsLocal[section].location) continue;

                let item = builder.add(databaseSectionsLocal[section].icon, databaseSectionsLocal[section].name, databaseSectionsLocal[section].url);
                SlideoutListFactory.createCountryList(item, databaseSectionsLocal);
                break;
            }
        }

        for (let i=0 ; i<databaseSectionsFeatured.length ; i++) {
            let section = databaseSections[databaseSectionsFeatured[i]];
            if (hide_nsfw && section.nsfw) continue;

            if (userId) {
                if (databaseSectionsFavorites.includes(databaseSectionsFeatured[i])) continue;
                if (databaseSectionsHidden.includes(databaseSectionsFeatured[i])) continue;
            }

            builder.add(section.icon, section.name, section.url);
        }

        builder.build(target);
        NODEQUERY("#slideout-menu .local select").addEventListener("change", change_section_country, false);
    }

    builder = new SlideoutListFactory(LANG.sections);

    for (let section in databaseSections) {
        if (databaseSectionsFavorites.includes(section)) continue;
        if (databaseSectionsFeatured.includes(section)) continue;
        if (databaseSectionsHidden.includes(section)) continue;
        if (hide_nsfw && section.nsfw) continue;

        builder.add(databaseSections[section].icon, databaseSections[section].name, databaseSections[section].url);
    }
    builder.build(target);

    if (userId && databaseSectionsHidden.length > 0) {
        builder = new SlideoutListFactory(LANG.hidden);

        for (let i=0 ; i<databaseSectionsHidden.length ; i++) {
            let section = databaseSections[databaseSectionsHidden[i]];
            if (hide_nsfw && section.nsfw) continue;

            builder.add(section.icon, section.name, section.url);
        }
        builder.build(target);
    }
}

function hide_slideout_menu_unfocus(evt) {
    if (evt.target == slideout_menu) return;
    if (slideout_menu.contains(evt.target)) return;
    if (evt.type == "click") evt.stopImmediatePropagation();
    animate_slideout_menu(false);
}

function change_section_country(evt) {
    let a = evt.target.parentNode.parentNode.querySelector("a").childNodes[1];
    let section = databaseSectionsLocal[evt.target.value];

    home_section_choosen(section.url);
}


function toggle_fullscreen() {
    let target = document.documentElement;
    if (document.fullscreenElement)
        document.exitFullscreen();
    else
        target.requestFullscreen({navigationUI: "show"}).then({}).catch(console.error);
}

function toggle_darkmode(state) {
    NODECLASSSWITCH(document.body, DARKTHEME, apiSettings.darkMode = state);
    return true;
}

function toggle_shade(state) {
    NODECLASSSWITCH(document.body, "shade", state);
}

function init_snackbar_user() {
    snackbarUser = SnackbarMenu.fromExistingElement(NODEID("snackbar-user"));

    let user = snackbarUser.content.querySelector(".user");
    let settings = snackbarUser.content.querySelector(".settings");

    NODECLASSSWITCH(user, HIDDEN, !userId);

    NODECLASSSWITCH(settings, HIDDEN, !userId);
    settings.querySelector("a").href = LINK_SETTINGS;

    snackbarUser.setCancelable(true);

    snackbarUser.onOptionSelected = function(index, item) {
        switch(index) {
            case 6:
                return true;
            case 7:
                nicgag_show_settings_menu();
            case 0:
            case 1:
            case 8:
                return true;
            case 3:
                toggle_fullscreen();
                break;
            case 4:
                switchDarkmode.content.click();
                break;
        }
    };

    snackbarUser.onHide = function() {
        if (sanckbarNicgagSettings && sanckbarNicgagSettings.showing) return;
        toggle_shade(false);
    };

    if (userId) {
        user.querySelector("img").src = userInfo.avatar;
        user.querySelector(".status").textContent = userInfo.location;
        let a = user.querySelector("a");
            a.href = LINK_USER + userInfo.name;
            a.childNodes[0].textContent = userInfo.name + " ";
        NODEID("logout").href = LINK_USER_LOGOUT;
    }

}

function init_darkmode_switch() {
    let state = apiSettings.darkMode;

    switchDarkmode = Switch.fromExistingElement(NODEID("darkmode-switch"));
    switchDarkmode.onToggle = toggle_darkmode;
    switchDarkmode.setState(state);

    // already done in index.html
    //
    //NODECLASSSWITCH(document.body, DARKTHEME, state);
    // if (state) toggle_darkmode(state);
    //
}

function navbar_user_click(evt) {
    if (evt.shiftKey || evt.ctrlKey || evt.altKey || evt.metaKey) return;

    evt.stopImmediatePropagation();// obligatory
    evt.preventDefault();
    snackbarUser.show();
    toggle_shade(true);
}


var mainSnackbar = null;
var mainSnackbarQueue = new Array();
var mainSnackbarShowing = false;

function main_show_snackbar(message, floating, duration) {
    if (mainSnackbarShowing) {
        mainSnackbarQueue.push({message: message, floating: floating});
        return;
    }

    if (!mainSnackbar) {
        mainSnackbar = new Snackbar(document.body);
        mainSnackbar.onTimeout = function() {
            mainSnackbarShowing = false;
            if (mainSnackbarQueue.length > 0) {
                let args = mainSnackbarQueue.shift();
                main_show_snackbar(args.message, args.floating);
            }
        };
    }

    if (arguments.length < 3) duration = floating ? Snackbar.LONG_DELAY : Snackbar.SHORT_DELAY;

    mainSnackbar.setDelay(duration);
    mainSnackbar.setFloating(floating);
    mainSnackbar.setBodyText(message);

    mainSnackbarShowing = true;
    requestAnimationFrame(mainSnackbar.show.bind(mainSnackbar));
}




var sanckbarCommentMenu = undefined;

function gagthread_show_comment_menu(comment) {
    if (sanckbarCommentMenu == null) {
        sanckbarCommentMenu = SnackbarMenu.fromExistingElement(NODEID("snackbar-comment-menu"));
        sanckbarCommentMenu.setCancelable(true);
        sanckbarCommentMenu.ignoreDividersIndex(true);
        sanckbarCommentMenu.onOptionSelected = gagthread_show_comment_menu_selected;
        sanckbarCommentMenu.onHide = function() {
            sanckbarCommentMenu.showing = false;
            sanckbarCommentMenu.comment = null;
            sanckbarCommentMenu.url = null;
            if (!NODESTATEHAS(NODEQUERY(".report-modal"), HIDDEN)) return;
            toggle_shade(false);
        };
    }

    sanckbarCommentMenu.comment = comment;
    sanckbarCommentMenu.url = gagCommentsView.list.content.classList.contains(HIDDEN) ? threadPostUrl: gagPostUrl;

    let ul = sanckbarCommentMenu.content.children[0].children;

    ul[3].classList.add(DISABLED);
    ul[3].classList.remove(HIDDEN);
    gagthread_check_comment_follow(comment, ul[3]);

    if (!userId) {
        for (let i=2 ; i<ul.length ; i++)
            NODECLASSSWITCH(ul[i], HIDDEN, true);
    } else {
        let flag = comment.info.userId == userIdComments;
        NODECLASSSWITCH(ul[2], HIDDEN, !flag);
        NODECLASSSWITCH(ul[4], HIDDEN, !flag);
        NODECLASSSWITCH(ul[5], HIDDEN, flag);
        NODECLASSSWITCH(ul[6], HIDDEN, flag);
        NODECLASSSWITCH(ul[7], HIDDEN, flag);
    }

    if (sanckbarCommentMenu.showing) return;
    toggle_shade(true);
    sanckbarCommentMenu.showing = true;
    sanckbarCommentMenu.show();
}

async function gagthread_check_comment_follow(comment, option) {
    if (!userId) {
        option.classList.add(HIDDEN);
        return;
    }

    try {
        let icon = option.children[0].children[0];
        let text = option.children[1];

        icon.className = "";
        text.textContent = LANG.follow_check;

        let res = await followCommentStatus(comment.info.threadId);
        if (comment != sanckbarCommentMenu.comment) return;

        option.classList.remove(DISABLED);
        text.textContent = res.followed ? LANG.unfollow_comment : LANG.follow_comment;

        NODECLASSSWITCH(icon, "icon-noti-active", res.followed);
        NODECLASSSWITCH(icon, "icon-noti", !res.followed);
    } catch(err) {
        if (comment != sanckbarCommentMenu.comment) return;
        main_show_snackbar(LANG.follow_check_failed + err.message, true);
        option.classList.add(HIDDEN);
    }
}

function gagthread_show_comment_menu_selected(index, item) {
    let gag_or_thread = !gagCommentsView.list.content.classList.contains(HIDDEN);
    let post_url = gag_or_thread ? gagPostUrl : threadPostUrl;

    switch(index) {
        case 0:// copy link
            clipboad_copy(location.origin + location.pathname + "#cs_comment_id=" + sanckbarCommentMenu.comment.info.id);
            return true;
        case 1:// copy text
            let text = sanckbarCommentMenu.comment.content.textContent.trim();
            if (text.length < 1)
                main_show_snackbar("This comment is empty");
            else
                clipboad_copy(text);
            return true;
        case 2:// follow/unfollow
            let state = item.parentNode.textContent.trim();
            let following = item.parentNode.children[0].children[0].classList.contains("icon-noti-active");
            followComment(sanckbarCommentMenu.comment.info.threadId, !following).catch(err => main_show_snackbar(`${state}:\n ${err.message}`, true));
            return true;
        case 3:// delete
            let comment = sanckbarCommentMenu.comment;
            let view = gag_or_thread ? gagCommentsView : threadCommentsView;
            let comments = view.items;// hold reference
            deletePostComment(sanckbarCommentMenu.url, comment.info.id).then(function() {
                if (comments != view.items) return;// context changed
                let idx = comments.indexOf(comment);
                if (idx < 0) return;// this should not happen
                view.removeItem(idx);
                if (gag_or_thread && gagPostInstance) gagPostInstance.updateCommentsCount(-1);
            }).catch(function(err) {
                console.error(err);
                main_show_snackbar(LANG.comment_delete_failed + err.message, true);
            });
            return true;
        case 4://dont like
            reportComment(sanckbarCommentMenu.comment.info.id, post_url, REPORT_REASONS.DISLIKE.type).catch(function(err) {
                console.error(err);
                main_show_snackbar(LANG.report_failed + err.message, true);
            });
            return true;
        case 5:// report
            show_modal_report(false, sanckbarCommentMenu.comment.info.id, post_url);
            return true;
    }

    return false
}



function page_switch(target) {
    toggle_shade(false);
    homeTabsScrollCheckSuspend(true);

    let title = NODEQUERY("#navbar .title");
    let comment_editor = NODEID("comment-editor");
    let page_gag = NODEID("page-gag");
    let footer_comment = NODEID("footer-comment");

    NODECLASSSWITCH(page_gag, HIDDEN, target != GAG);
    NODECLASSSWITCH(NODEID("page-thread"), HIDDEN, target != THREAD);
    NODECLASSSWITCH(NODEID("page-home"), HIDDEN, target != HOME);
    NODECLASSSWITCH(NODEID("home-tabs"), HIDDEN, target != HOME);

    NODECLASSSWITCH(NODEID("main-header"), HIDDEN, target == REPLY || target == FULLPREVIEW || target == HOMESEARCH);
    NODECLASSSWITCH(NODEID("main-header"), "home", target == HOME);
    NODECLASSSWITCH(NODEID("comment-header"), HIDDEN, target != REPLY);
    NODECLASSSWITCH(comment_editor, HIDDEN, target != REPLY);

    NODECLASSSWITCH(footer_comment, HIDDEN, !userId || (target != GAG && target != THREAD));

    NODECLASSSWITCH(NODEID("header-preview"), HIDDEN, target != FULLPREVIEW);
    NODECLASSSWITCH(NODEID("page-preview"), HIDDEN, target != FULLPREVIEW);

    NODECLASSSWITCH(NODEID("header-search"), HIDDEN, target != HOMESEARCH);
    NODECLASSSWITCH(NODEID("page-home-search"), HIDDEN, target != HOMESEARCH);

    switch(target) {
        case HOME:
        case GAG:
            mediawrap_update(true);
            break;
    }

    if (target == REPLY) return;
    NODECLASSSWITCH(NODEQUERY("#navbar .sidebar-menu"), HIDDEN, target != HOME);
    NODECLASSSWITCH(NODEQUERY("#navbar .back-thread"), HIDDEN, target != THREAD);
    NODECLASSSWITCH(NODEQUERY("#navbar .back-comment"), HIDDEN, target != GAG);

    NODECLASSSWITCH(title, HIDDEN, target == HOME);
    if (target == GAG) {
        title.textContent = LANG.post;
        footer_comment.children[0].textContent = LANG.write_comment;
    } else if (target == THREAD) {
        title.textContent = LANG.replies;
        footer_comment.children[0].textContent = LANG.write_reply;
    }
    title.title = title.textContent;

    NODECLASSSWITCH(NODEID("navbar").parentNode, "comment-shadow", target == GAG || target == THREAD);
}

function clipboad_copy(text) {
    navigator.clipboard.writeText(text).then(
        () => main_show_snackbar(LANG.clipboard_copied, false),
        err => main_show_snackbar(LANG.clipboard_failed + err.message, true)
    );
}

NODEQUERY("#footer-comment div").addEventListener("click", function() {
    if (!userId) {
        main_show_snackbar(LANG.login_required);
        return;
    }

    if (!gagCommentsView.list.content.classList.contains(HIDDEN))
        gag_reply_only();
    else if (!threadCommentsView.list.content.classList.contains(HIDDEN))
        thread_reply_only();
}, false);



var sanckbarNicgagSettings = undefined;

function nicgag_show_settings_menu() {
    if (sanckbarNicgagSettings == null) {
        sanckbarNicgagSettings = SnackbarMenu.fromExistingElement(NODEID("snackbar-nicgag-settings"));
        sanckbarNicgagSettings.setCancelable(true);
        sanckbarNicgagSettings.ignoreDividersIndex(true);
        sanckbarNicgagSettings.onExtraSelected = nicgag_show_settings_menu_selected;
        sanckbarNicgagSettings.onHide = function() {
            sanckbarNicgagSettings.showing = false;
            toggle_shade(false);
        };

        NODEID("settings-default-volume").addEventListener("input", function(evt) {
            evt.target.nextSibling.textContent = evt.target.value + "%";
        }, false);
    }

    let items = sanckbarNicgagSettings.content.querySelectorAll("switch");
    NODECLASSSWITCH(items[0], SWITCH_TOGGLE, nicgagSettings.forceEnglish);
    NODECLASSSWITCH(items[1], SWITCH_TOGGLE, nicgagSettings.rememberOldPosts);
    NODECLASSSWITCH(items[2], SWITCH_TOGGLE, nicgagSettings.lastSectionEnabled);
    NODECLASSSWITCH(items[3], SWITCH_TOGGLE, nicgagSettings.followReplyThreads);
    NODECLASSSWITCH(items[4], SWITCH_TOGGLE, nicgagSettings.headerExtraPadding);
    NODECLASSSWITCH(items[5], SWITCH_TOGGLE, nicgagSettings.useGIFinComments);

    let def_vol = NODEID("settings-default-volume");
    def_vol.value = nicgagSettings.videoDeafultVolume * 100;
    def_vol.nextSibling.textContent = def_vol.value + "%";

    // toggle_shade(true);
    sanckbarNicgagSettings.showing = true;
    sanckbarNicgagSettings.show();
}

function nicgag_show_settings_menu_selected(index, item) {
    let flag = !item.classList.contains(SWITCH_TOGGLE);
    NODECLASSSWITCH(item, SWITCH_TOGGLE, flag);

    switch(index) {
        case 0:
            main_show_snackbar("Reload the page to apply the changes", true, 4000);
            nicgagSettings.forceEnglish = flag;
            break;
        case 1:
            nicgagSettings.rememberOldPosts = flag;
            break;
        case 2:
            nicgagSettings.lastSectionEnabled = flag;
            break;
        case 3:
            nicgagSettings.followReplyThreads = flag;
            break;
        case 4:
            nicgagSettings.videoDeafultVolume = parseInt(item.value) / 100.0;
            home_video_mutex(null, false, true);
            break;
        case 5:
            nicgagSettings.headerExtraPadding = flag;
            homeHeaderHeight = flag ? 120 : 96;
            NODECLASSSWITCH(document.body, "extra-padding", flag);
            break;
        case 6:
            nicgagSettings.useGIFinComments = flag;
            break;
    }
}


NODEQUERY("#navbar .icon-search").addEventListener("click", function(evt) {
    history_suspend();
    evt.preventDefault();
    homesearch_init();
}, false);


var history_transaction = 0;
var history_current = 0;
var history_stack = new Array();

function history_serialize_args(args) {
    if (!args) return;

    for (let i=0 ; i<args.length ; i++) {
        if (!args[i])
            continue;
        if (args[i] instanceof PostMobile || args[i] instanceof PostCommentMobile)
            args[i] = args[i].serialize();
        else
            args[i] = nicgagSerializeInfo(args[i], true);
    }
}

function history_deserialize_args(args) {
    if (!args) return;

    for (let i=0 ; i<args.length ; i++) {
        if (!args[i])
            continue;
        if (args[i].object == "PostMobile")
            args[i] = PostMobile.deserialize(args[i]);
        else if (args[i].object == "PostCommentMobile")
            args[i] = PostCommentMobile.deserialize(args[i]);
        else
            args[i] = nicgagDeserializeInfo(args[i], true);
    }
}

function history_push(page, args, title, href) {
    if (title)
        document.title = title;
    else
        title = document.title;// assume current title

    history_serialize_args(args);

    let transaction = history_transaction++;
    let state = {page, args, title, transaction, resume: false, extra: undefined};

    if (history.state)
        history.pushState(state, "", href);
    else
        history.replaceState(state, ""/*, href*/);

    if (history_stack.length > 1) {
        let index = history_read_entry(history_current, true);
        if (index >= 0) {
            index++;
            if (index < history_stack.length) history_stack.splice(index);// drop foward entries
       }
   }

   history_stack.push(state);
   history_current = transaction;

   return transaction;
}

function history_read_entry(transaction, return_index) {
    let index = history_stack.findIndex(state => state.transaction == transaction);
    if (return_index) return index;
    else if (index < 0) return false;// not found

    return history_stack[index];
}

function history_suspend() {
    let entry = history_read_entry(history_current, false);
    entry.resume = true;

    if (history.state.transaction == history_current)
        history.replaceState(entry, "");

    history_callback(entry.page, "suspend");
}

function history_page_init(page, args, extra) {
    args = clone_object(args);// obligatory
    history_deserialize_args(args);
    if (args) args.push(extra ? extra : true);// "from_history" argument

    history_callback(page, "init", args, true);
}

function history_callback(page, function_name, args, apply) {
    // should obtain something like "home_init", "gag_exit", "thread_resume"
    let fn = window[page + "_" + function_name];
    if (!fn) return;

    if (apply) fn.apply(window, args);
    else if (arguments.length < 3) fn();
    else fn(args);
}

function history_exit(page) {
    try {
        history_callback(page, "exit", true);
    } catch(err) {
        console.error("Error calling exit of previous page: " + page, err);
    }
}

function history_set_extra(transaction, extra) {
    if (history_current != transaction) return;

    let entry = history_read_entry(history_current, false);
    entry.extra = extra;
    history.replaceState(entry, "");
}

window.addEventListener("popstate", function(evt) {
    if (!evt.state) return;// ¿¿¿???
    if (evt.state.title) document.title = evt.state.title;

    let dir = 0;
    let index = history_read_entry(evt.state.transaction, true);
    if (index >= 0) {
        if (evt.state.transaction > history_current) dir = 1;// foward
        else if (evt.state.transaction < history_current) dir = -1;// return
    }

    if (dir > 0) {// foward
        let current = history_read_entry(history_current, false);
        if (current.resume)
            history_suspend();
        else
            history_exit(current.page);

        history_current = evt.state.transaction;
        history_page_init(evt.state.page, evt.state.args, evt.state.extra);
        return;
    }

    if (dir < 0) {// return
        let current = history_read_entry(history_current, false);
        if (current) {
            current.resume = false;
            history_exit(current.page);
        } else {
            console.warn("History: unknown current transaction", history_current);
        }

        for ( ; index >= 0 ; index--) {
            if (evt.state.transaction != history_stack[index].transaction) {
                history_stack[index].resume = false;
                history_exit(history_stack[index].page);
                continue;
            }

            history_current = history_stack[index].transaction;
            page_switch(history_stack[index].page);

            if (history_stack[index].resume) {
                history_stack[index].resume = false;
                history_callback(history_stack[index].page, "resume");
            } else {
                history_page_init(evt.state.page, evt.state.args, evt.state.extra);
            }
            return;
        }
    }

    //
    // if this part is reached is because the actual transaction is not registred.
    // under normal circumstances this never should happen
    //
    console.error("History: invalid stack", history_current, history_stack);
    console.error("History: stack invalidation issued by", evt.state);

    history_current = evt.state.transaction;
    history_transaction = history_current + 1;
    history_stack = [clone_object(evt.state)];

    history_page_init(evt.state.page, evt.state.args, evt.state.extra);
}, false);



NODEQUERY(".icon-offline").addEventListener("click", function() {
    main_show_snackbar(LANG.offline_warn, true);
},false);

function main_connection_check(evt) {
    let online = navigator.onLine;
    let icon = NODEQUERY(".icon-offline")

    NODECLASSSWITCH(icon, HIDDEN, online);
    if (online) {
        if (!notificationsSocket) future_notification_init(true);
        return;
    }

    main_show_snackbar(LANG.offline_description, true);

    icon.animate([
        { opacity: 0.2 },
        { opacity: 1}
    ], {
        iterations: 4,
        duration: 1200,
		easing: "steps(2, start)"
    });
}

window.addEventListener('offline', main_connection_check, false);
window.addEventListener('online', main_connection_check, false);



/* NOT IMPLEMENTED TOO COMPLEX*/
var network_cache = new Map();

function network_cache_append(page, identifier, data) {
    identifier = typeof(identifier) == "string" ? identifier : identifier.toString();
    let cache = network_cache.get(page);
    if (!cache) {
        cache = { index: 0, map: new Array(15) };
        network_cache.set(page, cache);
    }

    let next = -1;
    data = JSON.stringify(data);

    for (let i=cache.index ; i<cache.map.length ; i++) {
        if (cache.map[i] && cache.map[i].identifier != identifier) continue;
        cache.map[i] = {identifier, data};
        next = i;
        break;
    }
    if (next < 0) {
        next = cache.index;
        cache.map[next] = {identifier, data};
    }

    cache.index = next + 1;
    if (cache.index >= cache.map.length) cache.index = 0;
}

function network_cache_retrieve(page, identifier) {
    identifier = typeof(identifier) == "string" ? identifier : identifier.toString();
    const cache = network_cache.get(page);
    if (cache) {
        for (let entry of cache.map) {
            if (entry && entry.identifier == identifier) return JSON.parse(entry.data);
        }
    }
    return undefined;
}

function network_cache_clear(page) {
    if (page)
        network_cache.delete(page);
    else
        network_cache.clear();
}



NODEQUERY(".report-modal select").addEventListener("change", function(evt) {
    // if (evt.target.parentNode.classList.contains(HIDDEN)) return;
    if (evt.target.selectedIndex < 1) return;

    let type = evt.target.dataset.sourceType;
    let id = evt.target.dataset.sourceId;
    let description = evt.target.parentNode.querySelector(".description");

    NODEREMOVEALLCHILDRENS(description);

    type = APPLICABLE_REPORT_REASONS[type][evt.target.selectedIndex - 1];

    if (type.content) {
        let message = type.content.split('\n');
        for (let tmp of message)
            description.appendChild(document.createElement("p")).textContent = tmp;

        if (type.externalUrl) {
            description.appendChild(document.createElement("hr"));
            let anchor = document.createElement("a");
                anchor.target = "_blank";
                anchor.href = type.externalUrl;
                anchor.textContent = type.externalUrl;
            description.appendChild(document.createElement("p")).appendChild(anchor);
        }
    } else {
        description.textContent = "(no description)";
    }
}, false);
NODEQUERY(".report-modal .report-actions div").addEventListener("click", function(evt) {
    let dialog = evt.target.parentNode.parentNode;
    let select = dialog.querySelector("select");
    let tmp = select.firstElementChild;

    NODEREMOVEALLCHILDRENS(select);
    NODEREMOVEALLCHILDRENS(dialog.querySelector(".description"));

    dialog.classList.add(HIDDEN);
    toggle_shade(false);
    select.appendChild(tmp);//placeholder
}, false);
NODEQUERY(".report-modal .report-actions div:last-child").addEventListener("click", function(evt) {
    let dialog = evt.target.parentNode.parentNode;
    let select = dialog.querySelector("select");

    if (select.selectedIndex < 1 || select.selectedIndex >= select.childElementCount) {
        alert(select.firstElementChild.textContent);
        return;
    }

    let type = select.dataset.sourceType;
    let id = select.dataset.sourceId;
    let post_url = select.dataset.sourceUrl;
    let is_post = type == "POST";
    let promise;

    type = APPLICABLE_REPORT_REASONS[type][select.selectedIndex - 1];

    if (is_post)
        promise = reportPost(id, type.type);
    else
        promise = reportComment(id, post_url, type.type);

    this.previousElementSibling.click();

    main_show_snackbar(LANG.sending_report, false, Snackbar.SHORT_DELAY);

    promise.then(function(res) {
        main_show_snackbar(
            res.okay ? LANG.report_success : LANG.report_dismissed,
            false,
            Snackbar.LONG_DELAY
        );
    }).catch(function(err) {
         main_show_snackbar(LANG.sending_report_failed + err.message, false, Snackbar.LONG_DELAY);
    });
}, false);

function show_modal_report(is_post_or_comment, content_id, post_url) {
    toggle_shade(true);

    let dialog = NODEQUERY(".report-modal");
    let select = dialog.querySelector("select");
    let reasons = is_post_or_comment ? APPLICABLE_REPORT_REASONS.POST: APPLICABLE_REPORT_REASONS.COMMENT;

    for (let reason in reasons) {
        let option = document.createElement("option");
        option.textContent = reasons[reason].title;
        select.appendChild(option);
    }
    select.selectedIndex = 0;
    select.dataset.sourceType = is_post_or_comment ? "POST" : "COMMENT";
    select.dataset.sourceId = content_id;
    select.dataset.sourceUrl = post_url;

    dialog.classList.remove(HIDDEN);
}



function isOldFirefox() {
    let i = navigator.userAgent.indexOf("Firefox/");
    if (i < 0) return false;

    let version = navigator.userAgent.substring(i).split(" ")[0];
    version = version.substring(version.indexOf("/") + 1);

    let version_number = parseFloat(version);

    if (!Number.isFinite(version_number) || Number.isNaN(version_number)) {
        return false;
    }

    return version_number < 76;
}




function main_log_error(error) {
    let details = error.message + "\n" + error.stack;

    NODEQUERY(".error-modal textarea").value += details + "\n\n";
    NODEQUERY(".error-feedback").classList.remove(HIDDEN);
}

window.addEventListener("error", function(evt) {
    main_log_error(evt.error ? evt.error : {message: evt.message, stack: evt.filename});
}, false);

