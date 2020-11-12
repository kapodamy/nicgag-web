"use strict";

function PostCommentMobile(type) {
    this.content = importTemplate("comment_mobile");
    let tmp = this.content.querySelector(".avatar a");

    this._userHref = tmp;
    this._userAvatar = tmp.children[0];

    tmp = this.content.querySelector(".info>div").children;
    this._username = tmp[0];
    this._iconVerified = tmp[1];
    this._iconStatus = tmp[2];
    this._iconPro = tmp[3];
    this._created = tmp[4];

    this._contentBody = this.content.querySelector(".content");

    let media = this.content.querySelector(".media");
    if (type == "text") {
        media.remove();
    } else {
        this._media = media;
        // if (OLD_FIREFOX) this._media.preload = "auto";
        this._media.addEventListener("click", this.evtPreviewClick.bind(this), false);
    }

    tmp = this.content.querySelector(".action").children;
    this._reply = tmp[0];
    this._likes = tmp[1];
    this._dislikes = tmp[2];
    tmp[3].addEventListener("click", this.evtMoreMenu.bind(this), false);

    this._likes.addEventListener("click", this.evtLike.bind(this), false);
    this._dislikes.addEventListener("click", this.evtDisLike.bind(this), false);

    this._reply.addEventListener("click", this.evtReply.bind(this), false);

    this._moreReplies = this.content.querySelector(".more-replies");
    this._moreReplies.addEventListener("click", this.evtMoreReplies.bind(this), false);
}


PostCommentMobile.prototype.updateMetadata = function() {
    this.refreshCreationDate();
    this.updateVote(null, apiGetCommentVote(this.info.id));

    if (!this._isReply && this.info.repliesCount > 0) {
        this._moreReplies.textContent = this.info.repliesCount < 2 ? LANG.view_reply : LANG.view_replies.replace('@', this.info.repliesCount);
        this._moreReplies.href = this._commentUrl;
    }
};

PostCommentMobile.prototype.setInfo = function(comment, opUserId, postId, isReply, isHost) {
    this._isHost = isHost;
    this._username.textContent = comment.username;
    this._username.href = comment.userProfile;

    NODECLASSSWITCH(this._username, "op", comment.userId == opUserId);
    NODECLASSSWITCH(this._username, "me", comment.userId == userIdComments);

    NODECLASSSWITCH(this.content, "pinned", comment.isPinned);

    this._userHref.href = comment.userProfile;
    this._userAvatar.src = comment.userAvatar;

    let str = comment.emojiStatus /*+ " " + comment.country*/;
    if (str == null) str = comment.country;
    if (str == null) str = "";

    this._iconStatus.textContent = str;

    NODECLASSSWITCH(this._iconStatus, HIDDEN, str.length < 1);
    NODECLASSSWITCH(this._iconVerified, HIDDEN, !comment.isVerifiedAccount);
    NODECLASSSWITCH(this._iconPro, "plus", comment.isActiveProPlus);
    NODECLASSSWITCH(this._iconPro, HIDDEN, !comment.isActivePro && !comment.isActivePro);
    NODECLASSSWITCH(this.content, "comment-child", isReply);

    let no_replies = isReply || comment.repliesCount < 1;
    NODECLASSSWITCH(this._moreReplies, HIDDEN, no_replies);

    this.info = comment;
    this._commentUrl = location.origin + LINK_POST + postId + "#cs_comment_id=" + comment.id;
    this._isReply = isReply;
    this._extra = {opUserId, postId, isHost};
    this._mediaReload = true;

    if (comment.contentMedia && !(comment.contentMedia instanceof Node)) {
        let content_media = document.createElement("div");
        for (let media of comment.contentMedia) {
            let node;
            let src;
            switch(media.type) {
                case "image":
                    node = importTemplate("comment_mobile_image");
                    src = media.src;
                    break;
                case "animated":
                    if (nicgagSettings.useGIFinComments && media.original.endsWith(".gif")) {
                        node = importTemplate("comment_mobile_image");
                        src = media.original;
                    } else {
                        node = importTemplate("comment_mobile_animated");
                        src = media.src;
                    }
                    break;
            }

            node.href = media.original;
            node.children[0].children[0].src = src;
            node.children[0].children[0].dataset.original = media.original;
            content_media.appendChild(node);
        }
        comment.contentMedia = content_media;
    }

    if (comment.contentMedia) this._media.appendChild(comment.contentMedia);
    this._contentBody.appendChild(comment.content);

    this.updateMetadata();
};

