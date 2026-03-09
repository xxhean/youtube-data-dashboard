const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/topics - List all topics
router.get('/', (req, res) => {
    try {
        const topics = db.prepare(`SELECT * FROM topics ORDER BY created_at DESC`).all();
        res.json({ success: true, data: topics });
    } catch (error) {
        console.error('Error fetching topics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/topics/:name/videos - Get videos for a specific topic
router.get('/:name/videos', (req, res) => {
    try {
        const { name } = req.params;
        const { limit = 50, page = 1 } = req.query;
        const offset = (page - 1) * limit;

        const countStmt = db.prepare(`SELECT COUNT(*) as total FROM videos WHERE keyword LIKE ?`);
        const total = countStmt.get(`%${name}%`).total;

        const stmt = db.prepare(`
            SELECT * FROM videos 
            WHERE keyword LIKE ? 
            ORDER BY view_count DESC
            LIMIT ? OFFSET ?
        `);
        const videos = stmt.all(`%${name}%`, Number(limit), Number(offset));

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
        console.error('Error fetching topic videos:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/topics - Add/Update topics
router.post('/', authMiddleware, (req, res) => {
    try {
        let items = req.body;
        if (!Array.isArray(items)) {
            items = [items];
        }

        let inserted = 0;
        let updated = 0;

        const insertStmt = db.prepare(`INSERT INTO topics (name, cover_url) VALUES (?, ?)`);
        const updateStmt = db.prepare(`UPDATE topics SET cover_url = COALESCE(?, cover_url) WHERE name = ?`);

        const transaction = db.transaction((topics) => {
            for (const topic of topics) {
                if (!topic.name) continue;

                const existing = db.prepare('SELECT id FROM topics WHERE name = ?').get(topic.name);

                if (existing) {
                    updateStmt.run(topic.cover_url, topic.name);
                    updated++;
                } else {
                    insertStmt.run(topic.name, topic.cover_url || '');
                    inserted++;
                }
            }
        });

        transaction(items);

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
