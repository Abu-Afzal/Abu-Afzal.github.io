// Data Berita (Simulasi - nanti bisa dari backend/API)
const beritaData = [
    {
        id: 1,
        title: "Penerimaan Peserta Didik Baru 2026",
        excerpt: "MTs Negeri 1 Luwu membuka PPDB tahun ajaran 2026/2027. Segera daftarkan putra-putri Anda...",
        date: "20 Mei 2026",
        icon: "📝",
        link: "#"
    },
    {
        id: 2,
        title: "Juara 1 Olimpiade Matematika Tingkat Provinsi",
        excerpt: "Selamat kepada Ahmad Fauzi yang berhasil meraih juara 1 Olimpiade Matematika...",
        date: "18 Mei 2026",
        icon: "🏆",
        link: "#"
    },
    {
        id: 3,
        title: "Kegiatan Ramadhan Bersama",
        excerpt: "Dalam rangka menyambut bulan suci Ramadhan, madrasah mengadakan berbagai kegiatan...",
        date: "15 Mei 2026",
        icon: "🕌",
        link: "#"
    }
];

// Render Berita
function renderBerita() {
    const container = document.getElementById('beritaContainer');
    if (!container) return;
    
    container.innerHTML = beritaData.map(berita => `
        <div class="berita-card">
            <div class="berita-image">${berita.icon}</div>
            <div class="berita-content">
                <div class="berita-date">📅 ${berita.date}</div>
                <h3 class="berita-title">${berita.title}</h3>
                <p class="berita-excerpt">${berita.excerpt}</p>
                <a href="${berita.link}" class="btn-more" style="margin-top: 15px; display: inline-block; padding: 8px 20px; font-size: 0.9rem;">Baca Selengkapnya</a>
            </div>
        </div>
    `).join('');
}

// Jalankan saat DOM loaded
document.addEventListener('DOMContentLoaded', renderBerita);
