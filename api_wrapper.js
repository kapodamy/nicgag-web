"use strict";

function apiParsePostInfo(postInfo) {
    let post = {
        section: undefined,
        isLong: !!postInfo.hasLongPostCover,// ignore on complex post
        creation: postInfo.creationTs,// creationTs is zero on complex post
        url: postInfo.url,
        title: xmlEntityDecoder(postInfo.title),
        tags: new Array(postInfo.tags.length),
        likesCount: postInfo.upVoteCount,
        dislikesCount: postInfo.downVoteCount,
        promoted: postInfo.promoted,
        commentsCount: postInfo.commentsCount,
        nsfw: !!postInfo.nsfw,
        isVoteMasked: postInfo.isVoteMasked,
        contentUrl: undefined,
        contentSource: undefined,
        contentDescription: undefined,
        type: undefined,
        id: postInfo.id
    };

    if (postInfo.postSection && postInfo.postSection.url)
        post.section = postInfo.postSection.url.substring(postInfo.postSection.url.lastIndexOf("/") + 1);
    else if (post.promoted)
        post.section = postInfo.postSection.imageUrl;

    if (postInfo.description)
        post.contentDescription = markdownParse(postInfo.description);
    else
        post.contentDescription = null;

    switch(postInfo.type) {
        case "Photo":
            post.type = "image";
            let src = postInfo.hasLongPostCover ? "image460c" : "image460";
            post.contentArticle = postInfo.hasLongPostCover ? postInfo.images["image460"].webpUrl : null;
            post.contentUrl = postInfo.images[src].webpUrl;
            post.contentSource = postInfo.images.image700.url;

            post.contentWidth = postInfo.images[src].width;
            post.contentHeight = postInfo.images[src].height;
            break;
        case "Animated":
            post.type = postInfo.images.image460sv.hasAudio ? "video" : "gif";
            post.poster = postInfo.images.image460.webpUrl;
            post.contentUrl = postInfo.images.image460sv.url;//av1Url; // av1 probably requires hardware acceleration
            post.contentSource = postInfo.images.image460sv.url;
            if (postInfo.images.image460sv.hasAudio) post.duration = postInfo.images.image460sv.duration;

            post.contentWidth = postInfo.images.image460sv.width;
            post.contentHeight = postInfo.images.image460sv.height;
            break;
        case "Video":
            switch(postInfo.video.source) {
                // case "Youtube":
                case "YouTube":
                    let id = encodeURIComponent(postInfo.video.id);
                    post.type = "youtube";
                    post.contentSource = "https://youtube.com/watch?v=" + id;
                    post.externalCover = postInfo.images.image460.webpUrl;
                    let params = new URLSearchParams();
                    params.set("v", postInfo.video.id);
                    params.set("origin", location.origin);
                    params.set("modestbranding", 1);
                    params.set("iv_load_policy", 3);
                    params.set("rel", 0);
                    params.set("playsinline", 1);
                    params.set("enablejsapi", 0);
                    params.set("start", postInfo.video.startTs);
                    post.contentUrl = "https://www.youtube.com/embed/" + id + "?" + params.toString();
                    break;
                default:
                    console.warn("unknown video source of " + postInfo.id, postInfo);
                    return null;
            }
            break;
        case "Article":
            post.type = "article";
            post.externalCover = postInfo.images.image460.webpUrl;
            post.contentUrl = postInfo.images.image460.webpUrl;
            // post.contentSource = postInfo.images.image700.url;
            post.contentWidth = postInfo.images.image460.width;
            post.contentHeight = postInfo.images.image460.height;
            post.contentArticle = apiParsePostArticle(postInfo.article.blocks, postInfo.article.medias);
            // if (!post.isLong) post.isLong = postInfo.article.blocks > 1;// force
            break;
        case "EmbedVideo":
            post.type = "embed";
            post.contentSource = null;
            post.contentUrl = postInfo.video.embedUrl;
            post.externalCover = postInfo.images.image460.webpUrl;

            switch (postInfo.video.id) {
                case "Facebook":
                    break;
                default:
                    console.warn("Unknown post EmbedVideo id: " + postInfo.video.id, postInfo);
            }
            break;
        default:
            console.warn("Unknown post type: "  + postInfo.type, postInfo);
            return null;
    }

    for (let i=0 ; i<postInfo.tags.length ; i++)
        post.tags[i] = postInfo.tags[i].key;

    return post;
}

