"use scrict";
function Tabs(entries, target) {
    if (arguments.length < 1) return;
    
    this.content = NODECUSTOM("tabs");
    this._listener = this.listener.bind(this);
    this.onTabSelected = null;
    this._existing = false;
    
    for (var i=0 ; i<entries.length ; i++) {
        this.content
            .appendChild(NODECUSTOM("tab"))
            .textContent = entries[i];
    }
    
    this.content.addEventListener("click", this._listener, false);
    
    if (target) target.appendChild(this.content);
}


Tabs.prototype.removeTab = function(index) {
    NODEBYINDEX(this.content, index).remove();
    return this;
};

Tabs.prototype.setEnabled = function(index, enable) {
    NODESTATESWITCH(this.content, index, DISABLED, !enable);
    return this;
};

Tabs.prototype.setVisible = function(index, visible) {
    NODESTATESWITCH(this.content, index, HIDDEN, !visible);
    return this;
};

Tabs.prototype.setSelected = function(index) {
    var tabs = this.content.children;
    for (var i=0 ; i<tabs.length ; i++) {
        NODESTATESWITCH(this.content, i, SELECTED, i == index);
    }
    
    return this;
}
   
Tabs.prototype.renameTab = function(index, name) {
    NODEBYINDEX(this.content, index).textContent = name;
    return this;
};

Tabs.prototype.addTab = function(insertIndex, name, selected, disabled, hidden) {
    var tab = NODECUSTOM("tab");
    var cls = tab.classList;
    
    tab.textContent = name;
    
    if (selected) cls.add(SELECTED);
    if (disabled) cls.add(DISABLED);
    if (hidden) cls.add(HIDDEN);
    
    if (insertIndex < 0)
        this.content.appendChild(tab);
    else
        NODEINSERTAT(this.content, insertIndex, tab);
    
    return this;
};

Tabs.prototype.getSelected = function() {
    var tabs = this.content.children;
    for (var i=0 ; i<tabs.length ; i++) {
        if (tabs[i].classList.contains(SELECTED))
            return i;
    }
    
    return -1;
};

Tabs.prototype.dispose = function() {
    this.content.removeEventListener("click", this._listener);
    if (!this._existing) this.content.remove();
    this.content = undefined;
}

Tabs.prototype.listener = function(evt) {
    if (NODESTATEHAS(evt.target, HIDDEN, DISABLED)) return;
    
    var index = NODEGETINDEX(this.content, evt.target);
    
    if (!this.onTabSelected) return;
    var result = this.onTabSelected(index, evt.target.textContent);
    
    if (result === SELECTED)
        this.setSelected(index);
    else if (result === DISABLED)
        this.setEnabled(index, false);
    else if (result === HIDDEN)
        this.setVisible(index, false);
    else if (result)
        this.setSelected(index);
}


Tabs.fromExistingElement = function(element) {
    if (element.tagName != "TABS") throw new Error("Invalid Tabs, invalid tag name");
    
    var instance = new Tabs();
        instance.content = element;
        instance._listener = instance.listener.bind(instance);
        instance.onTabSelected = null;
        instance._existing = true;

    instance.content.addEventListener("click", instance._listener, false);
    
    return instance;
};

