"use strict";

function SnackbarMenu(options, target) {
    if (arguments.length < 1) return;

    this.onOptionSelected = null;
    this.onExtraSelected = null;
    this.onHide = null;
    this._listener = this.listener.bind(this);
    this._listenerCancel = this.listenerCancel.bind(this);
    this.content = NODECUSTOM("SNACKBAR-MENU");
    this._existing = false;
    this._ignoreDividerIndex = false;

    this.content.addEventListener("click", this._listener, false);

    var ul = this.content.appendChild(document.createElement("ul"));

    var tmp;
    var item;
    var entry;
    var thumbnail;
    for (var i=0 ; i<options.length ; i++) {
        /*
            option = {
                content: "abc123" || document.createElement("span")
                icon: "http://example.com/icon.png" || document.createElement("picture")
                extra: "click me" || document.createElement("button"),
                disabled: true || false,
                hidden: true || false,
                cursor: true || false
            };

            option = "abc123";

            option = {// divider
                hidden: true || false
            };
        */
        entry = typeof(options[i]) == "string" ? {content: options[i]} : options[i];

        item = document.createElement("li");

        if (entry.content) {
            if (entry.icon) {
                tmp = NODECUSTOM("thumbnail");
                if (entry.icon instanceof Node) {
                    tmp.appendChild(entry.icon);
                } else {
                    thumbnail = document.createElement("img");
                    thumbnail.src = entry.icon;
                    thumbnail.className = "snackbar-menu-thumbnail";
                    tmp.appendChild(thumbnail);
                }
                item.appendChild(tmp);
            }

            tmp = document.createElement("item");
            if (entry.content instanceof Node)
                tmp.appendChild(entry.content);
            else
                tmp.appendChild(document.createTextNode(entry.content));
            item.appendChild(tmp);

            if (entry.extra) {
                tmp = document.createElement("extra");
                if (entry.extra instanceof Node)
                    tmp.appendChild(entry.extra);
                else
                    tmp.appendChild(document.createTextNode(entry.extra));
                item.appendChild(tmp);
            }

            if (entry.cursor) item.classList.add("cursor-pointer");

        } else {
            item.className = "divider";
        }

        if (entry.disabled) item.classList.add(DISABLED);
        if (entry.hidden) item.classList.add(HIDDEN);

        ul.appendChild(li);
    }

    this.content.classList.add(HIDDEN);

    if (target) target.appendChild(this.content);
}

SnackbarMenu.prototype._animate = function(show) {
    var content = this.content;

    content.animate([
        {translate: "0 100%"},
        {translate: "0"}
    ], {
        duration: 250,
        easing: "ease",
        direction: show ? "normal" : "reverse"
    })
    .onfinish = function() {
        if (show)
            content.focus();
        else
            content.classList.add(HIDDEN);
    };
}

SnackbarMenu.prototype.listener = function(e) {
    var ul = this.content.children[0];
    var item = NODESEARCHDIRECTCHILD(ul, e.target);
    if (item == null) return;//¿¿??

    if (NODESTATEHAS(item, HIDDEN, DISABLED, "divider")) return;

    var result;
    var index;

    if (this._ignoreDividerIndex) {
        index = 0;
        ul = ul.children;
        for (var i=0 ; i<ul.length ; i++) {
            if (ul[i] == item)
                break;
            else if (!ul[i].classList.contains("divider"))
                index++;
        }
    } else {
        index = NODEGETINDEX(item);
    }


    var extra = null;
    for (var i=item.children.length-1 ; i>=0 ; i--) {
        if (item.children[i].tagName == "EXTRA") {
            extra = item.children[i];
            break;
        }
    }

    e.stopPropagation();

    if (extra && (e.target == extra || extra.contains(e.target))) {
        if (!this.onExtraSelected) return;
        result = this.onExtraSelected(index, extra.children[0]);
    } else {
        if (!this.onOptionSelected) return;
        result = this.onOptionSelected(index, item.children[0]);
    }

    if (result) {
        if (this.onHide) this.onHide(false);
        this.hide();
    }
};

SnackbarMenu.prototype.listenerCancel = function(e) {
    if (!this.cancelable) return;
    if (e.target == this.content) return;
    if (this.content.contains(e.target)) return;
    if (this.onHide) this.onHide(true);
    this.hide();
}


SnackbarMenu.prototype.show = function() {
    this.content.classList.remove(HIDDEN);

    if (this.content.animate)
        this._animate(true);
    else
        this.content.focus();

    if (this.cancelable) document.body.addEventListener("click", this._listenerCancel, false);

    return this;
};

SnackbarMenu.prototype.hide = function() {
    document.body.removeEventListener("click", this._listenerCancel);
    if (this.content.animate)
        this._animate(false);
    else
        this.content.classList.add(HIDDEN);

    return this;
};

SnackbarMenu.prototype.setCancelable = function(cancelable) {
    this.cancelable = cancelable;
    return this;
};

SnackbarMenu.prototype.ignoreDividersIndex = function(ignore) {
    this._ignoreDividerIndex = ignore;
};

SnackbarMenu.prototype.dispose = function() {
    document.body.removeEventListener("click", this._listenerCancel);
    this.content.removeEventListener("click", this._listener);

    if (!this._existing) this.content.remove();
    this.content = undefined;
};


SnackbarMenu.fromExistingElement = function(element) {
    if (element.tagName != "SNACKBAR-MENU") throw new Error("Invalid SnackbarMenu, invalid tag name");

    var instance = new SnackbarMenu();
        instance.onOptionSelected = null;
        instance.onExtraSelected = null;
        instance.onHide = null;
        instance.content = element;
        instance._listener = instance.listener.bind(instance);
        instance._listenerCancel = instance.listenerCancel.bind(instance);
        instance._existing = true;
        instance._ignoreDividerIndex = false;

    instance.content.addEventListener("click", instance._listener, false);

    return instance;
}

