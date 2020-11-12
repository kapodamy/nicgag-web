"use strict";

const AUTOPLAY_RATIO = 0.25;// 25% of the viewport

var autoplayObserver = new IntersectionObserver(autoplay_handler, { threshold:[0.25, 0.5, 0.75, 1] });

function autoplay_handler(medias) {
    let autoplayMinHeight = mediaWrapWindow.height * AUTOPLAY_RATIO;
    let already_playing = false;

    for (let media of medias) {
        if (media.error) continue;
        
        /*
        if (media.target instanceof HTMLImageElement && media.target.naturalHeight < 1) {
            // broken image, attempt reload
            media.target.src = media.target.src;
            continue;
        }
        */

        let play;
        if (!media.isIntersecting)
            play = false;
        else if (media.boundingClientRect.height < autoplayMinHeight)
            play = media.intersectionRatio >= 0.65;
        else
            play = media.intersectionRatio >= 0.45;//true

        let paused = media.target.paused;
        let is_frame = media.target instanceof HTMLIFrameElement;
        let is_gif = is_frame ? false : media.target.defaultMuted;

        if (play) {
            if (!paused) continue;
            if (media.target.dataset.played == "1") continue;
            if (is_gif ? !apiSettings.autoplayGIF : !apiSettings.autoplayVideo) continue;

            if (already_playing) continue;// allow only ONE video/gif playing

            media.target.dataset.played = "1";
            already_playing = true;

            if (is_frame)
                youtube_playback_control(media.target, "playVideo");
            else
                media.target.play();
        } else {
            // show meta controls in videos only (no gifs)
            let parent = media.target.parentNode;
            if (parent && !is_gif && !is_frame) {
                parent.querySelector(".post-indicator").classList.remove(HIDDEN);
                parent.querySelector(".sound-toggle").classList.remove(HIDDEN);
                parent.querySelector(".post-label").classList.remove(HIDDEN);
            }

            if (!is_frame) media.target.controls = false;

            if (!paused) {
                if (is_frame)
                    youtube_playback_control(media.target, "pauseVideo");
                else
                    media.target.pause();
            }
        }
    }
}

function autoplay_observe(media) {
    media.dataset.played = "0";
    autoplayObserver.observe(media);
}

function autoplay_unobserve(media) {
    media.removeAttribute("data-played");
    autoplayObserver.unobserve(media);
}

