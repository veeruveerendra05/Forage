import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
    createUser,
    getUserByEmail,
    getUserById,
    updateUser,
    getFriends,
    addFriend,
    recordStreak,
    getStreaks,
    getUserStreaks,
    getCurrentStreak,
    getAllUsers,
    createChallenge,
    getChallenges,
    getChallengeById,
    joinChallenge,
    updateChallengeScore,
    getChallengeParticipants,
    getChallengeMessages,
    addChallengeMessage,
    getGlobalLeaderboard,
    addAchievement,
    getUserAchievements,
    addDevice,
    getUserDevices,
    removeDevice,
    createHabit,
    getHabit,
    completeHabit,
    hasCompletedToday
} from './db/database.js';

const app = express();
const PORT = 3001;
const JWT_SECRET = 'goalforge_secret_key_2024';

// Middleware
app.use(cors());
app.use(express.json());

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = 'usr_' + Math.random().toString(36).substr(2, 9);

        // Create user
        createUser(userId, email, passwordHash, name);

        // Generate token
        const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });

        // Create some initial streak data
        const today = new Date().toISOString().split('T')[0];
        recordStreak(userId, today, 1, 1, 1);

        res.json({
            token,
            user: {
                id: userId,
                email,
                name,
                avatar_type: 'gradient',
                avatar_seed: userId,
                avatar_colors: ['#6366f1', '#8b5cf6'],
                level: 1,
                xp: 0
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                bio: user.bio,
                avatar_type: user.avatar_type,
                avatar_seed: user.avatar_seed,
                avatar_colors: JSON.parse(user.avatar_colors || '[]'),
                level: user.level,
                xp: user.xp,
                settings: JSON.parse(user.settings || '{}'),
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== USER ROUTES ====================

// Get profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
    try {
        const user = getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            bio: user.bio,
            avatar_type: user.avatar_type,
            avatar_seed: user.avatar_seed,
            avatar_colors: JSON.parse(user.avatar_colors || '[]'),
            level: user.level,
            xp: user.xp,
            settings: JSON.parse(user.settings || '{}'),
            created_at: user.created_at,
            current_streak: getCurrentStreak(user.id)
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update profile
app.put('/api/user/profile', authenticateToken, (req, res) => {
    try {
        const updates = req.body;
        updateUser(req.user.id, updates);

        const user = getUserById(req.user.id);
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            bio: user.bio,
            avatar_type: user.avatar_type,
            avatar_seed: user.avatar_seed,
            avatar_colors: JSON.parse(user.avatar_colors || '[]'),
            level: user.level,
            xp: user.xp,
            settings: JSON.parse(user.settings || '{}'),
            created_at: user.created_at
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update avatar
app.post('/api/user/avatar', authenticateToken, (req, res) => {
    try {
        const { avatar_type, avatar_seed, avatar_colors } = req.body;
        updateUser(req.user.id, { avatar_type, avatar_seed, avatar_colors });

        res.json({ success: true, avatar_type, avatar_seed, avatar_colors });
    } catch (error) {
        console.error('Avatar update error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== FRIENDS ROUTES ====================

// Get friends list
app.get('/api/friends', authenticateToken, (req, res) => {
    try {
        const friends = getFriends(req.user.id);
        res.json(friends.map(f => ({
            ...f,
            avatar_colors: JSON.parse(f.avatar_colors || '[]')
        })));
    } catch (error) {
        console.error('Friends error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add friend
app.post('/api/friends', authenticateToken, (req, res) => {
    try {
        const { friend_id } = req.body;
        addFriend(req.user.id, friend_id);
        addFriend(friend_id, req.user.id); // Mutual friendship
        res.json({ success: true });
    } catch (error) {
        console.error('Add friend error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get friend's streaks
app.get('/api/friends/:id/streaks', authenticateToken, (req, res) => {
    try {
        const friendId = req.params.id;
        const { start, end } = req.query;

        const startDate = start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = end || new Date().toISOString().split('T')[0];

        const streaks = getStreaks(friendId, startDate, endDate);
        const friend = getUserById(friendId);

        res.json({
            friend: {
                id: friend.id,
                name: friend.name,
                avatar_type: friend.avatar_type,
                avatar_seed: friend.avatar_seed,
                avatar_colors: JSON.parse(friend.avatar_colors || '[]')
            },
            streaks
        });
    } catch (error) {
        console.error('Friend streaks error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== STREAKS ROUTES ====================

// Get user's streaks
app.get('/api/streaks', authenticateToken, (req, res) => {
    try {
        const streaks = getUserStreaks(req.user.id, 365);
        res.json({
            streaks,
            current_streak: getCurrentStreak(req.user.id)
        });
    } catch (error) {
        console.error('Streaks error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Record streak
app.post('/api/streaks', authenticateToken, (req, res) => {
    try {
        const { date, completed, habits_done } = req.body;
        const currentStreak = getCurrentStreak(req.user.id);
        const newStreak = completed ? currentStreak + 1 : 0;

        recordStreak(req.user.id, date, completed ? 1 : 0, habits_done || 0, newStreak);

        res.json({ success: true, streak_count: newStreak });
    } catch (error) {
        console.error('Record streak error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== HABIT ROUTES ====================

// Create habit
app.post('/api/habits', authenticateToken, (req, res) => {
    try {
        const { title, category, frequency_days } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        const habitId = 'habit-' + Math.random().toString(36).substr(2, 9);
        createHabit(habitId, req.user.id, title, category, frequency_days);

        res.status(201).json({
            id: habitId,
            title,
            category,
            frequency_days
        });
    } catch (error) {
        console.error('Create habit error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get habit
app.get('/api/habits/:id', authenticateToken, (req, res) => {
    try {
        const habit = getHabit(req.params.id);
        if (!habit) return res.status(404).json({ error: 'Habit not found' });

        // Security check
        if (habit.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

        res.json(habit);
    } catch (error) {
        console.error('Get habit error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Complete habit
app.post('/api/habits/:id/complete', authenticateToken, (req, res) => {
    try {
        const habit = getHabit(req.params.id);
        if (!habit) return res.status(404).json({ error: 'Habit not found' });
        if (habit.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

        if (hasCompletedToday(req.params.id)) {
            return res.status(400).json({ error: 'Already completed today' });
        }

        const logId = 'log-' + Math.random().toString(36).substr(2, 9);
        const newStreak = completeHabit(logId, req.params.id, req.user.id);

        res.json({ success: true, streak: newStreak });
    } catch (error) {
        console.error('Complete habit error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== CHALLENGES ROUTES ====================

// Get all challenges
app.get('/api/challenges', authenticateToken, (req, res) => {
    try {
        const challenges = getChallenges('active');
        res.json(challenges.map(c => ({
            ...c,
            avatar_colors: JSON.parse(c.avatar_colors || '[]')
        })));
    } catch (error) {
        console.error('Challenges error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get challenge by ID
app.get('/api/challenges/:id', authenticateToken, (req, res) => {
    try {
        const challenge = getChallengeById(req.params.id);
        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        const participants = getChallengeParticipants(req.params.id);
        const messages = getChallengeMessages(req.params.id);

        res.json({
            ...challenge,
            avatar_colors: JSON.parse(challenge.avatar_colors || '[]'),
            participants: participants.map(p => ({
                ...p,
                avatar_colors: JSON.parse(p.avatar_colors || '[]')
            })),
            messages: messages.reverse().map(m => ({
                ...m,
                avatar_colors: JSON.parse(m.avatar_colors || '[]')
            }))
        });
    } catch (error) {
        console.error('Challenge detail error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create challenge
app.post('/api/challenges', authenticateToken, (req, res) => {
    try {
        const { title, description, goal_type, goal_target, start_date, end_date } = req.body;
        const challengeId = 'chl_' + Math.random().toString(36).substr(2, 9);

        createChallenge(
            challengeId,
            req.user.id,
            title,
            description,
            goal_type,
            goal_target,
            start_date,
            end_date
        );

        // Auto-join creator
        joinChallenge(challengeId, req.user.id);

        res.json({ success: true, challenge_id: challengeId });
    } catch (error) {
        console.error('Create challenge error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Join challenge
app.post('/api/challenges/:id/join', authenticateToken, (req, res) => {
    try {
        joinChallenge(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Join challenge error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update challenge score
app.post('/api/challenges/:id/score', authenticateToken, (req, res) => {
    try {
        const { score } = req.body;
        updateChallengeScore(req.params.id, req.user.id, score);
        res.json({ success: true });
    } catch (error) {
        console.error('Update score error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Post message to challenge
app.post('/api/challenges/:id/messages', authenticateToken, (req, res) => {
    try {
        const { message } = req.body;
        addChallengeMessage(req.params.id, req.user.id, message);
        res.json({ success: true });
    } catch (error) {
        console.error('Post message error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== LEADERBOARD ROUTES ====================

// Get global leaderboard
app.get('/api/leaderboard/global', authenticateToken, (req, res) => {
    try {
        const leaderboard = getGlobalLeaderboard(100);
        res.json(leaderboard.map(u => ({
            ...u,
            avatar_colors: JSON.parse(u.avatar_colors || '[]')
        })));
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get friend leaderboard
app.get('/api/leaderboard/friends', authenticateToken, (req, res) => {
    try {
        const friends = getFriends(req.user.id);
        const currentUser = getUserById(req.user.id);

        const leaderboard = [
            {
                id: currentUser.id,
                name: currentUser.name,
                avatar_type: currentUser.avatar_type,
                avatar_seed: currentUser.avatar_seed,
                avatar_colors: JSON.parse(currentUser.avatar_colors || '[]'),
                level: currentUser.level,
                xp: currentUser.xp,
                current_streak: getCurrentStreak(currentUser.id)
            },
            ...friends.map(f => ({
                ...f,
                avatar_colors: JSON.parse(f.avatar_colors || '[]')
            }))
        ].sort((a, b) => (b.xp || 0) - (a.xp || 0));

        res.json(leaderboard);
    } catch (error) {
        console.error('Friend leaderboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== ACHIEVEMENTS ROUTES ====================

// Get user achievements
app.get('/api/achievements', authenticateToken, (req, res) => {
    try {
        const achievements = getUserAchievements(req.user.id);
        res.json(achievements);
    } catch (error) {
        console.error('Achievements error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Award achievement
app.post('/api/achievements', authenticateToken, (req, res) => {
    try {
        const { achievement_type, title, description, icon } = req.body;
        addAchievement(req.user.id, achievement_type, title, description, icon);
        res.json({ success: true });
    } catch (error) {
        console.error('Award achievement error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== DEVICE MANAGEMENT ROUTES ====================

// Get user devices
app.get('/api/devices', authenticateToken, (req, res) => {
    try {
        const devices = getUserDevices(req.user.id);
        res.json(devices);
    } catch (error) {
        console.error('Devices error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Remove device
app.delete('/api/devices/:id', authenticateToken, (req, res) => {
    try {
        removeDevice(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Remove device error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== DEMO DATA ====================

// Get all users (for demo friend selection)
app.get('/api/users', authenticateToken, (req, res) => {
    try {
        const users = getAllUsers();
        res.json(users.filter(u => u.id !== req.user.id).map(u => ({
            ...u,
            avatar_colors: JSON.parse(u.avatar_colors || '[]')
        })));
    } catch (error) {
        console.error('Users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Demo data creation removed - users start fresh

// Export app for testing
export { app };

// Only start server if run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    app.listen(PORT, () => {
        console.log(`🚀 GoalForge API running on http://localhost:${PORT}`);
    });
}
