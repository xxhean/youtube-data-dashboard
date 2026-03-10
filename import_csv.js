const fs = require('fs');
const path = require('path');
const db = require('./src/db');
const { processRawData } = require('./src/services/processRawData');

function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < text.length && text[i+1] === '"') {
                    currentCell += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentCell);
                currentCell = '';
            } else if (char === '\n' || char === '\r') {
                currentRow.push(currentCell);
                if (currentRow.length > 1 || currentCell !== '') {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentCell = '';
                if (char === '\r' && i + 1 < text.length && text[i+1] === '\n') {
                    i++;
                }
            } else {
                currentCell += char;
            }
        }
    }
    if (currentCell !== '' || currentRow.length > 0) {
        currentRow.push(currentCell);
        if (currentRow.length > 1 || currentCell !== '') {
            rows.push(currentRow);
        }
    }
    return rows;
}

const csvPath = 'd:/项目/N8N/3.9采集数据.csv';
if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at: ${csvPath}`);
    process.exit(1);
}

try {
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvData);
    
    // First row is header
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    console.log(`Found ${dataRows.length} videos in CSV.`);

    if (dataRows.length === 0) {
        console.log('No data to import.');
        process.exit(0);
    }

    const insertRaw = db.prepare(`
        INSERT INTO raw_videos (video_url, title, view_count, account, publish_date, scrape_date, focus)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTransaction = db.transaction((videos) => {
        for (const r of videos) {
            if (r.length < 5) continue; // Skip malformed rows
            const videoUrl = r[0] || '';
            const title = r[1] || '';
            const views = parseInt(r[2], 10) || 0;
            const account = r[3] || '';
            const publishDate = r[4] || '';
            const scrapeDate = r[5] || '';
            // skip r[6] which is days_from_now
            const focus = r[7] || '';

            insertRaw.run(
                videoUrl,
                title,
                views,
                account,
                publishDate,
                scrapeDate,
                focus
            );
        }
    });

    insertTransaction(dataRows);
    console.log(`Staged ${dataRows.length} records into raw_videos.`);

    // Process: raw_videos → videos/topics → clear raw_videos
    const result = processRawData();
    console.log(`✅ Import complete: ${result.inserted} new, ${result.updated} updated.`);

} catch (e) {
    console.error('Import failed:', e);
    process.exit(1);
}
