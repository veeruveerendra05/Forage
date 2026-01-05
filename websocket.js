/**
 * WebSocket Server Implementation
 * 
 * Handles real-time features:
 * - Challenge chat
 * - Live notifications
 * - Friend activity updates
 * - Leaderboard updates
 */

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./db/database');

function initializeWebSocket(server) {
    const io = socketIO(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;

            // Verify user exists and is active
            const user = await db.getUser(decoded.userId);
            if (!user || !user.is_active) {
                return next(new Error('Authentication error: Invalid user'));
            }

            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // Connection Handler
    io.on('connection', (socket) => {
        console.log(`✅ User connected: ${socket.user.full_name} (${socket.userId})`);

        // Join user's personal room for notifications
        socket.join(`user-${socket.userId}`);

        // Update user's online status
        db.updateUserStatus(socket.userId, 'online').catch(console.error);

        // ========================================================================
        // CHALLENGE CHAT
        // ========================================================================

        socket.on('join-challenge', async (challengeId) => {
            try {
                // Verify user is a participant
                const isParticipant = await db.isParticipant(challengeId, socket.userId);

                if (!isParticipant) {
                    socket.emit('error', { message: 'Not a participant of this challenge' });
                    return;
                }

                socket.join(`challenge-${challengeId}`);
                console.log(`User ${socket.userId} joined challenge ${challengeId}`);

                // Send recent messages
                const messages = await db.getChallengeMessages(challengeId, 50);
                socket.emit('challenge-history', messages);

            } catch (error) {
                console.error('Error joining challenge:', error);
                socket.emit('error', { message: 'Failed to join challenge' });
            }
        });

        socket.on('send-message', async (data) => {
            try {
                const { challengeId, content } = data;

                // Validate
                if (!content || content.trim().length === 0) {
                    socket.emit('error', { message: 'Message cannot be empty' });
                    return;
                }

                if (content.length > 5000) {
                    socket.emit('error', { message: 'Message too long (max 5000 characters)' });
                    return;
                }

                // Verify participant
                const isParticipant = await db.isParticipant(challengeId, socket.userId);
                if (!isParticipant) {
                    socket.emit('error', { message: 'Not a participant' });
                    return;
                }

                // Save message
                const message = await db.createChallengeMessage({
                    challenge_id: challengeId,
                    user_id: socket.userId,
                    content: content.trim()
                });

                // Broadcast to all participants
                io.to(`challenge-${challengeId}`).emit('new-message', {
                    id: message.id,
                    user: {
                        id: socket.user.id,
                        full_name: socket.user.full_name,
                        avatar_url: socket.user.avatar_url
                    },
                    content: message.content,
                    created_at: message.created_at
                });

            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        socket.on('leave-challenge', (challengeId) => {
            socket.leave(`challenge-${challengeId}`);
            console.log(`User ${socket.userId} left challenge ${challengeId}`);
        });

        // ========================================================================
        // NOTIFICATIONS
        // ========================================================================

        socket.on('mark-notification-read', async (notificationId) => {
            try {
                await db.markNotificationRead(notificationId, socket.userId);
                socket.emit('notification-read', { id: notificationId });
            } catch (error) {
                console.error('Error marking notification read:', error);
            }
        });

        // ========================================================================
        // FRIEND ACTIVITY
        // ========================================================================

        socket.on('subscribe-friends', async () => {
            try {
                const friends = await db.getUserFriends(socket.userId);

                // Join rooms for each friend's activity
                friends.forEach(friend => {
                    socket.join(`friend-activity-${friend.id}`);
                });

                console.log(`User ${socket.userId} subscribed to ${friends.length} friends`);
            } catch (error) {
                console.error('Error subscribing to friends:', error);
            }
        });

        // ========================================================================
        // TYPING INDICATORS
        // ========================================================================

        socket.on('typing-start', (challengeId) => {
            socket.to(`challenge-${challengeId}`).emit('user-typing', {
                userId: socket.userId,
                userName: socket.user.full_name
            });
        });

        socket.on('typing-stop', (challengeId) => {
            socket.to(`challenge-${challengeId}`).emit('user-stopped-typing', {
                userId: socket.userId
            });
        });

        // ========================================================================
        // DISCONNECTION
        // ========================================================================

        socket.on('disconnect', async () => {
            console.log(`❌ User disconnected: ${socket.user.full_name}`);

            try {
                await db.updateUserStatus(socket.userId, 'offline');

                // Notify friends
                const friends = await db.getUserFriends(socket.userId);
                friends.forEach(friend => {
                    io.to(`user-${friend.id}`).emit('friend-offline', {
                        userId: socket.userId,
                        userName: socket.user.full_name
                    });
                });
            } catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });

        // ========================================================================
        // ERROR HANDLING
        // ========================================================================

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    // ========================================================================
    // HELPER FUNCTIONS FOR BROADCASTING
    // ========================================================================

    /**
     * Send notification to a specific user
     */
    io.sendNotification = async (userId, notification) => {
        io.to(`user-${userId}`).emit('notification', notification);
    };

    /**
     * Broadcast XP gain to user and their friends
     */
    io.broadcastXPGain = async (userId, xpData) => {
        // Notify user
        io.to(`user-${userId}`).emit('xp-gained', xpData);

        // Notify friends
        const friends = await db.getUserFriends(userId);
        friends.forEach(friend => {
            io.to(`user-${friend.id}`).emit('friend-xp-gained', {
                userId,
                ...xpData
            });
        });
    };

    /**
     * Update leaderboard for all connected users
     */
    io.updateLeaderboard = async () => {
        const leaderboard = await db.getGlobalLeaderboard(10);
        io.emit('leaderboard-update', leaderboard);
    };

    /**
     * Notify challenge participants of score update
     */
    io.notifyChallengeUpdate = async (challengeId, userId, newScore) => {
        const leaderboard = await db.getChallengeLeaderboard(challengeId);
        io.to(`challenge-${challengeId}`).emit('challenge-leaderboard-update', {
            userId,
            newScore,
            leaderboard
        });
    };

    return io;
}

module.exports = initializeWebSocket;
