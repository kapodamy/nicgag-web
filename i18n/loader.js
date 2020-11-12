const NICGAG_FORCE_ENGLISH = "+/nicgag_forceenglish";

function i18n_load() {
    let path = document.head.querySelector("meta[name=nicgag-i18n]");
    if (!path) return;// already loaded (older versions of firefox)

    // nicgagSettings object is not available in early page load
    const force_english = localStorage.getItem(NICGAG_FORCE_ENGLISH) === (true).toString();

    let lang;
    if (force_english)
        lang = "en";
    else
        lang = i18n_selector();

    let lang_loader = document.createElement("script");
        lang_loader.src = path.content + "/" + lang + ".js";
        lang_loader.type = "text/javascript";
    document.head.appendChild(lang_loader);
}

function i18n_html() {
    if (!LANG_IN_HTML) return;// nothing to do
    let tabs = document.getElementById("home-tabs").children;
    let search = document.querySelector("#page-home-search .search-list header").childNodes;
    let settings = document.querySelectorAll("li.settings item");
    let nicgag = document.querySelectorAll("#snackbar-nicgag-settings item");
    let report = document.querySelector(".report-actions").children;
    let hide = document.querySelector("#snackbar-post-more .icon-forbidden").parentNode.nextElementSibling.childNodes;
    let hide_str = LANG_IN_HTML.hide_section.split('@');
    let antiquity = (window.gagCommentsHeader ? window.gagCommentsHeader : document).querySelector(".comment-antiquity span").childNodes[1];
    let featured = window.gagFeaturedPosts ? window.gagFeaturedPosts : document.querySelector("templates .featured-list-container");

    document.querySelector(".search-bar input").placeholder = LANG_IN_HTML.search_keywords;
    document.querySelector("#header-preview h4").textContent = LANG_IN_HTML.full_preview;
    document.getElementById("comment-btn").textContent = LANG_IN_HTML.reply_post_button;
    tabs[0].textContent = LANG.hot;
    tabs[1].textContent = LANG.trending;
    tabs[2].textContent = LANG.fresh;
    document.querySelector("#comment-editor textarea").placeholder = LANG_IN_HTML.reply_placeholder;
    document.querySelector("#attached-media .file-picker").title = LANG_IN_HTML.file_attach_hint;
    document.querySelector("#page-home-search .search-for span").childNodes[0].textContent = LANG_IN_HTML.search_for + '"';
    search[0].textContent = LANG_IN_HTML.recents;
    search[1].textContent = LANG_IN_HTML.clear;
    document.querySelector("#page-home-search .tags-list header").textContent = LANG_IN_HTML.tags;
    document.querySelector("#snackbar-user .login a").textContent = LANG_IN_HTML.login_9gag;
    document.getElementById("logout").textContent = LANG_IN_HTML.logout_9gag;
    document.querySelector(".icon-fullscreen").parentNode.nextElementSibling.textContent = LANG_IN_HTML.toggle_fullscreen;
    document.getElementById("darkmode-switch").parentNode.parentNode.querySelector("item").textContent = LANG_IN_HTML.dark_mode;
    settings[0].firstElementChild.textContent = LANG_IN_HTML.settings_9gag;
    settings[1].textContent = LANG_IN_HTML.settings_nicgag;
    document.querySelector("#snackbar-post-more .icon-link").parentNode.nextElementSibling.textContent = LANG_IN_HTML.copy_link;
    document.querySelector("#snackbar-post-more .icon-break").parentNode.nextElementSibling.textContent = LANG_IN_HTML.report_dont_like;
    hide[0].textContent = hide_str[0];
    hide[2].textContent = hide_str[1];
    document.querySelector("#snackbar-post-more .icon-hide").parentNode.nextElementSibling.textContent = LANG_IN_HTML.report_respost;
    document.querySelector("#snackbar-post-more .icon-report").parentNode.nextElementSibling.textContent = LANG_IN_HTML.report_post;
    document.querySelector("#snackbar-post-share .icon-download").parentNode.nextElementSibling.firstElementChild.textContent = LANG_IN_HTML.download_media;
    document.querySelector("#snackbar-post-share .icon-phone").parentNode.nextElementSibling.firstElementChild.textContent = LANG_IN_HTML.share_native;
    document.querySelector("#snackbar-comment-menu .icon-copy").parentNode.nextElementSibling.textContent = LANG_IN_HTML.copy_comment;
    document.querySelector("#snackbar-comment-menu .icon-trash").parentNode.nextElementSibling.textContent = LANG_IN_HTML.delete_comment;
    document.querySelector("#snackbar-comment-menu .icon-report").parentNode.nextElementSibling.textContent = LANG_IN_HTML.report_comment;
    nicgag[1].textContent = LANG_IN_HTML.restore_posts_startup;
    nicgag[2].textContent = LANG_IN_HTML.show_section_startup;
    nicgag[3].textContent = LANG_IN_HTML.auto_follow_threads;
    nicgag[4].textContent = LANG_IN_HTML.video_volume;
    nicgag[5].textContent = LANG_IN_HTML.header_padding;
    nicgag[6].textContent = LANG_IN_HTML.comments_gif_format;
    document.querySelector(".go-home").childNodes[2].textContent = LANG_IN_HTML.home_title;
    document.querySelector(".customize").title = LANG_IN_HTML.customize_home_hint;
    document.querySelector(".new-post b").textContent = LANG_IN_HTML.submit_post;
    document.querySelector(".report-modal h1").textContent = LANG_IN_HTML.report_title;
    document.querySelector(".report-modal p").textContent = LANG_IN_HTML.report_hint;
    document.querySelector(".report-modal option[hidden]").textContent = LANG_IN_HTML.report_reason_choose;
    report[0].textContent = LANG_IN_HTML.report_back;
    report[1].textContent = LANG_IN_HTML.resport_report;
    document.getElementById("template-post-loading").content.querySelector("button").textContent = LANG_IN_HTML.status_retry;
    antiquity.textContent = " " + LANG_IN_HTML.comments;
    document.getElementById("template-post_mobile").content.querySelector(".nsfw-mask h4").textContent = LANG_IN_HTML.sensitive_content;
    document.getElementById("template-post_mobile").content.querySelector(".nsfw-mask div").textContent = LANG_IN_HTML.sensitive_content_view;
    document.getElementById("template-post_mobile").content.querySelector(".btn.icon-share").textContent = LANG_IN_HTML.share_button;
    document.getElementById("template-comment_mobile").content.querySelector(".action div").textContent = LANG_IN_HTML.reply_button;
    featured.querySelector("span").textContent = LANG_IN_HTML.featured_posts;
    featured.querySelector(".featured-posts-toggle div").textContent = LANG.show;

    document.getElementById("template-post_mobile_embed").content.querySelector("h2").textContent = LANG_IN_HTML.post_iframe_error;
    document.getElementById("template-post_mobile_embed").content.querySelector("a").textContent = LANG_IN_HTML.post_iframe_error_hint;

    document.querySelector("#snackbar-comment-antiquity .icon-hot").parentNode.nextElementSibling.textContent = LANG.hot;
    document.querySelector("#snackbar-comment-antiquity .icon-recent").parentNode.nextElementSibling.textContent = LANG.recent;
    document.querySelector("#snackbar-comment-menu .icon-noti-active").parentNode.nextElementSibling.textContent = LANG.unfollow_comment;
    document.querySelector("#snackbar-comment-menu .icon-break").parentNode.nextElementSibling.textContent = LANG_IN_HTML.report_dont_like;
}

function i18n_process() {
    if (nicgagSettings.forceEnglish || !window.LANG_IN_HTML) return;// nothing to do

    try {
        i18n_html();
    } catch(err) {
        console.error("i18n failed, the current language is corrupted", err);
    } finally {
        delete window.LANG_IN_HTML;
    }
}


i18n_load();

