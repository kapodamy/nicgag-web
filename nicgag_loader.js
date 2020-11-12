"use strict";

const CONFIG_START = '<script type="text/javascript">window._config =';
const CONFIG_START_SUB = 7;
const CONFIG_END = '</script>';

const ERROR_GENERIC = "<h2>Error while loading the page</h2><br>";
const ERROR_MOBILE = "<h4>Maybe you can find what you need from our homepage or apps.</h4>";
const ERROR_DESKTOP = "<h3>Find what you're looking for with our app.</h3>";


function checkURL(url) {
    try {
        // METHOD 1 ¿slow?
        url = new URL(url);
    } catch(err) {
        console.warn("unknown url:" + url, err);
        return true;// invalid
    }

    /*
    // METHOD 2 ¿fast?
    url = url.substring(url.indexOf("/",  url.indexOf("://") + 3));
    let query = url.indexOf("?");
    let hash = url.indexOf("#");

    if (query > 0 || hash > 0) {
        if (query < 0) query = 0;
        if (hash < 0) hash = 0;
        url = url.substring(0, Math.min(query, hash));
    }
    */

    url = url.pathname.substr(1).split("/");

    switch (url[0]) {
        //
        //   exclude, should be not hooked
        //
        case "pro":
        case "settings":
        case "notifications":
        case "apps":
        case "advertise":
        case "rules":
        case "tips":
        case "faq":
        case "tos":
        case "privacy":
        case "report-bad-ads":
        case "feedback":
        case "contact":
        case "jobs":
        case "copyright":
        case "sw.js":// service worker script
            return true;

        //
        //   not implemented, should be not hooked
        //
        case "uid":// (user)
        case "u":// (user)
        case "submit":// (new post)
        case "login":
        case "customize":
            return true;
        case "":
        case "hot":
        case "trending":
        case "fresh":
        case "gag":
        case "search":
        case "tag":
        default:
            return false;
    }
}


function extractor(str, start, end) {
    let i = str.indexOf(start);
    if (i < 0) return null;

    let j = str.indexOf(end, i + start.length);
    if (j < 0) return null;

    return str.substring(i, j + end.length);
}

function extractConfig(str, old) {
    let config = extractor(str, '<script type="text/javascript">window._config =', '</script>');
    if (config) {
        if (old) {
            let meta = document.createElement("meta");
            meta.name = "9gag-config";
            meta.content = config;
            return meta.outerHTML;
        } else {
            return config.replace("<script ", '<script id="9gag-config" ');
        }
    } else {
        return config;
    }
}

function extractError(str) {
    let error;
    if (str.indexOf(ERROR_MOBILE) >= 0) {
        error = extractor(str, '<div class="content">', '</div>');
        if (error)
            error += "</div>";
        else
            error = ERROR_GENERIC + ERROR_MOBILE;
    } else if (str.indexOf(ERROR_DESKTOP) >= 0) {
        error = extractor(str, '<div class="message">', '</div>');
        if (!error) error = ERROR_GENERIC + ERROR_DESKTOP;
    } else {
        return false;
    }

    if (!error) return false;

    let bg = browser.runtime.getURL("templates/error_background.webm");

    return `<div id="fatal-error">${error}</div>`;
}


async function body() {
    let res = await fetch(browser.runtime.getURL("index.html"));
    res = await res.text();
    res = res.replace(/@@@/g, browser.runtime.getURL(""));

    return res;
}

async function init_html(buffer, old) {
    let tmp;
    let bodyContent = await body();

    tmp = extractConfig(buffer, old);
    if (tmp) bodyContent = bodyContent.replace("<!-- 9GAGCONFIG -->", tmp);

    tmp = extractError(buffer);
    if (tmp) bodyContent = bodyContent.replace("<!-- 9GAGERROR -->", tmp);

    return bodyContent;
}


async function init_nicgag() {
    try {
        let bodyContent = await init_html(document.documentElement.innerHTML, true);
        
        bodyContent = bodyContent.replace('nicgag-i18n', 'nicgag-i18n-loaded');
        
        let selector_present = typeof(i18n_selector) == "function";// script not loaded in time
        
        let lang;
        if (!selector_present || localStorage.getItem("+/nicgag_forceenglish") === (true).toString())
            lang = "en";
        else
            lang = i18n_selector();
        
        bodyContent = bodyContent.replace('i18n/selector.js', 'i18n/' + lang + '.js');

        bodyContent = new DOMParser().parseFromString(bodyContent, "text/html");
        document.documentElement.textContent = "";

        document.documentElement.appendChild(document.importNode(bodyContent.head, true));
        document.documentElement.appendChild(document.importNode(bodyContent.body, true));

        let scripts = document.getElementsByTagName("script");
        for (let orig of scripts) {
            if (!orig.src) continue;
            let js = document.createElement("script");
                js.src = orig.src;
                js.type = orig.type;
                js.id = orig.id;
                js.async = false;  
            orig.parentNode.replaceChild(js, orig);
        }
    } finally {
        document.documentElement.style.opacity = null;
    }
}

if ((location.protocol == "http:" || location.protocol == "https:") && !checkURL(location.href)) {
    document.documentElement.style.opacity = "0";
    // document.addEventListener("DOMContentLoaded",
        console.log("initialize nicGAG in a old Firefox version");
        init_nicgag();
  // });
}

