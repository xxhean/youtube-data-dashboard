const cron = require('node-cron');
const { google } = require('googleapis');
const db = require('../db');
require('dotenv').config();

const API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_VERSION = 'v3';
const CRON_SCHEDULE = process.env.REFRESH_CRON || '0 2 * * *'; // Default: 2 AM daily
const BATCH_SIZE = parseInt(process.env.REFRESH_BATCH_SIZE || '50', 10);

if (!API_KEY) {
    console.warn('YouTube API Key is missing. Auto-refresh views is disabled.');
    module.exports = null; // Return null if disabled
} else {
    const youtube = google.youtube({
        version: YOUTUBE_API_VERSION,
        auth: API_KEY,
    });

    // Helper: Extract YouTube video id from url
    function extractVideoId(url) {
        if (!url) return null;
        try {
            if (url.includes('youtube.com/shorts/')) {
                return url.split('youtube.com/shorts/')[1].split('?')[0];
            } else if (url.includes('v=')) {
                return new URL(url).searchParams.get('v');
            } else if (url.includes('youtu.be/')) {
                return url.split('youtu.be/')[1].split('?')[0];
            }
        } catch (e) {
            console.error('Error parsing url', url, e);
        }
        return null;
    }

    // Refresh function
    async function refreshViews() {
        console.log(`[${new Date().toISOString()}] Starting YouTube views auto-refresh...`);

        try {
            // Get all videos
            const videosStmt = db.prepare('SELECT id, video_url FROM videos');
            const allVideos = videosStmt.all();

            if (allVideos.length === 0) {
                console.log('No videos to refresh.');
                return;
            }

            const updateCountStmt = db.prepare('UPDATE videos SET view_count = ? WHERE id = ?');
            const insertHistoryStmt = db.prepare('INSERT INTO view_history (video_id, view_count) VALUES (?, ?)');

            for (let i = 0; i < allVideos.length; i += BATCH_SIZE) {
                const batch = allVideos.slice(i, i + BATCH_SIZE);
                const videoMap = {}; // idStr -> dbId
                const videoIds = batch.map(v => {
                    const yId = extractVideoId(v.video_url);
                    if (yId) videoMap[yId] = v.id;
                    return yId;
                }).filter(Boolean);

                if (videoIds.length === 0) continue;

                // Call YouTube API
                const response = await youtube.videos.list({
                    part: 'statistics',
                    id: videoIds.join(','),
                });

                const apiItems = response.data.items || [];

                db.transaction(() => {
                    let updated = 0;
                    for (const item of apiItems) {
                        const count = parseInt(item.statistics.viewCount, 10);
                        const dbId = videoMap[item.id];

                        if (dbId && !isNaN(count)) {
                            // Only update if count has changed? 
                            // Let's just update and log history
                            updateCountStmt.run(count, dbId);
                            insertHistoryStmt.run(dbId, count);
                            updated++;
                        }
                    }
                    console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}. Updated ${updated} videos.`);
                })();
            }

            console.log(`[${new Date().toISOString()}] Refresh completed.`);
        } catch (error) {
            console.error('Failed to refresh views:', error.message);
        }
    }

    // Schedule task
    cron.schedule(CRON_SCHEDULE, refreshViews, {
        timezone: "Asia/Shanghai"
    });

    console.log(`Cron scheduled: Refresh YouTube Views [${CRON_SCHEDULE}]`);

    module.exports = { refreshViews };
}
