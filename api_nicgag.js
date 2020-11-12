"use strict";

const TRUE = (true).toString();
const NICGAG_POST_CACHE = "+/nicgag_postscache";
const NICGAG_POST_CACHE_ENABLED = "+/nicgag_postscache_enabled";
const NICGAG_LAST_SECTION = "+/nicgag_lastsection";
const NICGAG_LAST_SECTION_ENABLED = "+/nicgag_lastsection_enabled";
const NICGAG_FOLLOW_REPLY_THREADS = "+/nicgag_followreplythread";
const NICGAG_VIDEO_DEFAULT_VOLUME = "+/nicgag_videodefaultvolume";
const NICGAG_VIDEO_DEFAULT_MUTE = "+/nicgag_videodefaultmute";
const NICGAG_HEADER_EXTRA_PADDING = "+/nicgag_headerextrapadding";
const NICGAG_USE_GIF_IN_COMMENTS = "+/nicgag_usegifincomments";

function nicgagPostsSave(section, after, viewState, antiquity, tags) {
    if (!section) section = "default";
    let obj = JSON.stringify({after, viewState, tags});
    localStorage.setItem(NICGAG_POST_CACHE + "/" + section + "/" + antiquity, obj);
}

function nicgagPostsLoad(section, antiquity) {
    if (!section) section = "default";
    let key = NICGAG_POST_CACHE + "/" + section + "/" + antiquity;
    let obj = localStorage.getItem(key);

    if (obj) {
        try {
            return JSON.parse(obj);
        } catch(err) {
            console.warn("Cannot read " + key, err);
        }
    }

    return null;
}

function nicgagPostsClear(section) {
    for (let antiquity of [HOT, TRENDING, FRESH])
        localStorage.removeItem(NICGAG_POST_CACHE + "/" + section + "/" + antiquity);
}


function nicgagSerializeInfo(info) {
    info = clone_object(info);
    if (!info) return info;

    for (let prop in info) {
        if (info[prop] instanceof Node) {
            info["$" + prop] = info[prop].outerHTML;
            delete info[prop];
        }
    }

    return info;
}

function nicgagDeserializeInfo(data) {
    // data = clone_object(data);// ¿optional?
    if (!data) return data;

    for (let prop in data) {
        if (prop.charAt(0) == "$") {
            data[prop.substr(1)] = parseHTML(data[prop]);
            delete data[prop];
        }
    }

    return data;
}

function nicgagSerializePostList(data, deserialize) {
    let fn = deserialize ? nicgagDeserializeInfo : nicgagSerializeInfo

    for (let i=0 ; i<data.length ; i++) data[i] = fn(data[i]);
}


const nicgagSettings = {
    __rmbroldpsts: undefined,
    __frt: undefined,
    __vv: undefined,
    __vm: undefined,
    __hp: undefined,
    __gc: undefined,

    get rememberOldPosts() {
        if (this.__rmbroldpsts !== undefined) return this.__rmbroldpsts;

        this.__rmbroldpsts = localStorage.getItem(NICGAG_POST_CACHE_ENABLED) === TRUE;
        return this.__rmbroldpsts;
    },
    set rememberOldPosts(value) {
        this.__rmbroldpsts = value;
        localStorage.setItem(NICGAG_POST_CACHE_ENABLED, value.toString());
    },

    get lastSection() {
        let value = localStorage.getItem(NICGAG_LAST_SECTION);
        return value ? value : null;
    },
    set lastSection(value) {
        localStorage.setItem(NICGAG_LAST_SECTION, value ? value : "");
    },

    get lastSectionEnabled() {
        return localStorage.getItem(NICGAG_LAST_SECTION_ENABLED) == TRUE;
    },
    set lastSectionEnabled(value) {
        localStorage.setItem(NICGAG_LAST_SECTION_ENABLED, value.toString());
    },

    get followReplyThreads() {
        if (this.__frt !== undefined) return this.__frt;

        this.__frt = localStorage.getItem(NICGAG_FOLLOW_REPLY_THREADS) === TRUE;
        return this.__frt;
    },
    set followReplyThreads(value) {
        this.__frt = value;
        localStorage.setItem(NICGAG_FOLLOW_REPLY_THREADS, value.toString());
    },

    get videoDeafultVolume() {
        if (this.__vv !== undefined) return this.__vv;
        this.__vv = localStorage.getItem(NICGAG_VIDEO_DEFAULT_VOLUME);
        if (this.__vv)
            this.__vv = parseFloat(this.__vv);
        else
            this.__vv = 1.0;// default

        return this.__vv;
    },
    set videoDeafultVolume(value) {
        this.__vv = value;
        localStorage.setItem(NICGAG_VIDEO_DEFAULT_VOLUME, value.toString());
    },

    get videoDeafultMuted() {
        if (this.__vm !== undefined) return this.__vm;
        this.__vm = localStorage.getItem(NICGAG_VIDEO_DEFAULT_MUTE) == TRUE;
        return this.__vm;
    },
    set videoDeafultMuted(value) {
        if (this.__vm === value) return;
        this.__vm = value;
        localStorage.setItem(NICGAG_VIDEO_DEFAULT_MUTE, value.toString());
    },

    get headerExtraPadding() {
        if (this.__hp !== undefined) return this.__hp;

        this.__hp = localStorage.getItem(NICGAG_HEADER_EXTRA_PADDING) === TRUE;
        return this.__hp;
    },
    set headerExtraPadding(value) {
        this.__hp = value;
        localStorage.setItem(NICGAG_HEADER_EXTRA_PADDING, value.toString());
    },

    get useGIFinComments() {
        if (this.__gc !== undefined) return this.__gc;
        this.__gc = localStorage.getItem(NICGAG_USE_GIF_IN_COMMENTS) == TRUE;
        return this.__gc;
    },
    set useGIFinComments(value) {
        if (this.__gc === value) return;
        this.__gc = value;
        localStorage.setItem(NICGAG_USE_GIF_IN_COMMENTS, value.toString());
    },

    get forceEnglish() {
        let value = localStorage.getItem(NICGAG_FORCE_ENGLISH);
        return value === TRUE || value == null;
    },
    set forceEnglish(value) {
        localStorage.setItem(NICGAG_FORCE_ENGLISH, value.toString());
    },
};

