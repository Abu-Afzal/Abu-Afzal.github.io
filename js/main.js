function renderCards() {
    const umumContainer = document.getElementById('layanan-umum');
    const madrasahContainer = document.getElementById('layanan-madrasah');

    // Render Layanan Umum
    if (umumContainer) {
        umumContainer.innerHTML = CONFIG.layananUmum.map(item => {
            const displayContent = item.logo 
                ? `<img src="${item.logo}" alt="${item.title}" class="card-logo">`
                : `<div class="card-icon">${item.icon}</div>`;

            return `
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="card-link">
                    <div class="card" style="background: ${item.color}; color: white;">
                        ${displayContent}
                        <div class="card-title">${item.title}</div>
                        <div class="card-desc">${item.desc || ''}</div>
                    </div>
                </a>
            `;
        }).join('');
    }

    // Render Layanan Madrasah
    if (madrasahContainer) {
        madrasahContainer.innerHTML = CONFIG.layananMadrasah.map(item => {
            const cardContent = `
                <div class="card" style="background: ${item.color}; color: white;">
                    <div class="card-icon">${item.icon}</div>
                    <div class="card-title">${item.title}</div>
                    <div class="card-desc">${item.desc || ''}</div>
                </div>
            `;
            
            return item.page 
                ? `<a href="${item.page}" class="card-link">${cardContent}</a>`
                : cardContent;
        }).join('');
    }
}

function closeModal() {
    document.getElementById('integrationModal').classList.remove('active');
}

document.getElementById('integrationModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

document.addEventListener('DOMContentLoaded', renderCards);
