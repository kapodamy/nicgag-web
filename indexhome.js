"use strict";

const OS_ANDROID = /(?:Android [\d\.]+;)|(?:;\s?Android [\d\.]+)/.test(navigator.userAgent);
const OS_ANDROID_SHARE_TYPE2 = false;
const SHARE_API = navigator.canShare && navigator.canShare();


var homeSection = null;// "null" means the front page
var homeAntiquity = HOT;
var homeAfter = null;
var homeTransaction = 0;
var homeFetchingNewPosts = false;
var homeSearchMode = null;

var homeFeaturedTags = importTemplate("featured-tag");
var homeStatus = new ListStatus(home_load_retry);

var homeView = ListAdapter.fromExistingElement("page-home", function() {
    home_load(false);// load more posts
}, function(info) {
    let post = new PostMobile(info.type, info, true);
    post.enableAutoplay(true);
    return post;
}, homeFeaturedTags, homeStatus);


var homeTabs = Tabs.fromExistingElement(NODEID("home-tabs"));
homeTabs.onTabSelected = home_change_antiquity;
homeTabs.isShowing = true;// used by home_animate_tabs()
homeTabs.offsetHeight = homeTabs.content.offsetHeight + "px";// used by home_animate_tabs() animation

NODEID("user-defined-sections").addEventListener("click", home_section_choosen, false);
NODEQUERY("#slideout-menu .go-home").addEventListener("click", home_section_choosen, false);


function home_init(section, antiquity, after, load_new_posts, called_from_main, from_history) {
    page_switch(HOME);

    let info;

    if (section && typeof(section) == "object") {
        homeSearchMode = info = section;
        called_from_main = false;

        homeTabs.setVisible(1, false);// disable "trending" tab
        NODECLASSSWITCH(homeTabs.content, HIDDEN, !homeSearchMode.isTag);
        NODEQUERY("#navbar .logo").classList.add(HIDDEN);

        let sectionTitle = NODEQUERY("#navbar .title");
        sectionTitle.classList.remove(HIDDEN);
        sectionTitle.textContent = homeSearchMode.isTag ? LANG.tag_results : LANG.search_results;
        sectionTitle.title = sectionTitle.textContent;
    } else {
        if (called_from_main == "from-main" && nicgagSettings.lastSectionEnabled) section = nicgagSettings.lastSection;
        homeSearchMode = null;
        info = home_compute_location(antiquity, section);
    }



    homeView.list.content.style.paddingTop = homeSearchMode && !homeSearchMode.isTag ? "48px" : null;

    if (info.href != location.href.substring(location.origin.length)) history.replaceState(history.state, "", info.href);

    let history_transaction = undefined;

    if (!from_history) {
        history_transaction = history_push(HOME, [
            section,
            antiquity,
            after,
            load_new_posts,
            false// obligatory
        ], info.title, info.href);
    }

    homeSection = section;
    homeAntiquity = antiquity;
    homeAfter = after;
    homeView.clear();

    if (!homeSearchMode && (from_history || nicgagSettings.rememberOldPosts)) {
        if (currentData && currentData.page == "home") currentData = null;

        let state = nicgagPostsLoad(homeSection, homeAntiquity);
        if (state) {
            homeAfter = state.after;
            homeView.items = state.posts;
            home_set_tags(state.tags);
            try {
                if (homeView.importState(state.viewState)) {
                    homeTabsScrollCheckSuspend(false);
                    return;
                }
                throw new Error("ListAdapter.importState() returned false");
            } catch(err) {
                console.error("invalid home state: ", state);
                console.error(err);
                homeView.clear();
                homeView.appendHeader();
            }
        }
    } else {
        homeView.appendHeader();
    }

    homeTabsScrollCheckSuspend(false);
    home_load(load_new_posts, history_transaction, from_history);
}

function home_exit(force) {
    if (force) home_save_state();

    homeSection = null;
    homeAntiquity = HOT;
    homeAfter = null;
    homeTransaction++;
    homeFetchingNewPosts = false;

    homeView.list.disableFetching(true);
    homeView.clear();

    homeTabsScrollCheckSuspend(true);
}

