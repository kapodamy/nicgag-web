"use strict";

const HOME_SEARCH_MIN_TAG_SIZE = 3;

var homeSearch = NODEID("page-home-search");
var homeSearchFor = homeSearch.querySelector(".search-for");
var homeSearchListRecents = homeSearch.querySelector(".search-list");
var homeSearchListTags = homeSearch.querySelector(".tags-list")
var homeSearchInput = NODEQUERY("#header-search .search-container input");

homeSearchInput.addEventListener("input", homesearch_search_input, false);
homeSearchListRecents.querySelector("span").addEventListener("click", homesearch_clear_recent_list, false);

NODEQUERY("#header-search .icon-cross-search").addEventListener("click", function() {
    homeSearchInput.value = "";
    homesearch_search_input();
});
NODEQUERY("#header-search .icon-search").addEventListener("click", homesearch_submit, false);
NODEQUERY("#header-search .icon-dismiss").addEventListener("click", homesearch_return, false);
homeSearchFor.children[1].addEventListener("click", homesearch_submit, false);

var homeSearchTransaction = 0;
var homeSearchTransactionSearch = 0;
var homeSearchTransactionTags = false;


function homesearch_init(from_history) {
    page_switch(HOMESEARCH);
    if (!from_history) history_push(HOMESEARCH, [], null, "/search");

    let recent = apiSettings.recentSearchs;
    if (recent.length > 0) {
        let list = homeSearchListRecents.querySelector("div");
        for (let item of recent) {
            list.appendChild(homesearch_item_create(item.value, item.description, item.isTag));
        }
    }

    // NODECLASSSWITCH(homeSearchListRecents, HIDDEN, recent.length < 1);
    homeSearchListRecents.classList.remove(HIDDEN);
}

function homesearch_exit(force) {
    homeSearchFor.classList.add(HIDDEN);
    homeSearchListTags.classList.add(HIDDEN);
    // homeSearchListRecents.classList.add(HIDDEN);

    homeSearchInput.value = "";

    NODEREMOVEALLCHILDRENS(homeSearchListRecents.querySelector("div"));
    NODEREMOVEALLCHILDRENS(homeSearchListTags.querySelector("div"));
}

function homesearch_return() {
    if (history_current > 0) return history.back();

    // the search was loaded with an absolute url, init home
    homesearch_exit(true);
    home_init(null, HOT, null, false, true);
}

function homesearch_submit(evt) {
    if (evt.shiftKey || evt.ctrlKey || evt.altKey || evt.metaKey) return;
    evt.preventDefault();

    let value = homeSearchInput.value;
    if (value.length < HOME_SEARCH_MIN_TAG_SIZE) {
        alert(LANG.search_error.replace('@', HOME_SEARCH_MIN_TAG_SIZE));
        return false;
    }

    homesearch_save_recents(value, "", false);
    homesearch_do_search(value, false);
    return true;
}


function homesearch_clear_recent_list() {
    NODEREMOVEALLCHILDRENS(homeSearchListRecents.querySelector("div"));
    homeSearchListRecents.classList.add(HIDDEN);
    apiSettings.recentSearchs = new Array();
    homesearch_search_input();
}

function homesearch_search_input() {
    homeSearchFor.classList.remove(HIDDEN);

    NODECLASSSWITCH(homeSearchListRecents, HIDDEN, homeSearchInput.value.length > HOME_SEARCH_MIN_TAG_SIZE);

    let flag = homeSearchInput.value.length < HOME_SEARCH_MIN_TAG_SIZE;
    NODECLASSSWITCH(homeSearchListTags, HIDDEN, flag);
    NODECLASSSWITCH(homeSearchFor, HIDDEN, flag);

    if (!flag) {
        homesearch_suggests_tags(homeSearchInput.value);
        homeSearchFor.querySelector("span span").textContent = homeSearchInput.value;
    }
}

async function homesearch_suggests_tags(keywords) {
    if (homeSearchTransactionTags) return;
    let list = homeSearchListTags.querySelector("div");
    homeSearchTransactionTags = true;

    try {
        let res = await searchSuggestTags(keywords);
        if (!res.tags || res.tags.length < 1) return;

        NODEREMOVEALLCHILDRENS(list);

        for (let tag of res.tags) {
            list.appendChild(homesearch_item_create(tag.highlighted, tag.count, true));
        }
    } catch(err) {
        console.error(err);
    } finally {
        homeSearchTransactionTags = false;
    }
}

function homesearch_item_create(text, count_or_description, is_tag) {
    let node = importTemplate("item-search");
    node.children[0].className = is_tag ? "icon-tag" : "icon-search";

    let spans = node.querySelectorAll("a span");

    if (typeof(count_or_description) == "number")
        spans[1].textContent = PostMobile.stringifyAmounts(count_or_description) + " posts";
    else
        spans[1].textContent = count_or_description ? count_or_description : "";

    if (text.includes("<")) {
        let parser = new DOMParser();
        parser = parser.parseFromString(text, "text/html");// parse something like "'<strong>foo</strong>bar<strong>123</strong>';

        for (let child of parser.body.childNodes) {
            if (child.nodeType == 3) {
                spans[0].appendChild(document.createTextNode(child.textContent));
            } else {
                spans[0].appendChild(document.createElement("strong")).textContent = child.textContent;
            }
        }

        text = spans[0].textContent;// striped text
    } else {
         spans[0].textContent = text;
    }

    text = encodeURIComponent(text);
    if (is_tag)
        node.children[1].href = LINK_TAGS + text + "?ref=search";
    else
        node.children[1].href = "/search?query=" + text;

    node.children[1].addEventListener("click", homesearch_item_click, false);

    return node;
}

function homesearch_item_click(evt) {
    if (evt.shiftKey || evt.ctrlKey || evt.altKey || evt.metaKey) return;
    evt.preventDefault();

    let spans = this.querySelectorAll("span");
    let value = spans[0].textContent.trim();
    let description = spans[1].textContent.trim();
    let is_tag = this.parentNode.children[0].classList.contains("icon-tag");

    homesearch_save_recents(value, description, is_tag);
    homesearch_do_search(value, is_tag);
}

function homesearch_save_recents(value, description, is_tag) {
    let recent = apiSettings.recentSearchs;

    for (let i=0 ; i<recent.length ; i++) {
        if (recent[i].value.toLowerCase() == value.toLowerCase()) {
            recent.splice(i, 1);
            break;
        }
    }

    recent.unshift({value, description: description.length < 1 ? undefined : description, isTag: is_tag});
    apiSettings.recentSearchs = recent;
}


function homesearch_do_search(text, is_tag) {
    let href;
    let value;

    text = text.trim();

    if (is_tag) {
        value = apiEncodeTag(text);
        href = "/tag/" + value + "?ref=search";
    } else {
        value = text;
        href = "/search?query=" + encodeURIComponent(text);
    }

    homesearch_exit(false);
    home_browse_tag_or_search(value, href, text, is_tag)
}

