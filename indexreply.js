"use strict";
const REPLY_MAX_ATTACHED_MEDIA = 1;// 9gag is designed to attach various files, and the maximum is stored in somewhere

NODEQUERY("#attached-media input").addEventListener("change", reply_file_picked, false);
NODEQUERY("#attached-media").addEventListener("click", reply_remove_media, false);

var replyHeader = NODEID("comment-header");
replyHeader.querySelector(".header-button").addEventListener("click", reply_return, false);

var replyButton = NODEID("comment-btn");
replyButton.addEventListener("click", reply_send, false);

var replyUploadButton = NODEQUERY("#attached-media .file-picker");
replyUploadButton.addEventListener("click", function() {
    if (replyContentMediaQuota < 1)
        main_show_snackbar(LANG.upload_quota, true);
    else
        NODEQUERY("#attached-media input").click();
}, false);


var replyParentCommentInfo;
var replyPostUrl;

var replyTarget;
var replyTargetParent;

var replyTransaction = 0;
var replyContentText = NODEQUERY("#comment-editor textarea");
var replyContentTextLength = 0;
var replyContentMedia;
var replyMediaAbort;
var replySending;
var replyContentMediaQuota = 1;
var replyThreadOnly;
var replyCallback;

replyContentText.addEventListener("input", reply_text_changed, false);


function reply_init(post_url, parent_comment, reply_thread_only, reply_hint, pre_text, callback, from_history) {
    page_switch(REPLY);

    if (!from_history) {
        history_push(REPLY, [
            post_url,
            parent_comment,
            reply_thread_only,
            reply_hint,
            pre_text,
            false,// no callback
        ], null, location.pathname + "#composer=1");
    }

    replyParentCommentInfo = parent_comment;
    replyPostUrl = post_url;
    replyContentText.value = pre_text;
    replyContentMedia = new Array();
    replyContentTextLength = -1;
    replySending = false;
    replyThreadOnly = reply_thread_only;
    replyCallback = callback;

    replyHeader.querySelector(".title").textContent = parent_comment ? LANG.new_reply : LANG.new_comment;

    if (reply_hint) {
        replyTarget = reply_hint;
        replyTargetParent = node_share_take(replyTarget.content);

        NODEID("comment-hint").appendChild(replyTarget.content);
    }

    replyUploadButton.classList.remove(HIDDEN);
    reply_disable(true);

    window.addEventListener('beforeunload', reply_back_request, false);

    requestAnimationFrame(function() {
        NODEQUERY("#comment-editor textarea").scrollIntoView();
    });
}

function reply_exit(force) {
    if (replySending) {
        main_show_snackbar(LANG.sending_comment, true);
    } else if (replyMediaAbort) {
        if (force || confirm(LANG.cancel_upload)) {
            if (replyMediaAbort) replyMediaAbort.abort();
        } else {
            return;
        }
    } else if (!force && replyContentTextLength > 0 && !confirm(LANG.reply_dismiss)) {
        return;
    }

    window.removeEventListener('beforeunload', reply_back_request);

    if (replyTargetParent)
        node_share_restore(replyTarget.content, replyTargetParent);
    else if (replyTarget)
        replyTarget.content.remove();

    if (replyContentMedia)
        for (let media of replyContentMedia) media.holder.remove();

    replyTarget = null;
    replyTargetParent = null;
    replyParentCommentInfo = null;
    replyContentMedia = null;
    replyMediaAbort = null;
    replyPostUrl = null;
    replyCallback = null;
    replyContentText.value = "";
    replyTransaction++;

    reply_toggle_shade(false);
}

function reply_return() {
    history.back();
}

function reply_suspend() { }


function reply_disable(disable) {
    if (disable) {
        replyButton.classList.add(DISABLED);
        return;
    }

    NODECLASSSWITCH(
        replyButton,
        DISABLED,
        replyContentText.value.length < 1 && replyContentMedia.length < 1
    );
}


async function reply_send(evt) {
    if (replyButton.classList.contains(DISABLED)) return;

    let transaction = ++replyTransaction;

    replySending = true;
    reply_disable(true);
    reply_toggle_shade(true);

    try {
        let parent_id = replyParentCommentInfo ? replyParentCommentInfo.id : null;
        let res = await commentSend(replyPostUrl, replyContentText.value, parent_id, replyContentMedia, replyThreadOnly);

        if (replyTarget instanceof PostCommentMobile && replyTarget.info) {
            replyTarget.info.repliesCount++;
            replyTarget.updateMetadata();

            if (nicgagSettings.followReplyThreads)
                reply_follow_thread(res);
            else
                main_show_snackbar(LANG.reply_posted, true);
        } else {
            if (replyTarget instanceof PostMobile && replyTarget.info) replyTarget.updateCommentsCount(1);
            main_show_snackbar(LANG.comment_posted, true);
        }

        if (replyCallback) replyCallback(apiParseCommentInfo(res.comment));

        if (transaction != replyTransaction) return;
        reply_toggle_shade(false);

        replySending = false;
        replyContentTextLength = -1;

        reply_return();
    } catch (err) {
        console.error(err);
        main_show_snackbar(LANG.reply_failed + err.message);

        if (transaction != replyTransaction) return;

        reply_toggle_shade(false);
        replySending = false;
        replyContentTextLength = -1;
        reply_disable();
    }
}

