// js/config.js
// Sets API_BASE to the backend server when the page is served from a different dev server (e.g. Live Server)
(function () {
    // default: same-origin API
    let API_BASE = '';

    // If the page is being served on a port that is not the backend's (5000), point API_BASE to backend
    try {
        // Use Render backend URL for all frontend API calls
        API_BASE = 'https://vida-uqtj.onrender.com';
    } catch (e) {
        API_BASE = '';
    }

    // expose globally
    window.API_BASE = API_BASE;
})();
