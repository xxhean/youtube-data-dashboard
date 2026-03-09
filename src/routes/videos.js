const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

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

// POST /api/videos - Push new video data (requires API key)
router.post('/', authMiddleware, (req, res) => {
    try {
        let items = req.body;
        if (!Array.isArray(items)) {
            items = [items];
        }

        let inserted = 0;
        let updated = 0;

        const insertStmt = db.prepare(`
            INSERT INTO videos (
                video_url, title, thumbnail_url, view_count, video_type, 
                channel_name, channel_avatar_url, publish_date, collect_date, 
                keyword, country, notes, is_highlighted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const updateStmt = db.prepare(`
            UPDATE videos SET 
                title = COALESCE(?, title), 
                view_count = COALESCE(?, view_count),
                keyword = COALESCE(?, keyword),
                notes = COALESCE(?, notes),
                is_highlighted = COALESCE(?, is_highlighted)
            WHERE video_url = ?
        `);

        const historyStmt = db.prepare(`
            INSERT INTO view_history (video_id, view_count) VALUES (?, ?)
        `);

        // Transaction for batch insert
        const transaction = db.transaction((videos) => {
            for (const video of videos) {
                // Check if video exists
                const existing = db.prepare('SELECT id, view_count FROM videos WHERE video_url = ?').get(video.video_url);

                if (existing) {
                    updateStmt.run(
                        video.title,
                        video.view_count,
                        video.keyword,
                        video.notes,
                        video.is_highlighted !== undefined ? (video.is_highlighted ? 1 : 0) : null,
                        video.video_url
                    );
                    updated++;

                    // If view count changed, record history
                    if (video.view_count && video.view_count !== existing.view_count) {
                        historyStmt.run(existing.id, video.view_count);
                    }
                } else {
                    const info = insertStmt.run(
                        video.video_url,
                        video.title || '',
                        video.thumbnail_url || '',
                        video.view_count || 0,
                        video.video_type || 'regular',
                        video.channel_name || '',
                        video.channel_avatar_url || '',
                        video.publish_date || '',
                        video.collect_date || getToday(),
                        video.keyword || '',
                        video.country || '',
                        video.notes || '',
                        video.is_highlighted ? 1 : 0
                    );
                    inserted++;

                    // Add initial history record
                    if (video.view_count) {
                        historyStmt.run(info.lastInsertRowid, video.view_count);
                    }
                }
            }
        });

        transaction(items);

        res.json({
            success: true,
            inserted,
            updated,
            message: `Successfully processed ${items.length} records (${inserted} new, ${updated} updated)`
        });
    } catch (error) {
        console.error('Error pushing videos:', error);
        res.status(500).json({ success: false, message: 'Server error' });
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
        const highlightedCount = db.prepare('SELECT COUNT(*) as count FROM videos WHERE is_highlighted = 1').get().count;

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