function home_resume() {
    let sectionTitle = NODEQUERY("#navbar .title");
    NODECLASSSWITCH(NODEQUERY("#navbar .logo"), HIDDEN, homeSection != null);
    NODECLASSSWITCH(sectionTitle, HIDDEN, homeSection == null);

    if (homeSearchMode) {
        sectionTitle.textContent = homeSearchMode.isTag ? LANG.tag_results : LANG.search_results;
        if (!homeSearchMode.isTag) NODEID("home-tabs").classList.add(HIDDEN);
    } else if (homeSection != null) {
        sectionTitle.textContent = apiGetSectionInfo(homeSection).name;
    }

    sectionTitle.title = sectionTitle.textContent;
    homeView.list.disableFetching(false);
    homeView.list.reLayout();
    homeTabsScrollCheckSuspend(false);
}

function home_suspend() {
    homeTabsScrollCheckSuspend(true);
}


async function home_load(new_posts, history_transaction, res) {
    homeStatus.showSpinner();

    homeFetchingNewPosts = new_posts && homeView.items.length > 0;
    let transaction = ++homeTransaction;

    try {
        if (!res || res === true) {
            if (currentData && currentData.page == "home") {
                res = currentData;
                currentData = null;
            } else {
                if (!homeSearchMode)
                    res = getPosts(homeAntiquity, homeSection, new_posts ? null : homeAfter);
                else if (homeSearchMode.isTag)
                    res = searchByTag(homeSearchMode.value, homeAntiquity, homeAfter);
                else
                    res = searchByKeywords(homeSearchMode.value, homeAfter)

                res = await res;// wait for the response
                if (transaction != homeTransaction) return;
            }
            history_set_extra(history_transaction, res);
        }

        home_process_post_list(res);

        homeFetchingNewPosts = false;
    } catch(err) {
        if (transaction != homeTransaction) return;
        console.error(err);
        homeStatus.showError(err.message);
    }
}

function home_process_post_list(res) {
    let new_posts = homeFetchingNewPosts ? new Array() : undefined;

    for (let post of res.posts) {
        if (post.promoted && apiSettings.hidePromotedPosts) continue;
        
        let tmp;
        try {
            tmp = apiParsePostInfo(post);
        } catch(err) {
            console.warn("apiParsePostInfo() cannot parse: ", post);
            console.error(err);
            main_log_error(err);
            continue;
        }

        if (!tmp.promoted && databaseSectionsHidden.includes(tmp.section)) continue;

        if (homeFetchingNewPosts)
            new_posts.push(tmp);
        else
            homeView.pushToItems(tmp);
    }

    // if (homeAfter === null || (homeAfter !== null && res.tags)) home_set_tags(res.tags);
    if (res.tags) home_set_tags(res.tags);

    if (homeFetchingNewPosts) {
        // notify the amount of new posts
        let diff = homeView.mergeItems(new_posts);

        if (diff === true) {
            homeAfter = res.nextCursor;// old posts dropped
            main_show_snackbar(LANG.section_reloaded, false);
        } else if (diff == 1) {
            main_show_snackbar(LANG.new_post, false);
        } else if (diff > 1) {
            main_show_snackbar(diff.toString() + LANG.new_posts, false);
        } else if (diff == 0) {
            main_show_snackbar(LANG.nothing_new, false);
        }

        homeView.upperFooter(false);
        homeView.list.disableFetching(false);
        return;
    } else {
        homeAfter = res.nextCursor;
    }

    homeView.upperFooter(false);
    homeView.append();
}


function home_load_retry() {
    home_load(homeFetchingNewPosts);
}


function home_change_antiquity(index) {
    let antiquity;
    switch(index) {
        case 0:
            antiquity = HOT;
            break;
        case 1:
            antiquity = TRENDING;
            break;
        case 2:
            antiquity = FRESH;
            break;
    }

    if (homeAntiquity == antiquity) {
        if (homeView.list.content.scrollTop <= homeTabsThreshold) {
            // if (confirm("¿load new posts?")) {
                homeView.upperFooter(true);
                home_load(true);
            // }
            return;
        }
        if (confirm(LANG.scroll_top))
            homeView.list.content.scrollTo({top: 0, behavior: "smooth"});
        return;
    }

    home_save_state();
    home_init(homeSection, antiquity, null);

    return SELECTED;
}

