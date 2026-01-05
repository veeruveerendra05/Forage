import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'goalforge.db'));

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar_type TEXT DEFAULT 'gradient',
    avatar_seed TEXT DEFAULT '',
    avatar_colors TEXT DEFAULT '["#6366f1", "#8b5cf6"]',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    settings TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id),
    UNIQUE(user_id, friend_id)
  );

  CREATE TABLE IF NOT EXISTS streaks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    habits_done INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    goal_type TEXT NOT NULL,
    goal_target INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS challenge_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(challenge_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS challenge_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT,
    last_login TEXT DEFAULT CURRENT_TIMESTAMP,
    is_trusted INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    achievement_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    frequency_days TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS habit_logs (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    date TEXT NOT NULL,
    FOREIGN KEY (habit_id) REFERENCES habits(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(habit_id, date)
  );
`);

// User functions
export const createUser = (id, email, passwordHash, name) => {
  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, avatar_seed)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(id, email, passwordHash, name, id);
};

export const getUserByEmail = (email) => {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
};

export const getUserById = (id) => {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id);
};

export const updateUser = (id, updates) => {
  const allowedFields = ['name', 'bio', 'avatar_type', 'avatar_seed', 'avatar_colors', 'settings', 'level', 'xp'];
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(typeof value === 'object' ? JSON.stringify(value) : value);
    }
  }

  if (fields.length === 0) return null;

  values.push(id);
  const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
  return stmt.run(...values);
};

// Friend functions
export const addFriend = (userId, friendId) => {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO friends (user_id, friend_id, status)
    VALUES (?, ?, 'accepted')
  `);
  return stmt.run(userId, friendId);
};

export const getFriends = (userId) => {
  const stmt = db.prepare(`
    SELECT u.id, u.name, u.avatar_type, u.avatar_seed, u.avatar_colors, u.level,
           (SELECT streak_count FROM streaks WHERE user_id = u.id ORDER BY date DESC LIMIT 1) as current_streak
    FROM friends f
    JOIN users u ON f.friend_id = u.id
    WHERE f.user_id = ? AND f.status = 'accepted'
  `);
  return stmt.all(userId);
};

// Streak functions
export const recordStreak = (userId, date, completed, habitsDone, streakCount) => {
  const stmt = db.prepare(`
    INSERT INTO streaks (user_id, date, completed, habits_done, streak_count)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      completed = excluded.completed,
      habits_done = excluded.habits_done,
      streak_count = excluded.streak_count
  `);
  return stmt.run(userId, date, completed, habitsDone, streakCount);
};

export const getStreaks = (userId, startDate, endDate) => {
  const stmt = db.prepare(`
    SELECT * FROM streaks
    WHERE user_id = ? AND date >= ? AND date <= ?
    ORDER BY date ASC
  `);
  return stmt.all(userId, startDate, endDate);
};

export const getUserStreaks = (userId, limit = 365) => {
  const stmt = db.prepare(`
    SELECT * FROM streaks
    WHERE user_id = ?
    ORDER BY date DESC
    LIMIT ?
  `);
  return stmt.all(userId, limit);
};

export const getCurrentStreak = (userId) => {
  const stmt = db.prepare(`
    SELECT streak_count FROM streaks
    WHERE user_id = ?
    ORDER BY date DESC
    LIMIT 1
  `);
  const result = stmt.get(userId);
  return result ? result.streak_count : 0;
};

// Get all users for demo/testing
export const getAllUsers = () => {
  const stmt = db.prepare('SELECT id, name, email, avatar_type, avatar_seed, avatar_colors, level FROM users');
  return stmt.all();
};

// Challenge functions
export const createChallenge = (id, creatorId, title, description, goalType, goalTarget, startDate, endDate) => {
  const stmt = db.prepare(`
    INSERT INTO challenges (id, creator_id, title, description, goal_type, goal_target, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(id, creatorId, title, description, goalType, goalTarget, startDate, endDate);
};

export const getChallenges = (status = 'active') => {
  const stmt = db.prepare(`
    SELECT c.*, u.name as creator_name, u.avatar_type, u.avatar_seed, u.avatar_colors,
           (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id) as participant_count
    FROM challenges c
    JOIN users u ON c.creator_id = u.id
    WHERE c.status = ?
    ORDER BY c.created_at DESC
  `);
  return stmt.all(status);
};

export const getChallengeById = (id) => {
  const stmt = db.prepare(`
    SELECT c.*, u.name as creator_name, u.avatar_type, u.avatar_seed, u.avatar_colors
    FROM challenges c
    JOIN users u ON c.creator_id = u.id
    WHERE c.id = ?
  `);
  return stmt.get(id);
};

export const joinChallenge = (challengeId, userId) => {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO challenge_participants (challenge_id, user_id)
    VALUES (?, ?)
  `);
  return stmt.run(challengeId, userId);
};

export const updateChallengeScore = (challengeId, userId, score) => {
  const stmt = db.prepare(`
    UPDATE challenge_participants
    SET score = ?
    WHERE challenge_id = ? AND user_id = ?
  `);
  return stmt.run(score, challengeId, userId);
};

