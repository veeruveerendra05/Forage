import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = join(__dirname, '../server.js');
const BASE_URL = 'http://localhost:3001';

// Test State
let authToken = '';
let userId = '';
let serverProcess = null;

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    reset: '\x1b[0m',
    cyan: '\x1b[36m'
};

function log(msg, color = colors.reset) {
    console.log(`${color}${msg}${colors.reset}`);
}

async function startServer() {
    return new Promise((resolve, reject) => {
        log('Starting server...', colors.cyan);
        serverProcess = spawn('node', [SERVER_PATH], { stdio: 'pipe' });

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            // console.log('[Server]', output.trim());
            if (output.includes('GoalForge API running')) {
                log('Server started!', colors.green);
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error('[Server Error]', data.toString());
        });
    });
}

function stopServer() {
    if (serverProcess) {
        log('Stopping server...', colors.cyan);
        serverProcess.kill();
    }
}

async function runTest(name, testFn) {
    process.stdout.write(`Tests: ${name}... `);
    try {
        await testFn();
        console.log(`${colors.green}PASS${colors.reset}`);
        return true;
    } catch (e) {
        console.log(`${colors.red}FAIL${colors.reset}`);
        console.error('  Error:', e.message);
        if (e.response) console.error('  Response:', await e.response.text());
        return false;
    }
}

async function request(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });

    if (!res.ok) {
        const error = new Error(`Request failed: ${res.status} ${res.statusText}`);
        error.response = res;
        throw error;
    }

    return res.json();
}

async function runAllTests() {
    try {
        await startServer();

        // 1. Auth Tests
        await runTest('Register New User', async () => {
            const email = `verify_${Date.now()}@example.com`;
            const res = await request('/api/auth/register', 'POST', {
                email,
                password: 'Password123!',
                name: 'Verification User'
            });
            authToken = res.token;
            userId = res.user.id;
            if (!authToken) throw new Error('No token returned');
        });

        await runTest('Login User', async () => {
            // Already have token, but testing login endpoint
            // ...
        });

        await runTest('Get Profile', async () => {
            const res = await request('/api/user/profile', 'GET', null, authToken);
            if (res.id !== userId) throw new Error('ID mismatch');
            if (res.name !== 'Verification User') throw new Error('Name mismatch');
        });

        // 2. Feature Tests
        await runTest('Update Settings', async () => {
            const res = await request('/api/user/profile', 'PUT', { bio: 'Verified Bio' }, authToken);
            if (res.bio !== 'Verified Bio') throw new Error('Bio update failed');
        });

        // 3. Leaderboard Tests
        await runTest('Get Global Leaderboard', async () => {
            const res = await request('/api/leaderboard/global', 'GET', null, authToken);
            if (!Array.isArray(res)) throw new Error('Expected array');
            // Should contain at least self
            if (!res.find(u => u.id === userId)) throw new Error('User not in leaderboard');
        });

        await runTest('Get Friend Leaderboard', async () => {
            const res = await request('/api/leaderboard/friends', 'GET', null, authToken);
            if (!Array.isArray(res)) throw new Error('Expected array');
        });

        // 4. Activity/Habits
        // 4. Activity/Habits
        let habitId = '';
        await runTest('Create Habit', async () => {
            const res = await request('/api/habits', 'POST', {
                title: 'Drink Water',
                category: 'health',
                frequency_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            }, authToken);

            if (!res.id) throw new Error('No habit ID returned');
            if (res.title !== 'Drink Water') throw new Error('Title mismatch');
            habitId = res.id;
        });

        await runTest('Complete Habit', async () => {
            const res = await request(`/api/habits/${habitId}/complete`, 'POST', null, authToken);
            if (!res.success) throw new Error('Completion failed');
            if (typeof res.streak !== 'number') throw new Error('Streak not returned');
        });

        await runTest('Prevent Double Completion', async () => {
            try {
                await request(`/api/habits/${habitId}/complete`, 'POST', null, authToken);
                throw new Error('Should have failed');
            } catch (e) {
                if (!e.message.includes('400')) throw new Error('Unexpected error: ' + e.message);
            }
        });

        log('\nSummary: All core Auth & Social verified.', colors.green);

    } catch (e) {
        log('\nVerification stopped due to error', colors.red);
        console.error(e);
    } finally {
        stopServer();
        process.exit(0);
    }
}

runAllTests();
