"use strict";

function PostMobile(type, post, minimal) {
    this.content = importTemplate("post_mobile");
    this._postContent = this.content.querySelector(".post-content");
    this._footnote = this.content.querySelector(".footnote");
    this._nsfwMask = this.content.querySelector(".nsfw-mask");

    this._nsfwMask.querySelector("div").addEventListener("click", this.evtNSFWClick.bind(this), false);

    let tmp;
    switch (type) {
        case "article":
        case "image":
            tmp = this._postContent.appendChild(importTemplate("post_mobile_image"));
            this._media = tmp.querySelector("img");
            this._longLabel = tmp.querySelector(".long");
            break;
        case "video":
            tmp = this._postContent.appendChild(importTemplate("post_mobile_video"));
            this._media = tmp.querySelector("video");
            this._mediaDuration = this.content.querySelector(".post-label");
            this._mediaSoundToggle = this.content.querySelector(".sound-toggle");
            this._media.addEventListener("volumechange", this.evtVolumeChange.bind(this), false);
            this._mediaSoundToggle.addEventListener("click", this.evtMuteButton.bind(this), false);
            break;
        case "gif":
            tmp = this._postContent.appendChild(importTemplate("post_mobile_gif"));
            this._media = tmp.querySelector("video");
            this._wakeLock = false;
            break;
        case "embed":
        case "youtube":
            tmp = this._postContent.appendChild(importTemplate("post_mobile_embed"));
            this._media = tmp.querySelector("iframe");
            break;
        default:
            this._postContent.textContent = "unknown post type: " + type;
            break;
    }

    switch (type) {
        case "article":
            this._longLabel.textContent = LANG.read_full_article;
            break;
        case "image":
            this._longLabel.textContent = LANG.view_full_image;
            break;
        case "youtube":
            this._media.classList.add("youtube");
            break;
    }

    tmp = this.content.querySelector("header");

    this._postTitle = tmp.querySelector("h3 a");
    this._postMore = tmp.querySelector("icon-more");

    this._sectionFav = tmp.querySelector(".icon-favorite");
    this._sectionHref = tmp.querySelector(".post-section a");
    this._sectionIcon = this._sectionHref.querySelector("img");

    tmp = this._sectionHref.querySelectorAll("span");
    this._sectionName = tmp[0];
    this._postCreated = tmp[1];

    this._tags = this.content.querySelector(".post-tag");

    tmp = this.content.querySelector(".post-action").children;
    this._likesCount = tmp[0];
    this._dislikesCount = tmp[1];
    this._commentsCount = tmp[2];

    this._type = type;

    this._likesCount.addEventListener("click", this.evtLike.bind(this), false);
    this._dislikesCount.addEventListener("click", this.evtDisLike.bind(this), false);

    this._commentsCount.addEventListener("click", this.evtComments.bind(this), false);
    this.content.querySelector(".post-action .icon-share").addEventListener("click", this.evtShareMenu.bind(this), false);

    this.content.querySelector("header .icon-more").addEventListener("click", this.evtMoreMenu.bind(this), false);
    this._sectionHref.addEventListener("click", this.evtSectionChange.bind(this), false);

    let post_view_listener = this.evtTitle.bind(this);
    this._postTitle.addEventListener("click", post_view_listener, false);

    if (this._longLabel) this._longLabel.addEventListener("click", post_view_listener, false);

    if (this._media instanceof HTMLMediaElement) {
        if (OLD_FIREFOX) this._media.preload = "none";

        let playback_fn = this._type == "gif" ? this.evtPlaybackGIF : this.evtPlaybackVideo;

        this._mediaIndicator = this._postContent.querySelector(".post-indicator");
        this._media.addEventListener("pause", playback_fn.bind(this), false);
        this._media.addEventListener("play", playback_fn.bind(this), false);
        this._media.addEventListener("error", playback_fn.bind(this), false);
        this._media.addEventListener("click", this.evtMediaClick.bind(this), false);
        this._mediaIndicator.addEventListener("click", this.evtPlayButton.bind(this), false);
    }

    switch(this._type) {
        // case "gif":
        case "image":
        case "article":
            this._media.addEventListener("click", this.evtPreviewClick.bind(this), false);
            break;
    }

    this._tags.addEventListener("click", this.evtTagsClick.bind(this), false);

    if (post) this.setInfo(post, minimal);
}

