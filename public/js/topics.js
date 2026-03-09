let state = {
    page: 1,
    limit: 50,
    activeTopic: ''
};

async function fetchTopics() {
    try {
        const res = await fetch(`/api/topics`);
        const data = await res.json();

        if (data.success && data.data.length > 0) {
            renderTopicsList(data.data);
            state.activeTopic = data.data[0].name; // Default select first
            fetchTopicVideos();
        } else {
            document.getElementById('topics-container').innerHTML = '<div style="color:var(--text-muted);padding:1rem;">No topics available</div>';
            document.getElementById('table-body').innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">Please add topics first</td></tr>`;
        }
    } catch (err) {
        console.error('Failed to fetch topics', err);
    }
}

function renderTopicsList(topics) {
    const container = document.getElementById('topics-container');
    container.innerHTML = topics.map((t, index) => {
        const isActive = index === 0;
        return `
            <div class="topic-card ${isActive ? 'active' : ''}" data-name="${t.name}">
                <img src="${t.cover_url || 'https://via.placeholder.com/160x100?text=' + encodeURIComponent(t.name)}" alt="${t.name}">
                <div class="topic-overlay">${t.name}</div>
                <div class="topic-check">✓</div>
            </div>
        `;
    }).join('');

    container.addEventListener('click', (e) => {
        const card = e.target.closest('.topic-card');
        if (card) {
            document.querySelectorAll('.topic-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            state.activeTopic = card.dataset.name;
            state.page = 1;
            fetchTopicVideos();
        }
    });
}

async function fetchTopicVideos() {
    if (!state.activeTopic) return;

    try {
        const queryParams = new URLSearchParams({
            page: state.page,
            limit: state.limit
        });

        const res = await fetch(`/api/topics/${encodeURIComponent(state.activeTopic)}/videos?${queryParams.toString()}`);
        const data = await res.json();

        if (data.success) {
            renderTable(data.data, (state.page - 1) * state.limit);
            document.getElementById('pagination-container').innerHTML =
                renderPagination(data.pagination, state.page, data.pagination.totalPages, 'goToPage');
        }
    } catch (err) {
        console.error('Failed to fetch topic videos', err);
    }
}

function renderTable(videos, offsetIndex) {
    const tbody = document.getElementById('table-body');

    if (videos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No videos found for this topic</td></tr>`;
        return;
    }

    tbody.innerHTML = videos.map((v, index) => {
        const typeBadge = v.video_type === 'short'
            ? `<span class="badge badge-short">Short</span>`
            : `<span class="badge badge-regular">Regular</span>`;

        const avatarStr = v.channel_avatar_url
            ? `<img src="${v.channel_avatar_url}" class="channel-avatar" alt="A">`
            : `<div class="channel-avatar"></div>`;

        return `
            <tr>
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
                </td>
                <td style="color:var(--text-muted)">${v.publish_date || '-'}</td>
                <td>
                    <div class="channel-info">
                        ${avatarStr}
                        <span>${v.channel_name || 'Unknown'}</span>
                    </div>
                </td>
                <td class="text-bold text-lg">${formatNumber(v.view_count)}</td>
                <td>${typeBadge}</td>
            </tr>
        `;
    }).join('');
}

window.goToPage = (page) => {
    state.page = page;
    fetchTopicVideos();
};

document.addEventListener('DOMContentLoaded', () => {
    fetchTopics();
});
