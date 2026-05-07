// js/config.js
// Sets API_BASE to the backend server when the page is served from a different dev server (e.g. Live Server)
(function () {
    // default: same-origin API
    let API_BASE = '';

    // If the page is being served on a port that is not the backend's (5000), point API_BASE to backend
    try {
        const port = window.location.port;
        if (port && port !== '5000') {
            API_BASE = 'http://localhost:5000';
        }
    } catch (e) {
        API_BASE = '';
    }

    // expose globally
    window.API_BASE = API_BASE;
})();
