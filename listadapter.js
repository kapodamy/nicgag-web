"use strict";

function ListAdapter(header, list, binder, more) {
    this.items = new Array();
    this.header = header;
    this.list = list;
    this.nextIndex = 0;
    this.binder = binder;
    this.more = more;

    if (list) list.OnPageDrop = this.onPagesDropped.bind(this);
}

ListAdapter.fromExistingElement = function(nodeID, fetchCallback, bindCallback, headerElement, footerElement) {
    let adapter = new ListAdapter(headerElement, null, bindCallback, fetchCallback);
    let list = InfiniteList.fromExistingElement(NODEID(nodeID), adapter.onFetchMore.bind(adapter), footerElement.holder);

    adapter.list = list;
    list.OnPageDrop = adapter.onPagesDropped.bind(adapter);
    list.dropPreviousPages(true);

    return adapter;
};

ListAdapter.prototype.maxItemsPerPage = 10;

ListAdapter.prototype.appendHeader = function() {
    if (!this.header) return;
    if (this.list.content.contains(this.header)) return;

    this.list.append([this.header], undefined, 0, false);
    return this;
};

ListAdapter.prototype.append = function() {
    let obj = this.build(this.list.getPageCount(), this.nextIndex, this.maxItemsPerPage);
    if (!obj) return;

    this.list.append(obj.views, obj.extra, null, true);
    this.nextIndex += obj.extra.length;
};

ListAdapter.prototype.build = function(page_number, index, max) {
    this.list.disableFetching(false);

    let length = this.items.length - index;
    if (length > max) length = max;

    if (length < 1) {
        console.warn("ListAdapter.build() no items to return. index=" + index + " length=" + length);
        return null;
    }

    let extra = {index, length};
    let views = new Array(length);

    for (let i=0 ; i<length ; i++, index++) {
        if (this.items[index].updateMetadata instanceof Function)
            this.items[index].updateMetadata();
        else
            this.items[index] = this.binder(this.items[index]);

        views[i] = this.items[index].content;
    }

    return {views, extra};
};

ListAdapter.prototype.unBindViews = function(index, length) {
    if (index < 0 || length < 0) return;

    for ( ; index < this.items.length && length > 0; index++, length--) {
        if (this.items[index].updateMetadata instanceof Function) {
            let obj = this.items[index];
            this.items[index] = obj.info;
            obj.content.remove();
            obj.dispose();
        }
    }
}

ListAdapter.prototype.clear = function(peserve_header) {
    this.list.disableFetching(true);

    if (peserve_header && this.header) {
        this.nextIndex = 1;
        this.removeAllPages(1);
    } else {
        this.nextIndex = 0;
        this.removeAllPages();
    }

    this.items = new Array();
};

ListAdapter.prototype.removeAllPages = function(index) {
    let pages = this.list.removeAllPages(index);
    if (!pages) return;
    for (let extra of pages) {
        if (extra) this.unBindViews(extra.index, extra.length);
    }
};

ListAdapter.prototype.importState = function(state, keep_empty_items) {
    if (!state || !state.uix || !state.items || !keep_empty_items && state.items.length < 1) return false;

    this.items = state.items;
    nicgagSerializePostList(this.items, true);

    this.nextIndex = state.index;
    this.list.importState(state.uix, state.extras);
    this.list.disableFetching(false);
    
    return true;
};

ListAdapter.prototype.exportState = function() {
    if (!this.items || this.items.length < 0) return null;

    let extras = this.list.getPages();
    for (let i=0 ; i<extras.length ; i++) extras[i] = extras[i].extra;

    let items = new Array(this.items.length);
    for (let i=0 ; i<items.length ; i++) {
        if (this.items[i].updateMetadata instanceof Function)
            items[i] = this.items[i].info;
        else
            items[i] = this.items[i];
    }
    nicgagSerializePostList(items, false);

    return {index: this.nextIndex, uix: this.list.exportState(), extras, items};
};

ListAdapter.prototype.insertItem = function(item, index) {
    if (index == undefined)
        this.items.push(item);
    else
        ARRAYINSERTITEM(this.items, index, item);

    this.update();
};

ListAdapter.prototype.removeItem = function(index_or_item) {
    if (!this.items || this.items.length < 1) return;

    if (typeof(index_or_item) !== "number")
        index_or_item = this.items.indexOf(index_or_item);

    if (index_or_item < 0) return;

    if (this.items[index_or_item].updateMetadata instanceof Function) {
        this.items[index_or_item].content.remove();
        this.items[index_or_item].dispose();
    }

    this.items.splice(index_or_item, 1);
    this.update();
};

