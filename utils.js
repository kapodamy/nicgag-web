const xmlEntityDecoder_primary = [
    'nbsp', 'iexcl', 'cent', 'pound', 'curren', 'yen', 'brvbar', 'sect', 'uml', 'copy', 'ordf', 'laquo', 'not', 'shy', 'reg', 'macr', 'deg', 'plusmn', 'sup2', 'sup3', 'acute', 'micro', 'para', 'middot', 'cedil', 'sup1', 'ordm', 'raquo', 'frac14', 'frac12', 'frac34', 'iquest', 'Agrave', 'Aacute', 'Acirc', 'Atilde', 'Auml', 'Aring', 'AElig', 'Ccedil', 'Egrave', 'Eacute', 'Ecirc', 'Euml', 'Igrave', 'Iacute', 'Icirc', 'Iuml', 'ETH', 'Ntilde', 'Ograve', 'Oacute', 'Ocirc', 'Otilde', 'Ouml', 'times', 'Oslash', 'Ugrave', 'Uacute', 'Ucirc', 'Uuml', 'Yacute', 'THORN', 'szlig', 'agrave', 'aacute', 'acirc', 'atilde', 'auml', 'aring', 'aelig', 'ccedil', 'egrave', 'eacute', 'ecirc', 'euml', 'igrave', 'iacute', 'icirc', 'iuml', 'eth', 'ntilde', 'ograve', 'oacute', 'ocirc', 'otilde', 'ouml', 'divide', 'oslash', 'ugrave', 'uacute', 'ucirc', 'uuml', 'yacute', 'thorn', 'yuml;'
];

const xmlEntityDecoder_secondary = [
    'quot', 'amp', 'lt', 'gt', 'OElig', 'oelig', 'Scaron', 'scaron', 'Yuml', 'circ', 'tilde', 'ensp', 'emsp', 'thinsp', 'zwnj', 'zwj', 'lrm', 'rlm', 'ndash', 'mdash', 'lsquo', 'rsquo', 'sbquo', 'ldquo', 'rdquo', 'bdquo', 'dagger', 'Dagger', 'permil', 'lsaquo', 'rsaquo', 'euro', 'fnof', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigmaf', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega', 'thetasym', 'upsih', 'piv', 'bull', 'hellip', 'prime', 'Prime', 'oline', 'frasl', 'weierp', 'image', 'real', 'trade', 'alefsym', 'larr', 'uarr', 'rarr', 'darr', 'harr', 'crarr', 'lArr', 'uArr', 'rArr', 'dArr', 'hArr', 'forall', 'part', 'exist', 'empty', 'nabla', 'isin', 'notin', 'ni', 'prod', 'sum', 'minus', 'lowast', 'radic', 'prop', 'infin', 'ang', 'and', 'or', 'cap', 'cup', 'int', 'there4', 'sim', 'cong', 'asymp', 'ne', 'equiv', 'le', 'ge', 'sub', 'sup', 'nsub', 'sube', 'supe', 'oplus', 'otimes', 'perp', 'sdot', 'lceil', 'rceil', 'lfloor', 'rfloor', 'lang', 'rang', 'loz', 'spades', 'clubs', 'hearts', 'diams;'
];

const xmlEntityDecoder_secondary_codes = [
    34, 38, 60, 62, 338, 339, 352, 353, 376, 710, 732, 8194, 8195, 8201, 8204, 8205, 8206, 8207, 8211, 8212, 8216, 8217, 8218, 8220, 8221, 8222, 8224, 8225, 8240, 8249, 8250, 8364, 402, 913, 914, 915, 916, 917, 918, 919, 920, 921, 922, 923, 924, 925, 926, 927, 928, 929, 931, 932, 933, 934, 935, 936, 937, 945, 946, 947, 948, 949, 950, 951, 952, 953, 954, 955, 956, 957, 958, 959, 960, 961, 962, 963, 964, 965, 966, 967, 968, 969, 977, 978, 982, 8226, 8230, 8242, 8243, 8254, 8260, 8472, 8465, 8476, 8482, 8501, 8592, 8593, 8594, 8595, 8596, 8629, 8656, 8657, 8658, 8659, 8660, 8704, 8706, 8707, 8709, 8711, 8712, 8713, 8715, 8719, 8721, 8722, 8727, 8730, 8733, 8734, 8736, 8743, 8744, 8745, 8746, 8747, 8756, 8764, 8773, 8776, 8800, 8801, 8804, 8805, 8834, 8835, 8836, 8838, 8839, 8853, 8855, 8869, 8901, 8968, 8969, 8970, 8971, 9001, 9002, 9674, 9824, 9827, 9829, 9830
];

