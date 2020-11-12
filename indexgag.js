"use strict";

var gagCommentsHeader = document.createElement("div");
var gagFeaturedPosts = gagCommentsHeader.appendChild(NODEQUERY("templates .featured-list-container"));
gagCommentsHeader.appendChild(NODEQUERY("templates .comment-antiquity"));

var gagCommentsAntiquityLabel = gagCommentsHeader.querySelector(".icon-collapse-down span");

var antiquity_menu = SnackbarMenu.fromExistingElement(NODEID("snackbar-comment-antiquity"));
antiquity_menu.setCancelable(true);
antiquity_menu.onOptionSelected = gag_change_antiquity;
antiquity_menu.onHide = function() {
    toggle_shade(false);
};

NODEQUERY("#navbar .back-comment").addEventListener("click", gag_return, false);
gagCommentsAntiquityLabel.parentNode.addEventListener("click", antiquity_menu_show, false);

var gagCommentsStatus = new ListStatus(gag_load_comments, importTemplate("comment-end"));

var gagCommentsView = ListAdapter.fromExistingElement("page-gag", function() {
    if (gagCommentsNext != null) gag_load_comments(false);
}, function(info) {
    let comment = new PostCommentMobile(info.type);
    comment.setInfo(info, gagPostOwnerId, gagPostId, false);
    return comment;
}, gagCommentsHeader, gagCommentsStatus)


var gagPostId;
var gagPostUrl;
var gagPostOwnerId;
var gagCommentsNext;
var gagReplyLocked;
var gagCommentsAntiquityHot;
var gagReLayout;

var gagPostInstance;
var gagPostParent;

var gagTransaction = 0;
var gagTransactionReply = 0;
var gagTransactionFeatured = 0;
var gagCommentsInit;

async function gag_init(post_info, post_instance, show_comments, from_history) {
    if (post_instance) {
        post_instance.viewMinimal(false);
        gagPostParent = node_share_take(post_instance.content);
        gagPostInstance = post_instance;
    } else {
        try {
            if (!from_history) {
                try {
                    post_info = apiParsePostInfo(post_info);
                } catch(err) {
                    console.warn("apiParsePostInfo() cannot parse: ", res.parent);
                    console.error(err);
                    main_log_error(err);
                }
            }
            gagPostParent = null;
            gagPostInstance = new PostMobile(post_info.type, post_info, false);
        } catch(err) {
            gagPostInstance = null;
            console.error(err);
            main_show_snackbar("Can not read the post info:\n" + err.message, true);
            return;
        }
    }

    gag_disable_scroll(false);
    page_switch(GAG);
    let history_transaction = undefined;

    if (!from_history) {
        let href = LINK_POST + post_info.id;
        if (show_comments) href += "#comment";

        history_transaction = history_push(GAG, [
            post_info,
            null,
            show_comments,
        ], post_info.title, href);

        if (post_instance && post_instance.content.parentNode) post_instance.enableAutoplay(false);
    }

    gagPostOwnerId = null;
    gagCommentsNext = null;
    gagReplyLocked = false;
    gagCommentsAntiquityHot = true;
    gagCommentsAntiquityLabel.textContent = LANG.hot;
    gagReLayout = false;
    gagFeaturedPostsScroll = true;

    gagPostId = post_info.id;
    gagPostUrl = post_info.url;

    gagCommentsStatus.showSpinner();
    gagCommentsView.appendHeader();

    if (gagPostInstance) NODEINSERTAT(gagCommentsHeader, 0, gagPostInstance.content);

    var scroll = false;
    if (show_comments) {
        if (from_history && from_history !== true) {
            setTimeout(gag_scroll_to_comments, 250, post_info.id);
        } else {
            scroll = setTimeout(function() {
                scroll = false;
                gag_scroll_to_comments(post_info.id);
            }, 1500);
        }
    }

    try {
        if (userId) {
            gagCommentsInit = true;
            await init9GAGComments();// obtain all likes, user id (in comments) and the quota
            gagCommentsInit = false;
        }

        gag_featured_posts_render();// async

        if (from_history === true) from_history = false;
        await gag_load_comments(from_history, history_transaction);
    } catch(err) {
        console.error(err);
        gagCommentsStatus.showError(err);
    }

    if (show_comments !== false && scroll !== false) {
        clearTimeout(scroll);
        gag_scroll_to_comments(post_info.id, from_history);
    }
}