ListAdapter.prototype.update = function() {
    let pages = this.list.getPages();
    let next = 0;
    let page_number = 0;

    if (this.header && pages.length > 0) pages.shift();

    for (let i=0 ; i<pages.length ; i++) NODEREMOVEALLCHILDRENS(pages[i].holder);

    main:/*label*/
    for (let page of pages) {
        page_number++;

        if (page.disposed) {
            let length = Math.min(this.items.length - next);
            if (length < 1) break main;

            page.extra.length = Math.min(length, page.extra.length);
            this.unBindViews(next, page.extra.length);

            page.extra.index = next;
            next += page.extra.length;

            continue;
        }

        let amount = page.extra.length;
        page.extra.length = 0;
        page.extra.index = next;

        for ( ; page.extra.length<amount ; page.extra.length++, next++) {
            if (next >= this.items.length) break main;

            if (this.items[next].updateMetadata instanceof Function)
                this.items[next].updateMetadata();
            else
                this.items[next] = this.binder(this.items[next]);

            page.holder.appendChild(this.items[next].content);
        }

    }

    if (page_number < pages.length) {
        if (this.header) page_number++;
        this.list.removeAllPages(page_number);
    }

    this.list.disableFetching(false);
};

ListAdapter.prototype.upperFooter = function(upper) {
    if (upper) {
        this.list.disableFetching(true);
        NODEINSERTAT(this.list.content, 0 ,this.list._bottom);
    } else if (this.list.content.children[0] == this.list._bottom) {
        this.list.content.appendChild(this.list._bottom);
    }
};

ListAdapter.prototype.recreate = function() {
    this.removeAllPages();
    this.nextIndex = 0;
    this.append();
};

ListAdapter.prototype.pushToItems = function(new_item) {
    if (!new_item) return;

    for (let i=0 ; i<this.items.length ; i++) {
        let obj = this.items[i].updateMetadata instanceof Function;
        let id = obj ? this.items[i].info.id : this.items[i].id;

        if (id == new_item.id) {
            if (obj) {
                this.items[i].info = new_item;
                this.items[i].updateMetadata();
            } else {
                this.items[i] = new_item;
            }
            return this;
        }
    }

    this.items.push(new_item);
    return this;
}

ListAdapter.prototype.onFetchMore = function(page_number, extra) {
    if (page_number >= 0) {
        if (!extra) {
            return this.header ? [this.header] : false/*header not present*/;
        }
        let obj = this.build(page_number, extra.index, extra.length);
        return obj ? obj.views : false;
    }
    else if (this.nextIndex < this.items.length) this.append();
    else this.more();
    return true;
};

ListAdapter.prototype.onPagesDropped = function(pages) {
    for (let page of pages) {
        if (page.extra) this.unBindViews(page.extra.index, page.extra.length);
    }
};

ListAdapter.prototype.mergeItems = function(new_items) {
    if (new_items.length < 1) return 0;// nothing to do

    if (this.items.length < 1) {
        this.items = new_items;
        this.nextIndex = this.header ? 1 : 0;
        this.removeAllPages(this.nextIndex);
        this.append();

        return true;
    }

    let found_indexs = new Array();
    for (let i=0 ; i<new_items.length ; i++) {
        for (let j=0; j<this.items.length ; j++) {
            let id = this.items[j].updateMetadata instanceof Function ? this.items[j].info.id : this.items[j].id;
            if (new_items[i].id == id) {
                found_indexs.push([i, j]);
                break;
            }
        }
    }

    if (found_indexs.length < 1) {
        // two possible cases:
        //      1. actual list is old. Theres a gap and/or missing new posts
        //      2. the necessary amount was fetched
        //
        this.items = new_items;
        this.nextIndex = this.header ? 1 : 0;
        this.removeAllPages(this.nextIndex);
        this.append();

        return true;
    }

    let j = 0;
    let k = 0;
    let res = new Array((new_items.length - found_indexs.length) + this.items.length);

    for (let i=0 ; i<new_items.length; i++) {
        if (k < found_indexs.length && found_indexs[k][0] == i) {
            k++;
            continue;
        }
        res[j++] = new_items[i];
    }
    k = 0;
    for (let i=0 ; i<this.items.length; i++) {
        if (k < found_indexs.length && found_indexs[k][1] == i) {
            if (this.items[found_indexs[k][1]].updateMetadata instanceof Function) {
                res[j] = this.items[found_indexs[k][1]];
                res[j].info = new_items[found_indexs[k][0]];
            } else {
                res[j] = new_items[found_indexs[k][0]];
            }
            j++;
            k++;
            continue;
        }
        res[j++] = this.items[i];
    }

    let diff = res.length - this.items.length;
    this.items = res;
    this.update();

    return diff;
}

