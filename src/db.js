require('dotenv').config();
const { Pool } = require('pg');

console.log('DB INIT', { hasUrl: !!process.env.DATABASE_URL, urlType: typeof process.env.DATABASE_URL });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Needed for hosted Neon Postgres
});

async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS raw_videos (
                id SERIAL PRIMARY KEY,
                video_url TEXT,
                title TEXT,
                view_count INTEGER DEFAULT 0,
                account TEXT,
                publish_date TEXT,
                scrape_date TEXT,
                focus TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS videos (
                id SERIAL PRIMARY KEY,
                video_url TEXT UNIQUE,
                title TEXT,
                thumbnail_url TEXT,
                view_count INTEGER DEFAULT 0,
                video_type TEXT CHECK (video_type IN ('short', 'regular')),
                channel_name TEXT,
                channel_avatar_url TEXT,
                publish_date TEXT,
                collect_date TEXT,
                keyword TEXT,
                country TEXT,
                notes TEXT,
                is_highlighted INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS topics (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE,
                cover_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS view_history (
                id SERIAL PRIMARY KEY,
                video_id INTEGER,
                view_count INTEGER,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE CASCADE
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                google_id TEXT UNIQUE,
                display_name TEXT,
                email TEXT,
                avatar_url TEXT,
                role TEXT DEFAULT 'viewer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Postgres Database tables initialized.');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
}

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    initDB
};
