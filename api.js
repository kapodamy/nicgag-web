"use strict";

const LIKE = 1;
const UNLIKE = 0;
const DISLIKE = -1;

const HOT = "hot";
const TRENDING = "trending";
const FRESH = "fresh";

const DEFAULT_POST_COMMENT__REPLY_TYPE = "old";
const DEFAULT_POST_COMMENT_TYPE = "hot";
const DEFAULT_POST_COMMENT_COUNT = 10;
const DEFAULT_POSTS_LIST_HOME_COUNT = 20;
const DEFAULT_POSTS_LIST_SECTION_COUNT = 10;

var API_COMMENT_DELETECREATE = "/v1/comment.json";
var API_COMMENT_LIST = "/v2/cacheable/comment-list.json";
var API_COMMENT_ACTIONS = null;

const LINK_USER_LOGOUT = "/logout";
const LINK_USER = "/u/";
const LINK_USERID = "/aid/";
const LINK_SETTINGS = "/settings";
const LINK_TAGS = "/tag/";
const LINK_POST = "/gag/";

const API_APP_STATE = "@mweb/appState";
const API_SECTION_STATE = "@mweb/sectionState";
const API_SEARCH_STATE = "@mweb/searchState";
const API_USER_STATE = "@mweb/userState";

const REPORT_POST_REPOST = 4;
const SEARCH_RECENT_MAX_ENTRIES = 20;

var auth, appId, userId, readStateParams, userInfo;
var databaseVotes, databaseUserUpload/*, databaseTags*/;
var databaseSections, databaseSectionsLocal, databaseSectionsFeatured, databaseSectionsFavorites, databaseSectionsHidden;

var databaseVotesComments = null, userCommentQuota = 0, userIdComments;
var databaseFollowing = {};// volatile

var currentData;
var notificationChannel, notificationApiHost;

async function init9GAG() {
    let config;
    let meta_config = NODEQUERY("meta[name='9gag-config']");

    if (meta_config) {
        config = outside_config_parse(meta_config.content);
    } else {
        config = window._config;
        if (window._config) delete window._config;
    }

    if (!config) throw new Error("init9GAG: 9GAG config not extracted");// config = await XHRGET("/v1/config");

    if (config.data.post) {
        currentData = { page: "gag", post: config.data.post };
    } else if (config.data.posts && config.data.tags/* && config.data.hasOwnProperty("nextCursor")*/) {
        currentData = { page: "home", posts: config.data.posts, tags: config.data.tags, nextCursor: config.data.nextCursor };
    } else {
        currentData = null;
    }

    let source;
    if (config.configs && config.configs.comment) {
        let tmp = config.app || config.page;
        source = {
            commentOptions: config.configs.comment,
            sections: tmp.sections,
            localSections: tmp.localSections,
            featuredSections: tmp.featuredSections,
            notiOptions: tmp.notiOptions
        };
    } else {
        source = config.app || config.page;
    }

    try {
        appId = source.commentOptions.appId;

        let data = await XHRPOSTJSON("/v1/user-info", {});

        userId = data.user.accountId;// ¡do not confuse with data.user.userId!
        auth = data.user.commentAuth;
        readStateParams = data.user.notiOptions.readStateParams;

        userInfo = {
            avatar: data.user.avatarUrl,
            profile: data.user.profileUrl,
            name: data.user.username,
            location: data.user.location || "",
            preferences: data.user.preferences
        };

        databaseVotes = data["vote"];
        databaseUserUpload = data["user-upload"];

        if (config.configs && config.configs.noti.pushHost)
            notificationApiHost = config.configs.noti.pushHost;
        else
            notificationApiHost = source.notiOptions.apiHost.replace('.', "-push.");// should generate something like "notif-push.9gag.com"
        if (data.user.notiOptions.channels.length > 0) notificationChannel = data.user.notiOptions.channels[0];
    } catch (err) {
        if (err.httpCode != 401) throw err;

        // no user logged
        userId = null;
    }

    databaseSections = apiParseSectionsInfo(source.sections, 3);
    databaseSectionsLocal = apiParseSectionsInfo(source.localSections, 2);
    databaseSectionsFeatured = apiParseSectionsInfo(source.featuredSections, 1);

    let sectionState = window.localStorage.getItem(API_SECTION_STATE);
    if (sectionState) {
        try {
            if (!sectionState) {
                sectionState = { section: { hiddenSections: new Array(), favoriteSections: new Array() } };
                window.localStorage.setItem(API_SECTION_STATE, JSON.stringify(sectionState));
            } else {
                sectionState = JSON.parse(sectionState);
            }
        } catch(err) {
            console.error("init9GAG: cannot read sectionState", err);
            sectionState = null;
        }
    }

    if (!sectionState || !sectionState.section) {
        databaseSectionsHidden = new Array();
        databaseSectionsFavorites = new Array();
    } else {
        databaseSectionsHidden = sectionState.section.hiddenSections;
        databaseSectionsFavorites = sectionState.section.favoriteSections;
    }

    API_COMMENT_DELETECREATE = location.protocol + "//" + source.commentOptions.cdnHost + API_COMMENT_DELETECREATE;
    API_COMMENT_LIST = location.protocol + "//" + source.commentOptions.cdnHost + API_COMMENT_LIST;
    API_COMMENT_ACTIONS = location.protocol + "//" + source.commentOptions.host;

    let src_config = meta_config || NODEID("9gag-config");
    if (src_config) src_config.remove();
}


