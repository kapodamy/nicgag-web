"use scrict";
function PopupMenu(options, target) {
    if (arguments.length < 1) return;

    this.onOptionSelected = null;
    this.onCancel = null;
    this._listener = this.listener.bind(this);
    this._listenerCancel = this.listenerCancel.bind(this);
    this.content = NODECUSTOM("popup-menu");
    this._existing = false;

    this.content.addEventListener("click", this._listener, false);

    var ul = this.content.appendChild(document.createElement("ul"));
    
    for (var i=0 ; i<options.length ; i++) {
        var entry = typeof(options[i]) == "string" ? {text: options[i]} : options[i];
        
        var item;
        if (entry.href) {
            item = document.createElement("a");
            item.href = entry.href;
            if (entry.rel) item.rel = entry.rel;
        } else {
            item = document.createElement("div");
        }
        
        if (entry.disabled) item.classList.add(DISABLED);
        
        item.textContent = entry.text;
        var li = document.createElement("li");
        li.appendChild(item);
        if (entry.hidden) li.classList.add(HIDDEN);
        ul.appendChild(li);
        
    }

    this.content.classList.add(HIDDEN);
    
    if (target)
        target.appendChild(this.content);
    else
        document.body.appendChild(this.content);  
}

PopupMenu.prototype.show = function(x, y) {
    this.content.style.left = x + "px";
    this.content.style.top = y + "px";
    
    if (this.cancelable) document.body.removeEventListener("click", this._listenerCancel);
    
    this.content.classList.remove(HIDDEN);
    this.content.focus();

    if (this.cancelable) {
        var obj = this;
        var callback = function() {
            if (obj.content)
                document.body.addEventListener("click", obj._listenerCancel, false)
        };
        
        setTimeout(callback, 1);
    }

    return this;
};

PopupMenu.prototype.hide = function() {
    if (!this.content) return;
    this.content.classList.add(HIDDEN);
    return this;
};

PopupMenu.prototype.setCancelable = function(cancelable) {
    this.cancelable = cancelable;
    return this;
};

PopupMenu.prototype.dispose = function() {
    document.body.removeEventListener("click", this._listenerCancel);
    this.content.removeEventListener("click", this._listener);
    
    if (!this._existing) this.content.remove();
    this.content = undefined;
};

PopupMenu.prototype.listener = function(e) {
    var ul = this.content.querySelector("ul");
    if (!ul.contains(e.target)) return;
    var li = NODESEARCHDIRECTCHILD(ul, e.target);
    if (!li) return;
    
    if (NODESTATEHAS(li, HIDDEN, DISABLED)) return;
    
    var index = NODEGETINDEX(li);
    
    if (!this.onOptionSelected) return;
    var result = this.onOptionSelected(index, li.textContent);
    
    if (result) this.hide();
};

PopupMenu.prototype.listenerCancel = function(e) {
    document.body.removeEventListener("click", this._listenerCancel);

    if (!this.content) return;
    if (!this.cancelable) return;
    if (e.target == this.content) return;
    if (this.content.contains(e.target)) return;
    
    this.hide();

    if (this.onCancel) this.onCancel();
}

PopupMenu.fromExistingElement = function(element) {
    if (element.tagName != "POPUP-MENU") throw new Error("Invalid PopupMenu, invalid tag name");
    
    var instance = new PopupMenu();
        instance.onOptionSelected = null;
        instance.onCancel = null;
        instance.content = element;
        instance._listener = instance.listener.bind(instance);
        instance._listenerCancel = instance.listenerCancel.bind(instance);
        instance._existing = true;

    instance.content.addEventListener("click", instance._listener, false);

    return instance;
}

