"use strict";

var fullPreviewMedia = null;
var fullPreviewInfo = null;
var fullPreviewEngine = null;
var fullPreviewFromHome = false;

{
    let header = NODEID("header-preview");
    header.querySelector(".header-button").addEventListener("click", e => history.back(), false);
    header.querySelector(".icon-download").addEventListener("click", fullpreview_btn_download, false);
    header.querySelector(".icon-playback").addEventListener("click", fullpreview_btn_controls, false);
    header.querySelector(".icon-share").addEventListener("click", fullpreview_btn_share, false);
    NODEID("page-preview").addEventListener("click", fullpreview_img_click, false);
}

function fullpreview_init(info, originUrl, mediaUrl, isPost, videoUrl, from_history) {
    if (fullPreviewMedia) fullPreviewMedia.remove();

    fullPreviewMedia = document.createElement(videoUrl ? "video" : "img");
    NODEID("page-preview").appendChild(fullPreviewMedia);

    if (videoUrl) {
        fullPreviewMedia.muted = true;
        fullPreviewMedia.controls = true;
        fullPreviewMedia.loop = true;
        fullPreviewMedia.autoplay = true;
    }

    fullPreviewFromHome = history.state && history.state.page == HOME;
    page_switch(FULLPREVIEW);

    if (fullPreviewFromHome) homeTabsScrollCheckSuspend(true);

    if (from_history) {
        fullPreviewInfo = info;
    } else {
        fullPreviewInfo = {
            title: isPost ? info.title : info.content.textContent,
            url: originUrl,
            media: mediaUrl,
            type: videoUrl ? "animated" : "image"
        };

        // suspend any previous page
        history_suspend();

        history_push(FULLPREVIEW, [
            fullPreviewInfo,
            null,
            null,
            null,
            null
        ], null, location.pathname + "#" + FULLPREVIEW);
    }

    fullPreviewMedia.src = videoUrl ? videoUrl : fullPreviewInfo.media;
    fullPreviewMedia.onerror = function() {
        let src = this.src;
        let chr = src.indexOf('?') < 0 ? '?' : '&';
        this.src = src + chr + Date.now().toString();
        this.onerror = null;
    }

    NODECLASSSWITCH(NODEQUERY("#header-preview .icon-playback"), HIDDEN, !videoUrl);

    requestAnimationFrame(function() {
        fullPreviewEngine = panzoom(fullPreviewMedia);
    });
}

function fullpreview_exit(force) {
    if (fullPreviewFromHome) homeTabsScrollCheckSuspend(false);

    fullPreviewInfo = null;
    if (fullPreviewEngine) {
        fullPreviewEngine.dispose();
        fullPreviewEngine = null;
    }
    fullPreviewMedia.remove();
    fullPreviewMedia = null;

    NODEID("page-preview").removeAttribute("tabindex");
}


function fullpreview_img_click(evt) {
   let header = NODEID("header-preview");
   if (evt.target == header || header.contains(evt.target)) return;
   
   let show = !!header.style.visibility;

   header.style.visibility = null;

   header.animate([
        {transform: "translate(0, -100%)"},
        {transform: "translate(0)"}
    ], {
        duration: 250,
        easing: "ease-in-out",
        direction: show ? "normal" : "reverse"
    })
    .onfinish = function() {
        if (!show) header.style.visibility = HIDDEN;
    };
}

function fullpreview_btn_download() {
    // call WebExtension downloads API
    window.postMessage({action: "download", url: fullPreviewInfo.media}, "*");
}

function fullpreview_btn_share(evt) {
    evt.stopImmediatePropagation();// obligatory
    home_menu_share_show(fullPreviewInfo.title, fullPreviewInfo.url, null, fullPreviewInfo.media, fullPreviewInfo.type);
}

function fullpreview_btn_controls() {
    let controls = fullPreviewMedia.controls;
    if (controls) 
        main_show_snackbar(LANG.playback_controls_disabled, false, Snackbar.LONG_DELAY);
    else
        main_show_snackbar(LANG.playback_controls_enabled, false);

    fullPreviewMedia.controls = !controls;
}