function gag_exit(force) {
    antiquity_menu.hide();

    gagTransaction++;
    gagTransactionReply++;
    gagCommentsNext = null;
    gagCommentsInit = true;
    gagCommentsView.list.disableFetching(true);
    gagCommentsView.clear();
    gag_disable_scroll(false);

    gag_featured_posts_hide(false);

    if (gagPostInstance) {
        if (gagPostParent) {
            gagPostInstance.viewMinimal(true);
            node_share_restore(gagPostInstance.content, gagPostParent);// put the post view back in the list
            gagPostInstance.enableAutoplay(true);// restore autoplay
        } else {
            gagPostInstance.content.remove();
            gagPostInstance.dispose();// dispose PostMobile instance
        }
    }

    gagPostParent = null;
    gagPostInstance = null;
    gagPostId = null;
    gagPostUrl = null;
}

function gag_return() {
    if (history_current > 0) return history.back();

    // the post was loaded with an absolute url, init home
    gag_exit(true);
    home_init(null, HOT, null, false, true);
}

function gag_resume() {
    if (gagReLayout) {
        gagCommentsView.update();
        gagCommentsView.list.reLayout();
        gagReLayout = false;
    }
}

function gag_suspend() { }


async function gag_load_comments(res, history_transaction) {
    let transaction = ++gagTransaction;

    if (userId && gagCommentsInit) {
        // comments are not initialized, maybe due network error, retry
        try {
            await init9GAGComments();
            gagCommentsInit = false;
            if (transaction != gagTransaction) return;
        } catch (err) {
            if (transaction != gagTransaction) return;
            console.error(err);
            gagCommentsStatus.showError(err);
            return;
        }
    }

    try {
        if (!gagPostUrl) return;
        if (!res) {
            res = await getPostComments(gagPostUrl, gagCommentsAntiquityHot, gagCommentsNext);
            if (transaction != gagTransaction) return;
            history_set_extra(history_transaction, res);
        }

        // let mentionMapping = new Map();

        for (let comment of res.comments) {
            let tmp;
            try {
                tmp = apiParseCommentInfo(comment/*, mentionMapping*/);
            } catch(err) {
                console.warn("apiParseCommentInfo() cannot parse: ", comment);
                console.error(err);
                main_log_error(err);
                continue;
            }
            gagCommentsView.pushToItems(tmp);
        }

        let last_next = gagCommentsNext;

        gagReplyLocked = res.lock;
        gagPostOwnerId = res.opUserId;
        gagCommentsNext = res.next;

        if (gagCommentsNext == null || gagCommentsView.items.length < 1)
            gagCommentsStatus.showFooter(
                gagCommentsView.items.length < 1 ?
                    (gagReplyLocked ? LANG.comments_locked : LANG.comments_empty)
                :
                    LANG.comments_end
            );
    } catch (err) {
        if (transaction != gagTransaction) return;
        console.error(err);
        gagCommentsStatus.showError(err);
        return;
    }

    if (gagCommentsView.items.length > 0) gagCommentsView.append();
}

function gag_change_antiquity(index, option) {
    let old = gagCommentsAntiquityHot;

    switch(index) {
        case 0:
            gagCommentsAntiquityHot = true;
            gagCommentsAntiquityLabel.textContent = LANG.hot;
            break;
        case 1:
            gagCommentsAntiquityHot = false;
            gagCommentsAntiquityLabel.textContent = LANG.recent;
            break;
    }

    if (old == gagCommentsAntiquityHot) main_show_snackbar(LANG.refreshing_comments);

    let scroll = gagCommentsView.list.content.scrollTop;
    gagCommentsNext = null;
    gagCommentsView.clear(true);

    gag_load_comments()/*.then(function() {
        gagCommentsView.list.content.scrollTo({top: scroll, behavior: "smooth"});
    })*/;

    return true;
}

function antiquity_menu_show(evt) {
    evt.stopImmediatePropagation();// obligatory
    toggle_shade(true);
    antiquity_menu.show();
}

function gag_navigate_to_section(section) {
    if (!gagPostId) return home_section_choosen(section);

    gag_exit(false);
    home_section_choosen(section);
}

function gag_reply_only() {
    gag_show_reply(null, gagPostInstance, "");
}


var gagFeaturedPostsScroll;
var gagFeaturedPostsList = gagFeaturedPosts.querySelector(".featured-list");
var gagFeaturedPostsToggle = gagFeaturedPosts.querySelector(".featured-posts-toggle div");
gagFeaturedPostsToggle.addEventListener("click", gag_feature_posts_unfold, false);
gagFeaturedPostsList.addEventListener("click", gag_feature_posts_click, false);