function home_section_choosen(evt) {
    let section;
    if (typeof(evt) == "string") {
        section = evt;
    } else {
        if (evt.shiftKey || evt.ctrlKey || evt.altKey || evt.metaKey) return;
        evt.preventDefault();

        let anchor;

        switch(evt.target.tagName) {
            case "IMG":
                anchor = evt.target.parentNode;
                break;
            case "A":
                anchor = evt.target;
                break;
            case "LI":
                anchor = evt.target.querySelector("a");
                break;
            case "UL":
            case "SELECT":
            case "OPTION":
                return;//¿¿??
            default:
                if (evt.target == this) return;
                if (evt.target.classList.contains("local")) return;
                anchor = evt.target.parentNode;// li <-- [a] <-- img
        }

        animate_slideout_menu(false);

        if (NODESTATEHAS(evt.target, "go-home", "icon-home")) {
            section = null;
        } else {
            if (anchor.tagName != "A") return;
            let href = anchor.href;
            section = href.substr(href.lastIndexOf("/") + 1);

            if (!apiGetSectionInfo(section)) throw new Error("Unknown section: " + section);
        }
    }

    homeTabs.setSelected(0);

    home_save_state();
    home_init(section, HOT, null);
}


function home_compute_location(antiquity, section) {
    section = apiGetSectionInfo(section);
    let title = section == null ? `Go Fun The World` : `${section.name} on 9GAG`;
    let sectionTitle = NODEQUERY("#navbar .title");

    let href = "/";
    title = `${NICGAG}: ${title}`;

    if (section) href += section.url;
    if (antiquity != HOT) {
        if (section != null) href += "/";
        href += antiquity;
    }

    NODECLASSSWITCH(NODEQUERY("#navbar .logo"), HIDDEN, section != null);
    NODECLASSSWITCH(sectionTitle, HIDDEN, section == null);
    homeTabs.setVisible(1, section == null);

    switch(antiquity) {
        case HOT:
            homeTabs.setSelected(0);
            break;
        case TRENDING:
            homeTabs.setSelected(1);
            break;
        case FRESH:
            homeTabs.setSelected(2);
            break;
    }

    sectionTitle.textContent = section == null ? "" : section.name;
    sectionTitle.title = sectionTitle.textContent;

    return {title, href};
}


window.addEventListener('beforeunload', function() {
    homeTabsScrollCheckSuspend(true);// avoid requestAnimationFrame() warnings in console while debugging
    home_save_state();
}, false);

function home_save_state() {
    if (homeSearchMode) return;// ¡do not save!

    let list = homeFeaturedTags.querySelectorAll("a");
    let tags = new Array(list.length);
    for (let i=0 ; i<list.length ; i++) tags[i] = { key: list[i].textContent, url: list[i].href };

    nicgagSettings.lastSection = homeSection;
    nicgagPostsSave(homeSection, homeAfter, homeView.exportState(), homeAntiquity, tags);
}


var post_download_option = null;
var homePostShareMenu = null;
var homePostShareMenu_showing = false;
var homePostShareMenu_post = null;
function home_menu_share_show(title, url, section, media, type) {
    if (homePostShareMenu == null) {
        homePostShareMenu = SnackbarMenu.fromExistingElement(NODEID("snackbar-post-share"));
        homePostShareMenu.setCancelable(true);
        homePostShareMenu.ignoreDividersIndex(true);
        homePostShareMenu.onOptionSelected = home_menu_share_selected;
        homePostShareMenu.onHide = function() {
            homePostShareMenu_showing = false;
            homePostShareMenu_post = null;
            toggle_shade(false);
        };

        NODECLASSSWITCH(homePostShareMenu.content.querySelector(".native-share"), HIDDEN, !SHARE_API && !OS_ANDROID);

        post_download_option = homePostShareMenu.content.children[0];

        post_download_option.querySelector("a").addEventListener("click", function(evt) {
            if (!evt.target.hasAttribute("download")) return;
            if (evt.shiftKey || evt.ctrlKey || evt.altKey || evt.metaKey) return;

            // images & videos are not "Same-Origin"
            // use WebExtension downloads API instead
            evt.preventDefault();
            window.postMessage({action: "download", url: evt.target.href}, "*");
        }, false);
    }

    if (homePostMoreMenu_showing) {
        homePostMoreMenu_showing = false;
        homePostMoreMenu.hide();
    }

    NODECLASSSWITCH(post_download_option, HIDDEN, !media);
    if (media) {
        let anchor = post_download_option.querySelector("a");
        anchor.href = media;
        if (type == "youtube")
            anchor.removeAttribute("download");
        else
            anchor.setAttribute("download", "");
    }


    if (!SHARE_API && OS_ANDROID) home_set_share_for("native-share a", share_android(title, url));
    home_set_share_for("whatsapp", share_whatsapp(title, url));
    home_set_share_for("facebook", share_facebook(title, url));
    home_set_share_for("pinterest", share_pinterest(title, url, media));
    home_set_share_for("twitter", share_twitter(title, url));
    home_set_share_for("email", share_email(title, url, section));

    if (SHARE_API) homePostShareMenu_post = {title: title, url: url};

    if (homePostShareMenu_showing) return;
    toggle_shade(true);
    homePostShareMenu_showing = true;
    homePostShareMenu.show();
}

