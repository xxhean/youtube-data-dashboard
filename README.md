# YouTube Data Dashboard / YouTube 视频数据看板

A minimalist, high-performance web dashboard for tracking and analyzing YouTube trending data, channels, and topic keywords. Built with a Node.js backend, SQLite database, and Vanilla JS frontend.

本项目是一个极简、高性能的网页数据看板，用于跟踪和分析 YouTube 热门视频、频道和主题标签的数据表现。后端采用 Node.js + SQLite 构建，前端基于原生 HTML/CSS/JS 实现。

## ✨ Features (功能特性)

- **Video Ranking (视频排行)**: Filter by video type (Shorts/Long Videos) and publish date. Sort by views or publish date.
- **Channel Ranking (频道排行)**: Track channel subscribers, total views, daily increments, and growth rankings.
- **Topic Ranking (主题排行)**: Browse hot topics and see related trending videos.
- **Auto Data Refresh (数据自动刷新)**: Integrated `node-cron` and YouTube Data API v3 to automatically update video view counts daily.
- **Multi-language Support (多语言支持)**: Built-in i18n support, switch seamlessly between English and Chinese content.
- **API Key Security (安全认证)**: Simple and secure `x-api-key` header authentication for data ingestion.

## 🛠️ Technology Stack (技术栈)

**Backend (后端)**:
- Node.js
- Express.js
- SQLite3 (`better-sqlite3`)
- YouTube Data API v3 (`googleapis`)
- node-cron

**Frontend (前端)**:
- HTML5 / CSS3 (Vanilla)
- Vanilla JavaScript
- Google Fonts (Inter)

## 📦 Installation & Setup (安装与运行)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/xxhean/youtube-data-dashboard.git
   cd youtube-data-dashboard
   ```

2. **Install dependencies (安装依赖):**
   ```bash
   npm install
   ```

3. **Environment Setup (环境变量配置):**
   Copy the example environment file and configure your keys:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in:
   - `PORT`: Server port (default: 3000)
   - `API_KEY`: Your custom secret key for pushing data via API.
   - `YOUTUBE_API_KEY`: Google Cloud YouTube Data API v3 Key.
   - `REFRESH_CRON`: Cron job schedule (default: `0 2 * * *` for 2 AM daily).

4. **Start the server (启动服务):**
   ```bash
   npm start
   ```
   *The database (`data/dashboard.sqlite`) will be created automatically on the first run.*

5. Navigate to `http://localhost:3000` in your browser.

## 📡 API Endpoints (数据接口)

*All POST/write requests require the `x-api-key` header.*

- `GET /api/videos` - Get video rankings (supports pagination, filtering, sorting).
- `POST /api/videos` - Upsert video statistics.
- `GET /api/channels` - Get channel rankings.
- `POST /api/channels` - Upsert channel statistics.
- `GET /api/topics` - List available topics.
- `POST /api/topics` - Upsert new topics.
- `GET /api/topics/:name/videos` - Get videos belonging to a specific topic.
- `POST /api/refresh-views` - Manually trigger the YouTube API view count refresh.

## 👨‍💻 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

[MIT](https://choosealicense.com/licenses/mit/)
