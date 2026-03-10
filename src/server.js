require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db');

// Import routes
const videosRouter = require('./routes/videos');
const channelsRouter = require('./routes/channels');
const topicsRouter = require('./routes/topics');
const authRouter = require('./routes/auth');

// Import cron jobs
const refreshCron = require('./cron/refreshViews');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==========================================
// Session + Passport (Google OAuth)
// ==========================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'ghost-dashboard-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        secure: false // Set true if using HTTPS in production
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport serialize/deserialize
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, result.rows[0] || null);
    } catch (err) {
        done(err, null);
    }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const googleId = profile.id;
            const displayName = profile.displayName || '';
            const email = (profile.emails && profile.emails[0]) ? profile.emails[0].value : '';
            const avatarUrl = (profile.photos && profile.photos[0]) ? profile.photos[0].value : '';

            // Check if user exists
            let result = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
            let user = result.rows[0];

            if (user) {
                // Update last login & info
                await db.query(`
                    UPDATE users SET display_name = $1, email = $2, avatar_url = $3, last_login = CURRENT_TIMESTAMP
                    WHERE google_id = $4
                `, [displayName, email, avatarUrl, googleId]);
                result = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
                user = result.rows[0];
            } else {
                // Create new user
                await db.query(`
                    INSERT INTO users (google_id, display_name, email, avatar_url)
                    VALUES ($1, $2, $3, $4)
                `, [googleId, displayName, email, avatarUrl]);
                result = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
                user = result.rows[0];
            }

            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));
    console.log('✅ Google OAuth enabled');
} else {
    console.warn('⚠️  Google OAuth disabled (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env)');
}

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Auth Routes
app.use('/auth', authRouter);

// Set up manually refresh endpoint
const authMiddleware = require('./middleware/auth');
app.post('/api/refresh-views', authMiddleware, async (req, res) => {
    if (refreshCron && refreshCron.refreshViews) {
        try {
            await refreshCron.refreshViews();
            res.json({ success: true, message: 'Refresh process triggered successfully.' });
        } catch (e) {
            res.status(500).json({ success: false, message: 'Error triggering refresh.' });
        }
    } else {
        res.status(503).json({ success: false, message: 'YouTube Refresh feature is disabled (missing API key).' });
    }
});

// API Routes
app.use('/api/videos', videosRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/topics', topicsRouter);

// Database Health Check
app.get('/api/health', async (req, res) => {
    try {
        const result = await db.query('SELECT 1');
        res.json({ status: 'ok', db: result.rows.length ? 'connected' : 'error' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Initialize DB and start server
db.initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Dashboard available at http://localhost:${PORT}`);
    });
});
