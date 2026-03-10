const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../data');
if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
}

// Connect to SQLite DB
const db = new Database(path.join(dbPath, 'database.sqlite'));

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// ==========================================
// raw_videos: 原始数据暂存表 (N8N 推送数据直接写入)
// 处理完成后数据会被清除
// ==========================================
db.prepare(`
    CREATE TABLE IF NOT EXISTS raw_videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_url TEXT,
        title TEXT,
        view_count INTEGER DEFAULT 0,
        account TEXT,
        publish_date TEXT,
        scrape_date TEXT,
        focus TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// ==========================================
// videos: 处理后的视频数据 (从 raw_videos 加工得来)
// ==========================================
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

// ==========================================
// topics: 主题/关键词 (从视频标题 #hashtag 自动提取)
// ==========================================
db.prepare(`
    CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        cover_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// ==========================================
// view_history: 播放量变化追踪
// ==========================================
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
