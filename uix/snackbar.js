"use strict";

function Snackbar(target) {
    if (arguments.length < 1) return;

    this.onClick = null;
    this.onTimeout = null;
    this._listener = this.listener.bind(this);
    this._existing = false;
    this._floating = false;
    this._delay = 0;
    this._timeout = null;
    this._selfDispose = false;
    this.content = NODECUSTOM("SNACKBAR");

    this.content.addEventListener("click", this._listener, false);

    this._message = this.content.appendChild(document.createElement("div"));
    this._action = this.content.appendChild(document.createElement("div"));

    this.content.classList.add(HIDDEN);

    if (target) target.appendChild(this.content);
}

Snackbar.prototype._animate = function(show, hidecallback) {
    var instance = this;
    
    instance.content.animate([
        {translate: "0 100%"},
        {translate: "0"}
    ], {
        duration: instance._floating ? 200 : 300,
        direction: show ? "normal" : "reverse",
        easing: instance._floating ? "ease-in-out" : "ease-out"
    })
    .onfinish = function() {
        if (!instance.content)
            return;
        else if (!show) {
            instance.content.classList.add(HIDDEN);
            if (hidecallback) hidecallback(instance);
            if (instance._selfDispose) instance.dispose();
        } else if (instance._delay > 0) {
            instance._setHandler();
        }
    };
}

Snackbar.prototype._clearHandler = function() {
    if (this._timeout == null) return;
    clearTimeout(this._timeout);
    this._timeout = null;
};

Snackbar.prototype._setHandler = function() {
    this._timeout = setTimeout(this._handler, this._delay, this);
};

Snackbar.prototype._handler = function(instance) {
    if (!instance.content) return;
    instance.hide(instance.onTimeout);
    // if (instance.onTimeout) instance.onTimeout();
};

Snackbar.prototype.listener = function(e) {
    var part;
    if (e.target == this.content)
        part = e.target;
    else
        part = NODESEARCHDIRECTCHILD(this.content, e.target);
    
    var action;
    if (part == this._action && this._action.childNodes.length > 0)
        action = true;
    else
        action = false;
    
    var result;
    if (this.onClick)
        result = this.onClick(action);
    else
        result = true;
    
    if (result) this.hide();
};


Snackbar.prototype.show = function() {    
    this.content.classList.remove(HIDDEN);
    
    if (this.content.animate)
        this._animate(true);
    else if (this._delay > 0)
        this._setHandler();
    
    return this;
};

Snackbar.prototype.hide = function(afterHideCallback) {
    if (!this.content) return;
    
    this._clearHandler();
    
    if (this.content.animate) {
        this._animate(false, afterHideCallback);
    } else {
        this.content.classList.add(HIDDEN);
        setTimeout(function(instance) {
            if (afterHideCallback) afterHideCallback(instance);
            if (instance._selfDispose) instance.dispose();
        }, 1, this);
    }
    
    return this;
};

Snackbar.prototype.dispose = function() {
    if (!this.content) return;
    this._clearHandler();
    this.content.removeEventListener("click", this._listener);
    if (!this._existing) this.content.remove();
    this.content = undefined;
};


Snackbar.prototype.setBodyText = function(message) {
    NODEREMOVEALLCHILDRENS(this._message);
    
    if (message instanceof Node) {
        this._message.appendChild(message);
    } else {
        message = message.split("\n");
        for (var i=0 ; i<message.length ; i++) {
            this._message.appendChild(document.createTextNode(message[i]));
            if ((i+1) < message.length) this._message.appendChild(document.createElement("br"));
        }
    }
    
    return this;
};

Snackbar.prototype.setActionText = function(action) {
    NODEREMOVEALLCHILDRENS(this._action);
    
    if (action instanceof Node)
        this._action.appendChild(action);
    else
        this._action.textContent = action;
    
    return this;
};

Snackbar.prototype.setFloating = function(floating) {
    this._floating = floating;
    NODECLASSSWITCH(this.content, "floating", floating);
    return this;
}

Snackbar.prototype.setDelay = function(miliseconds) {
    this._delay = miliseconds;
}

Snackbar.prototype.setDisposeOnHide = function(autoDispose) {
    this._selfDispose = autoDispose;
    return this;
};


Snackbar.SHORT_DELAY = 2000;

Snackbar.LONG_DELAY = 3500;

Snackbar.fromExistingElement = function(element) {
    if (element.tagName != "SNACKBAR") throw new Error("Invalid Snackbar, invalid tag name");

    var instance = new Snackbar();
    instance.onClick = null;
    instance.onTimeout = null;
    instance._listener = instance.listener.bind(instance);
    instance._existing = true;
    instance._floating = NODESTATEHAS(element, "floating");
    instance._delay = 0;
    instance._timeout = null;
    instance._selfDispose = false;
    instance.content = element;

    instance._message = element.children[0];
    instance._action = element.children[1];

    instance.content.addEventListener("click", instance._listener, false);

    return instance;
}

