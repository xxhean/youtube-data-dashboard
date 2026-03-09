// shared utility functions

// Format numbers (e.g. 1500000 -> 1.5M)
function formatNumber(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Generate pagination HTML
function renderPagination(paginationStr, currentPage, totalPages, onPageClickFnName) {
    if (totalPages <= 1) return '';

    let html = '';

    // Prev
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="${onPageClickFnName}(${currentPage - 1})">&lt;</button>`;

    // Pages
    for (let i = 1; i <= totalPages; i++) {
        // Show max 5 pages logic (simplification)
        if (totalPages > 7) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="${onPageClickFnName}(${i})">${i}</button>`;
            } else if (i === 2 || i === totalPages - 1) {
                html += `<span style="padding: 0.5rem">...</span>`;
            }
        } else {
            html += `<button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="${onPageClickFnName}(${i})">${i}</button>`;
        }
    }

    // Next
    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="${onPageClickFnName}(${currentPage + 1})">&gt;</button>`;

    return html;
}

// Format relative growth
function formatGrowth(num) {
    if (num > 0) return `<span class="text-success">+${formatNumber(num)}</span>`;
    if (num < 0) return `<span style="color: #EF4444">-${formatNumber(Math.abs(num))}</span>`;
    return '<span style="color: var(--text-muted)">+0</span>';
}

// Translations Dictionary
const translations = {
    en: {
        nav_video: "📹 Video Ranking",
        nav_channel: "📺 Channel Ranking",
        nav_topic: "🏷️ Topic Ranking",
        btn_login_register: "Login / Register",
        filter_type: "Video Type:",
        filter_date: "Publish Date:",
        filter_metric: "Metric:",
        filter_ranking: "Ranking Type:",
        btn_all: "All",
        btn_short: "Shorts",
        btn_regular: "Long Videos",
        btn_all_time: "All Time",
        btn_week: "This Week",
        btn_month: "This Month",
        btn_views: "Views",
        btn_subs: "Subscribers",
        btn_total: "Total",
        btn_growth: "Growth",
        search_ph: "Search title or keyword...",
        th_rank: "#",
        th_thumb: "Thumbnail",
        th_title: "Title",
        th_date: "Publish Date",
        th_channel: "Channel",
        th_views: "Views",
        th_keyword: "Keyword",
        th_type: "Type",
        th_videos: "Videos",
        th_subs: "Subs",
        th_tot_views: "Total Views",
        th_day_views: "Daily Views",
        th_day_subs: "Daily Subs",
        th_country: "Country",
        th_latest: "Latest Videos"
    },
    zh: {
        nav_video: "📹 视频排行",
        nav_channel: "📺 频道排行",
        nav_topic: "🏷️ 主题排行",
        btn_login_register: "登录 / 注册",
        filter_type: "视频类型：",
        filter_date: "发布时间：",
        filter_metric: "指标：",
        filter_ranking: "排名类型：",
        btn_all: "全部",
        btn_short: "短视频",
        btn_regular: "长视频",
        btn_all_time: "全部时间",
        btn_week: "本周",
        btn_month: "本月",
        btn_views: "观看数",
        btn_subs: "订阅数",
        btn_total: "总量",
        btn_growth: "增长",
        search_ph: "搜索标题或关键词...",
        th_rank: "排名",
        th_thumb: "视频封面",
        th_title: "标题",
        th_date: "发布日期",
        th_channel: "频道",
        th_views: "观看数",
        th_keyword: "主题",
        th_type: "类型",
        th_videos: "视频数",
        th_subs: "订阅数",
        th_tot_views: "总观看数",
        th_day_views: "每日观看",
        th_day_subs: "每日订阅",
        th_country: "国家",
        th_latest: "最新视频"
    }
};

let currentLang = localStorage.getItem('appLang') || 'en';

function applyTranslations() {
    const dict = translations[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            if (el.tagName === 'INPUT' && el.type === 'text') {
                el.placeholder = dict[key];
            } else {
                let arrow = '';
                if (el.innerText.includes('↓')) arrow = ' ↓';
                else if (el.innerText.includes('↑')) arrow = ' ↑';
                else if (el.innerText.includes('⇕')) arrow = ' ⇕';
                el.innerText = dict[key] + arrow;
            }
        }
    });

    const switcher = document.getElementById('lang-switcher');
    if (switcher) switcher.value = currentLang;
}

document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();

    const switcher = document.getElementById('lang-switcher');
    if (switcher) {
        switcher.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('appLang', currentLang);
            applyTranslations();
            // Optional: trigger re-render if sort arrows are affected, 
            // but for now reloading the page is the easiest way to ensure JS states refresh too
            window.location.reload();
        });
    }
});
