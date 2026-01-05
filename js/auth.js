import { avatarToDataURL, getInitials, AVATAR_PRESETS } from './avatar-generator.js';

const API_URL = 'http://localhost:3001/api';

// DOM Elements
const form = document.getElementById('auth-form');
const nameGroup = document.getElementById('name-group');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const submitBtn = document.getElementById('submit-btn');
const switchBtn = document.getElementById('switch-btn');
const switchText = document.getElementById('switch-text');

// State
let isLogin = true;

// Check query params for mode
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('mode') === 'register') {
    toggleMode();
}

// Check if already logged in
const existingToken = localStorage.getItem('goalforge_token');
if (existingToken) {
    // Verify token is still valid
    verifyToken(existingToken);
}

async function verifyToken(token) {
    try {
        const response = await fetch(`${API_URL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            window.location.href = '/pages/dashboard.html';
        }
    } catch (error) {
        // Token invalid, stay on auth page
        localStorage.removeItem('goalforge_token');
        localStorage.removeItem('goalforge_user');
    }
}

// Event Listeners
switchBtn.addEventListener('click', toggleMode);
form.addEventListener('submit', handleAuth);

function toggleMode() {
    isLogin = !isLogin;

    if (isLogin) {
        nameGroup.style.display = 'none';
        pageTitle.textContent = 'Welcome Back';
        pageSubtitle.textContent = 'Enter your details to access your account.';
        submitBtn.textContent = 'Sign In';
        switchText.textContent = "Don't have an account?";
        switchBtn.textContent = 'Create one';
    } else {
        nameGroup.style.display = 'block';
        nameGroup.style.animation = 'fadeIn 0.3s ease';
        pageTitle.textContent = 'Create Account';
        pageSubtitle.textContent = 'Start your journey to greatness today.';
        submitBtn.textContent = 'Get Started';
        switchText.textContent = 'Already have an account?';
        switchBtn.textContent = 'Sign In';
    }
}

async function handleAuth(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;

    // Validation
    if (!email || !password || (!isLogin && !name)) {
        showError('Please fill in all fields');
        return;
    }

    if (!isLogin && password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }

    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    try {
        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        const body = isLogin ? { email, password } : { email, password, name };

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Authentication failed');
        }

        // Save token and user data
        localStorage.setItem('goalforge_token', data.token);
        localStorage.setItem('goalforge_user', JSON.stringify(data.user));

        // Redirect
        if (isLogin) {
            window.location.href = '/pages/dashboard.html';
        } else {
            window.location.href = '/pages/onboarding.html';
        }
    } catch (error) {
        console.error('Auth error:', error);
        showError(error.message || 'Something went wrong. Please try again.');
        submitBtn.textContent = isLogin ? 'Sign In' : 'Get Started';
        submitBtn.disabled = false;
    }
}

function showError(message) {
    // Remove existing error
    const existingError = document.querySelector('.auth-error');
    if (existingError) {
        existingError.remove();
    }

    // Create error element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    errorDiv.style.cssText = `
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #ef4444;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 0.875rem;
        animation: fadeIn 0.3s ease;
    `;
    errorDiv.textContent = message;

    form.insertBefore(errorDiv, form.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// Utility function to get auth headers
export function getAuthHeaders() {
    const token = localStorage.getItem('goalforge_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Utility function to check if logged in
export function isLoggedIn() {
    return !!localStorage.getItem('goalforge_token');
}

// Utility function to logout
export function logout() {
    localStorage.removeItem('goalforge_token');
    localStorage.removeItem('goalforge_user');
    window.location.href = '/pages/auth.html';
}

// Utility function to get current user
export function getCurrentUser() {
    const userStr = localStorage.getItem('goalforge_user');
    return userStr ? JSON.parse(userStr) : null;
}
