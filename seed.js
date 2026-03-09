const items = [
    {
        video_url: 'https://youtube.com/shorts/test1',
        title: 'Cartoon adventures!',
        thumbnail_url: 'https://via.placeholder.com/120x68/FFB6C1',
        view_count: 32800000,
        video_type: 'short',
        channel_name: 'CartoonNetwork',
        channel_avatar_url: 'https://via.placeholder.com/32/FFB6C1',
        publish_date: '2026-03-03',
        keyword: 'cartoon',
        country: 'US',
        is_highlighted: true
    },
    {
        video_url: 'https://youtube.com/watch?v=123test',
        title: 'Brainrot is everywhere!',
        thumbnail_url: 'https://via.placeholder.com/120x68/87CEEB',
        view_count: 13000000,
        video_type: 'regular',
        channel_name: 'BrainrotHub',
        channel_avatar_url: 'https://via.placeholder.com/32/87CEEB',
        publish_date: '2026-03-04',
        keyword: 'brainrot',
        country: 'UK'
    }
];

fetch('http://localhost:3000/api/videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-api-key-123' },
    body: JSON.stringify(items)
}).then(r => r.json()).then(console.log).catch(console.error);

const channels = [
    {
        channel_name: 'CartoonNetwork',
        subscriber_count: 25600000,
        total_views: 332900000000,
        video_count: 3500,
        daily_views: 924100000,
        daily_subs: 15000,
        country: 'US',
        avatar_url: 'https://via.placeholder.com/64/FFB6C1'
    }
];
fetch('http://localhost:3000/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-api-key-123' },
    body: JSON.stringify(channels)
}).then(r => r.json()).then(console.log).catch(console.error);

const topics = [
    { name: 'cartoon', cover_url: 'https://via.placeholder.com/160x100/FFB6C1?text=Cartoon' },
    { name: 'brainrot', cover_url: 'https://via.placeholder.com/160x100/87CEEB?text=Brainrot' },
    { name: 'gaming', cover_url: 'https://via.placeholder.com/160x100/98FB98?text=Gaming' }
];

fetch('http://localhost:3000/api/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-api-key-123' },
    body: JSON.stringify(topics)
}).then(r => r.json()).then(console.log).catch(console.error);