function home_menu_share_selected(index) {
    if (index == 1 && SHARE_API)
        share_api(homePostShareMenu_post.title, homePostShareMenu_post.url);

    return true;
}



var homePostMoreMenu = null;
var homePostMoreMenu_showing = false;
var homePostMoreMenu_post = null;
function home_menu_more_show(id, url, section) {
    if (homePostMoreMenu == null) {
        homePostMoreMenu = SnackbarMenu.fromExistingElement(NODEID("snackbar-post-more"));
        homePostMoreMenu.setCancelable(true);
        homePostMoreMenu.ignoreDividersIndex(true);
        homePostMoreMenu.onOptionSelected = home_menu_more_selected;
        homePostMoreMenu.onHide = function() {
            homePostMoreMenu_showing = false;
            homePostMoreMenu_post = null;
            if (!NODESTATEHAS(NODEQUERY(".report-modal"), HIDDEN)) return;
            toggle_shade(false);
        };
    }

    if (homePostShareMenu_showing) {
        homePostShareMenu_showing = false;
        homePostShareMenu.hide();
    }

    let flag = !databaseSectionsHidden.includes(section);
    NODECLASSSWITCH(homePostMoreMenu.content.querySelector(".section-hide"), HIDDEN, flag);

    if (flag)
        homePostMoreMenu.content.querySelector(".section-hide b").textContent = apiGetSectionInfo(section).name;

    homePostMoreMenu_post = {id: id, url: url, section: section};

    if (homePostMoreMenu_showing) return;
    toggle_shade(true);
    homePostMoreMenu_showing = true;
    homePostMoreMenu.show();
}

function home_menu_more_selected(index) {
    switch(index) {
        case 0:
            clipboad_copy(homePostMoreMenu_post.url);
            return true;
        case 1:
            reportPost(homePostMoreMenu_post.id, REPORT_REASONS.DISLIKE.type).catch(err => main_show_snackbar(LANG.report_failed + err.message, true));
            return true;
        case 2:
            apiHideSection(homePostMoreMenu_post.section);
            return true;
        case 3:
            reportPost(homePostMoreMenu_post.id, REPORT_REASONS.REPOST.type).catch(
                err => main_show_snackbar(LANG.report_failed + err.message, true)
            );
            return true;
        case 4:
            show_modal_report(true, homePostMoreMenu_post.id);
            return true;
    }

    return false;
}

function home_set_share_for(selector, uri) {
    homePostShareMenu.content.querySelector("." + selector).href = uri;
}



function share_api(title, url) {
    navigator.share({title: title, url: url}).catch(err => main_show_snackbar(LAN.share_failed + err.message, false));
}

