"use strict";

function InfiniteList(fetcher, bottom, target) {
    if (arguments.length > 1) {
        this.content = NODECUSTOM("infinite-list");
        this._fetchfn = fetcher;
    } else {
        bottom = arguments[0][1];
        this.content = arguments[0][0];
        if (!bottom) console.warn("InfiniteList.fromExistingElement() missing bottom element");
    }

    this._bottom = bottom ? bottom : document.createElement("div");
    this._existing = arguments.length == 1;
    this._lockListener = false;
    this._disabled = true;
    this._pages = new Array();
    this._clearPages = false;
    this._processing = false;
    this._neighbourCheck = true;
    this.OnPageDrop = null;

    if (this._bottom.parentNode != this.content) this.content.appendChild(this._bottom);

    if ('IntersectionObserver' in window) {
        this._listener = new IntersectionObserver(this._intersectionProcessor.bind(this));
        this._listener.observe(this._bottom);
    } else {
        this._listener = this._scrollProcessor.bind(this);
        this.content.addEventListener("scroll", this._listener, false);
    }

    if (target) target.appendChild(this.content);
}


InfiniteList.prototype.dropPreviousPages = function(allow) {
    this._clearPages = !!allow;
    return this;
};

InfiniteList.prototype.dispose = function() {
    if (!this.content) return;

    if (this._listener.disconnect instanceof Function)
        this._listener.disconnect();
    else
        this.content.removeEventListener(this._listener);

    if (this._existing)
        NODEREMOVEALLCHILDRENS(this.content);
    else
        this.content.remove();

    this.content = undefined;
    this._fillfn = undefined;
    this._fetchfn = undefined;
    this._bottom = undefined;
    this._listener = undefined;
    this._pages = undefined;
};

InfiniteList.prototype.append = function(items, extra, insert, allowDrop) {
    this._lockListener = false;

    var holder = insert instanceof Node ? insert : NODECUSTOM("page-holder");
    for (var i=0 ; i<items.length ; i++) holder.appendChild(items[i]);

    if (holder === insert) return this;

    var page = { holder: holder, extra, size: false, allowDrop, recent: true};

    if (this._pages.length > 0 && typeof(insert) == "number") {
        ARRAYINSERTITEM(this._pages, insert, page);
        NODEINSERTAT(this.content, insert, holder);
    } else {
        this._pages.push(page);
        this.content.insertBefore(holder, this._bottom);
    }

    if (this._listener.observe instanceof Function)
        this._listener.observe(holder);
    //else// if the webpage is reloaded, the browser will restore the scroll
        this._scrollProcessor(this.content.scrollTop);

    return this;
};

InfiniteList.prototype.getPages = function() {
    var pages = new Array(this._pages.length);
    for (var i=0 ; i<pages.length ; i++) pages[i] = this.getPage(i);
    return pages;
};

InfiniteList.prototype.getPageCount = function() {
    return this._pages.length;
};

InfiniteList.prototype.removePage = function(index) {
    var removed = this._pages[index];
    this._pages.splice(index, 1);

    if (this._listener.observe instanceof Function) this._listener.unobserve(removed.holder);

    removed.holder.remove();
    return removed.extra;
};

InfiniteList.prototype.getPage = function(index) {
    return {
        holder: this._pages[index].holder,
        disposed: this._pages[index].size !== false,
        extra: this._pages[index].extra,
        allowDrop: this._pages[index].allowDrop
    };
};

InfiniteList.prototype.removeAllPages = function(indexStart) {
    if (this._pages.length < 1) return;

    var i = typeof(indexStart) == "number" ? indexStart : 0;
    var extra = new Array(this._pages.length - i);

    for (var j = 0 ; i<this._pages.length ; i++) {
        if (this._listener.observe instanceof Function) this._listener.unobserve(this._pages[i].holder);
        extra[j++] = this._pages[i].extra;
        this._pages[i].holder.remove();
    }

    if (extra.length == this._pages.length)
        this._pages = new Array();
    else
        this._pages.splice(indexStart, extra.length);

    return extra;
};

InfiniteList.prototype.allowDropPage = function(index, allowDrop) {
    this._pages[index].allowDrop = allowDrop;
};

InfiniteList.prototype.allowDropPageIfNeighbourVisible = function(allow) {
    this._neighbourCheck = allow;
}

InfiniteList.prototype.reLayout = function() {
    this._pagesInView();
    return this;
};

InfiniteList.prototype.importState = function(state, extras) {
    var holder;
    for (var i=0 ; i<state.pages.length ; i++) {
        holder = this.content.insertBefore(NODECUSTOM("page-holder"), this._bottom);
        holder.style.height = state.pages[i].size + "px";
        this._pages.push({
            holder,
            extra: extras[i],
            size: state.pages[i].size,
            allowDrop: state.pages[i].allowDrop
        });
        if (this._listener.observe instanceof Function) this._listener.observe(holder);
        
    }

    var fn = (function() {
        this.content.scrollTo({top: state.scroll});
        this._pagesInView(true);
    }).bind(this);

    if ('requestAnimationFrame' in window)
        requestAnimationFrame(fn);
    else
        setTimeout(fn);
};

