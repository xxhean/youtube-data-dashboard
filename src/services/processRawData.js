const db = require('../db');

/**
 * Extract YouTube video ID from URL
 */
function extractVideoId(url) {
    if (!url) return null;
    try {
        if (url.includes('youtube.com/shorts/')) {
            return url.split('youtube.com/shorts/')[1].split('?')[0].split('#')[0];
        } else if (url.includes('v=')) {
            return new URL(url).searchParams.get('v');
        } else if (url.includes('youtu.be/')) {
            return url.split('youtu.be/')[1].split('?')[0];
        }
    } catch (e) { }
    return null;
}

/**
 * Generate YouTube thumbnail URL from video URL
 */
function getThumbnailUrl(videoUrl) {
    const videoId = extractVideoId(videoUrl);
    if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    return '';
}

/**
 * Extract #hashtags from title
 * e.g. "Hello #dance #funny #shorts" → ['dance', 'funny']
 * Filters out 'shorts'/'short' since it's just a format indicator
 */
function extractHashtags(title) {
    if (!title) return [];
    const matches = title.match(/#([\w\u4e00-\u9fff]+)/g);
    if (!matches) return [];
    return matches
        .map(tag => tag.slice(1).toLowerCase())
        .filter(tag => tag !== 'shorts' && tag !== 'short');
}

/**
 * Decode URL-encoded account name
 */
function decodeAccount(account) {
    if (!account) return '';
    try {
        return decodeURIComponent(account);
    } catch (e) {
        return account;
    }
}

/**
 * Process all raw_videos into videos/topics, then clear raw_videos.
 * 
 * Flow:
 * 1. Read raw_videos
 * 2. For each: decode account, determine type, extract hashtags, generate thumbnail
 * 3. Upsert into videos table
 * 4. Insert unique hashtags into topics
 * 5. Record view_history
 * 6. Clear raw_videos
 */
async function processRawData() {
    const rawVideos = (await db.query('SELECT * FROM raw_videos')).rows;
    if (rawVideos.length === 0) return { processed: 0, inserted: 0, updated: 0 };

    let inserted = 0;
    let updated = 0;

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        for (const raw of rawVideos) {
            // 1. Decode account → channel_name
            const channelName = decodeAccount(raw.account);

            // 2. Handle missing video_url: generate placeholder from title+account hash
            let videoUrl = (raw.video_url || '').trim();
            if (!videoUrl) {
                // Generate a deterministic placeholder so dedup works
                const hash = Buffer.from(`${raw.title}|${raw.account}`).toString('base64url').slice(0, 20);
                videoUrl = `placeholder://${hash}`;
            }

            // 3. Determine video type from URL or title
            let videoType = 'regular';
            if (videoUrl.includes('/shorts/')) {
                videoType = 'short';
            } else if (raw.title && /#shorts/i.test(raw.title)) {
                videoType = 'short';
            }

            // 4. Generate thumbnail from YouTube URL
            const thumbnailUrl = getThumbnailUrl(videoUrl);

            // 4. Extract #hashtags → keyword
            const hashtags = extractHashtags(raw.title);
            const keyword = hashtags.join(', ');

            // 5. Map focus → is_highlighted (0=none, 1=normal/x, 2=FOLLOW/red)
            let isHighlighted = 0;
            if (raw.focus) {
                const focusVal = raw.focus.trim().toUpperCase();
                if (focusVal === 'FOLLOW') {
                    isHighlighted = 2;
                } else if (focusVal !== '') {
                    isHighlighted = 1;
                }
            }

            // 6. Check existing for history tracking
            const existingResult = await client.query('SELECT id, view_count FROM videos WHERE video_url = $1', [videoUrl]);
            const existing = existingResult.rows[0];

            // 7. Upsert into videos
            await client.query(`
                INSERT INTO videos (
                    video_url, title, thumbnail_url, view_count, video_type,
                    channel_name, publish_date, collect_date, keyword, is_highlighted
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT(video_url) DO UPDATE SET
                    title = excluded.title,
                    thumbnail_url = excluded.thumbnail_url,
                    view_count = excluded.view_count,
                    collect_date = excluded.collect_date,
                    keyword = excluded.keyword,
                    is_highlighted = excluded.is_highlighted
            `, [
                videoUrl,
                raw.title || '',
                thumbnailUrl,
                raw.view_count || 0,
                videoType,
                channelName,
                raw.publish_date || '',
                raw.scrape_date || '',
                keyword,
                isHighlighted
            ]);

            if (existing) {
                updated++;
                if (raw.view_count && raw.view_count !== existing.view_count) {
                    await client.query('INSERT INTO view_history (video_id, view_count) VALUES ($1, $2)', [existing.id, raw.view_count]);
                }
            } else {
                inserted++;
                if (raw.view_count) {
                    const newVideo = (await client.query('SELECT id FROM videos WHERE video_url = $1', [videoUrl])).rows[0];
                    if (newVideo) {
                        await client.query('INSERT INTO view_history (video_id, view_count) VALUES ($1, $2)', [newVideo.id, raw.view_count]);
                    }
                }
            }

            // 8. Insert topics from hashtags
            for (const tag of hashtags) {
                await client.query('INSERT INTO topics (name) VALUES ($1) ON CONFLICT(name) DO NOTHING', [tag]);
            }
        }

        // 9. Clear raw_videos after processing
        await client.query('DELETE FROM raw_videos');
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error in processRawData transaction:', e);
        throw e;
    } finally {
        client.release();
    }

    console.log(`[processRawData] Processed ${rawVideos.length} raw records → ${inserted} new, ${updated} updated`);
    return { processed: rawVideos.length, inserted, updated };
}

module.exports = { processRawData, extractHashtags, decodeAccount, getThumbnailUrl, extractVideoId };