export const getChallengeParticipants = (challengeId) => {
  const stmt = db.prepare(`
    SELECT cp.*, u.name, u.avatar_type, u.avatar_seed, u.avatar_colors, u.level
    FROM challenge_participants cp
    JOIN users u ON cp.user_id = u.id
    WHERE cp.challenge_id = ?
    ORDER BY cp.score DESC
  `);
  return stmt.all(challengeId);
};

export const getChallengeMessages = (challengeId, limit = 50) => {
  const stmt = db.prepare(`
    SELECT cm.*, u.name, u.avatar_type, u.avatar_seed, u.avatar_colors
    FROM challenge_messages cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.challenge_id = ?
    ORDER BY cm.created_at DESC
    LIMIT ?
  `);
  return stmt.all(challengeId, limit);
};

export const addChallengeMessage = (challengeId, userId, message) => {
  const stmt = db.prepare(`
    INSERT INTO challenge_messages (challenge_id, user_id, message)
    VALUES (?, ?, ?)
  `);
  return stmt.run(challengeId, userId, message);
};

// Leaderboard functions
export const getGlobalLeaderboard = (limit = 50) => {
  const stmt = db.prepare(`
    SELECT u.id, u.name, u.avatar_type, u.avatar_seed, u.avatar_colors, u.level, u.xp,
           (SELECT streak_count FROM streaks WHERE user_id = u.id ORDER BY date DESC LIMIT 1) as current_streak,
           (SELECT COUNT(*) FROM achievements WHERE user_id = u.id) as achievement_count
    FROM users u
    ORDER BY u.xp DESC, current_streak DESC
    LIMIT ?
  `);
  return stmt.all(limit);
};

// Achievement functions
export const addAchievement = (userId, achievementType, title, description, icon) => {
  const stmt = db.prepare(`
    INSERT INTO achievements (user_id, achievement_type, title, description, icon)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(userId, achievementType, title, description, icon);
};

export const getUserAchievements = (userId) => {
  const stmt = db.prepare(`
    SELECT * FROM achievements
    WHERE user_id = ?
    ORDER BY earned_at DESC
  `);
  return stmt.all(userId);
};

// Device management functions
export const addDevice = (id, userId, deviceName, deviceType) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO devices (id, user_id, device_name, device_type, last_login)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  return stmt.run(id, userId, deviceName, deviceType);
};

export const getUserDevices = (userId) => {
  const stmt = db.prepare(`
    SELECT * FROM devices
    WHERE user_id = ?
    ORDER BY last_login DESC
  `);
  return stmt.all(userId);
};

export const removeDevice = (deviceId) => {
  const stmt = db.prepare('DELETE FROM devices WHERE id = ?');
  return stmt.run(deviceId);
};

// Habit functions
export const createHabit = (id, userId, title, category, frequencyDays) => {
  const stmt = db.prepare(`
    INSERT INTO habits (id, user_id, title, category, frequency_days)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(id, userId, title, category, JSON.stringify(frequencyDays));
};

export const getHabit = (id) => {
  const stmt = db.prepare('SELECT * FROM habits WHERE id = ?');
  const habit = stmt.get(id);
  if (habit) {
    habit.frequency_days = JSON.parse(habit.frequency_days || '[]');
  }
  return habit;
};

export const hasCompletedToday = (habitId) => {
  const date = new Date().toISOString().split('T')[0];
  const stmt = db.prepare('SELECT id FROM habit_logs WHERE habit_id = ? AND date = ?');
  return !!stmt.get(habitId, date);
};

export const calculateStreak = (userId) => {
  // Simplified streak calculation: consecutive days with at least 1 habit completed
  const stmt = db.prepare(`
     SELECT date FROM streaks 
     WHERE user_id = ? AND habits_done > 0 
     ORDER BY date DESC
   `);
  const dates = stmt.all(userId).map(r => r.date);
  if (dates.length === 0) return 0;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // If no entry for today or yesterday, streak is broken (0), unless we just started
  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 0;
  let currentDate = new Date(dates[0]); // Start checking from the most recent active day

  for (const dateStr of dates) {
    const d = new Date(dateStr);
    const diff = (currentDate - d) / (1000 * 60 * 60 * 24);
    if (diff <= 1) { // 0 or 1 day difference
      streak++;
      currentDate = d;
    } else {
      break;
    }
  }
  return streak;
};

export const completeHabit = (logId, habitId, userId) => {
  const date = new Date().toISOString().split('T')[0];

  const insertLog = db.prepare(`
    INSERT INTO habit_logs (id, habit_id, user_id, date)
    VALUES (?, ?, ?, ?)
  `);

  const updateStreak = db.prepare(`
    INSERT INTO streaks (user_id, date, habits_done, streak_count)
    VALUES (?, ?, 1, 1)
    ON CONFLICT(user_id, date) DO UPDATE SET
      habits_done = habits_done + 1
  `);

  const transaction = db.transaction(() => {
    insertLog.run(logId, habitId, userId, date);
    updateStreak.run(userId, date);

    // Recalculate full streak and update generic streak count
    const streak = calculateStreak(userId);
    db.prepare('UPDATE streaks SET streak_count = ? WHERE user_id = ? AND date = ?').run(streak, userId, date);
    return streak;
  });

  return transaction();
};

export default db;

