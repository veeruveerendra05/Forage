-- GoalForge Professional PostgreSQL Schema
-- Version: 1.0.0
-- Author: GoalForge Team
-- Description: Production-ready database schema with security, performance, and scalability

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS (Type Safety)
-- ============================================================================

CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE friend_status AS ENUM ('pending', 'accepted', 'blocked');
CREATE TYPE challenge_type AS ENUM ('steps', 'reading', 'coding', 'custom');
CREATE TYPE domain_type AS ENUM ('coding', 'fitness', 'reading', 'finance', 'academics', 'career', 'mindfulness', 'creativity');
CREATE TYPE notification_type AS ENUM ('friend_request', 'challenge_invite', 'streak_milestone', 'achievement', 'xp_gained');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table with gamification
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Nullable for OAuth-only users
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    
    -- Gamification
    xp INTEGER DEFAULT 0 CHECK (xp >= 0),
    level INTEGER DEFAULT 1 CHECK (level >= 1),
    current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
    best_streak INTEGER DEFAULT 0 CHECK (best_streak >= 0),
    
    -- Settings
    timezone VARCHAR(50) DEFAULT 'UTC',
    theme VARCHAR(20) DEFAULT 'dark',
    accent_color VARCHAR(7) DEFAULT '#6366f1',
    
    -- Meta
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    role user_role DEFAULT 'user',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OAuth providers (Google, GitHub, etc.)
CREATE TABLE oauth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider_name VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_name, provider_user_id)
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tokens
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- HABITS & TRACKING
-- ============================================================================

CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    icon VARCHAR(10),
    color VARCHAR(7),
    
    -- Frequency & Targets
    frequency_days JSONB DEFAULT '["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]',
    daily_target_value INTEGER DEFAULT 1,
    target_unit VARCHAR(50) DEFAULT 'check-in',
    
    -- State
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habit completion logs (high-write table)
CREATE TABLE habit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    value_achieved INTEGER DEFAULT 1,
    notes TEXT,
    
    -- Prevent double completion on same day
    UNIQUE(habit_id, user_id, DATE(completed_at))
);

-- ============================================================================
-- DOMAIN ACTIVITIES (Flexible JSONB Storage)
-- ============================================================================

CREATE TABLE domain_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    domain domain_type NOT NULL,
    
    -- Flexible data storage
    -- Examples:
    -- Coding: {"problem_id": "LC-20", "difficulty": "Hard", "language": "Python", "time_taken": 45}
    -- Fitness: {"type": "Running", "distance_km": 5.2, "calories": 400, "duration_minutes": 30}
    -- Finance: {"type": "expense", "category": "food", "amount": 25.50, "currency": "USD"}
    activity_data JSONB NOT NULL,
    
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SOCIAL FEATURES
-- ============================================================================

CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status friend_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate friendships
    UNIQUE(requester_id, addressee_id),
    CHECK (requester_id != addressee_id)
);

-- User invite codes
CREATE TABLE invite_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CHALLENGES
-- ============================================================================

CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    type challenge_type NOT NULL,
    target_value INTEGER,
    is_public BOOLEAN DEFAULT TRUE,
    invite_code VARCHAR(10) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (end_date > start_date)
);

CREATE TABLE challenge_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    current_score INTEGER DEFAULT 0 CHECK (current_score >= 0),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(challenge_id, user_id)
);

-- Challenge chat messages
CREATE TABLE challenge_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) <= 5000), -- Prevent spam
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ACHIEVEMENTS & GAMIFICATION
-- ============================================================================

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(10),
    xp_reward INTEGER DEFAULT 0,
    criteria JSONB NOT NULL -- {"type": "streak", "value": 30}
);

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, achievement_id)
);

-- XP Shop inventory
CREATE TABLE shop_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cost INTEGER NOT NULL CHECK (cost > 0),
    item_type VARCHAR(50) NOT NULL, -- 'avatar_frame', 'theme', 'streak_freeze'
    item_data JSONB
);

CREATE TABLE user_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_item_id UUID REFERENCES shop_items(id) ON DELETE CASCADE,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_equipped BOOLEAN DEFAULT FALSE
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB, -- Additional context
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Push notification subscriptions (for PWA)
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- EXTERNAL INTEGRATIONS
-- ============================================================================

CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    service_name VARCHAR(50) NOT NULL, -- 'github', 'strava', 'goodreads'
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    service_user_id VARCHAR(255),
    metadata JSONB, -- Service-specific data
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, service_name)
);

