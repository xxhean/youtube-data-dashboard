const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { processRawData } = require('../services/processRawData');

// Helper to format date
const getToday = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

// GET /api/videos - Query videos with pagination and filters
router.get('/', (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            sort = 'view_count',
            order = 'desc',
            video_type,
            date_range, // 'week', 'month'
            keyword,
            channel
        } = req.query;

        const offset = (page - 1) * limit;
        let query = 'SELECT * FROM videos WHERE 1=1';
        const params = [];

        if (video_type && (video_type === 'short' || video_type === 'regular')) {
            query += ' AND video_type = ?';
            params.push(video_type);
        }

        if (date_range === 'week') {
            query += " AND publish_date >= date('now', '-7 days')";
        } else if (date_range === 'month') {
            query += " AND publish_date >= date('now', '-30 days')";
        }

        if (keyword) {
            query += ' AND (title LIKE ? OR keyword LIKE ?)';
            params.push(`%${keyword}%`);
            params.push(`%${keyword}%`);
        }

        if (channel) {
            query += ' AND channel_name = ?';
            params.push(channel);
        }

        // Add sorting properly to prevent SQL injection
        const allowedSortCols = ['view_count', 'publish_date', 'id'];
        const actualSort = allowedSortCols.includes(sort) ? sort : 'view_count';
        const actualOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const countStmt = db.prepare(`SELECT COUNT(*) as total FROM (${query})`);
        const total = countStmt.get(...params).total;

        query += ` ORDER BY ${actualSort} ${actualOrder} LIMIT ? OFFSET ?`;
        params.push(Number(limit), Number(offset));

        const stmt = db.prepare(query);
        const videos = stmt.all(...params);

        res.json({
            success: true,
            data: videos,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/videos - Push raw video data (requires API key)
// Accepts N8N raw format: { video_url, title, views, account, publish_date, scrape_date, focus }
// Data flows: raw_videos → process → videos/topics → clear raw_videos
router.post('/', authMiddleware, (req, res) => {
    try {
        let items = req.body;
        if (!Array.isArray(items)) {
            items = [items];
        }

        // Insert into raw_videos staging table
        const insertRaw = db.prepare(`
            INSERT INTO raw_videos (video_url, title, view_count, account, publish_date, scrape_date, focus)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const insertTransaction = db.transaction((videos) => {
            for (const v of videos) {
                insertRaw.run(
                    v.video_url || '',
                    v.title || '',
                    v.views || v.view_count || 0,
                    v.account || '',
                    v.publish_date || '',
                    v.scrape_date || v.collect_date || getToday(),
                    v.focus || ''
                );
            }
        });

        insertTransaction(items);

        // Process raw data → videos/topics, then clear raw_videos
        const result = processRawData();

        res.json({
            success: true,
            ...result,
            message: `Successfully processed ${items.length} records (${result.inserted} new, ${result.updated} updated)`
        });
    } catch (error) {
        console.error('Error pushing videos:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// GET /api/videos/stats - Statistics
router.get('/stats', (req, res) => {
    try {
        const totalVideos = db.prepare('SELECT COUNT(*) as count FROM videos').get().count;
        const totalViews = db.prepare('SELECT SUM(view_count) as total FROM videos').get().total || 0;

        const topChannels = db.prepare(`
            SELECT channel_name, COUNT(*) as count, SUM(view_count) as total_views 
            FROM videos 
            WHERE channel_name != ''
            GROUP BY channel_name 
            ORDER BY total_views DESC 
            LIMIT 5
        `).all();

        const today = getToday();
        const todayAdded = db.prepare(`SELECT COUNT(*) as count FROM videos WHERE date(created_at) = ?`).get(today).count;
        const highlightedCount = db.prepare('SELECT COUNT(*) as count FROM videos WHERE is_highlighted > 0').get().count;

        res.json({
            success: true,
            data: {
                total_videos: totalVideos,
                total_views: totalViews,
                top_channels: topChannels,
                today_added: todayAdded,
                highlighted_count: highlightedCount
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