async function reply_file_picked(evt) {
    if (evt.target.files.length < 0) return;

    let media = evt.target.files[0];
    evt.target.value = '';// clear file

    if (replyContentMedia.length >= REPLY_MAX_ATTACHED_MEDIA) return;

    let abort_instance = replyMediaAbort = new AbortController();
    let media_list = NODEID("attached-media");

    let progress = new Snackbar(document.body);
    progress.setActionText(LANG.abort);
    progress.setBodyText(LANG.uploading_file);
    progress.onClick = function(action) {
        if (!action) return;
        replyMediaAbort.abort();
        progress.dispose();
    };
    progress.show();

    replyUploadButton.classList.add(HIDDEN);
    reply_disable(true);

    try {
        let res = await uploadCommentMedia(media, abort_instance.signal);

        if (res.quota && res.quota.count != null) replyContentMediaQuota = res.quota.count;
        res = res.data;

        progress.onClick = null;
        progress.hide();

        let media_element;
        switch (res.sourceMeta['class']) {
            case "STATIC":
                media_element = ["img", {'src': res.imageMetaByType.image.webpUrl}];
                break;
            case "ANIMATED":
                media_element = ["img", {'src': res.imageMetaByType.animated.url}];
                break;
            case "ANIMATED_VIDEO":
                let source = res.imageMetaByType.video || res.imageMetaByType.animated;
                media_element = ["video", {'autoplay': "", 'loop': "", 'muted': "", 'src': source.url}];
                break;
            default:
                if (res.imageMetaByType && res.imageMetaByType.image && res.imageMetaByType.image.url) {
                    media_element = ["img", {'src': res.imageMetaByType.image.webpUrl}];
                } else {
                    main_show_snackbar(LANG.missing_preview, false);
                    media_element = ["span", {}, "¿?"];
                }
        }

        res.holder = makeDOM(["div", {'class': 'container'},
            ["div", {'class': "icon-delete", 'title': LANG.remove_media}],
            media_element
        ]);

        replyContentMedia.push(res);
        media_list.appendChild(res.holder);

    } catch (err) {
        if (!abort_instance.signal.aborted)
            main_show_snackbar(LANG.upload_file_error + err.message, true);
        if (abort_instance != replyMediaAbort) return;
    } finally {
        progress.dispose();
    }

    reply_disable();
    NODECLASSSWITCH(replyUploadButton, HIDDEN, replyContentMedia.length >= REPLY_MAX_ATTACHED_MEDIA);
    replyMediaAbort = null;
}

function reply_text_changed(evt) {
    replyContentTextLength = evt.target.value.length;
    reply_disable();
}

function reply_remove_media(evt) {
    if (!evt.target.classList.contains("icon-delete")) return;

    let media_list = new Array();
    let node = evt.target.parentNode;

    for (let media of replyContentMedia) {
        if (media.holder == node)
            node.remove();
        else
            media_list.push(media);
    }

    replyContentMedia = media_list;
    NODECLASSSWITCH(replyUploadButton, HIDDEN, replyContentMedia.length >= REPLY_MAX_ATTACHED_MEDIA);
    reply_disable();
}

function reply_back_request(evt) {
    if (replySending || replyMediaAbort) {
        evt.preventDefault();
        evt.returnValue = LANG.reply_exit_confirm;
    }
}

async function reply_follow_thread(res) {
    try {
        res = apiParseCommentInfo(res.comment);
        let threadId = res.threadId;

        res = await followCommentStatus(threadId);
        if (res.followed) return;// already followed

        res = await followComment(threadId, true);

        let follow_snackbar = new Snackbar(document.body);

        follow_snackbar.setBodyText(LANG.reply_posted + "\n" + LANG.reply_following);
        follow_snackbar.setActionText(LANG.unfollow);
        follow_snackbar.setDelay(Snackbar.LONG_DELAY);
        follow_snackbar.setDisposeOnHide(true);
        follow_snackbar.onClick = function(action) {
            if (!action) return;
            followComment(threadId, false).catch(function(err) {
                console.error(err);
                main_show_snackbar(LANG.unfollow_failed + err.message, true);
            });
            return true;
        };

        follow_snackbar.show();
    } catch (err) {
        console.error(err);
        main_show_snackbar(LANG.follow_failed + err.message);
    }
}

function reply_toggle_shade(show) {
    NODECLASSSWITCH(NODEID("comment-editor-shade"), HIDDEN, !show);
}

