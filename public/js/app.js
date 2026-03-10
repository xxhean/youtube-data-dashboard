let state = {
    page: 1,
    limit: 50,
    video_type: 'all', // all, short, regular
    date_range: 'all', // all, week, month
    keyword: '',
    sort: 'view_count',
    order: 'desc'
};

async function fetchVideos() {
    try {
        const queryParams = new URLSearchParams({
            page: state.page,
            limit: state.limit,
            sort: state.sort,
            order: state.order
        });

        if (state.video_type !== 'all') queryParams.append('video_type', state.video_type);
        if (state.date_range !== 'all') queryParams.append('date_range', state.date_range);
        if (state.keyword) queryParams.append('keyword', state.keyword);

        const res = await fetch(`/api/videos?${queryParams.toString()}`);
        const data = await res.json();

        if (data.success) {
            renderTable(data.data, (state.page - 1) * state.limit);
            document.getElementById('pagination-container').innerHTML =
                renderPagination(data.pagination, state.page, data.pagination.totalPages, 'goToPage');
        }
    } catch (err) {
        console.error('Failed to fetch videos', err);
    }
}

function renderTable(videos, offsetIndex) {
    const tbody = document.getElementById('table-body');

    if (videos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No videos found</td></tr>`;
        return;
    }

    tbody.innerHTML = videos.map((v, index) => {
        const typeBadge = v.video_type === 'short'
            ? `<span class="badge badge-short">Short</span>`
            : `<span class="badge badge-regular">Regular</span>`;

        const keywordBadge = v.keyword ? `<span class="badge badge-keyword">${v.keyword}</span>` : '-';

        const avatarStr = v.channel_avatar_url
            ? `<img src="${v.channel_avatar_url}" class="channel-avatar" alt="A">`
            : `<div class="channel-avatar"></div>`;

        const highlightStyle = v.is_highlighted === 2
            ? 'background: #FEE2E2' // FOLLOW = red/pink
            : (v.is_highlighted === 1 ? 'background: #FEF9C3' : ''); // x = yellow

        return `
            <tr style="${highlightStyle}">
                <td class="text-muted">${offsetIndex + index + 1}</td>
                <td>
                    <img src="${v.thumbnail_url || 'https://via.placeholder.com/120x68?text=No+Image'}" alt="Thumbnail" class="thumbnail">
                </td>
                <td style="max-width:300px">
                    <div style="font-weight:600;margin-bottom:0.5rem">
                        <a href="${v.video_url}" target="_blank" style="color:var(--text-color);text-decoration:none">
                            ${v.title || 'Untitled'}
                        </a>
                    </div>
                    ${typeBadge}
                </td>
                <td style="color:var(--text-muted)">${v.publish_date || '-'}</td>
                <td>
                    <div class="channel-info">
                        ${avatarStr}
                        <span>${v.channel_name || 'Unknown'}</span>
                    </div>
                </td>
                <td class="text-bold text-lg">${formatNumber(v.view_count)}</td>
                <td>${keywordBadge}</td>
            </tr>
        `;
    }).join('');
}

// Global scope for pagination click
window.goToPage = (page) => {
    state.page = page;
    fetchVideos();
};

document.addEventListener('DOMContentLoaded', () => {
    // Setup filter buttons
    document.getElementById('video-type-filters').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#video-type-filters button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.video_type = e.target.dataset.type;
            state.page = 1;
            fetchVideos();
        }
    });

    document.getElementById('date-filters').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#date-filters button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.date_range = e.target.dataset.range;
            state.page = 1;
            fetchVideos();
        }
    });

    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.keyword = e.target.value.trim();
            state.page = 1;
            fetchVideos();
        }, 500);
    });

    // Setup sorting
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortField = th.dataset.sort;
            if (state.sort === sortField) {
                state.order = state.order === 'desc' ? 'asc' : 'desc';
            } else {
                state.sort = sortField;
                state.order = 'desc';
            }

            // UI update
            document.querySelectorAll('.sortable').forEach(el => el.classList.remove('active-sort'));
            th.classList.add('active-sort');

            // Simple visual indicator replacement
            document.querySelectorAll('.sortable').forEach(el => {
                let text = el.innerText.replace(' ↓', '').replace(' ↑', '').replace(' ⇕', '');
                el.innerText = text + ' ⇕';
            });
            th.innerText = th.innerText.replace(' ⇕', state.order === 'desc' ? ' ↓' : ' ↑');

            state.page = 1;
            fetchVideos();
        });
    });

    // Initial load
    fetchVideos();
});
