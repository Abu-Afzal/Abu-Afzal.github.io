// Render kartu layanan
function renderCards() {
    const umumContainer = document.getElementById('layanan-umum');
    const madrasahContainer = document.getElementById('layanan-madrasah');

    // Render Layanan Umum
    if (umumContainer) {
        umumContainer.innerHTML = CONFIG.layananUmum.map(item => {
            const displayContent = item.logo 
                ? `<img src="${item.logo}" alt="${item.title}" class="card-logo" onerror="this.style.display='none'">`
                : `<div class="card-icon">${item.icon || '📌'}</div>`;

            return `
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="card-link">
                    <div class="card" style="background: ${item.color};">
                        ${displayContent}
                        <div class="card-title">${item.title}</div>
                        <div class="card-desc">${item.desc || ''}</div>
                        <div class="status-tag">🌐 Akses Langsung</div>
                    </div>
                </a>
            `;
        }).join('');
    }

    // Render Layanan Madrasah
    if (madrasahContainer) {
        madrasahContainer.innerHTML = CONFIG.layananMadrasah.map(item => {
            const cardContent = `
                <div class="card">
                    <div class="card-icon">${item.icon || '📌'}</div>
                    <div class="card-title">${item.title}</div>
                    <div class="card-desc">${item.desc || ''}</div>
                </div>
            `;
            
            return item.url 
                ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer" class="card-link">${cardContent}</a>`
                : cardContent;
        }).join('');
    }
}

// Modal functions
function openModal(title) {
    const modal = document.getElementById('integrationModal');
    const modalTitle = document.getElementById('modalTitle');
    if (modal && modalTitle) {
        modalTitle.textContent = `⚙️ ${title}`;
        modal.classList.add('active');
    }
}

function closeModal() {
    const modal = document.getElementById('integrationModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    renderCards();
    
    // Close modal when clicking outside
    const modal = document.getElementById('integrationModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
    
    // Close button
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
});
