/**
 * Import data from N8N database into the ghost dashboard.
 * 
 * Flow: N8N DB → raw_videos staging → process → videos/topics
 * 
 * Usage: node import_n8n.js
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Initialize ghost DB (creates tables if needed)
const db = require('./src/db');
const { processRawData } = require('./src/services/processRawData');

const n8nDbPath = path.resolve('d:/项目/N8N/data/database.sqlite');

if (!fs.existsSync(n8nDbPath)) {
    console.error(`N8N database not found at: ${n8nDbPath}`);
    process.exit(1);
}

try {
    const n8nDb = new Database(n8nDbPath);
    const rawVideos = n8nDb.prepare('SELECT * FROM videos').all();
    console.log(`Found ${rawVideos.length} videos in N8N database.`);

    if (rawVideos.length === 0) {
        console.log('No data to import.');
        process.exit(0);
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
                v.scrape_date || '',
                v.focus || ''
            );
        }
    });

    insertTransaction(rawVideos);
    console.log(`Staged ${rawVideos.length} records into raw_videos.`);

    // Process: raw_videos → videos/topics → clear
    const result = processRawData();
    console.log(`✅ Import complete: ${result.inserted} new, ${result.updated} updated.`);

    n8nDb.close();
} catch (e) {
    console.error('Import failed:', e);
    process.exit(1);
}
