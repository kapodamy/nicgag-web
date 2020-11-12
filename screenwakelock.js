"use strict";
const DISABLE_WAKELOCK_API = false;// used in debugging only

var wakelock_queries = 0;
var wakelock_instance = null;


function wakeLock_adquire() {
    wakelock_queries++;
    if (wakelock_instance) return;

    wakeLock_request();
}

function wakeLock_release() {
    wakelock_queries--;
    if (wakelock_queries > 0 || !wakelock_instance) return;

    wakeLock_dispose();
}


function wakeLock_request() {
    if (document.visibilityState !== 'visible') return;// request later on visibilitychange event

    if (DISABLE_WAKELOCK_API) {
        wakelock_instance = true;
    } else if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen')
        .then(function(instance) {
            wakelock_instance = instance;
        })
        .catch(function(err) {
            console.warn("wakeLock request failed", err);
        });
    } else {
        // Screen Wake Lock API not available
        wakelock_instance = true;
    }
}

function wakeLock_dispose() {
    if (wakelock_instance !== true) {
        wakelock_instance.release();//.then(function() { wakelock_instance = null; });
    }

    wakelock_instance = null;
}


document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        if (wakelock_instance == null && wakelock_queries > 0) wakeLock_request();
    } else {
        if (wakelock_instance != null) wakeLock_dispose();
    }
});