async function getPostComments(postUrl, hot_or_new, next) {
    let params;

    if (next) {
        params = next;// absolute params
    } else {
        params = new URLSearchParams();
        params.append("appId", appId);
        params.append("count", DEFAULT_POST_COMMENT_COUNT);
        params.append("url", postUrl);
        params.append("type", hot_or_new ? "hot" : "new");
        params.append("origin", location.origin);
    }

    return XHRGET(API_COMMENT_LIST, params);
}

async function getPostCommentReplies(postUrl, commentId, next) {
    let params;

    if (next) {
        params = new URLSearchParams(next);// predefined params
    } else {
        params = new URLSearchParams();
        params.append("appId", appId);
        params.append("count", DEFAULT_POST_COMMENT_COUNT);
        params.append("url", postUrl);
        params.append("level", "2");
        params.append("commentId", commentId);
    }

    params.append("origin", location.origin);

    return XHRGET(API_COMMENT_LIST, params);
}


async function likePost(postId, vote) {
    if (!userId) throw new Error("no user logged");

    let action;
    switch(vote) {
        case LIKE:
            action = "like";
            break;
        case UNLIKE:
            action = "unlike";
            break;
        case DISLIKE:
            action = "dislike";
            break;
        default:
            throw new Error("Invalid vote: " + vote);
    }

    XHRPOSTJSON("/v1/vote/" + action, {id: postId});

    databaseVotes[postId] = vote;
}

async function likePostComment(commentId, vote) {
    switch(vote) {
        case LIKE:
        case UNLIKE:
        case DISLIKE:
            break;
        default:
            throw new Error("Invalid vote: " + vote);
    }

    var params = new URLSearchParams();
    params.append("appId", appId);
    params.append("auth", auth);
    params.append("commentId", commentId);
    params.append("value", vote);

    XHRPOST(API_COMMENT_ACTIONS + "/v1/like.json", params);

    databaseVotesComments[commentId] = vote;
}


async function followCommentStatus(threadId) {
    let res = databaseFollowing[threadId];
    if (res != null) return { followed: res };

    res = await XHRPOSTJSON("/v1/follow-thread-status", {threadId});

    databaseFollowing[threadId] = res.followed;
    return res;
}

async function followComment(threadId, follow) {
    let res = await XHRPOSTJSON("/v1/follow-thread", {threadId: threadId, follow: follow});
    databaseFollowing[threadId] = follow;

    return res;
}


