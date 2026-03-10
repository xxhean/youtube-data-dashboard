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
router.get('/', async (req, res) => {
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
            params.push(video_type);
            query += ` AND video_type = $${params.length}`;
        }

        if (date_range === 'week') {
            query += " AND publish_date >= (CURRENT_DATE - INTERVAL '7 days')::text";
        } else if (date_range === 'month') {
            query += " AND publish_date >= (CURRENT_DATE - INTERVAL '30 days')::text";
        }

        if (keyword) {
            params.push(`%${keyword}%`);
            query += ` AND (title ILIKE $${params.length} OR keyword ILIKE $${params.length})`;
        }

        if (channel) {
            params.push(channel);
            query += ` AND channel_name = $${params.length}`;
        }

        const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS sub`;
        const totalResult = await db.query(countQuery, params);
        const total = parseInt(totalResult.rows[0].total);

        // Add sorting properly to prevent SQL injection
        const allowedSortCols = ['view_count', 'publish_date', 'id'];
        const actualSort = allowedSortCols.includes(sort) ? sort : 'view_count';
        const actualOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        params.push(Number(limit));
        const limitIdx = params.length;
        params.push(Number(offset));
        const offsetIdx = params.length;

        query += ` ORDER BY ${actualSort} ${actualOrder} LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

        const videosResult = await db.query(query, params);

        res.json({
            success: true,
            data: videosResult.rows,
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
router.post('/', authMiddleware, async (req, res) => {
    try {
        let items = req.body;
        if (!Array.isArray(items)) {
            items = [items];
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            for (const v of items) {
                await client.query(`
                    INSERT INTO raw_videos (video_url, title, view_count, account, publish_date, scrape_date, focus)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    v.video_url || '',
                    v.title || '',
                    v.views || v.view_count || 0,
                    v.account || '',
                    v.publish_date || '',
                    v.scrape_date || v.collect_date || getToday(),
                    v.focus || ''
                ]);
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        // Process raw data → videos/topics, then clear raw_videos
        const result = await processRawData();

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
router.get('/stats', async (req, res) => {
    try {
        const totalVideos = parseInt((await db.query('SELECT COUNT(*) as count FROM videos')).rows[0].count);
        const totalViewsResult = await db.query('SELECT SUM(view_count) as total FROM videos');
        const totalViews = parseInt(totalViewsResult.rows[0].total) || 0;

        const topChannels = (await db.query(`
            SELECT channel_name, COUNT(*) as count, SUM(view_count) as total_views 
            FROM videos 
            WHERE channel_name != '' AND channel_name IS NOT NULL
            GROUP BY channel_name 
            ORDER BY total_views DESC 
            LIMIT 5
        `)).rows;

        const today = getToday();
        const todayAdded = parseInt((await db.query(`SELECT COUNT(*) as count FROM videos WHERE DATE(created_at) = $1::date`, [today])).rows[0].count);
        const highlightedCount = parseInt((await db.query('SELECT COUNT(*) as count FROM videos WHERE is_highlighted > 0')).rows[0].count);

        res.json({
            success: true,
            data: {
                total_videos: totalVideos,
                total_views: totalViews,
                top_channels: topChannels.map(c => ({...c, count: parseInt(c.count), total_views: parseInt(c.total_views)})),
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
