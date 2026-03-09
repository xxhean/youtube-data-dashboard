const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
}

// Connect to SQLite DB
const db = new Database(path.join(dbPath, 'database.sqlite'));

// Create Tables
db.prepare(`
    CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_name TEXT UNIQUE,
        channel_url TEXT,
        avatar_url TEXT,
        subscriber_count INTEGER DEFAULT 0,
        total_views BIGINT DEFAULT 0,
        video_count INTEGER DEFAULT 0,
        daily_views INTEGER DEFAULT 0,
        daily_subs INTEGER DEFAULT 0,
        country TEXT,
        joined_date TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        cover_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS view_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id INTEGER,
        view_count INTEGER,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE CASCADE
    )
`).run();

module.exports = db;
