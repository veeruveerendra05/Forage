import { auth } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'auth.html';
        return;
    }

    const filterSelect = document.querySelector('select');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => loadLeaderboard(e.target.value.toLowerCase()));
    }

    // Initial load
    loadLeaderboard('global');
});

async function loadLeaderboard(type = 'global') {
    const loading = document.getElementById('loading-state');
    const content = document.getElementById('leaderboard-content');

    if (loading) loading.style.display = 'block';
    if (content) content.style.display = 'none';

    try {
        const token = localStorage.getItem('token');
        const endpoint = type === 'friends' ? '/api/leaderboard/friends' : '/api/leaderboard/global';

        const response = await fetch(`http://localhost:3001${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch leaderboard');

        const users = await response.json();
        renderLeaderboard(users);

        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';

    } catch (error) {
        console.error('Leaderboard error:', error);
        if (loading) loading.innerHTML = `<p style="color: var(--error)">Failed to load rankings. Please try again.</p>`;
    }
}

function renderLeaderboard(users) {
    const podiumContainer = document.getElementById('podium-container');
    const rankList = document.getElementById('rank-list');

    podiumContainer.innerHTML = '';
    rankList.innerHTML = '';

    if (users.length === 0) {
        rankList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No data available</div>';
        return;
    }

    // Top 3 for Podium
    const top3 = users.slice(0, 3);
    // Rest for list
    const rest = users.slice(3);

    // Reorder top 3 for display: 2nd (Silver), 1st (Gold), 3rd (Bronze)
    // Access safely
    const first = top3[0];
    const second = top3[1];
    const third = top3[2];

    // Helper to generate Podium HTML
    const createPodiumItem = (user, rank, colorClass, heightClass) => {
        if (!user) return '';
        const initials = user.name ? user.name.substring(0, 2).toUpperCase() : '??';
        const avatarStyle = user.avatar_colors && user.avatar_colors.length
            ? `background: linear-gradient(135deg, ${user.avatar_colors[0]}, ${user.avatar_colors[1]})`
            : 'background: var(--primary)';

        return `
            <div class="podium-step">
                <div class="podium-avatar" style="${avatarStyle}; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">
                    ${initials}
                    <div class="podium-rank" style="background: ${colorClass}; border-color: ${colorClass}; color: #1e293b;">${rank}</div>
                </div>
                <div class="podium-block ${heightClass}" style="color: white;">
                    <div style="text-align: center; padding-bottom: 20px;">
                        <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100px;">${user.name}</div>
                        <div style="font-size: 0.9rem; opacity: 0.8;">${user.xp || 0} XP</div>
                    </div>
                </div>
            </div>
        `;
    };

    // Render Podium
    let podiumHTML = '';
    // Order: 2, 1, 3
    if (second) podiumHTML += createPodiumItem(second, 2, '#94a3b8', 'silver');
    if (first) podiumHTML += createPodiumItem(first, 1, '#fbbf24', 'gold');
    if (third) podiumHTML += createPodiumItem(third, 3, '#b45309', 'bronze');

    podiumContainer.innerHTML = podiumHTML;

    // Render List
    rest.forEach((user, index) => {
        const rank = index + 4;
        const initials = user.name ? user.name.substring(0, 2).toUpperCase() : '??';
        const avatarStyle = user.avatar_colors && user.avatar_colors.length
            ? `background: linear-gradient(135deg, ${user.avatar_colors[0]}, ${user.avatar_colors[1]})`
            : 'background: var(--primary)';

        const row = document.createElement('div');
        row.className = 'rank-item';
        row.innerHTML = `
            <div class="rank-badge">${rank}</div>
            <div style="width: 40px; height: 40px; border-radius: 50%; ${avatarStyle}; display: flex; align-items: center; justify-content: center; margin-right: var(--space-md); font-weight: bold;">
                ${initials}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 600;">${user.name}</div>
                <div style="font-size: 0.875rem; color: var(--text-muted);">Level ${user.level || 1}</div>
            </div>
            <div style="font-weight: 700; color: var(--primary);">${user.xp || 0} XP</div>
        `;
        rankList.appendChild(row);
    });
}
