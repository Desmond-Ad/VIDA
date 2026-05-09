// js/auth.js - Authentication utility functions

/**
 * Get JWT token from localStorage
 */
function getToken() {
    return localStorage.getItem('authToken');
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
    return !!getToken();
}

/**
 * Get current user info
 */
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

/**
 * Logout - clear token and redirect to login
 */
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/Public/login.html';
}

/**
 * Fetch with automatic JWT token injection
 */
async function fetchWithToken(url, options = {}) {
    const token = getToken();
    
    if (!token) {
        console.warn('No token found. Redirecting to login...');
        logout();
        throw new Error('No token');
    }

    // Add Authorization header
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    try {
        // If API_BASE is set (from js/config.js), prefix relative URLs
        const base = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : '';
        const finalUrl = (url && url.startsWith('/')) ? (base + url) : url;
        
        console.log('🔧 fetchWithToken: base =', base, 'url =', url, 'finalUrl =', finalUrl);

        const response = await fetch(finalUrl, {
            ...options,
            headers
        });

        // If unauthorized (not authenticated) -> logout and redirect to login
        if (response.status === 401) {
            console.warn('Unauthorized. Redirecting to login...');
            logout();
            throw new Error('Unauthorized');
        }

        // If forbidden (authenticated but insufficient privileges) -> redirect to purchase page
        if (response.status === 403) {
            console.warn('Forbidden: insufficient privileges. Redirecting to Purchase page...');
            window.location.href = '/Purchase.html';
            throw new Error('Forbidden');
        }

        return response;
    } catch (err) {
        console.error('Fetch error:', err);
        throw err;
    }
}

/**
 * Check auth on page load and redirect if not logged in
 */
function checkAuth() {
    // Don't redirect if already on login page
    if (window.location.pathname.includes('login.html')) {
        return;
    }
    
    if (!isLoggedIn()) {
        console.warn('Not logged in. Redirecting to login page...');
        window.location.href = '/Public/login.html';
    }

    // If user is logged in but not admin, disallow access to Dashboard page
    const user = getCurrentUser();

    // Dashboard -> admin only
    if (window.location.pathname.includes('Dashboard.html') && (!user || user.role !== 'admin')) {
        console.warn('Non-admin attempting to access Dashboard. Redirecting to login page...');
        window.location.href = '/Public/login.html?next=dashboard';
        return;
    }

    // Purchase page -> purchase role or admin
    if (window.location.pathname.includes('Purchase.html') && (!user || (user.role !== 'purchase' && user.role !== 'admin'))) {
        console.warn('Unauthorized access to Purchase page. Redirecting to login...');
        window.location.href = '/Public/login.html?next=purchase';
        return;
    }

    // rev page -> rev role or admin
    if (window.location.pathname.toLowerCase().includes('rev.html') && (!user || (user.role !== 'rev' && user.role !== 'admin'))) {
        console.warn('Unauthorized access to Rev page. Redirecting to login...');
        window.location.href = '/Public/login.html?next=rev';
        return;
    }
}

/**
 * Return true when current logged-in user is an admin
 */
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

/**
 * Add logout button to navbar (if present)
 */
function addLogoutButton() {
    const nav = document.querySelector('nav');
    if (!nav) return;

    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Logout';
    logoutBtn.style.marginLeft = '20px';
    logoutBtn.style.padding = '8px 16px';
    logoutBtn.style.background = '#e74c3c';
    logoutBtn.style.color = 'white';
    logoutBtn.style.border = 'none';
    logoutBtn.style.borderRadius = '4px';
    logoutBtn.style.cursor = 'pointer';
    logoutBtn.addEventListener('click', logout);
    nav.appendChild(logoutBtn);

    // Role-based nav: show/hide Dashboard link based on role
    if (isLoggedIn()) {
        if (isAdmin()) {
            // ensure Dashboard link exists
            if (!nav.querySelector('a[href*="Dashboard.html"]')) {
                const dashLink = document.createElement('a');
                dashLink.href = '/Public/Dashboard.html';
                dashLink.textContent = 'Dashboard';
                dashLink.style.marginLeft = '12px';
                nav.appendChild(dashLink);
            }
        } else {
            // remove dashboard links for non-admins
            nav.querySelectorAll('a[href*="Dashboard.html"]').forEach(a => a.remove());
        }
    }
}

// Auto-check auth and add logout button on page load
document.addEventListener('DOMContentLoaded', function () {
    checkAuth();
    addLogoutButton();
});
