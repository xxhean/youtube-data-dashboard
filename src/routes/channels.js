const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/channels - Aggregate channel data from videos table
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            sort = 'total_views',
            order = 'desc'
        } = req.query;

        const offset = (page - 1) * limit;

        // Allowed sort columns (aggregated from videos)
        const allowedSorts = ['total_views', 'video_count'];
        const actualSort = allowedSorts.includes(sort) ? sort : 'total_views';
        const actualOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const countQuery = `SELECT COUNT(*) as total FROM (SELECT DISTINCT channel_name FROM videos WHERE channel_name != '' AND channel_name IS NOT NULL) AS sub`;
        const countResult = await db.query(countQuery);
        const total = parseInt(countResult.rows[0].total);

        const channelsResult = await db.query(`
            SELECT 
                channel_name,
                COUNT(*) as video_count,
                SUM(view_count) as total_views,
                MAX(collect_date) as updated_at
            FROM videos
            WHERE channel_name != '' AND channel_name IS NOT NULL
            GROUP BY channel_name
            ORDER BY ${actualSort} ${actualOrder}
            LIMIT $1 OFFSET $2
        `, [Number(limit), Number(offset)]);
        
        const channels = channelsResult.rows.map(c => ({
            ...c, 
            video_count: parseInt(c.video_count), 
            total_views: parseInt(c.total_views)
        }));

        // Get latest 3 videos for each channel to display in UI
        for (let channel of channels) {
            const latestVideosResult = await db.query(`
                SELECT thumbnail_url, title, video_url 
                FROM videos 
                WHERE channel_name = $1 
                ORDER BY publish_date DESC, id DESC 
                LIMIT 3
            `, [channel.channel_name]);
            channel.latest_videos = latestVideosResult.rows;
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

module.exports = router;