async function commentSend(postUrl, text, parent, media, replyThreadOnly) {
    let params = new URLSearchParams();
    params.append("appId", appId);
    params.append("auth", auth);
    params.append("url", postUrl);
    params.append("text", text);

    if (parent) params.append("parent", parent);
    if (replyThreadOnly) params.append("replyThreadOnly", "1");

    if (media && media.length > 0) {
        let userMedia = new Array(media.length);
        let hash = new Array(media.length);
        for (let i=0 ; i<media.length ; i++) {
            userMedia[i] = media[i].sourceMeta;
            hash[i] = media[i].hash;
        }

        params.append("userMedia", JSON.stringify(userMedia));
        params.append("hash", hash.length > 1 ? JSON.stringify(hash) : hash[0]);
    }

    return XHRPOST(API_COMMENT_DELETECREATE, params);
}

async function uploadCommentMedia(file, abortSignal) {
    let data = new FormData();
    data.append("auth", auth);
    data.append("appId", appId);
    data.append("blob", file/*, file.name*/);

    return XHRPOST(API_COMMENT_ACTIONS + "/v1/media.json", data, abortSignal);
}

async function deletePostComment(postUrl, commentId_or_replyCommentId) {
    let params = new URLSearchParams();
    params.append("appId", appId);
    params.append("auth", auth);
    params.append("url", postUrl);
    params.append("_method", "DELETE");
    params.append("id", commentId_or_replyCommentId);

    return XHRPOST(API_COMMENT_DELETECREATE, params);
}


async function getPost(id) {
    let params = new URLSearchParams();
    params.append("id", id);

    return XHRGET("/v1/post", params);
}

async function getPosts(antiquity, section, after) {
    switch(antiquity) {
        case HOT:
        case TRENDING:
        case FRESH:
            break;
        default:
            throw new Error("Unexpected antiquity: " + antiquity);
    }

    let hot_home = antiquity == HOT && !section;

    if (section && antiquity == TRENDING)
        throw new Error("trending is available only in the home");
    else if (!section)
        section = "default";// home posts

    let params;
    if (after) {
        if (after.startsWith("after=")) {
            params = after;// absolute params
        } else {
            params = new URLSearchParams();
            params.append("after", after);
            params.append("c", DEFAULT_POSTS_LIST_HOME_COUNT);
        }
    } else {
        params = null;
    }

    let url = `https://9gag.com/v1/group-posts/group/${section}/type/${antiquity}`;
    if (hot_home && apiSettings.sortHotPageByMostRecent) url += "/sort/time";

    return XHRGET(url, params);
}


async function notificationsGet(refKey) {
    let request;
    if (refKey)
        request = {refKey: refKey};
    else
        request = {};

    return XHRPOSTJSON("/v1/notifications", request);
}

async function notificationsCheck() {
    let params = new URLSearchParams(readStateParams);

    return XHRGET("https://notif.9gag.com/v1/read-state.json", params);
    // return XHRPOST("https://notif.9gag.com/v1/read-state.json", params);
}


async function searchSuggestTags(keywords) {
    let params = new URLSearchParams();
    params.append("query", keywords);

    return XHRGET("/v1/tag-suggest", params);
}

async function searchByTag(tag, hot_or_fresh, next) {
    tag = encodeURIComponent(tag);

    return XHRGET("/v1/tag-posts/tag/" + tag + "/type/" + (hot_or_fresh ? HOT : FRESH), next);
}

async function searchByKeywords(keywords, next) {
    let params;
    if (next) {
        params = next;
    } else {
        params = new URLSearchParams();
        params.append("query", keywords);
    }

    return XHRGET("/v1/search-posts", params);
}


async function getFeaturedPosts() {
    return XHRGET("/v1/featured-posts");
}


async function reportPost(postId, reasonId) {
    return XHRPOSTJSON("/report", {entryId: postId, type: reasonId});
}

async function reportComment(commentId_or_replyCommentId, postUrl, reasonId) {
    return XHRPOSTJSON(API_COMMENT_ACTIONS + "/v1/report.json", {
        appId,
        auth,
        url: postUrl,
        commentId: commentId_or_replyCommentId,
        userReportData: JSON.stringify({reportType: reasonId})
    });
}


