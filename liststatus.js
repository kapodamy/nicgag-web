"use strict";

function ListStatus(retryCallback, footer) {
    this.holder = importTemplate("post-loading");
    this.holder.querySelector("button").addEventListener("click", evt => retryCallback(), false);

    this.footer = footer;
    if (footer) this.holder.appendChild(footer);
};

ListStatus.prototype.switchStatus = function(type) {
    NODECLASSSWITCH(this.holder.children[0], HIDDEN, type !== 0);
    NODECLASSSWITCH(this.holder.children[1], HIDDEN, type !== 1);
    if (this.footer) NODECLASSSWITCH(this.footer, HIDDEN, type !== 2);
}

ListStatus.prototype.showSpinner = function() {
    this.switchStatus(0);
};

ListStatus.prototype.showError = function(message) {
    if (!message) message = "Network Error";
    this.holder.children[1].children[1].textContent = message;
    this.switchStatus(1);
};

ListStatus.prototype.showFooter = function(message) {
    this.footer.textContent = message;
    this.switchStatus(2);
};

