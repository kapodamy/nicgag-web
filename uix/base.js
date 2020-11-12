var HIDDEN = "hidden";
var SELECTED = "selected";
var DISABLED = "disabled";
var supportCustomElements = true;

function NODEID(id) {
    return document.getElementById(id);
}

function NODEQUERY(selector) {
    return document.querySelector(selector);
}

function NODEQUERYALL(selector) {
    return document.querySelectorAll(selector);
}

function NODEBYINDEX(parent, index) {
    return parent.children[index];
}

function NODEGETINDEX(parent, node, childNodes) {
    if (!node) {
        node = parent;
        parent = node.parentNode;
    }

    var children = childNodes ? parent.childNodes : parent.children;
    for (var i=0 ; i<children.length ; i++) {
        if (children[i] == node)
        return i;
    }

    return -1;
}

function NODESTATESWITCH(parent, index, state, flag) {
    var cls = parent.children[index].classList;
    if (flag)
        cls.add(state);
    else
        cls.remove(state);
}

function NODECLASSSWITCH(node, state, flag) {
    var cls = node.classList;
    if (flag)
        cls.add(state);
    else
        cls.remove(state);
}

function NODEINSERTAT(parent, index, node) {
    var children = parent.children;
    if (index == children.length)
        parent.appendChild(node);
    else
        parent.insertBefore(node, children[index]);
}

function NODEMAKE(json_dom) {
    // [TAGNAME, ATTRS, [TAGNAME, ATTRS, ...]...]

    function render(def, par) {
        if (def[0] instanceof Array) {
            for (var i=0; i<def.length ; i++) render(def[i], par);
            return;
        }

        if (def.length == 1) return document.createTextNode(def[0]);

        let node = document.createElement(def[0]);
        if (def[1]) {
            for (let attr in def[1]) {
                if (def[1][attr] === null || def[1][attr] === undefined) continue;
                node.setAttribute(attr, def[1][attr]);
            }
        }
        for (var i = 2 ; i < def.length ; i++) {
            if (def[i] === null || def[i] === undefined) continue;
            if (typeof(def[i]) == "string")
                node.appendChild(document.createTextNode(def[i]));
            else
                render(def[i], node);
        }

        if (par)
            par.appendChild(node);
        else
           return node;
    }

    return render(json_dom, null);
}

function NODECUSTOM(name) {
    if (supportCustomElements)
        return document.createElement(name);

    var node = document.createElement("div");
    node.classList.add(name);
    return node;
}

function NODESTATEHAS(node, ...state) {
    var cls = node.classList;

    for (var i=0 ; i<state.length ; i++)
        if (cls.contains(state[i])) return true;

    return false;
}

function ISSCROLLEDINTOVIEW(el) {
    var rect = el.getBoundingClientRect();
    var elemTop = rect.top;
    var elemBottom = rect.bottom;

    // Only completely visible elements return true:
    // var isVisible = (elemTop >= 0) && (elemBottom <= window.innerHeight);
    // Partially visible elements return true:
    var isVisible = elemTop < window.innerHeight && elemBottom >= 0;
    return isVisible;
}

function SETHEIGHTPX(node, height) {
    node.style.height = height + "px";
}

function NODEREMOVEALLCHILDRENS(parent) {
    if (!parent) return;
    var child;
    while (child = parent.lastChild) parent.removeChild(child);
}

function NODESEARCHDIRECTCHILD(parent, deepNode) {
    if (!parent.contains(deepNode)) throw new Error("the deepNode does not have connection with the parent");

    var child = deepNode;
    while (child) {
        if (child.parentNode == parent) return child;
        child = child.parentNode;
    }
    return null;
}

function NODEHEIGHTOFFSET(node) {
    var sibling = node.nextSibling || node.parentNode;
    return sibling.offsetTop - node.offsetTop;
}

function ARRAYINSERTITEM(array, index, item) {
    if (index == array.length) {
        array.push(item);
        return;
    } else if (index > array.length) {
        array[index] = item;
        return;
    } else if (index == 0) {
        array.unshift(item);
        return;
    }
    var end = index - 1;
    var i = array.length - 1;
    for (; i>end ; i--) array[i + 1] = array[i];
    array[index] = item;
}

