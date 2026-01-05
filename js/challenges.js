import { generateAvatar, getInitials } from './avatar-generator.js';

const API_URL = 'http://localhost:3001/api';

// State
let currentUser = null;
let challenges = [];
let currentChallenge = null;
let messagePolling = null;

// Check auth
const token = localStorage.getItem('goalforge_token');
if (!token) {
    window.location.href = '/pages/auth.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    loadChallenges();

    // Set default dates for create form
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    document.getElementById('challenge-start').value = today;
    document.getElementById('challenge-end').value = nextMonth;
});

// Load user data
async function loadUserData() {
    try {
        const response = await fetch(`${API_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            currentUser = await response.json();
        }
    } catch (error) {
        console.error('Error loading user:', error);
    }
}

// Load all challenges
async function loadChallenges() {
    try {
        const response = await fetch(`${API_URL}/challenges`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            challenges = await response.json();
        }
    } catch (error) {
        console.error('Error loading challenges:', error);
    }

    // Always start with empty data - no demo/fallback
    renderChallenges();
}

// Render challenges grid
function renderChallenges() {
    const container = document.getElementById('challenge-grid');

    if (challenges.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚔️</div>
                <p style="font-size: 1.25rem; margin-bottom: 8px;">No active challenges</p>
                <p>Create a challenge to compete with friends!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = challenges.map(challenge => {
        const daysLeft = Math.ceil((new Date(challenge.end_date) - new Date()) / (1000 * 60 * 60 * 24));
        const goalTypeEmoji = {
            'steps': '🚶',
            'habits': '✅',
            'reading': '📚',
            'coding': '💻',
            'custom': '🎯'
        };

        return `
            <div class="challenge-card" onclick="openChallenge('${challenge.id}')">
                <div class="challenge-header">
                    <span class="challenge-badge badge-${challenge.status}">${challenge.status}</span>
                </div>
                <h3 class="challenge-title">${challenge.title}</h3>
                <p class="challenge-description">${challenge.description || 'No description'}</p>
                <div class="challenge-meta">
                    <div class="meta-item">
                        <span>${goalTypeEmoji[challenge.goal_type] || '🎯'}</span>
                        <span>${challenge.goal_target} ${challenge.goal_type}</span>
                    </div>
                    <div class="meta-item">
                        <span>👥</span>
                        <span>${challenge.participant_count || 0} joined</span>
                    </div>
                    <div class="meta-item">
                        <span>⏰</span>
                        <span>${daysLeft} days left</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Open challenge detail
async function openChallenge(challengeId) {
    try {
        const response = await fetch(`${API_URL}/challenges/${challengeId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            currentChallenge = await response.json();
            renderChallengeDetail();
            document.getElementById('challenge-detail').classList.add('active');
            startMessagePolling();
        } else {
            showToast('Challenge not found', 'error');
        }
    } catch (error) {
        console.error('Error loading challenge:', error);
        showToast('Failed to load challenge', 'error');
    }
}

// Render challenge detail
function renderChallengeDetail() {
    if (!currentChallenge) return;

    // Header
    document.getElementById('detail-title').textContent = currentChallenge.title;
    document.getElementById('detail-description').textContent = currentChallenge.description || 'No description';

    // Stats
    document.getElementById('detail-goal').textContent = `${currentChallenge.goal_target} ${currentChallenge.goal_type}`;
    document.getElementById('detail-participants').textContent = currentChallenge.participants?.length || 0;

    const daysLeft = Math.ceil((new Date(currentChallenge.end_date) - new Date()) / (1000 * 60 * 60 * 24));
    document.getElementById('detail-ends').textContent = `${daysLeft} days`;

    // Leaderboard
    const leaderboardContainer = document.getElementById('challenge-leaderboard-list');
    const participants = currentChallenge.participants || [];

    leaderboardContainer.innerHTML = participants.map((p, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

        const initials = getInitials(p.name);
        const colors = p.avatar_colors || ['#6366f1', '#8b5cf6'];
        const avatarSvg = generateAvatar(p.avatar_type || 'gradient', p.avatar_seed || p.user_id, colors, initials);

        return `
            <div class="leaderboard-item">
                <div class="rank ${rankClass}">${medal}</div>
                <div class="participant-avatar">${avatarSvg}</div>
                <div class="participant-info">
                    <div style="font-weight: 600;">${p.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Level ${p.level}</div>
                </div>
                <div class="participant-score">${p.score}</div>
            </div>
        `;
    }).join('');

    // Messages
    renderMessages();
}

// Render chat messages
function renderMessages() {
    const container = document.getElementById('chat-messages');
    const messages = currentChallenge?.messages || [];

    if (messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: var(--space-xl);">
                <p>💬</p>
                <p style="margin-top: 8px;">No messages yet. Start the conversation!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = messages.map(msg => {
        const initials = getInitials(msg.name);
        const colors = msg.avatar_colors || ['#6366f1', '#8b5cf6'];
        const avatarSvg = generateAvatar(msg.avatar_type || 'gradient', msg.avatar_seed || msg.user_id, colors, initials);

        const time = new Date(msg.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });

        return `
            <div class="chat-message">
                <div class="message-avatar">${avatarSvg}</div>
                <div class="message-content">
                    <div class="message-author">${msg.name}</div>
                    <div class="message-text">${msg.message}</div>
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Send message
async function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (!message || !currentChallenge) return;

    try {
        const response = await fetch(`${API_URL}/challenges/${currentChallenge.id}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        });

        if (response.ok) {
            input.value = '';

            // Add message to local state
            const newMessage = {
                user_id: currentUser?.id || 'you',
                name: currentUser?.name || 'You',
                message,
                created_at: new Date().toISOString(),
                avatar_type: currentUser?.avatar_type || 'gradient',
                avatar_seed: currentUser?.avatar_seed || 'you',
                avatar_colors: currentUser?.avatar_colors || ['#6366f1', '#8b5cf6']
            };

            if (!currentChallenge.messages) {
                currentChallenge.messages = [];
            }
            currentChallenge.messages.push(newMessage);
            renderMessages();
        } else {
            throw new Error('Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Failed to send message', 'error');
    }
}

// Join challenge
async function joinCurrentChallenge() {
    if (!currentChallenge) return;

    try {
        const response = await fetch(`${API_URL}/challenges/${currentChallenge.id}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            showToast('Joined challenge successfully!', 'success');
            document.getElementById('join-btn').textContent = 'Joined ✓';
            document.getElementById('join-btn').disabled = true;
        } else {
            throw new Error('Failed to join');
        }
    } catch (error) {
        console.error('Error joining challenge:', error);
        showToast('Failed to join challenge', 'error');
    }
}

// Update score
async function updateScore() {
    if (!currentChallenge) return;

    const score = prompt('Enter your current score:');
    if (!score) return;

    try {
        const response = await fetch(`${API_URL}/challenges/${currentChallenge.id}/score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ score: parseInt(score) })
        });

        if (response.ok) {
            showToast('Score updated!', 'success');
            // Reload challenge to get updated leaderboard
            openChallenge(currentChallenge.id);
        } else {
            throw new Error('Failed to update score');
        }
    } catch (error) {
        console.error('Error updating score:', error);
        showToast('Failed to update score', 'error');
    }
}

// Create challenge
async function createChallenge(event) {
    event.preventDefault();

    const challengeData = {
        title: document.getElementById('challenge-title').value,
        description: document.getElementById('challenge-description').value,
        goal_type: document.getElementById('challenge-goal-type').value,
        goal_target: parseInt(document.getElementById('challenge-target').value),
        start_date: document.getElementById('challenge-start').value,
        end_date: document.getElementById('challenge-end').value
    };

    try {
        const response = await fetch(`${API_URL}/challenges`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(challengeData)
        });

        if (response.ok) {
            showToast('Challenge created successfully!', 'success');
            closeCreateModal();
            loadChallenges();
        } else {
            throw new Error('Failed to create challenge');
        }
    } catch (error) {
        console.error('Error creating challenge:', error);
        showToast('Failed to create challenge', 'error');
    }
}

// Modal functions
function openCreateModal() {
    document.getElementById('create-modal').classList.add('active');
}

function closeCreateModal() {
    document.getElementById('create-modal').classList.remove('active');
    document.getElementById('create-form').reset();
}

function closeDetailModal() {
    document.getElementById('challenge-detail').classList.remove('active');
    stopMessagePolling();
    currentChallenge = null;
}

// Message polling
function startMessagePolling() {
    // Poll for new messages every 5 seconds
    messagePolling = setInterval(async () => {
        if (!currentChallenge) {
            stopMessagePolling();
            return;
        }

        try {
            const response = await fetch(`${API_URL}/challenges/${currentChallenge.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const updated = await response.json();
                if (updated.messages.length !== currentChallenge.messages.length) {
                    currentChallenge.messages = updated.messages;
                    renderMessages();
                }
            }
        } catch (error) {
            // Silently fail
        }
    }, 5000);
}

function stopMessagePolling() {
    if (messagePolling) {
        clearInterval(messagePolling);
        messagePolling = null;
    }
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
        z-index: 3000;
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
window.openChallenge = openChallenge;
window.closeDetailModal = closeDetailModal;
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.createChallenge = createChallenge;
window.sendMessage = sendMessage;
window.joinCurrentChallenge = joinCurrentChallenge;
window.updateScore = updateScore;

// Handle Enter key in chat
document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});