PostMobile.prototype.updateMetadata = function() {
    this.updateVote(null, apiGetPostVote(this.info.id));
    this.updateCommentsCount();
};

PostMobile.prototype.setInfo = function(post, minimal)  {
    if (post.type != this._type) throw new Error("Unexpected post type (differs from constructor)");

    if (post.promoted) {
        this._sectionIcon.src = post.section;// post.section holds the icon url
        this._sectionName.textContent = LANG.promoted;
        this._sectionHref.removeAttribute("href");
    } else {
        let section = apiGetSectionInfo(post.section);
        this._sectionIcon.src = section.icon;
        this._sectionName.textContent = section.name;
        this._sectionHref.href = "/" + section.url + "?ref=post-section";
        NODECLASSSWITCH(this._sectionFav, "yellow", databaseSectionsFavorites[post.section]);
    }

    let nsfw = post.nsfw && apiSettings.maskSensitiveContent;
    NODECLASSSWITCH(this._postContent, HIDDEN, nsfw);
    NODECLASSSWITCH(this._nsfwMask, HIDDEN, !nsfw);

    if (post.type == "article")
        this._postCreated.appendChild(document.createElement("b")).textContent = LANG.article;
    else if (post.creation && post.creation > 0)
        this._postCreated.textContent = PostMobile.stringifyDate(post.creation);
    else
        this._postCreated.textContent = "";

    this._postTitle.textContent = post.title;

    NODECLASSSWITCH(this._footnote, HIDDEN, !post.contentDescription);
    if (post.contentDescription) this._footnote.appendChild(post.contentDescription);

    if (this._media instanceof HTMLVideoElement) {
        this._media.controls = false;

        if (post.type == "gif") {
            this._mediaIndicator.classList.remove(HIDDEN);
        } else {
            this.hideVideoElements(false, false);
            this._media.volume = nicgagSettings.videoDeafultVolume;
            this.updateMute(nicgagSettings.videoDeafultMuted);
        }
    }

    switch (post.type) {
        case "image":
            this._imageReload = true;
            this._media.src = post.contentUrl;
            break;
        case "video":
            this._media.src = post.contentUrl;
            this._media.poster = post.poster;
            this._mediaDuration.textContent = PostMobile.stringifyTime(post.duration);
            break;
        case "gif":
            this._media.src = post.contentUrl;
            this._media.poster = post.poster;
            break;
        case "youtube":
            this._mediaId = PostMobile.youtubeInstances++;
            this.evtYoutubeLoad = PostMobile.prototype.evtYoutubeLoad.bind(this);
            this._media.addEventListener("load", this.evtYoutubeLoad);
            this._media.src = post.contentUrl + "&widgetid=" + this._mediaId;
            break;
        case "embed":
            this._media.src = post.contentUrl;
            break;
        case "article":
            // the logic is on this.viewMinimal() function
            break;
    }
    
    /*
    //
    // NOT IMPLEMENTED
    // beacuse is impossible detect "error" and "load" events if the iframe is blocked
    //
    switch(post.type) {
        case "youtube":
        case "embed":
            // this._mediaExternalCover.src = post.externalCover;
            // this._mediaExternalError.classList.add(HIDDEN);
    }
    */

    if (this._longLabel) this._longLabel.href = LINK_POST + post.id;

    if (this._media instanceof HTMLMediaElement) this._media.alt = post.title;

    this._commentsCount.href = LINK_POST + post.id + "#comment";
    this.info = post;

    this.updateMetadata();
    this.viewMinimal(minimal);
};

PostMobile.prototype.dispose = function() {
    this.media = null;
    this.clearInfo();
};


PostMobile.prototype.enableAutoplay = function(enable) {
    let native_media = this._media instanceof HTMLMediaElement;

    if (native_media) {
        if (this._media.paused) this._mediaIndicator.classList.remove(HIDDEN);
        this._media.controls = !this._media.paused;
    }

    if (native_media || this._media instanceof HTMLIFrameElement) {
        if (enable)
            autoplay_observe(this._media);
        else
            autoplay_unobserve(this._media);
    }
};