function share_android(title, url) {
    let intent = "intent:";

    if (OS_ANDROID_SHARE_TYPE2) {
        let scheme = location.protocol.substring(0, location.protocol.length - 1);
        intent += url.substr(url.indexOf(":") + 1);
        intent += "#Intent;scheme=" + scheme + ";"
    } else {
        intent += "#Intent;";
    }

    intent += "type=text/plain;";
    intent += "action=android.intent.action.SEND;";// "action=android.intent.action.SENDTO;"
    // intent += "flags=524288;";

    if (title) intent += "S.android.intent.extra.SUBJECT=" + encodeURIComponent(title) + ";"
    intent += "S.android.intent.extra.TEXT=" + encodeURIComponent(url) + ";"
    intent += "S.browser_fallback_url="  + encodeURIComponent(url) + ";"
    intent += ";end";

    return intent;
}

function share_whatsapp(title, url) {
    let content = encodeURIComponent(`${title} \n${url}?ref=9g.wsa.mw`);
    return `https://api.whatsapp.com/send?text=${content}`;
}

function share_facebook(title, url) {
    return "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url + "?ref=fb.s.mw");
}

function share_pinterest(title, url, media) {
    title = encodeURIComponent(title);
    url = encodeURIComponent(url + "?ref=pn.mw");

    if (media)
        media = "&media=" + encodeURIComponent(media);
    else
        media = "";

    return `https://pinterest.com/pin/create/button/?url=${url}${media}&description=${title}`;
}

function share_twitter(title, url) {
    let referer = encodeURIComponent(url + "?ref=t.mw");
    let text = encodeURIComponent(title);
    url = encodeURIComponent(url + "?ref=t.mw&via=9GAG");

    return `https://twitter.com/intent/tweet?original_referer=${referer}&source=tweetbutton&text=${text};&url=${url}`;
}

function share_email(title, url, section) {
    let subject;
    let body;

    if (section) {
        section = apiGetSectionInfo(section).name;
        subject = `Check out "${title}"`;
        body = `Seen in ${section}, you must check it out on 9GAG! :D\r\n${title}\r\n${url}?ref=9g.m.mw`;
    } else {
        subject = "Check out this comment";
        body = `Seen on 9GAG! :D\r\n${title}\r\n${url}?ref=9g.m.mw`;
    }

    return "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
}



homeFeaturedTags.addEventListener("click", function(evt) {
    if (evt.shiftKey || evt.ctrlKey || evt.altKey || evt.metaKey) return;
    if (evt.target == homeFeaturedTags) return;
    evt.preventDefault();

    let anchor = evt.target.tagName == "A" ? evt.target : evt.target.children[0];

    home_exit(false);
    home_browse_tag_or_search(apiExtractIdFromURL(anchor.href), anchor.href, anchor.textContent, true);
}, false);

function home_set_tags(tags) {
    NODEREMOVEALLCHILDRENS(homeFeaturedTags);

    let empty = !tags || tags.length < 1;
    NODECLASSSWITCH(homeFeaturedTags, HIDDEN, empty);
    if (empty) return;

    for (let tag of tags) {
        if (!tag.url.includes('?')) tag.url += "?ref=featured-tag";

        let li = document.createElement("li");
        let a = document.createElement("a");
        a.textContent = tag.key;
        a.href = tag.url;

        li.appendChild(a);
        homeFeaturedTags.appendChild(li);
    }
}

function home_browse_tag_or_search(value, href, subject, is_tag) {
    subject = is_tag ? (subject + " ") : "";
    let title = "Best 30+ " + subject + "fun on 9GAG";

    home_init({value, href, title, isTag: is_tag}, HOT);
}



function home_animate_tabs(show) {
    if (show == homeTabs.isShowing) return;

    let container = homeTabs.content.parentNode;
    homeTabs.isShowing = show;
    homeTabs.animating = true;

    if (show) container.classList.remove(HIDDEN);

    if (!show && homeView.list.content.scrollTop < homeHeaderHeight) {
        homeView.list.content.scrollTo({top: homeHeaderHeight, behavior: 'smooth'});
    }

    container.animate([
        {transform: "translate(0px, -" + homeHeaderHeight + "px)"},
        {transform: "translate(0px)"}
    ], {
        duration: 250,
        easing: "ease-in-out",
        direction: show ? "normal" : "reverse"
    })
    .onfinish = function() {
        homeTabs.animating = false;
        if (!show) container.classList.add(HIDDEN);
    };
}



var homeTabsLastTs = -1;
var homeTabsLastScroll = -1;
var homeTabsThreshold = 90;
var homeTabsCallbackId = null;
var homeHeaderHeight = 96;

