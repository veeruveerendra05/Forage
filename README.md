# GoalForge 🎯

> **Professional SaaS Platform for Habit Tracking & Goal Achievement**

[![Build Status](https://github.com/yourusername/goalforge/workflows/Deploy/badge.svg)](https://github.com/yourusername/goalforge/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

## 🚀 Features

- ✅ **Habit Tracking** - Build streaks and track daily habits
- 🎯 **Goal Management** - Set and achieve long-term objectives
- 👥 **Social Features** - Connect with friends and compete
- ⚔️ **Challenges** - Real-time chat and leaderboards
- 💻 **8 Domain Pages** - Coding, Fitness, Reading, Finance, and more
- 🔒 **Secure Authentication** - JWT + OAuth (Google, GitHub)
- 📱 **Progressive Web App** - Install on any device, works offline
- 🔔 **Push Notifications** - Stay motivated with reminders
- 📊 **Analytics** - Track progress with charts and insights
- 🌐 **API Integrations** - Auto-sync with GitHub, Strava, Goodreads

## 🏗️ Architecture

**Frontend**: HTML5, CSS3, Vanilla JavaScript
**Backend**: Node.js, Express.js
**Database**: PostgreSQL with JSONB
**Cache**: Redis
**Real-time**: Socket.io (WebSockets)
**Auth**: JWT + Passport.js (OAuth)
**Deployment**: Docker, AWS ECS, GitHub Actions

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 15
- Redis >= 7
- Docker (optional)

## 🛠️ Installation

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/goalforge.git
cd goalforge

# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Option 2: Manual Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/goalforge.git
cd goalforge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Set up PostgreSQL database
createdb goalforge
psql -d goalforge -f db/schema.sql

# Start Redis
redis-server

# Start the application
npm run start:dev
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all required environment variables.

**Critical Variables**:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret key for JWT tokens (min 32 characters)
- `GOOGLE_CLIENT_ID` - Google OAuth credentials
- `SMTP_*` - Email service configuration

### OAuth Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
6. Copy Client ID and Secret to `.env`

#### GitHub Integration
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set callback URL: `http://localhost:3001/api/integrations/github/callback`
4. Copy Client ID and Secret to `.env`

#### Strava Integration
1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create new application
3. Set callback URL: `http://localhost:3001/api/integrations/strava/callback`
4. Copy Client ID and Secret to `.env`

## 📦 Scripts

```bash
# Development
npm run dev              # Start frontend dev server
npm run start:dev        # Start backend with nodemon

# Production
npm start                # Start production server
npm run build            # Build frontend for production

# Testing
npm test                 # Run all tests with coverage
npm run test:watch       # Run tests in watch mode

# Database
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with sample data

# Docker
npm run docker:build     # Build Docker image
npm run docker:up        # Start all containers
npm run docker:down      # Stop all containers
npm run docker:logs      # View container logs

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm test -- --coverage
```

**Test Coverage Goals**: 80%+ across all modules

## 📚 API Documentation

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/google
GET  /api/auth/verify
```

### Habits

```http
GET    /api/habits
POST   /api/habits
GET    /api/habits/:id
PUT    /api/habits/:id
DELETE /api/habits/:id
POST   /api/habits/:id/complete
```

### Challenges

```http
GET    /api/challenges
POST   /api/challenges
GET    /api/challenges/:id
POST   /api/challenges/:id/join
POST   /api/challenges/:id/score
GET    /api/challenges/:id/messages
POST   /api/challenges/:id/messages
```

### WebSocket Events

```javascript
// Connect
socket.emit('join-challenge', challengeId)

// Send message
socket.emit('send-message', { challengeId, content })

// Receive messages
socket.on('new-message', (message) => {})

// Notifications
socket.on('notification', (notification) => {})
socket.on('xp-gained', (data) => {})
```

## 🚀 Deployment

### AWS ECS (Production)

1. Push code to `main` branch
2. GitHub Actions automatically:
   - Runs tests
   - Builds Docker image
   - Pushes to ECR
   - Deploys to ECS
   - Sends Slack notification

### Manual Deployment

```bash
# Build Docker image
docker build -t goalforge .

# Tag for registry
docker tag goalforge:latest your-registry/goalforge:latest

# Push to registry
docker push your-registry/goalforge:latest

# Deploy to server
ssh your-server "docker pull your-registry/goalforge:latest && docker-compose up -d"
```

## 🔒 Security

- ✅ JWT authentication with 24-hour expiry
- ✅ bcrypt password hashing (10 rounds)
- ✅ Rate limiting (100 req/15min)
- ✅ CSRF protection
- ✅ Helmet.js security headers
- ✅ Input validation with Zod
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection
- ✅ CORS configuration
- ✅ Row-Level Security (PostgreSQL)

## 📊 Performance

- ⚡ < 200ms API response time (p95)
- ⚡ WebSocket for real-time (99% less HTTP requests)
- ⚡ Redis caching for leaderboards
- ⚡ PostgreSQL indexes on high-traffic queries
- ⚡ Compression middleware
- ⚡ CDN for static assets (production)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **K VEERENDRA** - *Lead Developer* - [@veeruveerendra05](https://github.com/veeruveerendra05)

## 🙏 Acknowledgments

- Inspired by modern habit tracking apps
- Built with industry-standard best practices
- Designed for scalability and performance

## 📞 Support

- 📧 Email: support@goalforge.com
- 💬 Discord: [Join our community](https://discord.gg/goalforge)
- 📖 Docs: [docs.goalforge.com](https://docs.goalforge.com)
- 🐛 Issues: [GitHub Issues](https://github.com/veeruveerendra05/Forage/issues)

---

**Made with ❤️ by the Forage Team**