async function init9GAGComments() {
    if (databaseVotesComments) return;

    let data = new FormData();
    data.append("appId", appId);
    data.append("auth", auth);

    try {
        let res = await XHRPOST(API_COMMENT_ACTIONS + "/v1/user.json", data);
        userCommentQuota = data.count;
        databaseVotesComments = res.likeMapping ? res.likeMapping : new Array();
        userIdComments = res.user ? res.user.userId : null;
    } catch(err) {
        databaseVotesComments = new Array();
        userCommentQuota = 0;
        throw err;
    }
}


async function cacheableUNKNOWNAPI(json) {
    let params = new URLSearchParams();
    params.append("json", json);

    return XHRPOST("/cacheable", json);
}

async function privacyCheck() {
    return XHRGET("/v1/check");// returns: {country: "%contry code%", gdpr: true|false, ccpa: true|false}
}

function getNotificationChannel() {
    if (!notificationChannel || !notificationApiHost) return false;
    let id = encodeURI(notificationChannel);
    let timestamp = Date.now();
    return new WebSocket(`wss://${notificationApiHost}/ws/${id}?_=${timestamp}&tag=&time=&eventid=`);
}


const apiSettings = {
    __apv: undefined,
    __apg: undefined,
    __msc: undefined,
    __hpp: undefined,

    get darkMode() {
        try {
            let obj = localStorage.getItem(API_APP_STATE);

            if (obj) {
                obj = JSON.parse(obj);
            } else {
                obj = {
                    app: {
                        darkMode: false,
                        autoPlay: { video: "always", gif: "always" }
                    }
                };
                localStorage.setItem(API_APP_STATE, JSON.stringify(obj));
            }

            return obj.app.darkMode;
        } catch (err) {
            console.error(err);
            return false;
        }
    },
    set darkMode(state) {
        try {
            let obj = JSON.parse(localStorage.getItem(API_APP_STATE));
            obj.app.darkMode = state;
            localStorage.setItem(API_APP_STATE, JSON.stringify(obj));
        } catch (err) {
            console.error(err);
            return false;
        }
    },
    get autoplayVideo() {
       if (this.__apv !== undefined) return this.__apv;
       try {
            let obj = JSON.parse(localStorage.getItem(API_APP_STATE));
            return this.__apv = obj.app.autoPlay.video != "never";
        } catch (err) {
            console.error(err);
            return false;
        }
    },
    get autoplayGIF() {
       if (this.__apg !== undefined) return this.__apg;
       try {
            let obj = JSON.parse(localStorage.getItem(API_APP_STATE));
            return this.__apg = obj.app.autoPlay.gif != "never";
        } catch (err) {
            console.error(err);
            return false;
        }
    },
    get recentSearchs() {
        try {
            let obj = JSON.parse(localStorage.getItem(API_SEARCH_STATE));
            if (!obj) {
                obj = { search: { history: new Array() } };
                localStorage.setItem(API_SEARCH_STATE, JSON.stringify(obj));
            }
            if (!obj.search || !obj.search.history) return new Array();

            let res = new Array(obj.search.history.length);
            for (let i=0 ; i<obj.search.history.length ; i++) {
                res[i] = {
                    value: obj.search.history[i].value,
                    description: obj.search.history[i].description,
                    isTag: obj.search.history[i].type == "tagHistory",
                };
            }
            return res;
        } catch (err) {
            console.error(err);
            return new Array();
        }
    },
    set recentSearchs(values) {
        try {
            let obj = JSON.parse(localStorage.getItem(API_SEARCH_STATE));
            if (!obj.search) obj.search = { history: new Array() };

            if (values.length > SEARCH_RECENT_MAX_ENTRIES) values.splice(SEARCH_RECENT_MAX_ENTRIES);

            let res = new Array(values.length);
            for (let i=0 ; i<values.length ; i++) {
                res[i] = {
                    value: values[i].value,
                    description: values[i].description,
                    type: values[i].isTag ? "tagHistory" : "searchHistory",
                };
            }

            obj.search.history = res;
            localStorage.setItem(API_SEARCH_STATE, JSON.stringify(obj));
        } catch (err) {
            console.error(err);
        }
    },
    get maskSensitiveContent() {
        if (this.__msc !== undefined) return this.__msc;
        try {
            let obj = JSON.parse(localStorage.getItem(API_USER_STATE));
            if (!obj) {
                obj = { user: { userInfo: { user: { nsfwMode: false, safeMode: false } } } };
                localStorage.setItem(API_USER_STATE_STATE, JSON.stringify(obj));
            }
            if (obj.user) obj = obj.user;
            return this.__msc = obj.userInfo.user.safeMode;
        } catch (err) {
            console.error(err);
            return false;
        }
    },
    get showSensitiveContent() {
        try {
            let obj = JSON.parse(localStorage.getItem(API_USER_STATE));
            if (!obj) {
                obj = { user: { userInfo: { user: { nsfwMode: false, safeMode: false } } } };
                localStorage.setItem(API_USER_STATE, JSON.stringify(obj));
            }
            if (obj.user) obj = obj.user;
            return obj.userInfo.user.nsfwMode;
        } catch (err) {
            console.error(err);
            return false;
        }
    },
    get sortHotPageByMostRecent() {
        if (this.__mrh !== undefined) return this.__mrh;
        try {
            let obj = localStorage.getItem(API_APP_STATE);
            obj = JSON.parse(obj);
            return this.__mrh = obj.app.mostRecentHot;
        } catch (err) {
            console.error(err);
            return false;
        }
    },
    get hidePromotedPosts() {
       if (this.__hpp !== undefined) return this.__hpp;
       try {
            let obj = JSON.parse(localStorage.getItem(API_APP_STATE));
            return this.__hpp = obj.app.proSettings.hidePromotedPosts;
        } catch (err) {
            console.error(err);
            return false;
        }
    },
};