function homeTabsScrollCheck(time) {
    if (homeTabsLastTs < 0) homeTabsLastTs = time;
    let diff_ts = time - homeTabsLastTs;

    if (diff_ts >= 300) {
        let scroll = homeView.list.content.scrollTop;
        if (homeTabsLastScroll < 0) homeTabsLastScroll = scroll;
        let diff_scroll = scroll - homeTabsLastScroll;

        if (diff_scroll <= -homeTabsThreshold && !homeTabs.isShowing)
            home_animate_tabs(true);
        else if (diff_scroll >= homeTabsThreshold && homeTabs.isShowing)
            home_animate_tabs(false);

        homeTabsLastTs = time;
        homeTabsLastScroll = scroll;
    }

    homeTabsCallbackId = requestAnimationFrame(homeTabsScrollCheck);
}

function homeTabsScrollCheckSuspend(suspend) {
    if (homeTabsCallbackId !== null) {
        cancelAnimationFrame(homeTabsCallbackId);
        homeTabsCallbackId = null;
    }
    if (homePageScrollProcessorRunning !== null) {
        cancelAnimationFrame(homePageScrollProcessorRunning);
        homePageScrollProcessorRunning = null;
    }
    if (suspend) {
        homeTabs.animating = false;
        homeTabs.isShowing = true;
    } else {
        homeTabsLastTs = -1;
        homeTabsLastScroll = -1;
        homeTabsCallbackId = requestAnimationFrame(homeTabsScrollCheck);
    }

    homeTabs.suspend = suspend;
}

var homePageScrollProcessorRunning = null;
var homePageScrollProcessorLastScroll = 0;
homeView.list.content.addEventListener("scroll", function() {
    if (homeTabs.suspend) return;
    if (homeTabs.isShowing || homeTabs.animating) {
        homePageScrollProcessorLastScroll = homeView.list.content.scrollTop;
        return;
    } else if (homePageScrollProcessorRunning !== null || homePageScrollProcessorRunning === false) return;
    homePageScrollProcessorRunning = requestAnimationFrame(homePageScrollProcessor);
}, false);
function homePageScrollProcessor() {
    if (homeTabs.animating) return;
    homePageScrollProcessorRunning = null;
    let scroll = homeView.list.content.scrollTop;
    if (scroll < homePageScrollProcessorLastScroll && scroll < homeHeaderHeight) {
        home_animate_tabs(true);
    }
    homePageScrollProcessorLastScroll = scroll;
}



var header_left = NODEQUERY("#navbar>.left>div");
var header_right = NODEQUERY("#navbar>.right");
NODEID("navbar").addEventListener("click", function(evt) {
    if (NODESTATEHAS(homeView.list.content, "hidden")) return;

    let left = header_left.offsetLeft + header_left.offsetWidth;
    let right = header_right.offsetLeft;

    if (homeView.list.content.classList.contains(HIDDEN)) return;
    if (evt.clientX<left || evt.clientX>right) return;

    home_animate_tabs(!homeTabs.isShowing);
}, false);


function home_video_mutex(self_media, pause, volume) {
    let medias = document.querySelectorAll(".post-cell video, .post-cell iframe.youtube");
    for (let media of medias) {
        if (media == self_media) continue;

        if (media instanceof HTMLIFrameElement) {
            if (pause) {
                youtube_playback_control(media, "pauseVideo");// there no way to check if already paused without the Youtube API
            } else {
                youtube_playback_control(media, "setVolume", parseInt(nicgagSettings.videoDeafultVolume * 100));
                youtube_playback_control(media, nicgagSettings.videoDeafultMuted ? "mute" : "unMute");
            }
            continue;
        }

        if (pause) {
            if (media.paused) continue;
            media.pause();
        } else if (!media.defaultMuted/*not GIF*/) {
            if (volume) media.volume = nicgagSettings.videoDeafultVolume;
            media.muted = nicgagSettings.videoDeafultMuted;
        }
    }
}


function home_show_post_comments(post_info, post_instance, post_relative_url, show_comments) {
    history_suspend();
    gag_init(post_info, post_instance, show_comments);
}

