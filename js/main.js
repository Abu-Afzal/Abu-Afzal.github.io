function renderCards() {
    const umumContainer = document.getElementById('layanan-umum');
    const madrasahContainer = document.getElementById('layanan-madrasah');

    // ========== LAYANAN UMUM ==========
    if (umumContainer && CONFIG.layananUmum) {
        umumContainer.innerHTML = CONFIG.layananUmum.map(item => {
            // Cek logo atau icon
            const displayContent = item.logo 
                ? `<img src="${item.logo}" alt="${item.title}" class="card-logo" onerror="this.style.display='none'; this.parentElement.querySelector('.card-icon-fallback').style.display='flex';">
                   <div class="card-icon card-icon-fallback" style="display:none;">${item.icon || '📌'}</div>`
                : `<div class="card-icon">${item.icon || '📌'}</div>`;

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

    // ========== LAYANAN MADRASAH ==========
    // ✅ KODE BARU (BENAR):
if (madrasahContainer && CONFIG.layananMadrasah) {
    madrasahContainer.innerHTML = CONFIG.layananMadrasah.map(item => {
        // Cek logo atau icon
        const displayContent = item.logo 
            ? `<img src="${item.logo}" alt="${item.title}" class="card-logo" onerror="this.style.display='none'; this.parentElement.querySelector('.card-icon-fallback').style.display='flex';">
               <div class="card-icon card-icon-fallback" style="display:none;">${item.icon || '📌'}</div>`
            : `<div class="card-icon">${item.icon || '📌'}</div>`;

        const cardContent = `
            <div class="card" style="background: ${item.color}; color: white;">
                ${displayContent}
                <div class="card-title">${item.title}</div>
                <div class="card-desc">${item.desc || ''}</div>
            </div>
        `;
        
        // Prioritaskan url eksternal, baru page internal
        const link = item.url || item.page;
        
        // ✅ DETEKSI LINK EKSTERNAL
        const isExternal = link && (link.startsWith('http://') || link.startsWith('https://'));
        
        // ✅ BUAT LINK YANG BENAR
        if (isExternal) {
            return `<a href="${link}" target="_blank" rel="noopener noreferrer" class="card-link">${cardContent}</a>`;
        // ✅ MENJADI INI:
        } else if (link) {
        // Gunakan link apa adanya (tidak dipaksa masuk folder pages/)
        return `<a href="${link}" class="card-link">${cardContent}</a>`;
        } 
        else {
            return `<div class="card-link">${cardContent}</div>`;
        }
    }).join('');
}
}

function closeModal() {
    const modal = document.getElementById('integrationModal');
    if (modal) modal.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', function() {
    renderCards();
    
    // Close modal when clicking outside
    const modal = document.getElementById('integrationModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }
    
    // Close button
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
});