window.addEventListener('storage', function(evt) {
    switch (evt.key) {
        case API_APP_STATE:
        case API_SECTION_STATE:
        case API_SEARCH_STATE:
        case API_USER_STATE:
            break;
        default:
            return;
    }

    apiSettings.__apv = undefined;
    apiSettings.__apg = undefined;
    apiSettings.__msc = undefined;
    apiSettings.__mrh = undefined;
}, false);


function outside_config_parse(raw_config) {
    const START = "JSON.parse(";
    raw_config = raw_config.substring(raw_config.indexOf(START) + START.length, raw_config.lastIndexOf(");"));
    return JSON.parse(JSON.parse(raw_config));
}

function killWebWorkers() {
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for (let registration of registrations) registration.unregister();
    });
}



/*** report reason/issues/kind ***/
/*** not implemeted, requires a new ｕｉｘ component (some kind of dialog or formulary) ***/

const REPORT_REASONS = {
    COPYRIGHT: {
        type: 1,
        title: "Copyright and trademark infringement",
        content: "Report as Copyright and trademark infringement?\n\nWe remove posts that include copyright or trademark infringement. If someone is using your photo without your permission or impersonating you, we may remove the content and disable the account.\n\nTo report a claim of copyright infringement, please tap continue and fill out the form.",
        externalUrl: "https://about.9gag.com/copyright#takedown-notice"
    },
    IMPERSONATION: {
        type: 11,
        title: "Impersonation",
        content: "What can I do if someone is impersonating me on 9GAG?\n\n9GAG takes safety seriously. If someone created posts/comments/accounts pretending to be you, you can tap continue and fill out the form. Make sure to provide all the requested info, including a photo of your government-issued ID.\n\nWe only respond to reports sent to us from the person who's being impersonated or a representative of the person who's being impersonated (ex: a parent). If someone you know is being impersonated, please encourage that person to report it.",
        externalUrl: "https://www.surveymonkey.com/r/GSJ3NTF"
    },
    SPAM: {
        type: 2,
        title: "Spam",
        content: "Report as spam?\n\nWe remove:\n- Clickbait\n- Advertising\n- Scam\n- Script bot",
        externalUrl: null
    },
    COMMENT_SPAM: {
        type: 2,
        title: "Spam",
        content: "Report as spam?\n\nWe remove:\n- Advertising\n- Scam\n- Script bot",
        externalUrl: null
    },
    PORNOGRAPHY: {
        type: 3,
        title: "Pornography",
        content: "Report as pornography?\n\nWe remove:\n- Photos or videos of sexual intercourse\n- Posts showing sexual intercourse, genitals or close-ups of fully-nude buttocks",
        externalUrl: null
    },
    REPOST: {
        type: 4,
        title: "Repost",
        content: "Report as repost?",
        externalUrl: null
    },
    HATRED_BULLYING: {
        type: 5,
        title: "Hatred and bullying",
        content: "Report as hatred and bullying?\n\nWe remove:\n- Comments that contain credible threat\n- Comments that target people to degrade or shame them\n- Personal information shared to blackmail or harass\n- Threats to post nude photo of you",
        externalUrl: null
    },
    SELF_HARM: {
        type: 6,
        title: "Self-harm",
        content: "Report as self-harm?\n\nWe remove comments encouraging or promoting self injury, which includes suicide, cutting and eating disorders. We may also remove posts identifying victims of self injury if the post attacks or makes fun of them.",
        externalUrl: null
    },
    VIOLENCE: {
        type: 7,
        name: "VIOLENCE",
        title: "Violent, gory and harmful content",
        content: "Report as violent, gory and harmful content?\n\nWe remove:\n- Photos or videos of extreme graphic violence\n- Posts that encourage violence or attack anyone based on their religious, ethnic or sexual background\n- Specific threats of physical harm, theft, vandalism or financial harm",
        externalUrl: null
    },
    CHILD_PORN: {
        type: 8,
        title: "Child Porn",
        content: "Report as child porn?\n\nWe remove and may report to legal entity about:\n- Photos or videos of sexual intercourse with children\n- Posts of nude or partially nude children",
        externalUrl: null
    },
    ILLEGAL: {
        type: 9,
        title: "Illegal activities e.g. Drug Uses",
        content: "Report as illegal activities?\n\nWe remove and may report to legal entity about:\n- Posts promoting illegal activities, e.g. the use of hard drugs\n- Posts intended to sell or distribute drugs",
        externalUrl: null
    },
    DECEPTIVE: {
        type: 10,
        title: "Deceptive content",
        content: "Report as deceptive content?\n\nWe remove:\n- Purposefully fake or deceitful news\n- Hoax disproved by a reputable source",
        externalUrl: null
    },
    DISLIKE: {
        type: 12,
        title: "I just don't like it",
        content: "What can I do if I see something I don't like on 9GAG?\n\n- Report it if it doesn't follow 9GAG rules\n- Downvote it to decide which posts/ comments can go viral",
        externalUrl: null
    },
    INAPPROPRIATE_USERNAME_OR_PICTURE: {
        type: 13,
        title: "Inappropriate username/ profile picture",
        content: "Report as inappropriate username or profile picture?\n\nWe remove:\n- Inappropriate and offensive username/ profile picture",
        externalUrl: null
    }
};

