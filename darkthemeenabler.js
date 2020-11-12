const DARKTHEME = "darktheme";

try {
    let darkMode;
    if (window.apiSettings) {
        darkMode = apiSettings.darkMode;
    } else {
        // api.js not loaded in time
        let obj = JSON.parse(localStorage.getItem("@mweb/appState"));
        darkMode = obj && obj.app.darkMode;
    }
    
    if (darkMode) document.body.classList.add(DARKTHEME);
} catch(e) {
    console.error("splash screen", e);
}