PostCommentMobile.prototype.clearInfo = function() {
    this.info = null;
    this._isReply = false;
    this._extra = null;
    this._commentUrl = null;

    NODEREMOVEALLCHILDRENS(this._contentBody);
    NODEREMOVEALLCHILDRENS(this._media);
};

PostCommentMobile.prototype.setIsHost = function(isHost) {
    this._isHost = isHost;
    NODECLASSSWITCH(this._moreReplies, HIDDEN, isHost);
    // NODECLASSSWITCH(this._reply, HIDDEN, isHost);
};

PostCommentMobile.prototype.dispose = function() {
    PostCommentMobile.prototype.clearInfo();
}

PostCommentMobile.prototype.serialize = function() {
    return {
        object: "PostCommentMobile",
        type: this.content.querySelector(".media") ? null : "text",
        info: nicgagSerializeInfo(this.info),
        opUserId: this._extra.opUserId,
        postId: this._extra.postId,
        isReply: this._isReply,
        isHost: this._extra.isHost
    };
}

PostCommentMobile.deserialize = function(data) {
    data.info = nicgagDeserializeInfo(data.info);

    let object = new PostCommentMobile(data.info.type);
    object.setInfo(data.info, data.opUserId, data.postId, data.isReply, data.isHost);
    return object;
}

PostCommentMobile.prototype.changeVote = async function(newVote) {
    if (!userId) {
        main_show_snackbar(LANG.login_required, true);
        return;
    }

    let id = this.info.id;
    let lastVote = apiGetCommentVote(id);

    if (newVote == lastVote) newVote = 0;// drop

    try {
        likePostComment(id, newVote, lastVote);
        this.updateVote(id, newVote, lastVote);
    } catch (err) {
        main_show_snackbar(LANG.comment_vote_failed + err.message, true);
    }
}

PostCommentMobile.prototype.updateVote = function(commentId, vote, lastVote) {
    if (commentId) {
        if (!this.info) return;
        if (commentId != this.info.id) return;

        switch(vote) {
            case 1:
                this.info.likeCount++;
                break;
            case -1:
                this.info.dislikeCount++;
                break;
        }
        switch(lastVote) {
            case 1:
                this.info.likeCount--;
                break;
            case -1:
                this.info.dislikeCount--;
                break;
        }
    }

    if (this.info.isVoteMasked) {
        this._likes.textContent = "·";
        this._dislikes.textContent = "·";
    } else {
        this._likes.textContent = PostMobile.stringifyAmounts(this.info.likeCount);
        this._dislikes.textContent = PostMobile.stringifyAmounts(this.info.dislikeCount);
    }

    NODECLASSSWITCH(this._likes, "active", vote == 1);
    NODECLASSSWITCH(this._dislikes, "active", vote == -1);
}

PostCommentMobile.prototype.refreshCreationDate = function() {
    this._created.textContent = PostMobile.stringifyDate(this.info.timestamp);
};


PostCommentMobile.prototype.evtReply = function() {
    if (!userId) {
        main_show_snackbar(LANG.login_required);
        return;
    }

    let mention = "@" + this.info.username + " ";

    if (this._isReply || this._isHost)
        thread_show_reply(this, mention, false);
    else
        gag_show_reply(this.info, this, mention);
};

PostCommentMobile.prototype.evtLike = function() {
    this.changeVote(1);
};

PostCommentMobile.prototype.evtDisLike = function() {
    this.changeVote(-1);
};

PostCommentMobile.prototype.evtMoreMenu = function(evt) {
    evt.stopImmediatePropagation();// obligatory
    gagthread_show_comment_menu(this);
};

PostCommentMobile.prototype.evtMoreReplies = function(evt) {
    if (evt.shiftKey || evt.ctrlKey || evt.altKey || evt.metaKey) return;

    evt.preventDefault();
    gag_show_thread(this.info, this);
};

