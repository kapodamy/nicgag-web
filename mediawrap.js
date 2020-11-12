"use strict";

var mediaWrapMap = new Map();
var mediaWrapWindow = { width: 0, height: 0 };


function mediawrap_observe(media, width, height) {
    mediaWrapMap.set(media, {width, height});
    mediawrap_compute(media, width, height);
}

function mediawrap_unobserve(media) {
    media.style.height = null;
    mediaWrapMap.delete(media);
}

function mediawrap_compute(media, width, height, only_visible) {
    let wrap_width = media.parentNode ? media.parentNode.offsetWidth : 0;
    if (wrap_width < 1) {
        if (only_visible) return;
        wrap_width = mediaWrapWindow.width;
    }

    let wrap_height = (wrap_width * height) / width;

    if (wrap_height > mediaWrapWindow.height)
        media.style.height = mediaWrapWindow.height + "px";
    else
        media.style.height = wrap_height + "px";
}

function mediawrap_init() {
    mediaWrapWindow.width = window.innerWidth;
    mediaWrapWindow.height = window.innerHeight;

    let header_height = NODEQUERY("body>header:not(.hidden)");
    if (header_height) header_height = header_height.offsetHeight;
    if (header_height < 1) header_height = 96;// default

    header_height += 40;// add some margin

    mediaWrapWindow.width -= mediaWrapWindow.width < 480 ? 8 : 24;// borders
    mediaWrapWindow.height -= header_height;

    mediaWrapWindow.width = parseInt(mediaWrapWindow.width);
    mediaWrapWindow.height = parseInt(mediaWrapWindow.height);
}

function mediawrap_update(only_visible) {
    mediawrap_init();
    for (let [media, dimensions] of mediaWrapMap)
        mediawrap_compute(media, dimensions.width, dimensions.height, only_visible === true);
}

window.addEventListener("resize", mediawrap_update, false);

/*document.addEventListener('fullscreenchange', function() {
    if (!document.fullscreenElement || document.fullscreenElement == document.documentElement) mediawrap_update();
}, false);*/

mediawrap_init();


