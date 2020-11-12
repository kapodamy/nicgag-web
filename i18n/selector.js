function i18n_selector() {
    let lang = navigator.language.split('-');

    switch(lang[0]) {
        case "es":
            switch(lang[1]) {
                case "AR":
                case "419":
                case "es":
                default:
                return lang[0];
            }
            break;
        case "en":
            return lang[0];
    }

    return "en";// default
}

