import {
    generateAvatar,
    avatarToDataURL,
    getInitials,
    AVATAR_PRESETS
} from './avatar-generator.js';

const API_URL = 'http://localhost:3001/api';

// State
let currentUser = null;
let selectedAvatar = null;
let currentAvatarType = 'gradient';
let avatarSeed = Date.now().toString();

// Check auth on load
const token = localStorage.getItem('goalforge_token');
if (!token) {
    window.location.href = '/pages/auth.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    setupEventListeners();
});

// Load user data from API
async function loadUserData() {
    try {
        const response = await fetch(`${API_URL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('goalforge_token');
                localStorage.removeItem('goalforge_user');
                window.location.href = '/pages/auth.html';
                return;
            }
            throw new Error('Failed to load profile');
        }

        currentUser = await response.json();
        localStorage.setItem('goalforge_user', JSON.stringify(currentUser));

        renderProfile();
        renderSettings();
    } catch (error) {
        console.error('Error loading user data:', error);
        // Try to use cached data
        const cachedUser = localStorage.getItem('goalforge_user');
        if (cachedUser) {
            currentUser = JSON.parse(cachedUser);
            renderProfile();
            renderSettings();
        }
    }
}

// Render profile header
function renderProfile() {
    if (!currentUser) return;

    // Avatar
    const avatarEl = document.getElementById('profile-avatar');
    const initials = getInitials(currentUser.name);
    const colors = currentUser.avatar_colors || ['#6366f1', '#8b5cf6'];
    const svg = generateAvatar(
        currentUser.avatar_type || 'gradient',
        currentUser.avatar_seed || currentUser.id,
        colors,
        currentUser.avatar_type === 'gradient' ? initials : ''
    );
    avatarEl.innerHTML = svg;

    // Info
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-bio').textContent = currentUser.bio || 'Welcome to GoalForge!';
    document.getElementById('profile-email').textContent = currentUser.email;

    // Format date
    const joinDate = new Date(currentUser.created_at);
    document.getElementById('member-since').textContent = joinDate.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
    });

    // Stats
    document.getElementById('stat-level').textContent = currentUser.level || 1;
    document.getElementById('stat-streak').textContent = currentUser.current_streak || 0;
    document.getElementById('stat-xp').textContent = currentUser.xp || 0;

    // Update avatar state
    currentAvatarType = currentUser.avatar_type || 'gradient';
    avatarSeed = currentUser.avatar_seed || currentUser.id;
    selectedAvatar = {
        type: currentAvatarType,
        seed: avatarSeed,
        colors: colors
    };
}

// Render settings from user data
function renderSettings() {
    if (!currentUser) return;

    // Account settings
    document.getElementById('setting-name').value = currentUser.name || '';
    document.getElementById('setting-bio').value = currentUser.bio || '';
    document.getElementById('setting-email').value = currentUser.email || '';

    // Load saved settings
    const settings = currentUser.settings || {};

    // Toggle switches
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
        const settingName = toggle.dataset.setting;
        if (settings[settingName] !== undefined) {
            toggle.classList.toggle('active', settings[settingName]);
        }
    });

    // Display settings
    if (settings.theme) {
        document.getElementById('setting-theme').value = settings.theme;
    }
    if (settings.accent_color) {
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.color === settings.accent_color);
        });
    }
    if (settings.date_format) {
        document.getElementById('setting-date-format').value = settings.date_format;
    }
    if (settings.week_start) {
        document.getElementById('setting-week-start').value = settings.week_start;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;

            // Update tab states
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update panels
            document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(`panel-${tabId}`).classList.add('active');
        });
    });

    // Toggle switches
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
        });
    });

    // Color options
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        });
    });

    // Avatar type tabs
    document.querySelectorAll('.avatar-type-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentAvatarType = tab.dataset.type;
            document.querySelectorAll('.avatar-type-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            generateAvatarOptions();
        });
    });
}

// Save all settings
async function saveSettings() {
    if (!currentUser) return;

    const settings = {};

    // Collect toggle settings
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
        settings[toggle.dataset.setting] = toggle.classList.contains('active');
    });

    // Collect other settings
    settings.theme = document.getElementById('setting-theme').value;
    settings.date_format = document.getElementById('setting-date-format').value;
    settings.week_start = document.getElementById('setting-week-start').value;

    const activeColor = document.querySelector('.color-option.active');
    if (activeColor) {
        settings.accent_color = activeColor.dataset.color;
    }

    // Build update object
    const updates = {
        name: document.getElementById('setting-name').value,
        bio: document.getElementById('setting-bio').value,
        settings: settings
    };

    try {
        const response = await fetch(`${API_URL}/user/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            throw new Error('Failed to save settings');
        }

        currentUser = await response.json();
        localStorage.setItem('goalforge_user', JSON.stringify(currentUser));

        showToast('Settings saved successfully!', 'success');
        renderProfile();
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Failed to save settings', 'error');
    }
}

