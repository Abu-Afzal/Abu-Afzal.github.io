function renderCards() {
    const umumContainer = document.getElementById('layanan-umum');
    const madrasahContainer = document.getElementById('layanan-madrasah');

    // 🔒 1. Ambil data user aktif dari localStorage untuk pengecekan role
    const userStr = localStorage.getItem('sipelita_user');
    const currentUser = userStr ? JSON.parse(userStr) : null;

    // 🔒 2. Daftar hitam judul card yang HANYA boleh dilihat oleh Admin
    const fiturKhususAdmin = ['Master PKKM', 'Admin Users', 'Kelola Berita'];

    // ========== LAYANAN UMUM ==========
    if (umumContainer && CONFIG.layananUmum) {
        umumContainer.innerHTML = CONFIG.layananUmum
            // 🔒 Saring Layanan Umum
            .filter(item => {
                if (fiturKhususAdmin.includes(item.title) && (!currentUser || currentUser.role !== 'admin')) {
                    return false; // Sembunyikan jika bukan admin
                }
                return true;
            })
            .map(item => {
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
    if (madrasahContainer && CONFIG.layananMadrasah) {
        madrasahContainer.innerHTML = CONFIG.layananMadrasah
            // 🔒 Saring Layanan Madrasah
            .filter(item => {
                if (fiturKhususAdmin.includes(item.title) && (!currentUser || currentUser.role !== 'admin')) {
                    return false; // Sembunyikan jika bukan admin
                }
                return true;
            })
            .map(item => {
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
                
                const link = item.url || item.page;
                const isExternal = link && (link.startsWith('http://') || link.startsWith('https://'));
                
                if (isExternal) {
                    return `<a href="${link}" target="_blank" rel="noopener noreferrer" class="card-link">${cardContent}</a>`;
                } else if (link) {
                    return `<a href="${link}" class="card-link">${cardContent}</a>`;
                } else {
                    return `<div class="card-link">${cardContent}</div>`;
                }
            }).join('');
    }
}
