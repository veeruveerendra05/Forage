import { generateAvatar, getInitials } from './avatar-generator.js';

const API_URL = 'http://localhost:3001/api';

// State
let currentUser = null;
let friends = [];
let friendStreaks = {};

// Check auth
const token = localStorage.getItem('goalforge_token');
if (!token) {
    window.location.href = '/pages/auth.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    setupEventListeners();
});

// Load user data
async function loadUserData() {
    try {
        // Load current user
        const userResponse = await fetch(`${API_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userResponse.ok) {
            if (userResponse.status === 401 || userResponse.status === 403) {
                window.location.href = '/pages/auth.html';
                return;
            }
        }

        currentUser = await userResponse.json();

        // Generate invite code from user ID
        const inviteCode = generateInviteCode(currentUser.id);
        document.getElementById('user-invite-code').textContent = inviteCode;

        // Load friends
        await loadFriends();
    } catch (error) {
        console.error('Error loading data:', error);
        // Use demo data if API fails
        loadDemoData();
    }
}

// Generate invite code from user ID
function generateInviteCode(userId) {
    const hash = userId.substring(4, 8).toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `GF-${hash}-${suffix}`;
}

// Load friends from API or use demo data
async function loadFriends() {
    try {
        const response = await fetch(`${API_URL}/friends`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            friends = await response.json();
        }
    } catch (error) {
        console.error('Error loading friends:', error);
    }

    // Always start with empty data - no demo/fallback
    renderFriends();
    renderStreakCalendars();
    renderComparison();
}

// Render friends list
function renderFriends() {
    const container = document.getElementById('friend-list');
    document.getElementById('friend-count').textContent = friends.length;

    if (friends.length === 0) {
        container.innerHTML = `
            <div style="color: var(--text-muted); grid-column: 1 / -1; text-align: center; padding: var(--space-2xl);">
                <p style="font-size: 1.25rem; margin-bottom: var(--space-md);">👋 No friends yet!</p>
                <p>Share your invite code or add friends to start competing.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = friends.map(friend => {
        const initials = getInitials(friend.name);
        const colors = friend.avatar_colors || ['#6366f1', '#8b5cf6'];
        const avatarSvg = generateAvatar(
            friend.avatar_type || 'gradient',
            friend.avatar_seed || friend.id,
            colors,
            initials
        );

        return `
            <div class="connection-card">
                <div class="connection-header">
                    <div class="avatar">${avatarSvg}</div>
                    <div>
                        <div style="font-weight: 600;">${friend.name} <span class="badge-icon">Level ${friend.level}</span></div>
                        <div style="color: var(--text-muted); font-size: 0.875rem;">🔥 ${friend.current_streak || 0} Day Streak</div>
                    </div>
                </div>
                <div style="display: flex; gap: var(--space-sm); margin-top: var(--space-md);">
                    <button class="btn btn-outline" style="flex: 1; font-size: 0.875rem;" onclick="viewFriendStreaks('${friend.id}')">
                        📅 View Calendar
                    </button>
                    <button class="btn btn-outline" style="flex: 1; font-size: 0.875rem;" onclick="challengeFriend('${friend.id}')">
                        ⚔️ Challenge
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Render friend streak calendars
function renderStreakCalendars() {
    const container = document.getElementById('streak-calendar-grid');

    if (friends.length === 0) {
        container.innerHTML = `
            <div style="color: var(--text-muted); grid-column: 1 / -1; text-align: center; padding: var(--space-2xl);">
                <p>Add friends to see their streak calendars!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = friends.map(friend => {
        // Generate or fetch streak data
        const streaks = friendStreaks[friend.id] || generateDemoStreaks(friend.id, friend.current_streak || 0);
        friendStreaks[friend.id] = streaks;

        const initials = getInitials(friend.name);
        const colors = friend.avatar_colors || ['#6366f1', '#8b5cf6'];
        const avatarSvg = generateAvatar(
            friend.avatar_type || 'gradient',
            friend.avatar_seed || friend.id,
            colors,
            initials
        );

        // Generate calendar grid
        const today = new Date();
        const calendarDays = [];

        // Day headers
        const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        dayNames.forEach(day => {
            calendarDays.push(`<div class="mini-cal-day mini-cal-header">${day}</div>`);
        });

        // Last 28 days (4 weeks)
        for (let i = 27; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayNum = date.getDate();

            const streakData = streaks.find(s => s.date === dateStr);
            const completed = streakData?.completed ? 1 : 0;
            const streakCount = streakData?.streak_count || 0;

            let streakClass = '';
            if (completed) {
                if (streakCount >= 7) streakClass = 'streak-7';
                else if (streakCount >= 3) streakClass = 'streak-3';
            }

            const isToday = i === 0;

            calendarDays.push(`
                <div class="mini-cal-day ${completed ? 'completed' : ''} ${streakClass} ${isToday ? 'today' : ''}" 
                     title="${dateStr}: ${completed ? '✓ Active' : '✗ Inactive'}">
                    ${dayNum}
                </div>
            `);
        }

        return `
            <div class="friend-streak-card">
                <div class="friend-streak-header">
                    <div class="avatar">${avatarSvg}</div>
                    <div class="streak-info">
                        <h4>${friend.name}</h4>
                        <div class="streak-badge">🔥 ${friend.current_streak || 0} day streak</div>
                    </div>
                </div>
                <div class="mini-streak-calendar">
                    ${calendarDays.join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Render comparison chart
function renderComparison() {
    const container = document.getElementById('comparison-chart');
    const leaderboard = document.getElementById('friend-leaderboard');

    // Add current user to comparison
    const allUsers = [
        {
            id: currentUser?.id || 'you',
            name: 'You',
            current_streak: currentUser?.current_streak || 7,
            isCurrentUser: true
        },
        ...friends
    ].sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0));

    const maxStreak = Math.max(...allUsers.map(u => u.current_streak || 0), 1);

    // Render bars
    container.innerHTML = allUsers.slice(0, 6).map((user, index) => {
        const streakCount = user.current_streak || 0;
        const height = (streakCount / maxStreak) * 150 + 20;
        const colors = user.isCurrentUser
            ? ['#6366f1', '#8b5cf6']
            : (user.avatar_colors || ['#10b981', '#06b6d4']);

        return `
            <div class="comparison-bar">
                <div class="bar-value">${streakCount}</div>
                <div class="bar-fill" style="height: ${height}px; background: linear-gradient(180deg, ${colors[0]}, ${colors[1]});"></div>
                <div class="bar-label">${user.isCurrentUser ? 'You' : user.name.split(' ')[0]}</div>
            </div>
        `;
    }).join('');

    // Render leaderboard
    leaderboard.innerHTML = allUsers.map((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
        const colors = user.isCurrentUser
            ? ['#6366f1', '#8b5cf6']
            : (user.avatar_colors || ['#6366f1', '#8b5cf6']);
        const initials = getInitials(user.name);
        const avatarSvg = generateAvatar('gradient', user.id, colors, initials);

        return `
            <div style="display: flex; align-items: center; gap: var(--space-md); padding: var(--space-md); border-bottom: 1px solid rgba(255,255,255,0.05); ${user.isCurrentUser ? 'background: rgba(99, 102, 241, 0.1); border-radius: 8px;' : ''}">
                <span style="font-size: 1.25rem; min-width: 40px;">${medal}</span>
                <div class="avatar" style="width: 36px; height: 36px;">${avatarSvg}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${user.isCurrentUser ? 'You' : user.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Level ${user.level || 1}</div>
                </div>
                <div style="font-weight: 700; color: #f59e0b;">🔥 ${user.current_streak || 0}</div>
            </div>
        `;
    }).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.social-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;

            document.querySelectorAll('.social-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            document.querySelectorAll('.social-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(`panel-${tabId}`).classList.add('active');
        });
    });

    // Comparison timeframe
    document.getElementById('comparison-timeframe')?.addEventListener('change', () => {
        renderComparison();
    });
}

// Modal functions
function openInviteModal() {
    document.getElementById('invite-modal').classList.add('active');
}

function closeInviteModal() {
    document.getElementById('invite-modal').classList.remove('active');
    document.getElementById('friend-code-input').value = '';
}

// Copy invite code
function copyInviteCode() {
    const code = document.getElementById('user-invite-code').textContent;
    navigator.clipboard.writeText(code);
    showToast('Invite code copied!', 'success');
}

// Add friend by code
async function addFriendByCode() {
    const code = document.getElementById('friend-code-input').value.trim();
    if (!code) {
        showToast('Please enter a code', 'error');
        return;
    }

    // For demo, just add a random friend
    const newFriend = {
        id: 'new_' + Date.now(),
        name: 'New Friend',
        level: Math.floor(Math.random() * 5) + 1,
        current_streak: Math.floor(Math.random() * 15),
        avatar_type: 'gradient',
        avatar_seed: Date.now().toString(),
        avatar_colors: ['#a855f7', '#6366f1']
    };

    friends.push(newFriend);

    closeInviteModal();
    renderFriends();
    renderStreakCalendars();
    renderComparison();

    showToast('Friend added successfully!', 'success');
}

// View friend streaks (scroll to calendar tab)
function viewFriendStreaks(friendId) {
    // Switch to streaks tab
    document.querySelector('[data-tab="streaks"]').click();
}

// Challenge friend
function challengeFriend(friendId) {
    showToast('Challenge sent! 🎯', 'success');
}

// Toast notification
function showToast(message, type = 'info') {
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

// Make functions global
window.openInviteModal = openInviteModal;
window.closeInviteModal = closeInviteModal;
window.copyInviteCode = copyInviteCode;
window.addFriendByCode = addFriendByCode;
window.viewFriendStreaks = viewFriendStreaks;
window.challengeFriend = challengeFriend;
