require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

// Import routes
const videosRouter = require('./routes/videos');
const channelsRouter = require('./routes/channels');
const topicsRouter = require('./routes/topics');

// Import cron jobs
const refreshCron = require('./cron/refreshViews');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

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
app.get('/api/health', (req, res) => {
    try {
        const result = db.prepare('SELECT 1').get();
        res.json({ status: 'ok', db: result ? 'connected' : 'error' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Dashboard available at http://localhost:${PORT}`);
});
