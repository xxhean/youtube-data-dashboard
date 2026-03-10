const Database = require('better-sqlite3');
const n8nDb = new Database('d:/项目/N8N/data/database.sqlite');
const rows = n8nDb.prepare('SELECT id, video_url, title FROM videos LIMIT 3').all();
console.log(JSON.stringify(rows, null, 2));
