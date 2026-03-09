let state = {
    page: 1,
    limit: 50,
    metric: 'views', // views, subscribers
    type: 'total' // total, growth
};

async function fetchChannels() {
    try {
        const queryParams = new URLSearchParams({
            page: state.page,
            limit: state.limit,
            metric: state.metric,
            type: state.type
        });

        const res = await fetch(`/api/channels?${queryParams.toString()}`);
        const data = await res.json();

        if (data.success) {
            renderTable(data.data, (state.page - 1) * state.limit);
            document.getElementById('pagination-container').innerHTML =
                renderPagination(data.pagination, state.page, data.pagination.totalPages, 'goToPage');
        }
    } catch (err) {
        console.error('Failed to fetch channels', err);
    }
}

function renderTable(channels, offsetIndex) {
    const tbody = document.getElementById('table-body');

    if (channels.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted)">No channels found</td></tr>`;
        return;
    }

    tbody.innerHTML = channels.map((c, index) => {
        const rank = offsetIndex + index + 1;
        let rankClass = 'rank-other';
        if (rank === 1) rankClass = 'rank-1';
        if (rank === 2) rankClass = 'rank-2';
        if (rank === 3) rankClass = 'rank-3';

        const rankBadge = `<div class="rank-badge ${rankClass}">${rank}</div>`;
        const avatarStr = c.avatar_url
            ? `<img src="${c.avatar_url}" class="channel-avatar" alt="A">`
            : `<div class="channel-avatar"></div>`;

        let latestVideosHtml = '';
        if (c.latest_videos && c.latest_videos.length > 0) {
            latestVideosHtml = c.latest_videos.map(v =>
                `<img src="${v.thumbnail_url || 'https://via.placeholder.com/60x80'}" class="small-thumbnail" title="${v.title}">`
            ).join('');
        } else {
            latestVideosHtml = `<span class="text-muted">-</span>`;
        }

        return `
            <tr>
                <td>${rankBadge}</td>
                <td>
                    <div class="channel-info">
                        ${avatarStr}
                        <a href="${c.channel_url || '#'}" target="_blank" style="font-weight:600;color:var(--text-color);text-decoration:none">
                            ${c.channel_name || 'Unknown'}
                        </a>
                    </div>
                </td>
                <td style="color:var(--text-muted)">${formatNumber(c.video_count || 0)}</td>
                <td class="text-bold">${formatNumber(c.subscriber_count || 0)}</td>
                <td class="text-lg">${formatNumber(c.total_views || 0)}</td>
                <td>${formatGrowth(c.daily_views || 0)}</td>
                <td>${formatGrowth(c.daily_subs || 0)}</td>
                <td>${c.country || '-'}</td>
                <td>${latestVideosHtml}</td>
            </tr>
        `;
    }).join('');
}

window.goToPage = (page) => {
    state.page = page;
    fetchChannels();
};

document.addEventListener('DOMContentLoaded', () => {
    // Setup filter buttons
    document.getElementById('metric-filters').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#metric-filters button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.metric = e.target.dataset.metric;
            state.page = 1;
            fetchChannels();
        }
    });

    document.getElementById('type-filters').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#type-filters button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.type = e.target.dataset.type;
            state.page = 1;
            fetchChannels();
        }
    });

    // Initial load
    fetchChannels();
});
