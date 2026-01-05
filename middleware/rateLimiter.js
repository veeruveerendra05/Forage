/**
 * Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

// Create Redis client for distributed rate limiting
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    legacyMode: true
});

redisClient.connect().catch(console.error);

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:api:'
    }),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests',
            message: 'You have exceeded the rate limit. Please try again later.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes
 */
const authLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:auth:'
    }),
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true, // Don't count successful logins
    message: {
        error: 'Too many authentication attempts',
        retryAfter: '15 minutes'
    },
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many login attempts',
            message: 'Your account has been temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * Message rate limiter for challenge chat
 * 30 messages per minute
 */
const messageLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:msg:'
    }),
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: {
        error: 'Too many messages',
        retryAfter: '1 minute'
    },
    keyGenerator: (req) => {
        // Rate limit per user, not per IP
        return req.user?.id || req.ip;
    },
    handler: (req, res) => {
        res.status(429).json({
            error: 'Slow down!',
            message: 'You are sending messages too quickly. Please wait a moment.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * Password reset rate limiter
 * 3 requests per hour
 */
const passwordResetLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:reset:'
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
        error: 'Too many password reset requests',
        retryAfter: '1 hour'
    },
    keyGenerator: (req) => {
        // Rate limit by email
        return req.body.email || req.ip;
    }
});

/**
 * File upload rate limiter
 * 10 uploads per hour
 */
const uploadLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:upload:'
    }),
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        error: 'Too many file uploads',
        retryAfter: '1 hour'
    },
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    }
});

/**
 * Custom rate limiter factory
 */
function createRateLimiter(options) {
    return rateLimit({
        store: new RedisStore({
            client: redisClient,
            prefix: options.prefix || 'rl:custom:'
        }),
        windowMs: options.windowMs || 15 * 60 * 1000,
        max: options.max || 100,
        message: options.message || { error: 'Rate limit exceeded' },
        keyGenerator: options.keyGenerator || ((req) => req.ip),
        skip: options.skip,
        handler: options.handler
    });
}

module.exports = {
    apiLimiter,
    authLimiter,
    messageLimiter,
    passwordResetLimiter,
    uploadLimiter,
    createRateLimiter,
    redisClient
};