function apiParseCommentInfo(commentInfo, mentionMapping) {
    let comment = {
        id: commentInfo.commentId,

        userId: commentInfo.user.userId,
        username: commentInfo.user.displayName,
        userProfile: commentInfo.user.profileUrl,
        userAvatar: commentInfo.user.avatarUrl,
        country: commentInfo.user.country,
        emojiStatus: commentInfo.user.emojiStatus,

        isActivePro: !!commentInfo.user.isActivePro,
        isActiveProPlus: !!commentInfo.user.isActiveProPlus,
        isVerifiedAccount: !!commentInfo.user.isVerifiedAccount,

        isVoteMasked: !!commentInfo.isVoteMasked,
        likeCount: commentInfo.likeCount,
        dislikeCount: commentInfo.dislikeCount,
        isPinned: !!commentInfo.isPinned,

        timestamp: commentInfo.timestamp,
        repliesCount: commentInfo.childrenTotal,
        repliesUrl: commentInfo.childrenUrl,

        threadId: commentInfo.threadId,
        contentMedia: null,
        type: null
    };

    let content = null;

    if (!mentionMapping) mentionMapping = new Map();
    if (!commentInfo.mentionMapping.hasOwnProperty("dummy")) {
        for (let mention in commentInfo.mentionMapping) {
            if (!mentionMapping.has(mention))
                mentionMapping.set(mention, commentInfo.mentionMapping[mention]);
        }
    }

    switch (commentInfo.type) {
        case "text":
            comment.type = "text";
            content = xmlEntityDecoder(commentInfo.text);
            break;
        case "userMedia":
            content = xmlEntityDecoder(commentInfo.mediaText);

            if (!commentInfo.media || commentInfo.media.length < 1)
                break;

            comment.contentMedia = new Array();
            for (let media of commentInfo.media) {
                switch(media.imageMetaByType.type) {
                    case "STATIC":
                        comment.type = "image";
                        comment.contentMedia.push({
                            type: "image",
                            src: media.imageMetaByType.image.webpUrl,
                            original: media.imageMetaByType.image.url
                        });
                        break;
                    case "ANIMATED":
                        comment.type = "animated";
                        comment.contentMedia.push({
                            type: "animated",
                            src: media.imageMetaByType.video.url,
                            original: media.imageMetaByType.animated.url
                        });
                        break;
                    default:
                        console.warn("unknown comment user media type", media, commentInfo);
                }
            }
            break;
        default:
            console.warn("unknown comment type", commentInfo);
            content = xmlEntityDecoder(commentInfo.text);
    }

    comment.content = PostCommentMobile.parseCommentBody(content, mentionMapping);

    return comment;
}

function apiParseMediaInfo(mediaInfo) {
    return {
        hash: mediaInfo.payload.hash,
        userMedia: mediaInfo.payload.sourceMeta,
        previewUrl: mediaInfo.payload.data.imageMetaByType.image.webpUrl,// .url,
    };
}

function apiGetPostVote(postId) {
    if (!userId) return 0;// no user session

    let vote = databaseVotes[postId];
    if (vote == undefined)
        return 0;
    else
        return vote;
}

function apiGetCommentVote(commentId) {
    if (!userId || !databaseVotesComments) return 0;// no user session

    let vote = databaseVotesComments[commentId];
    if (vote == undefined)
        return 0;
    else
        return vote;
}