function gag_feature_posts_unfold(evt) {
    let hidden = gagFeaturedPostsList.classList.contains(HIDDEN);
    evt.target.textContent = hidden ? LANG.hide : LANG.show;
    gag_disable_scroll(hidden);

    NODECLASSSWITCH(gagFeaturedPosts, "active", hidden);
    NODECLASSSWITCH(gagFeaturedPostsList, HIDDEN, !hidden);

    gagFeaturedPostsList.parentNode.scrollIntoView({behavior: "smooth"})
    if (hidden) {
        // gagCommentsView.list.reLayout();
        if (gagFeaturedPostsScroll) {
            gagFeaturedPostsList.parentNode.scrollTop = 0;
            gagFeaturedPostsScroll = false;
        }
    }
}

async function gag_feature_posts_click(evt) {
    let anchor = NODESEARCHDIRECTCHILD(gagFeaturedPostsList, evt.target);
    if (!anchor) return;// ¿¿??
    evt.preventDefault();
    evt.stopImmediatePropagation();

    try {
        toggle_shade(true);

        let transaction = ++gagTransaction;
        let res = await getPost(anchor.dataset.id);
        if (transaction != gagTransaction) return;
        if (!res.post) throw new Error("missing post info in the response");

        gag_exit(false);
        gag_init(res.post, null, false);
    } catch(err) {
        console.error(err);
        main_show_snackbar("Failed to fetch the post\n" + err.message, true);
    } finally {
        toggle_shade(false);
    }
}

async function gag_featured_posts_render() {
    try {
        gagFeaturedPostsToggle.textContent = LANG.show;

        let featured = ++gagTransactionFeatured;
        let res = await getFeaturedPosts();
        if (featured != gagTransactionFeatured) return;

        if (!res || !res.items || res.items.length < 1) {
            gag_featured_posts_hide();
            return;
        }

        for (let item of res.items) {
            let entry = importTemplate("featured-posts-item");
            entry.dataset.id = apiExtractIdFromURL(item.url);

            if (item.url.indexOf('?') < 0) item.url += "?ref=mfsidebar";
            entry.href = item.url;

            entry.querySelector("img").src = item.webpUrl || item.imageUrl;
            entry.querySelector("p").textContent = xmlEntityDecoder(item.title);

            let small = entry.getElementsByTagName("small");
            small[0].textContent = PostMobile.stringifyAmounts(item.upVoteCount) + " " + LANG.upvotes;
            small[1].textContent = PostMobile.stringifyAmounts(item.commentsCount) + " " + LANG.comments;

            gagFeaturedPostsList.appendChild(entry);
        }
        gagFeaturedPosts.classList.remove(HIDDEN);
    } catch(err) {
        console.error("Failed to fetch featured posts", err);
        gag_featured_posts_hide();
    }
}



function gag_featured_posts_hide(keep_list) {
    if (!keep_list) NODEREMOVEALLCHILDRENS(gagFeaturedPostsList);

    gagFeaturedPosts.classList.add(HIDDEN);
    gagFeaturedPosts.classList.remove("active");
    gagFeaturedPostsList.classList.add(HIDDEN);
}

function gag_scroll_to_comments(post_id, fast) {
    if (gagPostId != post_id) return;

    gagCommentsAntiquityLabel.parentNode.parentNode.scrollIntoView({
        behavior: fast ? "auto" : "smooth", block: "start"
    });
}

function gag_disable_scroll(disable) {
    gagCommentsView.list.content.style.overflowY = disable ? "hidden" : "";
}



function gag_show_reply(parent_comment, hint, pre_text) {
    if (gagReplyLocked) {
        main_show_snackbar(LANG.comments_locked, true);
        return;
    }
    history_suspend();

    let transaction = ++gagTransactionReply;
    let callback = function(comment) {
        if (transaction != gagTransactionReply) return;
        gagCommentsView.insertItem(comment, 0);
        gagReLayout = false;
    };

    gagReLayout = true;
    reply_init(gagPostUrl, parent_comment, false, hint, pre_text, callback);
}

function gag_show_thread(comment_info, comment_host) {
    gagReLayout = false;
    history_suspend();
    thread_init(comment_info, gagPostUrl, gagPostId, comment_host);
}