PostCommentMobile.prototype.evtPreviewClick = function(evt) {
    switch(evt.target.tagName) {
        case "IMG":
        case "VIDEO":
            break;
        default:
            return;
    }

    evt.preventDefault();
    evt.stopImmediatePropagation();
    
    if (this._mediaReload && this._media.hasAttribute("src") && (this._media.naturalHeight < 1 || this._media.naturalWidth < 1)) {
        // ¿image/video broken? try reloading
        this._mediaReload = false;
        this._media.src = this._media.src;
        return;
    }

    let original = evt.target.dataset.original;

    fullpreview_init(
        this.info,
        this._commentUrl,
        original,
        false,
        original.endsWith(".gif") > 0 ? evt.target.src : null
    );
};


PostCommentMobile.stringSplitter = function(text, search, results, transform) {
    let i = 0;
    let j = 0;

    while((j = text.indexOf(search, i)) >= 0) {
        if (i != j) results.push(text.substring(i, j));
        results.push(transform(text.substr(j, search.length)));
        i = j + search.length;
    }

    if (i < text.length) results.push(text.substring(i));
};

PostCommentMobile.parseCommentBody = function(content, mentionMapping) {
    const HTTP = "http://";
    const HTTPS = "https://";
    const RX = /\w/;

    let result = document.createElement("div");

    let body = new Array();
    let body2 = new Array();

    // parse line breaks
    PostCommentMobile.stringSplitter(content, "\n", body, str => document.createElement("br"));

    // linkify mentions
    for (let user of mentionMapping) {
        for (let i=0 ; i<body.length ; i++) {
            if (body[i] instanceof Node) {
                body2.push(body[i]);
            } else {
                PostCommentMobile.stringSplitter(
                    body[i],
                    user[0],
                    body2,
                    str => PostCommentMobile.createUserMention(user[0], user[1])
                );
            }
        }
        body = body2;
        body2 = new Array();
    }

    if (body2.length > 0) {
        body = body2;
        body2 = new Array();
    }

    // linkify urls
    for (let i=0 ; i<body.length ; i++) {
        if (body[i] instanceof Node) {
            body2.push(body[i]);
            continue;
        }

        let j1 = body[i].indexOf(HTTPS);
        let j2 = body[i].indexOf(HTTP);
        if (j1 < 0 && j2 < 0) {
            body2.push(body[i]);
            continue;
        }

        let j = j1 < 0 ? j2 : j1;
        let protocol = j1 < 0 ? HTTP : HTTPS;

        let k = body[i].indexOf(' '/*white space*/, j + 1);
        if (k < 0) k = body[i].indexOf(' '/*hard space*/, j + 1);
        if (k < 0) k = body[i].indexOf("\x09"/*tab*/, j + 1);
        if (k < 0) k = undefined;/* until the end*/

        if (j > 0) {
           if (RX.test(body[i].charAt(j - 1))) {
               body2.push(body[i].substring(0, k));// alphanumeric char before
               j = -1;
           } else {
               body2.push(body[i].substring(0, j));
           }
        }

        let l;
        if (j < 0) {
            l = false;
        } else {
            l = body[i].substring(j, k);
            if (l == protocol) {
                body2.push(l);// not a link
                l = false;
            }
        }


        if (l) {
            let a = document.createElement("a");
                a.textContent = l;
                a.href = l;
                a.target="_blank"
            body2.push(a);
        }

        if (k === undefined) continue;

        body[i] = body[i].substring(k);
        i--;// parse again this line
    }


    // append everything
    let buffer = "";
    for (let i=0 ; i<body2.length ; i++) {
        if (body2[i] instanceof Node) {
            if (buffer) {
                result.appendChild(document.createTextNode(buffer));
                buffer = "";
            }
            result.appendChild(body2[i]);
        } else {
            buffer += body2[i];
        }
    }

    if (buffer) result.appendChild(document.createTextNode(buffer));

    return result;
}

PostCommentMobile.createUserMention = function(username, userId) {
    let a = document.createElement("a");
        a.href = LINK_USERID + userId;
        a.textContent = username;
        a.className = "user-mention";
        a.target = "_blank";
        a.rel = "noreferrer";
        a.referrerpolicy = "same-origin";

    return a;
};

