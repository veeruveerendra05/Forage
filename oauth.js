/**
 * OAuth Integration Module
 * 
 * Handles authentication with:
 * - Google (Social Login)
 * - GitHub (Coding Domain Integration)
 * - Strava (Fitness Domain Integration)
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { Strategy: StravaStrategy } = require('passport-strava-oauth2');
const db = require('./db/database');

function initializeOAuth(app) {
    // Initialize Passport
    app.use(passport.initialize());

    // ========================================================================
    // GOOGLE OAUTH (Social Login)
    // ========================================================================

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
        scope: ['profile', 'email']
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;

                // Check if user exists
                let user = await db.getUserByEmail(email);

                if (!user) {
                    // Create new user
                    user = await db.createUser({
                        email,
                        full_name: profile.displayName,
                        avatar_url: profile.photos[0]?.value,
                        is_verified: true, // Google verified the email
                        password_hash: null // OAuth users don't have passwords
                    });
                }

                // Link OAuth provider
                await db.upsertOAuthProvider({
                    user_id: user.id,
                    provider_name: 'google',
                    provider_user_id: profile.id,
                    access_token: accessToken,
                    refresh_token: refreshToken
                });

                done(null, user);
            } catch (error) {
                done(error, null);
            }
        }
    ));

    // Google OAuth routes
    app.get('/api/auth/google',
        passport.authenticate('google', { session: false })
    );

    app.get('/api/auth/google/callback',
        passport.authenticate('google', { session: false, failureRedirect: '/auth?error=google_failed' }),
        (req, res) => {
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { userId: req.user.id },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Redirect to frontend with token
            res.redirect(`${process.env.CLIENT_URL}/dashboard?token=${token}&new_user=${!req.user.created_at}`);
        }
    );

    // ========================================================================
    // GITHUB OAUTH (Coding Domain Integration)
    // ========================================================================

    passport.use('github-integration', new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/integrations/github/callback',
        scope: ['repo', 'user']
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                done(null, { profile, accessToken, refreshToken });
            } catch (error) {
                done(error, null);
            }
        }
    ));

    // GitHub integration routes
    app.get('/api/integrations/github/connect',
        (req, res, next) => {
            // Store user ID in session for callback
            req.session = req.session || {};
            req.session.userId = req.user.id;
            next();
        },
        passport.authenticate('github-integration', { session: false })
    );

    app.get('/api/integrations/github/callback',
        passport.authenticate('github-integration', { session: false, failureRedirect: '/domains/coding?error=github_failed' }),
        async (req, res) => {
            try {
                const userId = req.session.userId;
                const { profile, accessToken, refreshToken } = req.user;

                // Save integration
                await db.createIntegration({
                    user_id: userId,
                    service_name: 'github',
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    service_user_id: profile.id,
                    metadata: {
                        username: profile.username,
                        profile_url: profile.profileUrl
                    }
                });

                res.redirect(`${process.env.CLIENT_URL}/domains/coding?connected=github`);
            } catch (error) {
                console.error('GitHub callback error:', error);
                res.redirect(`${process.env.CLIENT_URL}/domains/coding?error=github_save_failed`);
            }
        }
    );

    // GitHub Webhook Handler
    app.post('/api/webhooks/github', async (req, res) => {
        try {
            const crypto = require('crypto');
            const signature = req.headers['x-hub-signature-256'];
            const payload = JSON.stringify(req.body);

            // Verify webhook signature
            const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
            const digest = 'sha256=' + hmac.update(payload).digest('hex');

            if (signature !== digest) {
                return res.status(401).json({ error: 'Invalid signature' });
            }

            const event = req.headers['x-github-event'];

            // Handle push event
            if (event === 'push' && req.body.ref === 'refs/heads/main') {
                const repoFullName = req.body.repository.full_name;

                // Find user by GitHub repo
                const integration = await db.getIntegrationByRepo('github', repoFullName);

                if (integration) {
                    const commit = req.body.head_commit;

                    // Create domain activity
                    await db.createDomainActivity({
                        user_id: integration.user_id,
                        domain: 'coding',
                        activity_data: {
                            type: 'github_commit',
                            repo: req.body.repository.name,
                            message: commit.message,
                            files_changed: commit.modified.length + commit.added.length,
                            additions: commit.added.length,
                            deletions: commit.removed.length,
                            sha: commit.id,
                            url: commit.url
                        }
                    });

                    // Award XP
                    const xpAmount = 10 + (commit.modified.length * 2);
                    await db.awardXP(integration.user_id, xpAmount);

                    // Notify via WebSocket
                    const io = req.app.get('io');
                    if (io) {
                        io.broadcastXPGain(integration.user_id, {
                            amount: xpAmount,
                            reason: 'GitHub commit',
                            details: commit.message
                        });
                    }
                }
            }

            res.sendStatus(200);
        } catch (error) {
            console.error('GitHub webhook error:', error);
            res.sendStatus(500);
        }
    });

    // ========================================================================
    // STRAVA OAUTH (Fitness Domain Integration)
    // ========================================================================

    passport.use('strava-integration', new StravaStrategy({
        clientID: process.env.STRAVA_CLIENT_ID,
        clientSecret: process.env.STRAVA_CLIENT_SECRET,
        callbackURL: process.env.STRAVA_REDIRECT_URI || '/api/integrations/strava/callback'
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                done(null, { profile, accessToken, refreshToken });
            } catch (error) {
                done(error, null);
            }
        }
    ));

    // Strava integration routes
    app.get('/api/integrations/strava/connect',
        (req, res, next) => {
            req.session = req.session || {};
            req.session.userId = req.user.id;
            next();
        },
        passport.authenticate('strava-integration', { session: false, scope: ['activity:read'] })
    );

    app.get('/api/integrations/strava/callback',
        passport.authenticate('strava-integration', { session: false, failureRedirect: '/domains/fitness?error=strava_failed' }),
        async (req, res) => {
            try {
                const userId = req.session.userId;
                const { profile, accessToken, refreshToken } = req.user;

                await db.createIntegration({
                    user_id: userId,
                    service_name: 'strava',
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    service_user_id: profile.id,
                    metadata: {
                        username: profile.username,
                        profile_url: profile._json.profile
                    }
                });

                res.redirect(`${process.env.CLIENT_URL}/domains/fitness?connected=strava`);
            } catch (error) {
                console.error('Strava callback error:', error);
                res.redirect(`${process.env.CLIENT_URL}/domains/fitness?error=strava_save_failed`);
            }
        }
    );

    // Strava Webhook Handler
    app.post('/api/webhooks/strava', async (req, res) => {
        try {
            const { object_type, aspect_type, owner_id, object_id } = req.body;

            if (object_type === 'activity' && aspect_type === 'create') {
                const integration = await db.getIntegrationByServiceUserId('strava', owner_id.toString());

                if (integration) {
                    const axios = require('axios');

                    // Fetch activity details
                    const activity = await axios.get(
                        `https://www.strava.com/api/v3/activities/${object_id}`,
                        {
                            headers: { 'Authorization': `Bearer ${integration.access_token}` }
                        }
                    );

                    // Create domain activity
                    await db.createDomainActivity({
                        user_id: integration.user_id,
                        domain: 'fitness',
                        activity_data: {
                            type: activity.data.type,
                            name: activity.data.name,
                            distance_km: activity.data.distance / 1000,
                            duration_minutes: activity.data.moving_time / 60,
                            calories: activity.data.calories,
                            elevation_gain: activity.data.total_elevation_gain,
                            average_speed: activity.data.average_speed,
                            strava_id: object_id
                        }
                    });

                    // Award XP based on activity
                    const xpAmount = Math.floor(activity.data.moving_time / 60) * 2; // 2 XP per minute
                    await db.awardXP(integration.user_id, xpAmount);

                    // Notify via WebSocket
                    const io = req.app.get('io');
                    if (io) {
                        io.broadcastXPGain(integration.user_id, {
                            amount: xpAmount,
                            reason: 'Strava activity',
                            details: activity.data.name
                        });
                    }
                }
            }

            res.sendStatus(200);
        } catch (error) {
            console.error('Strava webhook error:', error);
            res.sendStatus(500);
        }
    });

    // Strava Webhook Verification (required by Strava)
    app.get('/api/webhooks/strava', (req, res) => {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === process.env.STRAVA_VERIFY_TOKEN) {
            res.json({ 'hub.challenge': challenge });
        } else {
            res.sendStatus(403);
        }
    });

    console.log('✅ OAuth providers initialized');
}

module.exports = initializeOAuth;