const APPLICABLE_REPORT_REASONS = {
    PROFILE: [REPORT_REASONS.INAPPROPRIATE_USERNAME_OR_PICTURE, REPORT_REASONS.SPAM, REPORT_REASONS.PORNOGRAPHY, REPORT_REASONS.HATRED_BULLYING, REPORT_REASONS.SELF_HARM, REPORT_REASONS.VIOLENCE, REPORT_REASONS.CHILD_PORN, REPORT_REASONS.ILLEGAL, REPORT_REASONS.DECEPTIVE, REPORT_REASONS.IMPERSONATION, REPORT_REASONS.COPYRIGHT, REPORT_REASONS.DISLIKE],
    POST: [REPORT_REASONS.SPAM, REPORT_REASONS.REPOST, REPORT_REASONS.PORNOGRAPHY, REPORT_REASONS.HATRED_BULLYING, REPORT_REASONS.SELF_HARM, REPORT_REASONS.VIOLENCE, REPORT_REASONS.CHILD_PORN, REPORT_REASONS.ILLEGAL, REPORT_REASONS.DECEPTIVE, REPORT_REASONS.COPYRIGHT, REPORT_REASONS.DISLIKE],
    COMMENT: [REPORT_REASONS.COMMENT_SPAM, REPORT_REASONS.HATRED_BULLYING, REPORT_REASONS.SELF_HARM, REPORT_REASONS.ILLEGAL, REPORT_REASONS.IMPERSONATION]
};

