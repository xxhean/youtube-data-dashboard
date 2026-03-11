# 视频推送 API 接口文档

此接口用于从 N8N 或 Python 爬虫脚本向系统自动化推送采集到的 YouTube 视频数据。

---

## 接口详情

- **请求地址**: `POST http://localhost:3000/api/videos`  *(部署到服务器后，请将 localhost:3000 替换为你服务器的域名或 IP)*
- **Content-Type**: `application/json`
- **鉴权方式**: 在 Header 中传入 `x-api-key`

### 1. Header 鉴权参数

| Key | Value | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `x-api-key` | `test-api-key-123` | ✅ 是 | API 密钥，配置在项目 `.env` 文件的 `API_KEY` 字段中 |
| `Content-Type` | `application/json` | ✅ 是 | 固定值，声明请求体为 JSON 格式 |

> ⚠️ **重要提醒**：Header 的 Key 是 `x-api-key`（全小写、带横杠），**不是** `Authorization`！如果写错会返回 `401 API key is missing` 错误。

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

*(注：`days_from_now` 字段不需要推送，系统不存储，按需实时展现)*

---

## 请求示例

### 示例 1: CURL 批量推送 (命令行测试)

```bash
curl -X POST http://localhost:3000/api/videos \
  -H "x-api-key: test-api-key-123" \
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

### 示例 2: Python 推送脚本 (完整可运行)

```python
import requests
import json

API_URL = "http://localhost:3000/api/videos"
API_KEY = "test-api-key-123"

# 请求头 —— 注意 Key 必须是 x-api-key
headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

# 要推送的数据（支持数组批量推送）
data = [
    {
        "video_url": "https://www.youtube.com/shorts/rP1RkeWQt20",
        "title": "COUPLE GOALS! 🥰 #dance #funny",
        "views": 1200000,
        "account": "CadelandMia",
        "publish_date": "2026-03-08",
        "scrape_date": "2026-03-09",
        "focus": "FOLLOW"
    }
]

response = requests.post(
    API_URL,
    json=data,
    headers=headers,
    timeout=30,
    proxies={"http": None, "https": None}   # ← 绕过系统代理，防止走 Clash/V2Ray 超时
)

print(response.status_code)
print(response.json())
```

> ⚠️ **代理问题**：如果你的电脑安装了 Clash、V2Ray 等代理软件，Python 的 `requests` 库会自动使用系统代理。推送到 `localhost` 时会被代理拦截导致超时。**必须加上 `proxies={"http": None, "https": None}` 来绕过代理！**

### 示例 3: N8N HTTP Request 节点配置

在 N8N 中使用 HTTP Request 节点推送数据时：

| 配置项 | 值 |
| :--- | :--- |
| Method | `POST` |
| URL | `http://localhost:3000/api/videos` |
| Authentication | `Generic Credential Type` → `Header Auth` |
| Header Auth 的 Name | `x-api-key` |
| Header Auth 的 Value | `test-api-key-123` |
| Body Content Type | `JSON` |
| Body | 绑定你采集到的数据数组 |

---

## 响应数据结构 (Response)

### 成功响应 (200)

```json
{
  "success": true,
  "processed": 2,
  "inserted": 1,
  "updated": 1,
  "message": "Successfully processed 2 records (1 new, 1 updated)"
}
```

| 字段 | 说明 |
| :--- | :--- |
| `processed` | 收到的原始数据记录数 |
| `inserted` | 新增记录数量 (之前没见过的 video_url) |
| `updated` | 更新记录数量 (video_url 已存在，更新了播放量等信息) |

### 失败响应

```json
// 401 - 缺少 API Key
{ "success": false, "message": "API key is missing" }

// 403 - API Key 不正确
{ "success": false, "message": "Invalid API key" }

// 500 - 服务器内部错误
{ "success": false, "message": "Server error: ..." }
```

---

## 常见问题排查

| 现象 | 原因 | 解决办法 |
| :--- | :--- | :--- |
| `401 API key is missing` | 请求头写成了 `Authorization` 而不是 `x-api-key` | 把 Header Key 改为 `x-api-key` |
| `403 Invalid API key` | Key 的值写错了 | 检查 `.env` 里的 `API_KEY` 值，确保和推送时传的一致 |
| `Read timed out` 且端口是 `7897` | Python 走了 Clash/V2Ray 代理 | 加上 `proxies={"http": None, "https": None}` 参数 |
| `Connection refused` | Node.js 服务没在运行 | 在项目目录执行 `npm run dev` 启动服务 |
| 推送成功但网页看不到数据 | 浏览器缓存 | 按 `Ctrl + Shift + R` 强制刷新页面 |

---

## 数据转换流说明

为了方便理解您的数据交给此 API 后的发生经过：
1. 数据被接收后会首先进入缓冲层 `raw_videos` 表。
2. 后台通过内置 `processRawData()` **自动解码账号名称、提取标题中的 `#Tags` 到主题库、根据链接生成对应缩略图封面、更新排查记录变更...**
3. 最后，清理掉缓冲层，并在前端实现**实时**反馈！因此你推过来后，不用再做二次处理，打开浏览器刷新就能直接看。
