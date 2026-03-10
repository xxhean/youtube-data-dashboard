const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/topics - List all topics
router.get('/', async (req, res) => {
    try {
        const topics = (await db.query(`SELECT * FROM topics ORDER BY created_at DESC`)).rows;
        res.json({ success: true, data: topics });
    } catch (error) {
        console.error('Error fetching topics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/topics/:name/videos - Get videos for a specific topic
router.get('/:name/videos', async (req, res) => {
    try {
        const { name } = req.params;
        const { limit = 50, page = 1 } = req.query;
        const offset = (page - 1) * limit;

        const countQuery = `SELECT COUNT(*) as total FROM videos WHERE keyword ILIKE $1`;
        const totalResult = await db.query(countQuery, [`%${name}%`]);
        const total = parseInt(totalResult.rows[0].total);

        const videosResult = await db.query(`
            SELECT * FROM videos 
            WHERE keyword ILIKE $1 
            ORDER BY view_count DESC
            LIMIT $2 OFFSET $3
        `, [`%${name}%`, Number(limit), Number(offset)]);

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
        console.error('Error fetching topic videos:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/topics - Add/Update topics
router.post('/', authMiddleware, async (req, res) => {
    try {
        let items = req.body;
        if (!Array.isArray(items)) {
            items = [items];
        }

        let inserted = 0;
        let updated = 0;

        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            for (const topic of items) {
                if (!topic.name) continue;

                const existingResult = await client.query('SELECT id FROM topics WHERE name = $1', [topic.name]);
                const existing = existingResult.rows[0];

                if (existing) {
                    await client.query(`UPDATE topics SET cover_url = COALESCE($1, cover_url) WHERE name = $2`, [topic.cover_url, topic.name]);
                    updated++;
                } else {
                    await client.query(`INSERT INTO topics (name, cover_url) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`, [topic.name, topic.cover_url || '']);
                    inserted++;
                }
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        res.json({
            success: true,
            inserted,
            updated,
            message: `Successfully processed ${items.length} topics`
        });
    } catch (error) {
        console.error('Error pushing topics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
