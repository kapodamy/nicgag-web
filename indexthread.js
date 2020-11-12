"use strict";

const ADAPTER_TYPE_HOST = "_host_";
const ADAPTER_TYPE_END_THREAD = "_endthread_";

NODEQUERY("#navbar .back-thread").addEventListener("click", thread_return, false);

var threadTransaction = 0;
var threadReplyTransaction = 0;
var threadCommentsStatus = new ListStatus(thread_load_comments, importTemplate("comment-end"));
var threadCommentsHeader = document.createElement("div");

var threadCommentsView = ListAdapter.fromExistingElement("page-thread", function() {
    if (threadCommentsNext != null) thread_load_comments();
}, function(info) {
    let comment = new PostCommentMobile(info.type);
    comment.setInfo(info, threadPostOwnerId, threadPostId, true, false);
    return comment;
}, threadCommentsHeader, threadCommentsStatus);

var threadCommentHostInfo;
var threadPostUrl;
var threadCommentHost;
var threadCommentHostParent;
var threadCommentsNext;
var threadReplyLocked;
var threadPostOwnerId;
var threadPostId;

function thread_init(comment_host_info, post_url, post_id, comment_host, from_history) {
    let history_transaction = undefined;
    if (!from_history) {
        history_transaction = history_push(THREAD, [
            comment_host_info,
            post_url,
            post_id,
            comment_host
        ], null, location.pathname + "#cs_comment_id=" + comment_host_info.id);
    }

    let title = NODEQUERY("#navbar .title");
    title.textContent = LANG.replies;
    title.title = title.textContent;

    threadCommentHostInfo = comment_host_info;
    threadPostUrl = post_url;
    threadPostId = post_id;

    let scroll_offset;
    if (comment_host && comment_host.content.parentNode) {
        scroll_offset = gagCommentsView.list.content.scrollTop - comment_host.content.offsetTop + gagCommentsView.list.content.offsetTop;
    } else {
        scroll_offset = false;
    }

    if (comment_host) {
        threadCommentHost = comment_host;
        threadCommentHostParent = node_share_take(comment_host.content);
        comment_host.setIsHost(true);// disable reply buttons
        threadCommentsHeader.appendChild(comment_host.content);
    }

    page_switch(THREAD);

    threadCommentsView.appendHeader();

    if (scroll_offset) threadCommentsView.list.content.scrollTo({top: scroll_offset});

    thread_load_comments(from_history, history_transaction);
}

function thread_exit(force) {
    threadCommentsNext = null;
    threadCommentHostInfo = null;
    threadPostUrl = null;
    threadTransaction++;
    threadReplyTransaction++;

    threadCommentsView.clear();

    if (threadCommentHostParent) {
        threadCommentHost.setIsHost(false);
        node_share_restore(threadCommentHost.content, threadCommentHostParent);
    } else if (threadCommentHost) {
        threadCommentHost.content.remove();
        threadCommentHost.dispose();
    }

    threadCommentHost = null;
    threadCommentHostParent = null;
}

function thread_return() {
    history.back();
}

function thread_resume() {
    threadCommentsView.list.reLayout();
    threadCommentsView.update();
}

function thread_suspend() { }


async function thread_load_comments(res, history_transaction) {
    try {
        threadCommentsStatus.showSpinner();

        if (!res || res === true) {
            let transaction = ++threadTransaction;
            res = await getPostCommentReplies(threadPostUrl, threadCommentHostInfo.id, threadCommentsNext);
            if (transaction != threadTransaction) return;
            history_set_extra(history_transaction, res);
        }

        threadReplyLocked = res.lock;
        threadPostOwnerId = res.opUserId;
        threadCommentsNext = res.next;

        let mentionMapping = new Map();
        let parsed_info;

        if (!threadCommentHost || threadCommentHostInfo.emptyInfo) {
            try {
                parsed_info = apiParseCommentInfo(res.parent, mentionMapping);
            } catch(err) {
                console.warn("apiParseCommentInfo() cannot parse: ", res.parent);
                console.error(err);
                main_log_error(err);
            }
        }

        if (!threadCommentHost) {
            if (parsed_info) {
                threadCommentHostInfo = parsed_info;
                threadCommentHost = new PostCommentMobile(parsed_info.type);
                threadCommentHost.setInfo(parsed_info, threadPostOwnerId, threadPostId);
                threadCommentHost.setIsHost(true);
                threadCommentsHeader.appendChild(threadCommentHost.content);
            } else {
                main_show_snackbar(LANG.missing_host_comment, true);
            }
        }

        if (threadCommentHostInfo.emptyInfo) threadCommentHostInfo = parsed_info;

        for (let comment of res.comments) {
            let tmp;
            try {
                tmp = apiParseCommentInfo(comment, mentionMapping);
            } catch(err) {
                console.warn("apiParseCommentInfo() cannot parse: ", comment);
                console.error(err);
                main_log_error(err);
                continue;
            }
            threadCommentsView.pushToItems(tmp);
        }

        if (threadCommentsNext == null) threadCommentsStatus.showFooter(LANG.replies_end);
    } catch (err) {
        console.error(err);
        threadCommentsStatus.showError(err);
        return;
    }

    threadCommentsView.append();
}

function thread_reply_only() {
    thread_show_reply(threadCommentHost, "", true);
}


function thread_show_reply(hint, pre_text, reply_thread_only) {
    if (threadReplyLocked) {
        main_show_snackbar(LANG.replies_locked, true);
        return;
    }
    history_suspend();

    let transaction = ++threadReplyTransaction;
    let callback = function(comment) {
        if (transaction != threadReplyTransaction) return;
        threadCommentsView.insertItem(comment);
    };

    reply_init(threadPostUrl, threadCommentHostInfo, reply_thread_only, hint, pre_text, callback);
}

