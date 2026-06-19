import { DRIVE_CONFIG } from './drive-config.js';

async function loadGaleriOtomatis() {
    const container = document.getElementById('galeriKegiatanContainer');
    const loading   = document.getElementById('loadingGaleri');
    const filterSelect = document.getElementById('filterKegiatan'); // Mengambil elemen dropdown filter
    
    if (!container) return;

    try {
        if (loading) loading.style.display = 'block';
        container.innerHTML = '';

        // 1. Ambil daftar sub-folder kegiatan
        const queryDrive = `'${DRIVE_CONFIG.FOLDER_ID_UTAMA}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryDrive)}&orderBy=createdTime%20desc&fields=files(id,name)&key=${DRIVE_CONFIG.DRIVE_CONFIG ? DRIVE_CONFIG.DRIVE_CONFIG.API_KEY : DRIVE_CONFIG.API_KEY}`;

        const response = await fetch(url);
        const result = await response.json();

        if (result.error) throw new Error(result.error.message);

        const listFolder = result.files || [];
        if (loading) loading.style.display = 'none';

        if (listFolder.length === 0) {
            container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px; font-style: italic;">Belum ada sub-folder dokumentasi kegiatan.</p>`;
            return;
        }

        // 2. Loop setiap folder dan cari file cover.jpg di dalamnya
        for (const folder of listFolder) {
            const linkDriveFolder = `https://drive.google.com/drive/folders/${folder.id}?usp=sharing`;
            const namaKegiatan    = folder.name;
            
            // Default gambar jika guru belum mengunggah file cover.jpg (menggunakan gradasi elegan)
            let gambarSampul = `background: linear-gradient(135deg, #4f46e5, #9333ea); display: flex; align-items: center; justify-content: center; color: white; font-size: 3rem;`;
            let elemenGambar = `<div class="card-image-placeholder" style="${gambarSampul}">📂</div>`;

            try {
                // Query untuk mencari file bernama 'cover.jpg' di dalam folder kegiatan terkait
                const queryCover = `'${folder.id}' in parents and name = 'cover.jpg' and trashed = false`;
                const urlCover = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryCover)}&fields=files(id)&key=${DRIVE_CONFIG.API_KEY}`;
                
                const resCover = await fetch(urlCover);
                const dataCover = await resCover.json();
                
                // Jika file 'cover.jpg' ditemukan, ubah elemen gambar menjadi tag <img> dengan link direct Google Drive
                if (dataCover.files && dataCover.files.length > 0) {
                    const idCover = dataCover.files[0].id;
                    
                    // 🛠️ FIX TYPO PEER CHAT: Mengubah '0{idCover}' menjadi '${idCover}' agar interpolasi string aktif
                    const srcGambar = `http://googleusercontent.com/profile/picture/${idCover}`;
                    elemenGambar = `<img src="${srcGambar}" alt="${namaKegiatan}" class="card-img" onerror="this.src='https://placehold.co/600x400?text=Foto+Eror'">`;
                }
            } catch (errCover) {
                console.error("Gagal memuat cover untuk folder " + namaKegiatan, errCover);
            }

            // Suntikkan kartu ke dalam grid container
            container.innerHTML += `
                <a href="${linkDriveFolder}" target="_blank" class="galeri-card">
                    <div class="card-image-wrapper">
                        ${elemenGambar}
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">${namaKegiatan.toUpperCase()}</h3>
                    </div>
                </a>
            `;
        }

        // 🎯 SETELAH SELESAI RENDERING: Langsung sinkronkan tampilan dengan status filter saat ini
        if (filterSelect) {
            terapkanFilterGaleri(filterSelect.value);
        }

    } catch (error) {
        console.error("Gagal membaca Google Drive API:", error);
        if (loading) loading.style.display = 'none';
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#ef4444; padding:20px; font-weight:bold;">❌ Gagal memuat galeri: ${error.message}</p>`;
    }
}

// ==========================================
// 🛠️ FUNGSI UTAMA PENYARINGAN (FILTERING)
// ==========================================
function terapkanFilterGaleri(tahunTerpilih) {
    // Membidik target kartu sesuai class yang Bapak buat di loop atas (.galeri-card)
    const semuaKartu = document.querySelectorAll('.galeri-card');
    
    semuaKartu.forEach(kartu => {
        const teksJudul = kartu.textContent || kartu.innerText;

        if (tahunTerpilih === 'semua') {
            kartu.classList.remove('album-tersembunyi');
        } else {
            // Jika judul folder (Misal: "WORKSHOP KBC 2025") mengandung angka tahun pilihan, tampilkan!
            if (teksJudul.includes(tahunTerpilih)) {
                kartu.classList.remove('album-tersembunyi');
            } else {
                kartu.classList.add('album-tersembunyi');
            }
        }
    });
}

// ==========================================
// 🔌 INISIALISASI EVENT LISTENER DROPDOWN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const filterSelect = document.getElementById('filterKegiatan');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            terapkanFilterGaleri(e.target.value);
        });
    }
});

window.loadGaleriOtomatis = loadGaleriOtomatis;
document.addEventListener('DOMContentLoaded', loadGaleriOtomatis);
