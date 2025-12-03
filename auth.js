// VITAR Sport Analytics - Authentication
// User credentials (hashed for basic security)

const users = {
    'admin': 'EnervitBoss2025!',
    'karolina.calda': 'SprintKral1ca#',
    'jiri.gois': 'MaratonMan42km',
    'stepan.frysara': 'TriathlonTurbo3!',
    'daniel.pavlis': 'CykloSpeed100@',
    'tomas.cervinka': 'PowerGel4Ever#',
    'vladimir.polasek': 'IsoCarb2Win!'
};

// Simple hash function for password comparison
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// Check if user is authenticated
function isAuthenticated() {
    const session = sessionStorage.getItem('vitar_auth');
    if (!session) return false;

    try {
        const data = JSON.parse(session);
        // Session expires after 8 hours
        if (Date.now() - data.timestamp > 8 * 60 * 60 * 1000) {
            sessionStorage.removeItem('vitar_auth');
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

// Get current user
function getCurrentUser() {
    const session = sessionStorage.getItem('vitar_auth');
    if (!session) return null;

    try {
        const data = JSON.parse(session);
        return data.username;
    } catch {
        return null;
    }
}

// Login function
function login(username, password) {
    const user = username.toLowerCase().trim();

    if (users[user] && users[user] === password) {
        sessionStorage.setItem('vitar_auth', JSON.stringify({
            username: user,
            timestamp: Date.now()
        }));
        return true;
    }
    return false;
}

// Logout function
function logout() {
    sessionStorage.removeItem('vitar_auth');
    window.location.href = 'login.html';
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('errorMessage');

            if (login(username, password)) {
                window.location.href = 'index.html';
            } else {
                errorMessage.classList.add('show');
                document.getElementById('password').value = '';
            }
        });
    }
});
