import { generateAvatar, getInitials } from './avatar-generator.js';

const API_URL = 'http://localhost:3001/api';

// Check auth
const token = localStorage.getItem('goalforge_token');
if (!token) {
    window.location.href = '/pages/auth.html';
}

let currentUser = null;
let notifications = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    setGreeting();
});

// Load user data
async function loadUserData() {
    try {
        const response = await fetch(`${API_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            currentUser = await response.json();
            updateUI();
            loadDashboardData();
        } else {
            // Redirect to login if unauthorized
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('goalforge_token');
                window.location.href = '/pages/auth.html';
            }
        }
    } catch (error) {
        console.error('Error loading user:', error);
    }
}

// Update UI with user data
function updateUI() {
    if (!currentUser) return;

    // Update greeting
    const greeting = document.getElementById('greeting');
    if (greeting) {
        const timeOfDay = getTimeOfDay();
        greeting.textContent = `Good ${timeOfDay}, ${currentUser.name.split(' ')[0]}`;
    }

    // Update user initials
    const initials = getInitials(currentUser.name);
    const userInitials = document.getElementById('user-initials');
    if (userInitials) {
        userInitials.textContent = initials;
    }

    // Update sidebar
    const sidebarName = document.getElementById('sidebar-name');
    if (sidebarName) {
        sidebarName.textContent = currentUser.name;
    }

    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (sidebarAvatar) {
        const colors = currentUser.avatar_colors || ['#6366f1', '#8b5cf6'];
        const avatarSvg = generateAvatar(
            currentUser.avatar_type || 'gradient',
            currentUser.avatar_seed || currentUser.id,
            colors,
            initials
        );
        sidebarAvatar.innerHTML = avatarSvg;
        sidebarAvatar.style.background = 'transparent';
    }

    // Update header avatar
    const profileBtn = document.getElementById('user-profile-btn');
    if (profileBtn) {
        const colors = currentUser.avatar_colors || ['#6366f1', '#8b5cf6'];
        const avatarSvg = generateAvatar(
            currentUser.avatar_type || 'gradient',
            currentUser.avatar_seed || currentUser.id,
            colors,
            initials
        );
        profileBtn.querySelector('#user-initials').outerHTML = avatarSvg;
        profileBtn.style.background = 'transparent';
    }

    // Update streak badge
    const streak = currentUser.current_streak || 0;
    const streakBadge = document.getElementById('streak-badge');
    const streakCount = document.getElementById('streak-count');
    const mainStreak = document.getElementById('main-streak');
    const streakMessage = document.getElementById('streak-message');

    if (streak > 0) {
        if (streakBadge) {
            streakBadge.style.display = 'flex';
            streakCount.textContent = streak;
        }
        if (mainStreak) {
            mainStreak.textContent = streak;
        }
        if (streakMessage) {
            if (streak >= 30) {
                streakMessage.textContent = "You're unstoppable! 🚀";
            } else if (streak >= 14) {
                streakMessage.textContent = "You're in the top 10%! Keep it up!";
            } else if (streak >= 7) {
                streakMessage.textContent = "One week strong! 💪";
            } else {
                streakMessage.textContent = "Great start! Keep going!";
            }
        }
    } else {
        if (mainStreak) {
            mainStreak.textContent = '0';
        }
        if (streakMessage) {
            streakMessage.textContent = 'Start your journey today!';
        }
    }
}

// Load dashboard data
async function loadDashboardData() {
    // Load habits (placeholder for now)
    loadHabits();

    // Load leaderboard
    loadLeaderboard();

    // Load notifications
    loadNotifications();
}

// Load habits
function loadHabits() {
    const habitsList = document.getElementById('habits-list');
    // For now, show empty state
    // This will be populated when habits feature is implemented
}

// Load leaderboard
async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/leaderboard/friends`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const leaderboard = await response.json();
            renderLeaderboard(leaderboard.slice(0, 3));
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// Render leaderboard
function renderLeaderboard(users) {
    const container = document.getElementById('leaderboard-preview');
    if (!users || users.length === 0) {
        return; // Keep empty state
    }

    container.innerHTML = users.map((user, index) => {
        const initials = getInitials(user.name);
        const colors = user.avatar_colors || ['#6366f1', '#8b5cf6'];
        const avatarSvg = generateAvatar(
            user.avatar_type || 'gradient',
            user.avatar_seed || user.id,
            colors,
            initials
        );

        const isCurrentUser = user.id === currentUser?.id;

        return `
            <div class="leaderboard-mini-item" style="${isCurrentUser ? 'background: rgba(99, 102, 241, 0.1); border-radius: var(--radius-sm); padding: var(--space-sm);' : ''}">
                <span style="font-weight: bold; width: 20px;">${index + 1}</span>
                <div style="width: 30px; height: 30px; border-radius: 50%; overflow: hidden;">
                    ${avatarSvg}
                </div>
                <span style="flex: 1;">${isCurrentUser ? 'You' : user.name}</span>
                <span style="color: var(--warning);">${user.xp || 0} pts</span>
            </div>
        `;
    }).join('');
}

// Load notifications
async function loadNotifications() {
    // Placeholder for notifications
    // This will be implemented with real notification system
    notifications = [];
    updateNotificationBadge();
}

// Update notification badge
function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
        if (notifications.length > 0) {
            badge.style.display = 'flex';
            badge.textContent = notifications.length;
        } else {
            badge.style.display = 'none';
        }
    }
}

// Toggle notifications dropdown
function toggleNotifications() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) {
        const isVisible = dropdown.style.display !== 'none';
        dropdown.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            renderNotifications();
        }
    }
}

// Render notifications
function renderNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: var(--space-xl); color: var(--text-muted);">
                <p>🔔</p>
                <p style="margin-top: 8px;">No new notifications</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notifications.map(notif => `
        <div style="padding: var(--space-md); border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="font-weight: 600; margin-bottom: 4px;">${notif.title}</div>
            <div style="font-size: 0.875rem; color: var(--text-muted);">${notif.message}</div>
            <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">${notif.time}</div>
        </div>
    `).join('');
}

// Get time of day
function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
}

// Set greeting
function setGreeting() {
    const greeting = document.getElementById('greeting');
    if (greeting && !currentUser) {
        const timeOfDay = getTimeOfDay();
        greeting.textContent = `Good ${timeOfDay}`;
    }
}

// Close notifications when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notifications-dropdown');
    const btn = document.getElementById('notifications-btn');

    if (dropdown && btn && dropdown.style.display !== 'none') {
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    }
});

// Make functions global
window.toggleNotifications = toggleNotifications;
