"use strict";

function Switch(target) {
    if (arguments.length < 1) return;

    this.onToggle = null;
    this._active = false;

    this._listener = this.listener.bind(this);
    this.content = NODECUSTOM("SWITCH");
    this._existing = false;

    this.content.appendChild(NODECUSTOM("SWITCH-BG"));
    this.content.appendChild(NODECUSTOM("SWITCH-FG"));

    this.content.addEventListener("click", this._listener, false);

    if (target) target.appendChild(this.content);
}

Switch.prototype.setDisabled = function(disable) {
    NODECLASSSWITCH(this.content, "switch-disabled", disable);
    return this;
};

Switch.prototype.setState = function(active) {
    if (arguments.length < 1) return this._active;

    if (this._active == active) return;
    this._active = active;

    NODECLASSSWITCH(this.content, "switch-toggle", active);

    return this;
};

Switch.prototype.getState = function() {
    return this._active;
}

Switch.prototype.toggle = function() {
    this.setState(!this._active);
    return this;
}

Switch.prototype.dispose = function() {
    this.content.removeEventListener("click", this._listener);
    if (!this._existing) this.content.remove();
    this.content = undefined;
};

Switch.prototype.listener = function(e) {
    if (NODESTATEHAS(this.content, "switch-disabled")) return;

    var flag = !this._active;
    var res = this.onToggle ? this.onToggle(flag) : true;
    if (!res) return;

    this.toggle(flag);
};

Switch.fromExistingElement = function(element) {
    if (element.tagName != "SWITCH") Error("Invalid Switch, invalid tag name");

    var instance = new Switch();
        instance.onToggle = null;
        instance.content = element;
        instance._listener = instance.listener.bind(instance);
        instance._existing = true;
        instance._toggle = NODESTATEHAS(element.classList.contains("switch-toggle"));

    instance.content.addEventListener("click", instance._listener, false);

    return instance;
}