const xmlEntityDecoder_rx_dec = /&#[0-9]{1,5};/g;
const xmlEntityDecoder_rx_hex = /&#x[a-fA-F0-9]{2,};/g;

function xmlEntityDecoder_decode(str, src, code) {
    return str.replace(new RegExp('&' + src + ';', 'g'), String.fromCharCode(code));
}

function xmlEntityDecoder_decode2(str, regex, start, radix) {
    let matches = str.match(regex);
    if (!matches) return str;
    
    for (let match of matches) {
        let charCode = parseInt(match.substring(start, match.length - 1), radix);
        let dec = charCode >= -32768 && charCode <= 65535 ? String.fromCharCode(charCode) : "";
        str = str.replace(match, dec);
    }
    
    return str;
}

function xmlEntityDecoder(str) {
    if (!str) return str;

    for (let i = 0 ; i < xmlEntityDecoder_primary.length ; i++)
        str = xmlEntityDecoder_decode(str, xmlEntityDecoder_primary[i], i + 160);
    
    for (let i = 0 ; i < xmlEntityDecoder_secondary.length ; i++)
        str = xmlEntityDecoder_decode(str, xmlEntityDecoder_secondary[i], xmlEntityDecoder_secondary_codes[i]);

    str = xmlEntityDecoder_decode2(str, xmlEntityDecoder_rx_dec, 2, 10);
    
    str = xmlEntityDecoder_decode2(str, xmlEntityDecoder_rx_hex, 3, 16);
    
    return str;
}



function importTemplate(name) {
    return document.importNode(document.getElementById("template-" + name).content.children[0], true);
}

function makeDOM(json_dom) {
    // [TAGNAME, ATTRS, [TAGNAME, ATTRS, ...]...]

    function render(def, par) {
        if (def[0] instanceof Array) {
            for (let child of def) render(child, par);
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
        for (let i = 2 ; i < def.length ; i++) {
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

function parseHTML(str) {
    let parser =new DOMParser();
    let doc = parser.parseFromString(str, "text/html");
    return document.importNode(doc.body.firstChild, true);
}


function clone_object(obj) {
    if (clone_object_common(obj)) return obj;
    return obj instanceof Array ? clone_object_clone_array(obj) : clone_object_iterate(obj);
}

function clone_object_common(o) {
    if (o === undefined || o === null) return true;
    switch(typeof(o)) {
        case "number":
        case "string":
        case "function":
        case "undefined":
            return true;
    }
    if (o instanceof Node) return true;
    return false;
}

function clone_object_iterate(i) {
    let o = {};
    let f = false;
    for (let p in i) {
        if (i[p] instanceof Array) {
            o[p] = clone_object_clone_array(i[p]);
        } else {
            if (clone_object_common(i[p]))
                o[p] = i[p];
            else
                o[p] = clone_object_iterate(i[p]);
        }
        f = true;
    }
    return f ? o : i;
}

function clone_object_clone_array(i) {
    let c = 0;
    for (let x of i) c++;
    let o = new Array(c);
    c = -1;
    for (let x of i) {
        c++;
        if (x instanceof Array)
            o[c] = clone_object_clone_array(x);
        else if (clone_object_common(x))
            o[c] = x;
        else
            o[c] = clone_object_iterate(x);
    }
    return o;
}


function node_share_take(node) {
    let parent = node.parentNode;
    if (!parent) return null;
    
    return {index: NODEGETINDEX(parent, node, true), parent};
}

function node_share_restore(node, parentInfo) {
    if (!parentInfo) return null;
    
    NODEINSERTAT(parentInfo.parent, parentInfo.index, node)
}


function youtube_playback_control(iframe, command, argument) {
    if (!iframe.contentWindow) return;// not loaded

    iframe.contentWindow.postMessage(JSON.stringify({
        event: "command",
        func: command,
        args: arguments.length < 3 ? "" : [argument]
    }), '*');
}