InfiniteList.prototype.exportState = function() {
    var scroll = this.content.scrollTop;
    var pages = new Array(this._pages.length);

    for (var i=0 ; i<pages.length ; i++) {
        pages[i] = {
            size: this._pages[i].size === false ? NODEHEIGHTOFFSET(this._pages[i].holder) : this._pages[i].size,
            allowDrop: this._pages[i].allowDrop
        }
    }

    return { pages, scroll};
};

InfiniteList.prototype.disableFetching = function(disable) {
    this._disabled = disable;
    if (!disable) this._lockListener = false;
}


InfiniteList.prototype._scrollProcessor = function(evt) {
    if (this._disabled) return;
    var offset = this._bottom.offsetTop - this.content.offsetTop - this.content.offsetHeight;
    var scroll = evt.type == "scroll" ? this.content.scrollTop : evt;

    if (scroll < offset)
        this._pagesInView();
    else if (!this._lockListener && !this._processing)
        this._fetchMore();
};

InfiniteList.prototype._intersectionProcessor = function(entries) {
    if (this._disabled || entries.length < 1) return;

    var page_checks = 0;
    var fetch_more = 0;

    for (var i=0 ; i<entries.length ; i++) {
        if (entries[i].target == this._bottom) {
            if (entries[i].isIntersecting) fetch_more++;
        } else {
            page_checks++;// page visibility change
        }
    }

    if (page_checks) setTimeout(this._pagesInView.bind(this));
    if (!this._lockListener && !this._processing && fetch_more > 0) this._fetchMore();
};

InfiniteList.prototype._fetchMore = function() {
    var obj = this;

    function fn() {
        obj._processing = false;
        var res = obj._fetchfn(-1);
        obj._lockListener = res === true;
    }

    this._processing = true;

    if ('requestAnimationFrame' in window)
        requestAnimationFrame(fn);
    else
        setTimeout(fn);
};


InfiniteList.prototype._pagesInView = function(force) {
    if (!this._clearPages) return;
    if (force !== true && this.content.scrollTopMax < 1) return;// the element was hidden

    var height;
    var offset;
    var hide;
    var end = this.content.offsetHeight;
    var dropped = new Array();
    // var added = 0;
    
    var start;
    var end;

    if (this._neighbourCheck) {
        var padding = this.content.offsetHeight * 1.75;// incrase window 75%
        end = this.content.scrollTop + padding;
        start = this.content.scrollTop - padding;
    } else {
        end = this.content.scrollTop + this.content.offsetHeight;
        start = this.content.scrollTop;
    }

    for (var i=0 ; i<this._pages.length ; i++) {
        height = NODEHEIGHTOFFSET(this._pages[i].holder);

        offset = this._pages[i].holder.offsetTop - this.content.offsetTop;
        hide = start > (offset+height) || end < offset;

        if (!hide && this._pages[i].recent) this._pages[i].recent = false;

        if (hide && this._pages[i].size === false) {
            if (this._pages[i].recent) continue;
            if (!this._pages[i].allowDrop) continue;

            this._pageVisibiltity(i, height);
            NODEREMOVEALLCHILDRENS(this._pages[i].holder);
            dropped.push({number: i, extra: this._pages[i].extra});
        }
        else if (!hide && this._pages[i].size !== false) {
            // added++;
            var res = this._fetchfn(i, this._pages[i].extra);
            if (!res || res.length < 0) {
                this.removePage(i--);
                continue;
            }

            this.append(res, this._pages[i].extra, this._pages[i].holder);
            this._pageVisibiltity(i, false);
        }
    }

    // if (dropped.length > 0 || added > 0 && this.content.scrollTop != scroll) this.content.scrollTop = scroll;
    if (dropped.length > 0 && this.OnPageDrop) this.OnPageDrop(dropped);
    
    if (force === true) {
        var bottom_offset = this._bottom.offsetTop - this.content.offsetTop - this.content.offsetHeight;
        if (this.content.scrollTop >= bottom_offset) {
            var fn = this._fetchMore.bind(this);
            if ('requestAnimationFrame' in window)
                requestAnimationFrame(fn);
            else
                setTimeout(fn);
        }
    }
}

InfiniteList.prototype._pageVisibiltity = function(index, size) {
    this._pages[index].size = size;
    this._pages[index].holder.style.height = size === false ? null : (size + "px");
};


InfiniteList.fromExistingElement = function(target, fetcher, bottom) {
    if (target.tagName != "INFINITE-LIST") throw Error("Invalid InfiniteList, invalid tag name");

    var instance = new InfiniteList([target, bottom ? bottom : target.lastChild]);
        instance._fetchfn = fetcher;

    return instance;
};