PostMobile.prototype.viewMinimal = function(minimal) {
    if (minimal)
        this._postTitle.href = LINK_POST + this.info.id;
    else
        this._postTitle.removeAttribute("href");

    if (this._longLabel) {
        let is_long = this.info.type == "article" || this.info.isLong;
        NODECLASSSWITCH(this._longLabel, "hidden", !minimal || !is_long);
    }

    switch (this.info.type) {
        case "image":
            if (this.info.contentArticle) {
                this._media.src = minimal ? this.info.contentUrl : this.info.contentArticle;
            }
            break;
        case "video":
            break;
        case "gif":
            break;
        case "youtube":
            break;
        case "embed":
            break;
        case "article":
            // NODECLASSSWITCH(this._media.parentNode, HIDDEN, !minimal);
            NODECLASSSWITCH(this._postContent, "full-article", !minimal);

            if (minimal) {
                this._media.src = this.info.contentUrl;
                this.info.contentArticle.remove();
            } else {
                if (!this.info.isLong) this._media.src = this.info.contentUrl;
                this._postContent.appendChild(this.info.contentArticle);
            }
            break;
    }
    let body_width = document.body.clientWidth;

    let show_tags = !minimal && this.info.tags.length > 0;
    NODECLASSSWITCH(this._tags, HIDDEN, !show_tags);
    if (show_tags/* && this._tags.childElementCount < 1*/) {
        for (let tag of this.info.tags) {
            let a = document.createElement("a");
            a.href = LINK_TAGS + encodeURIComponent(apiEncodeTag(tag)) + "?ref=post-tag";
            a.target = "_blank";
            a.textContent = tag;
            this._tags.appendChild(a);
        }
    }

    this._commentsCount.style.display = minimal ? null : "none";

    switch(this.info.type) {
        case "video":
        case "image":
        case "gif":
        case "youtube":
            if (minimal)
                mediawrap_observe(this._media, this.info.contentWidth, this.info.contentHeight);
            else
                mediawrap_unobserve(this._media);
            break;
    }

};

PostMobile.prototype.serialize = function() {
    return {
        object: "PostMobile",
        type: this._type,
        info: nicgagSerializeInfo(this.info),
        minimal: this._postTitle.hasAttribute("href")
    };
}

PostMobile.deserialize = function(data) {
    let object = new PostMobile(data.type);
    nicgagDeserializeInfo(data.info);
    object.setInfo(data.info, data.minimal);
    return object;
}

PostMobile.prototype.clearInfo = function() {
    switch (this._type) {
        case "gif":
            if (this._wakeLock) {
                wakeLock_release();
                this._wakeLock = false;
            }
        case "video":
            this._media.removeAttribute("poster");
            this._media.removeAttribute("src");
            break;
        case "article":
        case "image":
        case "youtube":
        case "embed":
            this._media.removeAttribute("src");
            break;
    }

    switch (this._type) {
        case "embed":
            break;
        case "youtube":
            window.removeEventListener("load", this.evtYoutubeLoad);
            break;
        case "article":
            let article = this._postContent.querySelector(".article-content");
            if (article) article.remove();
            break;
        default:
            mediawrap_unobserve(this._media);
            break;
    }

    this.info = null;

    this._sectionIcon.removeAttribute("src");

    NODEREMOVEALLCHILDRENS(this._tags);
    NODEREMOVEALLCHILDRENS(this._footnote);

    this.enableAutoplay(false);
}

PostMobile.prototype.refreshCreationDate = function() {
    if (this.info.type != "article" && this.info.creation && this.info.creation > 0)
        this._postCreated.textContent = PostMobile.stringifyDate(this.info.creation);
};


PostMobile.prototype.evtTitle = async function(evt) {
    if (!evt.target.hasAttribute("href")) return;
    if (evt.shiftKey || evt.ctrlKey || evt.altKey || evt.metaKey) return;

    evt.preventDefault();
    home_show_post_comments(this.info, this, evt.target.getAttribute("href"), false);
};

