"use strict";
window.addEventListener("message", function(evt) {
    if (evt.source !== window || !evt.data) return;   
    if (evt.data.action != "download") return;
    
    chrome.runtime.sendMessage(evt.data.url);
});

