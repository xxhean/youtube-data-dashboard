const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/channels - Query channels with sorting
router.get('/', (req, res) => {
    try {
        const {
            metric = 'total_views',  // 'total_views' or 'subscriber_count'
            type = 'total',     // 'total' or 'growth' (daily_)
            page = 1,
            limit = 50
        } = req.query;

        const offset = (page - 1) * limit;
        let orderCol = 'total_views';

        if (type === 'growth') {
            orderCol = metric === 'views' ? 'daily_views' : 'daily_subs';
        } else {
            orderCol = metric === 'subscribers' ? 'subscriber_count' : 'total_views';
        }

        // Ensure column name is safe
        const allowedCols = ['total_views', 'subscriber_count', 'daily_views', 'daily_subs'];
        if (!allowedCols.includes(orderCol)) {
            orderCol = 'total_views';
        }

        const countStmt = db.prepare(`SELECT COUNT(*) as total FROM channels`);
        const total = countStmt.get().total;

        const stmt = db.prepare(`
            SELECT * FROM channels 
            ORDER BY ${orderCol} DESC 
            LIMIT ? OFFSET ?
        `);
        const channels = stmt.all(Number(limit), Number(offset));

        // Get latest 3 videos for each channel to display in UI
        for (let channel of channels) {
            channel.latest_videos = db.prepare(`
                SELECT thumbnail_url, title, video_url 
                FROM videos 
                WHERE channel_name = ? 
                ORDER BY publish_date DESC, id DESC 
                LIMIT 3
            `).all(channel.channel_name);
        }

        res.json({
            success: true,
            data: channels,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/channels - Batch update/insert channels
router.post('/', authMiddleware, (req, res) => {
    try {
        let items = req.body;
        if (!Array.isArray(items)) {
            items = [items];
        }

        let inserted = 0;
        let updated = 0;

        const insertStmt = db.prepare(`
            INSERT INTO channels (
                channel_name, channel_url, avatar_url, subscriber_count,
                total_views, video_count, daily_views, daily_subs, country, joined_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const updateStmt = db.prepare(`
            UPDATE channels SET 
                channel_url = COALESCE(?, channel_url),
                avatar_url = COALESCE(?, avatar_url),
                subscriber_count = COALESCE(?, subscriber_count),
                total_views = COALESCE(?, total_views),
                video_count = COALESCE(?, video_count),
                daily_views = COALESCE(?, daily_views),
                daily_subs = COALESCE(?, daily_subs),
                country = COALESCE(?, country),
                updated_at = CURRENT_TIMESTAMP
            WHERE channel_name = ?
        `);

        const transaction = db.transaction((channels) => {
            for (const channel of channels) {
                if (!channel.channel_name) continue;

                const existing = db.prepare('SELECT id FROM channels WHERE channel_name = ?').get(channel.channel_name);

                if (existing) {
                    updateStmt.run(
                        channel.channel_url,
                        channel.avatar_url,
                        channel.subscriber_count,
                        channel.total_views,
                        channel.video_count,
                        channel.daily_views,
                        channel.daily_subs,
                        channel.country,
                        channel.channel_name
                    );
                    updated++;
                } else {
                    insertStmt.run(
                        channel.channel_name,
                        channel.channel_url || '',
                        channel.avatar_url || '',
                        channel.subscriber_count || 0,
                        channel.total_views || 0,
                        channel.video_count || 0,
                        channel.daily_views || 0,
                        channel.daily_subs || 0,
                        channel.country || '',
                        channel.joined_date || ''
                    );
                    inserted++;
                }
            }
        });

        transaction(items);

        res.json({
            success: true,
            inserted,
            updated,
            message: `Successfully processed ${items.length} channels`
        });
    } catch (error) {
        console.error('Error pushing channels:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
