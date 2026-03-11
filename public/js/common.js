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

let turnstileSiteKey = '';
let currentTurnstileWidgetId = null;

async function checkAuthStatus() {
    try {
        const [authRes, configRes] = await Promise.all([
            fetch('/auth/me'),
            fetch('/auth/config')
        ]);
        const data = await authRes.json();
        const config = await configRes.json();
        
        turnstileSiteKey = config.turnstileSiteKey || '';

        const authContainer = document.querySelector('.auth-buttons');
        if (!authContainer) return;

        if (data.success && data.user) {
            // Logged in
            const user = data.user;
            authContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <img src="${user.avatar_url}" alt="Avatar" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #E5E7EB;">
                    <span style="font-weight: 500; font-size: 0.9rem;">${user.display_name}</span>
                    <a href="/auth/logout" class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; margin-left: 0.5rem;">Log out</a>
                </div>
            `;
        } else {
            // Not logged in -> Show Modal Trigger
            authContainer.innerHTML = `
                <button onclick="openAuthModal()" class="btn btn-primary" style="display: flex; align-items: center; gap: 0.5rem;">
                    <span data-i18n="btn_login_register">${currentLang === 'zh' ? '登录 / 注册' : 'Login / Register'}</span>
                </button>
            `;
        }
    } catch (e) {
        console.error('Failed to check auth status', e);
    }
}

// ========================
// Authentication Modal Logic
// ========================
function openAuthModal() {
    // Inject Turnstile script if not present
    if (!document.getElementById('turnstile-script')) {
        const script = document.createElement('script');
        script.id = 'turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        document.head.appendChild(script);
    }

    let modal = document.getElementById('auth-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'auth-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="closeAuthModal()">&times;</button>
                <div id="modal-step-1">
                    <h2 class="modal-title">${currentLang === 'zh' ? '欢迎来到 Ghost Dashboard' : 'Welcome to Dashboard'}</h2>
                    <p class="modal-subtitle">${currentLang === 'zh' ? '登录或注册以继续' : 'Login or register to continue'}</p>
                    
                    <a href="/auth/google" class="btn-social" style="text-decoration: none;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.59 22.56 12.25Z" fill="#4285F4"/>
                            <path d="M12 23C14.97 23 17.46 22.01 19.28 20.34L15.71 17.57C14.72 18.23 13.47 18.63 12 18.63C9.15 18.63 6.74 16.71 5.88 14.13H2.21V16.98C4.01 20.55 7.72 23 12 23Z" fill="#34A853"/>
                            <path d="M5.88 14.13C5.66 13.47 5.53 12.75 5.53 12C5.53 11.25 5.66 10.53 5.88 9.87V7.02H2.21C1.47 8.5 1.04 10.19 1.04 12C1.04 13.81 1.47 15.5 2.21 16.98L5.88 14.13Z" fill="#FBBC05"/>
                            <path d="M12 5.38C13.62 5.38 15.07 5.94 16.22 7.03L19.36 3.89C17.46 2.12 14.97 1.04 12 1.04C7.72 1.04 4.01 3.45 2.21 7.02L5.88 9.87C6.74 7.29 9.15 5.38 12 5.38Z" fill="#EA4335"/>
                        </svg>
                        ${currentLang === 'zh' ? '使用 Google 继续' : 'Continue with Google'}
                    </a>

                    <div class="divider">${currentLang === 'zh' ? '或' : 'or'}</div>

                    <input type="email" id="auth-email" class="input-field" placeholder="${currentLang === 'zh' ? '电子邮箱' : 'Email Address'}" required>
                    <div id="turnstile-container" class="turnstile-container"></div>
                    <p id="auth-error-1" style="color: red; font-size: 0.85rem; margin-bottom: 1rem; display: none;"></p>
                    <button class="btn-block" onclick="sendAuthCode()" id="btn-send-code">
                        ${currentLang === 'zh' ? '使用邮箱继续' : 'Continue with Email'}
                    </button>
                    
                    <p style="margin-top:2rem; font-size: 0.75rem; color: #9CA3AF;">
                        ${currentLang === 'zh' ? '继续即表示您同意 服务条款 和 隐私政策' : 'By continuing, you agree to our Terms of Service and Privacy Policy.'}
                    </p>
                </div>

                <div id="modal-step-2" style="display: none;">
                    <h2 class="modal-title">${currentLang === 'zh' ? '输入验证码' : 'Enter verification code'}</h2>
                    <p class="modal-subtitle" id="verify-subtitle">We sent a code to your email</p>
                    
                    <input type="text" id="auth-code" class="input-field" placeholder="000000" style="text-align:center; font-size:1.5rem; letter-spacing:0.5rem" maxlength="6">
                    <p id="auth-error-2" style="color: red; font-size: 0.85rem; margin-bottom: 1rem; display: none;"></p>
                    <button class="btn-block" onclick="verifyAuthCode()" id="btn-verify-code">
                        ${currentLang === 'zh' ? '验证登录' : 'Verify & Login'}
                    </button>
                    <button class="btn-social" style="margin-top:1rem; border:none; box-shadow:none; color:var(--text-muted)" onclick="showModalStep1()">
                        &larr; ${currentLang === 'zh' ? '返回修改邮箱' : 'Back to email'}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    showModalStep1();
    
    // Force a small reflow to ensure the transition runs
    void modal.offsetWidth;
    modal.classList.add('active');
}

function showModalStep1() {
    document.getElementById('modal-step-1').style.display = 'block';
    document.getElementById('modal-step-2').style.display = 'none';
    
    // Render Turnstile logic if sitekey is loaded
    setTimeout(() => {
        if (turnstileSiteKey && window.turnstile) {
            // Prevent double rendering
            if (currentTurnstileWidgetId !== null) {
                try {
                    turnstile.remove(currentTurnstileWidgetId);
                } catch(e){}
            }
            document.getElementById('turnstile-container').innerHTML = '';
            currentTurnstileWidgetId = turnstile.render('#turnstile-container', {
                sitekey: turnstileSiteKey,
            });
        }
    }, 300);
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function sendAuthCode() {
    const email = document.getElementById('auth-email').value.trim();
    const errorEl = document.getElementById('auth-error-1');
    const btn = document.getElementById('btn-send-code');
    errorEl.style.display = 'none';

    if (!email || !email.includes('@')) {
        errorEl.textContent = currentLang === 'zh' ? '请输入有效的邮箱地址' : 'Please enter a valid email';
        errorEl.style.display = 'block';
        return;
    }

    let turnstileToken = '';
    if (turnstileSiteKey && window.turnstile && currentTurnstileWidgetId !== null) {
        turnstileToken = turnstile.getResponse(currentTurnstileWidgetId);
        if (!turnstileToken) {
            errorEl.textContent = currentLang === 'zh' ? '请完成人机验证' : 'Please complete the captcha';
            errorEl.style.display = 'block';
            return;
        }
    } else if (turnstileSiteKey) {
        errorEl.textContent = currentLang === 'zh' ? '人机验证组件未加载，请稍候重试' : 'Captcha not loaded, please wait';
        errorEl.style.display = 'block';
        return;
    } else {
        // Fallback for dev mode where turnkey is totally empty
        turnstileToken = 'dev_skip'; 
    }

    btn.disabled = true;
    btn.textContent = currentLang === 'zh' ? '发送中...' : 'Sending...';

    try {
        const res = await fetch('/auth/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, turnstileToken })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('modal-step-1').style.display = 'none';
            document.getElementById('modal-step-2').style.display = 'block';
            document.getElementById('verify-subtitle').textContent = (currentLang === 'zh' ? '已发送验证码至 ' : 'Sent code to: ') + email;
            document.getElementById('auth-code').value = '';
            document.getElementById('auth-code').focus();
        } else {
            errorEl.textContent = data.message;
            errorEl.style.display = 'block';
            if (window.turnstile && currentTurnstileWidgetId !== null) turnstile.reset(currentTurnstileWidgetId);
        }
    } catch (e) {
        errorEl.textContent = currentLang === 'zh' ? '网络错误' : 'Network error';
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = currentLang === 'zh' ? '使用邮箱继续' : 'Continue with Email';
    }
}

async function verifyAuthCode() {
    const email = document.getElementById('auth-email').value.trim();
    const code = document.getElementById('auth-code').value.trim();
    const errorEl = document.getElementById('auth-error-2');
    const btn = document.getElementById('btn-verify-code');
    errorEl.style.display = 'none';

    if (code.length < 5) {
        errorEl.textContent = currentLang === 'zh' ? '请输入完整的验证码' : 'Please enter the full code';
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = currentLang === 'zh' ? '验证中...' : 'Verifying...';

    try {
        const res = await fetch('/auth/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        const data = await res.json();
        
        if (data.success) {
            // Logged in!
            window.location.reload();
        } else {
            errorEl.textContent = data.message;
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = currentLang === 'zh' ? '验证登录' : 'Verify & Login';
        }
    } catch (e) {
        errorEl.textContent = currentLang === 'zh' ? '网络错误' : 'Network error';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = currentLang === 'zh' ? '验证登录' : 'Verify & Login';
    }
}

// Global hook
document.addEventListener('DOMContentLoaded', () => {
    // Override the generic translations for login if zh
    if (translations.zh) {
        translations.zh.btn_login_register = '登录 / 注册';
    }
    
    applyTranslations();
    checkAuthStatus();

    const switcher = document.getElementById('lang-switcher');
    if (switcher) {
        switcher.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('appLang', currentLang);
            applyTranslations();
            window.location.reload();
        });
    }
});