function apiParseSectionsInfo(sectionsInfo, level) {
    let result;

    if (level ==  1) {
        result = new Array();
        for (let id in sectionsInfo) result.push(id);
        return result;
    }

    result = {};
    for (let id in sectionsInfo) {
        result[id] = {
            name: sectionsInfo[id].name,
            url:  sectionsInfo[id].url,
            icon: sectionsInfo[id].ogWebpUrl
        };

        if (sectionsInfo[id].location)
            result[id].location = sectionsInfo[id].location;

        if (level == 3) {
            result[id].nsfw = sectionsInfo[id].isSensitive;
            result[id].locked = sectionsInfo[id].userUploadEnabled;
        }
    }

    return result;
}

function apiParsePostArticle(blocks, medias) {
    let article = document.createElement("div");
        article.className = "article-content";

    for (let block of blocks) {
        switch(block.type) {
            case "Media":
                let media = medias[block.mediaId];
                let base = document.createElement("a");
                let template;

                switch(media.type) {
                    case "Photo":
                        template = importTemplate("post_mobile_image");
                        template.querySelector(".long").remove();

                        let img = template.querySelector("img");
                        img.src = media.images.image460.webpUrl;
                        img.style.width = media.images.image460.width;
                        img.style.height = media.images.image460.height;

                        base.href = media.images.image700.url;
                        base.appendChild(template);
                        break;
                    case "Animated":
                        let audio = media.images.image460sv.hasAudio != 0;

                        template = document.createElement("div");
                        template.style = "text-align: center; position: relative;";

                        let video = template.appendChild(document.createElement("video"));
                        video.controls = true;
                        video.loop = !audio;
                        video.playsinline = audio;

                        let indicator = template.appendChild(document.createElement("span"));
                        indicator.className = "post-indicator hidden " + (audio ? "icon-play" : "gif");

                        indicator.addEventListener("click", function() {
                            this.classList.add(HIDDEN);
                            let video = this.parentNode.querySelector("video");
                            video.src = video.src;
                            video.play();
                        }, false);
                        video.addEventListener("error", function() {
                            this.parentNode.querySelector("span").classList.remove(HIDDEN);
                        }, false);

                        if (audio)
                            video.preload = "metadata";
                        else
                            video.autoplay = true;

                        // video.style.width = "100%";//media.images.image460sv.width;
                        // video.style.height = media.images.image460sv.height;
                        mediawrap_compute(video, media.images.image460sv.width, media.images.image460sv.height, false);

                        video.poster = media.images.image460.webpUrl;
                        video.src = media.images.image460sv.url;//av1Url;
                        break;
                    case "Video":
                        switch(media.video.source) {
                            case "YouTube":
                                template = importTemplate("post_mobile_embed");
                                let iframe = template.querySelector("iframe");
                                iframe.src = `https://www.youtube.com/embed/${media.video.id}?modestbranding=1&iv_load_policy=3&rel=0&enablejsapi=1&start=0`;
                                iframe.style.width = "100%";
                                // iframe.style.height = mediaWrapWindow.height + "px";// ¿optional?
                                break;
                            default:
                                console.warn("unknown post/block/media/video source in media block", media.video.source, media);
                                continue;
                        }
                        break;
                    default:
                        console.warn("Unknown post/block/media type: "  + media.type, media);
                        continue;
                }
                article.appendChild(template)/*.alt = block.caption;*/
                break;
            case "RichText":
                article.appendChild(markdownParse(block.content));
                break;
            default:
                console.warn("unknown block type: " + type, block);
        }
    }

    let media_elements = article.querySelectorAll("img, video");
    for (let media of media_elements) {
        media.style.width = "100%";
        //media.parentNode.style.textAlign = "center";
    }

    return article;
}

function apiHideSection(section) {
   if (databaseSectionsHidden.includes(section)) return;
   databaseSectionsHidden.push(section);
}

function apiGetSectionInfo(section) {
    return databaseSections[section] || databaseSectionsLocal[section];
}

function apiExtractIdFromURL(url) {
    url = new URL(url);
    return url.pathname.substr(url.pathname.lastIndexOf('/') + 1);
}

function apiEncodeTag(raw_tag) {
    return raw_tag.replace(/\s+/g, '-').toLowerCase();
}