PostMobile.prototype.evtLike = async function(evt) {
    this.changeVote(1);
};

PostMobile.prototype.evtDisLike = function(evt) {
    this.changeVote(-1);
};

PostMobile.prototype.evtComments = function(evt) {
    if (evt.shiftKey || evt.ctrlKey || evt.altKey || evt.metaKey) return;
    evt.preventDefault();
    home_show_post_comments(this.info, this, evt.target.getAttribute("href"), true);
};

PostMobile.prototype.evtShareMenu = function(evt) {
    evt.stopImmediatePropagation();// obligatory
    home_menu_share_show(this.info.title, this.info.url, this.info.section, this.info.contentSource, this.info.type);
};

PostMobile.prototype.evtMoreMenu = function(evt) {
    evt.stopImmediatePropagation();// obligatory
    home_menu_more_show(this.info.id, this.info.url, this.info.section);
};

PostMobile.prototype.evtSectionChange = function(evt) {
    if (evt.shiftKey || evt.ctrlKey || evt.altKey || evt.metaKey) return;

    evt.preventDefault();
    gag_navigate_to_section(this.info.section);
};

PostMobile.prototype.evtPlaybackVideo = function(evt) {
    if (evt.type == "error" || !!this._media.error) {

        this.hideVideoElements(true, false);
        if (!this._media.paused) this._media.pause();

    } else if (evt.type == "play") {

        home_video_mutex(this._media, true);
        this.hideVideoElements(true, true);
        this._media.controls = true;

    } else if (evt.type == "pause" && this._media.controls) {

        // WARNING: some browsers can display a floating icon button on thiers native controls
        this.hideVideoElements(true, false);

    }
};

PostMobile.prototype.evtPlaybackGIF = function(evt) {
    let evt_error = evt.type == "error" || !!this._media.error;
    let evt_pause = evt.type == "pause";
    let evt_play = evt.type == "play" && !evt_error;

    if (evt_error && !this._media.paused) this._media.pause();

    if (evt_play) {
        home_video_mutex(this._media, true);
        this._media.controls = true;
    }

    NODECLASSSWITCH(this._mediaIndicator, HIDDEN, evt_play);

    if (evt_play && !this._wakeLock) {
        wakeLock_adquire();
        this._wakeLock = true;
    } else if (!evt_play && this._wakeLock) {
        wakeLock_release();
        this._wakeLock = false;
    }
};

PostMobile.prototype.evtPlayButton = function(evt) {
    if (this._media.error) this._media.src = this._media.src;
    this._media.play();
};

PostMobile.prototype.evtMuteButton = function(evt) {
    let flag = !this._media.muted;
    nicgagSettings.videoDeafultMuted = flag;
    this.updateMute(flag);
};

PostMobile.prototype.evtVolumeChange = function(evt) {
    let flag = this._media.muted;
    nicgagSettings.videoDeafultMuted = flag;
    this.updateMute(flag);

    home_video_mutex(this._media);// update other videos muted option
};

PostMobile.prototype.evtMediaClick = function(evt) {
    // if (this._media.controls) return;

    if (this._media.paused) {
        if (!this._media.controls) this.evtPlayButton(evt);
    } else {
        this._media.pause();
    }
};

PostMobile.prototype.evtPreviewClick = function() {
    if (this._imageReload && this._media.hasAttribute("src") && (this._media.naturalHeight < 1 || this._media.naturalWidth < 1)) {
        // ¿image broken? try reloading
        this._imageReload = false;
        this._media.src = this._media.src;
        return;
    }

    if (!this.info.contentSource) return;

    fullpreview_init(
        this.info,
        this._postTitle.href,
        this.info.contentSource,
        true,
        this._type == "gif" ? this._media.src : null
    );
};

PostMobile.prototype.evtTagsClick = function(evt) {
    if (evt.shiftKey || evt.ctrlKey || evt.altKey || evt.metaKey) return;
    if (evt.target == this._tags) return;

    evt.preventDefault();

    let href = evt.target.href;
    home_browse_tag_or_search(apiExtractIdFromURL(href), href, evt.target.textContent, true);
}

