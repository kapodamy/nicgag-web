"use strict";

const OLD_FIREFOX = isOldFirefox();

function isOldFirefox() {
    let i = navigator.userAgent.indexOf("Firefox/");
    if (i < 0) return false;

    let version = navigator.userAgent.substring(i).split(" ")[0];
    version = version.substring(version.indexOf("/") + 1);

    let version_number = parseFloat(version);

    if (!Number.isFinite(version_number) || Number.isNaN(version_number)) {
        return false;
    }

    return version_number < 76;
}


function listener(details) {
    if (details.tabId < 0 || checkURL(details.url)) return;// undesired page

    let filter = browser.webRequest.filterResponseData(details.requestId);
    let decoder = new TextDecoder("utf-8");

    let i = -1;
    let buffer = "";
    let error = false;
    
    filter.onstart = function(evt) {};

    filter.ondata = function(evt) {
        buffer += decoder.decode(evt.data, {stream: true});
    }

    filter.onerror = function(err) {
        console.error(err);
        error = true;
    }

    filter.onstop = async function() {
        let tmp;
        let encoder = new TextEncoder();

        if (error) {
            filter.write(encoder.encode(buffer));
            filter.close();
            return;
        }

        let bodyContent = await init_html(buffer);// function located in nicgag_loader.js

        filter.write(encoder.encode(bodyContent));
        filter.close();
  };
}

function processor_old(details) {
    if (checkURL(details.url) || details.tabId < 0) return;// undesired page

    details.responseHeaders.push({
        name: 'content-security-policy',
        value: "script-src 'moz-extension:'; style-src 'moz-extension:' 'unsafe-inline'"
    });
    /*details.responseHeaders.push({
        name: 'cache-control',
        value: "no-cache"
    });*/

    return {responseHeaders: details.responseHeaders};
}


if (OLD_FIREFOX) {
    //
    // browser.webRequest.filterResponseData is bugged and does not work
    //
    browser.webRequest.onHeadersReceived.addListener(
        processor_old,
        { urls: ["*://9gag.com/*"], types: ["main_frame"] },
        ["responseHeaders", "blocking"]
    );
    browser.contentScripts.register({
        js: [{ file: "/nicgag_loader.js" }, { file: "/i18n/selector.js" }],
        runAt: "document_end",
        matches: ["*://9gag.com/*"]
    });
} else {
    browser.webRequest.onBeforeRequest.addListener(
        listener,
        { urls: ["*://9gag.com/*"], types: ["main_frame"] },
        ["blocking"]
    );
}

browser.webRequest.onHeadersReceived.addListener(
    function(details) {
        return {cancel: true};
    },
    { urls: ["*://9gag.com/sw.js"], types: ["script"] },
    ["blocking"]
);


browser.runtime.onMessage.addListener(function(download_url) {
    browser.downloads.download({url: download_url});
});

