function SlideoutListFactory(name) {
    this._header = makeDOM(["div", {'class': "section-header"}, name]);
    this._ul = makeDOM(["ul", {'class': "large"}]);
}

SlideoutListFactory.prototype.add = function(iconUrl, sectionName, sectionUrl) {
    let item = makeDOM(
        ["li", undefined,
            ["a", {'href': sectionUrl}, 
                ["img", {'src': iconUrl, 'loading': "lazy"}],
                sectionName
            ]
        ]
    );
    this._ul.appendChild(item);
    
    return item;
}

SlideoutListFactory.prototype.build = function(target) {
    target.appendChild(this._header);
    target.appendChild(this._ul);
}

SlideoutListFactory.createCountryList = function(item, countryList) {
    let base = makeDOM(
        ["div", {'class': "local icon-local", 'alt': LANG.pick_country},
            ["select", undefined,
                ["option", undefined, LANG.select_location + ":"]
            ]
        ]
    );
    item.appendChild(base);
    base = base.getElementsByTagName("select")[0];
    
    for (let country in countryList) {
        item = document.createElement("option");
            item.value = country;
            item.textContent = countryList[country].name;
        base.appendChild(item);
    }
};