PostMobile.prototype.evtNSFWClick = function(evt) {
    this._postContent.classList.remove(HIDDEN);
    this._nsfwMask.classList.add(HIDDEN);
}

PostMobile.prototype.evtYoutubeLoad = function(evt) {
    if (!this._media || !this._media.hasAttribute("src")) return;
    youtube_playback_control(this._media, nicgagSettings.videoDeafultMuted ? "mute" : "unMute");
    youtube_playback_control(this._media, "setVolume", parseInt(nicgagSettings.videoDeafultVolume * 100));
}


PostMobile.prototype.changeVote = async function(newVote) {
    if (!userId) {
        main_show_snackbar(LANG.login_required, true);
        return;
    }

    let id = this.info.id;
    let lastVote = apiGetPostVote(id);

    if (newVote == lastVote) newVote = 0;// drop

    try {
        likePost(id, newVote, lastVote);
        this.updateVote(id, newVote, lastVote);
    } catch (err) {
        main_show_snackbar(LANG.post_vote_failed + err.message, true);
    }
}

PostMobile.prototype.updateVote = function(postId, vote, lastVote) {
    if (postId) {
        if (!this.info) return;
        if (postId != this.info.id) return;

        switch(vote) {
            case 1:
                this.info.likesCount++;
                break;
            case -1:
                this.info.dislikesCount++;
                break;
        }
        switch(lastVote) {
            case 1:
                this.info.likesCount--;
                break;
            case -1:
                this.info.dislikesCount--;
                break;
        }
    }

    if (this.info.isVoteMasked) {
        this._likesCount.textContent = "·";
        this._dislikesCount.textContent = "·";
    } else {
        this._likesCount.textContent = PostMobile.stringifyAmounts(this.info.likesCount);
        this._dislikesCount.textContent = PostMobile.stringifyAmounts(this.info.dislikesCount);
    }

    NODECLASSSWITCH(this._likesCount, "active", vote == 1);
    NODECLASSSWITCH(this._dislikesCount, "active", vote == -1);
}

PostMobile.prototype.updateCommentsCount = function(shift) {
    if (arguments.length > 0) this.info.commentsCount += shift;
    this._commentsCount.textContent = PostMobile.stringifyAmounts(this.info.commentsCount);
}

PostMobile.prototype.hideVideoElements = function(hide, indicator) {
    NODECLASSSWITCH(this._mediaIndicator, HIDDEN, hide && indicator);
    NODECLASSSWITCH(this._mediaDuration, HIDDEN, hide);
    NODECLASSSWITCH(this._mediaSoundToggle, HIDDEN, hide);
};

PostMobile.prototype.updateMute = function(muted) {
    if (this._mediaSoundToggle) {
        this._media.muted = muted;
        NODECLASSSWITCH(this._mediaSoundToggle, "on", !muted);
    } else {
        youtube_playback_control(this._media, muted ? "mute" : "unMute");
    }
}


PostMobile.youtubeInstances = 0;

PostMobile.stringifyAmounts = function (amount) {
    if (amount < 1000)
        return amount.toString();
    else
        return (amount / 1000).toFixed(2) + "K";
};

PostMobile.stringifyDate = function(creationTs) {
    const monthNames = LANG.month_names;

    let now = Math.floor(Date.now() / 1000) - creationTs;
    if (now < 60) return LANG.just_now;
    if (now < 3600) return Math.floor(now / 60) + 'm';
    if (now < 86400) return Math.floor(now / 3600) + 'h';
    if (now < 604800) return Math.floor(now / 86400) + 'd';

    let fullDate = new Date(1000 * creationTs);
    let date = fullDate.getDate();
    let month = monthNames[fullDate.getMonth()];
    let year = fullDate.getFullYear();

    let str = `${date} ${month}`;

    if (year != new Date().getFullYear())
        str += ' ' + year.toString().substr(-2);

    return str;
};

PostMobile.stringifyTime = function(seconds) {
    let m = Math.floor(seconds / 60);
    let s = seconds - (m * 60);
    s = parseInt(s);

    function pad(nro) {
        return nro<10?("0"+nro):nro;
    }

    return pad(m) + ":" + pad(s);
};

