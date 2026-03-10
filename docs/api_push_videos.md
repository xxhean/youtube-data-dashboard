# 视频推送 API 接口文档

此接口用于从 N8N 或其他爬虫脚本向系统自动化推送采集到的 YouTube 视频数据。

---

## 接口详情

- **请求地址**: `POST http://localhost:3000/api/videos`  *(请根据实际部署的域名或 IP 替换 localhost:3000)*
- **Content-Type**: `application/json`
- **鉴权方式**: 在 Header 中传入 `Authorization`

### 1. Header 鉴权参数

| Key | Value | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `Authorization` | `Bearer <你的API_KEY>` | 是 | 你的 API_KEY 配置在项目根目录的 `.env` 文件中。目前默认是 `test-api-key-123` |

### 2. Request Body 请求体参数 (JSON)

既支持推送**单条数据（Object）**，也支持推送**批量数据（Array）**。
参数字段名为了兼容 N8N，支持直接使用原始数据列名。

| 字段名 | 类型 | 必填 | 默认值 | N8N对应 | 说明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `video_url` | String | **是** | `""` | 视频地址 | YouTube 视频链接，**非常重要（不要留空）**。系统依靠这个地址进行查重更新和封面图生成。 |
| `title` | String | 否 | `""` | 标题 | 视频标题。后台会自动从中提取 `#标签` 作为分类主题。 |
| `views` | Number | 否 | `0` | 观看次数 | 当前的播放量。后端支持传 `views` 或 `view_count`。 |
| `account` | String | 否 | `""` | 所属账号 | 频道或账号名称。后端**已支持自动解码**，N8N 推送 `%E5...` 也没关系。 |
| `publish_date`| String | 否 | `""` | 发布日期 | 视频原本的发布日期 (如 `2026-03-07`) |
| `scrape_date` | String | 否 | 当前系统日期 | 抓取日期 | 你的数据采集日期。后端支持传 `scrape_date` 取代 `collect_date`。 |
| `focus` | String | 否 | `""` | 重点关注 | 传 `FOLLOW` 则在面板中标记为**红色**；传 `x` 或其他符则标记为**黄色**。不传则无背景色。 |

*(注：之前的 `days_from_now` 字段不需要推送，系统不存储，按需实时展现)*

---

## 请求示例 (CURL)

### 示例 1: 批量推送多条数据 (推荐用法)

```bash
curl -X POST http://localhost:3000/api/videos \
  -H "Authorization: test-api-key-123" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "video_url": "https://www.youtube.com/shorts/rP1RkeWQt20",
      "title": "COUPLE GOALS! 🥰 #dance #funny #shorts",
      "views": 1200000,
      "account": "CadelandMia",
      "publish_date": "2026-03-08",
      "scrape_date": "2026-03-09",
      "focus": "FOLLOW"
    },
    {
      "video_url": "https://www.youtube.com/shorts/07zYSet9u_8",
      "title": "Whose foot is it#sonic #sonic3 #shorts",
      "views": 555000,
      "account": "%E5%88%BA%E7%8C%AC%E7%B4%A2%E5%B0%BC%E5%85%8BSONIC",
      "publish_date": "2026-03-07",
      "scrape_date": "2026-03-09",
      "focus": "x"
    }
]'
```

### 示例 2: 单条数据推送

```json
// POST Body:
{
  "video_url": "https://www.youtube.com/watch?v=123456",
  "title": "A regular video #vlog",
  "views": 4500,
  "account": "MyChannel",
  "focus": ""
}
```

---

## 响应数据结构 (Response)

成功推送后，系统会经过内置的清洗服务，返回类似如下 JSON 格式：

```json
{
  "success": true,
  "processed": 2,     // 收到的原始数据记录数
  "inserted": 1,      // 新增记录数量
  "updated": 1,       // 探测到重复链接，发生的更新数量
  "message": "Successfully processed 2 records (1 new, 1 updated)"
}
```

**(当遇到报错时)：**
```json
{
  "success": false,
  "message": "Unauthorized" // 或者 Server error 等详细报错
}
```

---

## 数据转换流说明

为了方便理解您的数据交给此 API 后的发生经过：
1. 数据被接收后会首先进入缓冲层 `raw_videos` 表。
2. 后台通过内置 `processRawData()` **自动解码账号名称、提取标题中的 `#Tags` 到主题库、根据链接生成对应缩略图封面、更新排查记录变更...**
3. 最后，清理掉缓冲层，并在前端实现**实时**反馈！因此你推过来后，不用再做二次处理，打开浏览器刷新就能直接看。