-- ============================================================================
-- ANALYTICS & LOGGING
-- ============================================================================

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    metadata JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Habits
CREATE INDEX idx_habits_user_id ON habits(user_id) WHERE is_archived = FALSE;
CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, DATE(completed_at));
CREATE INDEX idx_habit_logs_habit_date ON habit_logs(habit_id, DATE(completed_at));

-- Domain Activities
CREATE INDEX idx_domain_activities_user ON domain_activities(user_id, performed_at DESC);
CREATE INDEX idx_domain_activities_data ON domain_activities USING gin (activity_data);

-- Social
CREATE INDEX idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id, status);

-- Challenges
CREATE INDEX idx_challenge_participants ON challenge_participants(challenge_id, current_score DESC);
CREATE INDEX idx_challenge_messages ON challenge_messages(challenge_id, created_at DESC);

-- Notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- TRIGGERS (Auto-update timestamps)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS (Business Logic)
-- ============================================================================

-- Calculate user streak
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_streak INTEGER := 0;
    v_current_date DATE := CURRENT_DATE;
BEGIN
    -- Count consecutive days with at least one completed habit
    WHILE EXISTS (
        SELECT 1 FROM habit_logs
        WHERE user_id = p_user_id
        AND DATE(completed_at) = v_current_date - v_streak
    ) LOOP
        v_streak := v_streak + 1;
    END LOOP;
    
    RETURN v_streak;
END;
$$ LANGUAGE plpgsql;

-- Award XP and check for level up
CREATE OR REPLACE FUNCTION award_xp(p_user_id UUID, p_xp_amount INTEGER)
RETURNS VOID AS $$
DECLARE
    v_new_xp INTEGER;
    v_new_level INTEGER;
BEGIN
    UPDATE users
    SET xp = xp + p_xp_amount
    WHERE id = p_user_id
    RETURNING xp INTO v_new_xp;
    
    -- Level formula: level = floor(sqrt(xp / 100))
    v_new_level := FLOOR(SQRT(v_new_xp / 100.0)) + 1;
    
    UPDATE users
    SET level = v_new_level
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA (Default Achievements)
-- ============================================================================

INSERT INTO achievements (name, description, icon, xp_reward, criteria) VALUES
('First Step', 'Complete your first habit', '🎯', 10, '{"type": "habit_completion", "count": 1}'),
('Week Warrior', 'Maintain a 7-day streak', '🔥', 50, '{"type": "streak", "days": 7}'),
('Month Master', 'Maintain a 30-day streak', '💪', 200, '{"type": "streak", "days": 30}'),
('Social Butterfly', 'Add 5 friends', '👥', 30, '{"type": "friends", "count": 5}'),
('Challenge Champion', 'Win a challenge', '🏆', 100, '{"type": "challenge_win", "count": 1}'),
('Code Warrior', 'Solve 50 coding problems', '💻', 150, '{"type": "domain_activity", "domain": "coding", "count": 50}'),
('Fitness Fanatic', 'Log 30 workouts', '🏃', 150, '{"type": "domain_activity", "domain": "fitness", "count": 30}');

-- ============================================================================
-- VIEWS (Leaderboard)
-- ============================================================================

CREATE VIEW global_leaderboard AS
SELECT 
    u.id,
    u.full_name,
    u.avatar_url,
    u.xp,
    u.level,
    u.current_streak,
    RANK() OVER (ORDER BY u.xp DESC) as rank
FROM users u
WHERE u.is_active = TRUE
ORDER BY u.xp DESC;

-- ============================================================================
-- SECURITY (Row Level Security - Optional but Recommended)
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_activities ENABLE ROW LEVEL SECURITY;

-- Users can only see their own habits
CREATE POLICY habits_user_policy ON habits
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY habit_logs_user_policy ON habit_logs
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY domain_activities_user_policy ON domain_activities
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Clean up expired tokens (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS VOID AS $$
BEGIN
    DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP;
    DELETE FROM email_verification_tokens WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE users IS 'Core user accounts with gamification stats';
COMMENT ON TABLE domain_activities IS 'Flexible JSONB storage for all domain-specific activities';
COMMENT ON TABLE habit_logs IS 'High-write table for daily habit completions';
COMMENT ON COLUMN domain_activities.activity_data IS 'JSONB column allows flexible schema per domain type';
COMMENT ON FUNCTION calculate_user_streak IS 'Calculates consecutive days with at least one completed habit';