// Avatar Modal Functions
function openAvatarModal() {
    document.getElementById('avatar-modal').classList.add('active');
    generateAvatarOptions();
}

function closeAvatarModal() {
    document.getElementById('avatar-modal').classList.remove('active');
}

function generateAvatarOptions() {
    const grid = document.getElementById('avatar-grid');
    grid.innerHTML = '';

    const initials = getInitials(currentUser?.name || 'User');

    // Generate 12 avatar options
    for (let i = 0; i < 12; i++) {
        const seed = avatarSeed + '_' + i;
        const preset = AVATAR_PRESETS[i % AVATAR_PRESETS.length];
        const colors = preset.colors;

        const svg = generateAvatar(
            currentAvatarType,
            seed,
            colors,
            currentAvatarType === 'gradient' ? initials : ''
        );

        const option = document.createElement('div');
        option.className = 'avatar-option';
        option.innerHTML = svg;
        option.dataset.seed = seed;
        option.dataset.colors = JSON.stringify(colors);

        if (selectedAvatar && selectedAvatar.seed === seed && selectedAvatar.type === currentAvatarType) {
            option.classList.add('selected');
        }

        option.addEventListener('click', () => {
            document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedAvatar = {
                type: currentAvatarType,
                seed: seed,
                colors: colors
            };
        });

        grid.appendChild(option);
    }
}

function regenerateAvatars() {
    avatarSeed = Date.now().toString();
    generateAvatarOptions();
}

async function saveAvatar() {
    if (!selectedAvatar) {
        showToast('Please select an avatar', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/user/avatar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                avatar_type: selectedAvatar.type,
                avatar_seed: selectedAvatar.seed,
                avatar_colors: selectedAvatar.colors
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save avatar');
        }

        currentUser.avatar_type = selectedAvatar.type;
        currentUser.avatar_seed = selectedAvatar.seed;
        currentUser.avatar_colors = selectedAvatar.colors;
        localStorage.setItem('goalforge_user', JSON.stringify(currentUser));

        renderProfile();
        closeAvatarModal();
        showToast('Avatar updated!', 'success');
    } catch (error) {
        console.error('Error saving avatar:', error);
        showToast('Failed to update avatar', 'error');
    }
}

// Logout function
function logout() {
    localStorage.removeItem('goalforge_token');
    localStorage.removeItem('goalforge_user');
    window.location.href = '/pages/auth.html';
}

// Toast notification
function showToast(message, type = 'info') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 2000;
        animation: slideUp 0.3s ease;
        ${type === 'success' ? 'background: #10b981;' : ''}
        ${type === 'error' ? 'background: #ef4444;' : ''}
        ${type === 'info' ? 'background: #6366f1;' : ''}
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Make functions available globally
window.openAvatarModal = openAvatarModal;
window.closeAvatarModal = closeAvatarModal;
window.regenerateAvatars = regenerateAvatars;
window.saveAvatar = saveAvatar;
window.saveSettings = saveSettings;
window.loadUserData = loadUserData;
window.logout = logout;
