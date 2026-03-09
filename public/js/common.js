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
