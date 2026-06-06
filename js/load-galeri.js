import { DRIVE_CONFIG } from './drive-config.js';

async function loadGaleriOtomatis() {
    const container = document.getElementById('galeriKegiatanContainer');
    const loading   = document.getElementById('loadingGaleri');
    
    if (!container) return;

    try {
        // Tampilkan indikator loading, sembunyikan container utama
        if (loading) loading.style.display = 'block';
        container.innerHTML = '';

        // Parameter Query Drive API v3:
        // - Mengambil file yang berada di dalam folder utama ('FOLDER_ID_UTAMA' in parents)
        // - Hanya mengambil file berjenis Folder (mimeType = 'application/vnd.google-apps.folder')
        // - Memastikan folder tersebut tidak sedang berada di tempat sampah (trashed = false)
        const queryDrive = `'${DRIVE_CONFIG.FOLDER_ID_UTAMA}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        
        // Membentuk URL Endpoint Google API v3
        // orderBy=createdTime desc digunakan agar folder yang baru dibuat guru berada di posisi paling atas/awal
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryDrive)}&orderBy=createdTime%20desc&fields=files(id,name)&key=${DRIVE_CONFIG.API_KEY}`;

        // Lakukan penarikan data dari server Google
        const response = await fetch(url);
        const result = await response.json();

        // Tangkap error jika API Key salah atau kuota terlampaui
        if (result.error) {
            throw new Error(result.error.message);
        }

        const listFolder = result.files || [];

        // Hentikan loading setelah data berhasil didapat
        if (loading) loading.style.display = 'none';

        // Jika folder utama masih kosong/belum ada sub-folder kegiatan
        if (listFolder.length === 0) {
            container.innerHTML = `
                <p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px; font-style: italic;">
                    Belum ada sub-folder dokumentasi kegiatan di dalam Google Drive Anda.
                </p>
            `;
            return;
        }

        // Mulai looping data folder untuk diubah menjadi susunan kartu HTML
        listFolder.forEach(folder => {
            // Link direktori khusus agar ketika kartu diklik, user langsung diarahkan masuk ke folder foto tersebut
            const linkDriveFolder = `https://drive.google.com/drive/folders/${folder.id}?usp=sharing`;
            const namaKegiatan    = folder.name;

            container.innerHTML += `
                <a href="${linkDriveFolder}" target="_blank" class="galeri-card">
                    <div class="card-image-wrapper" style="background: linear-gradient(135deg, #4f46e5, #9333ea); display: flex; align-items: center; justify-content: center; color: white; font-size: 3.5rem; min-height: 160px;">
                        📁
                    </div>
                    <div class="card-body">
                        <h3>${namaKegiatan.toUpperCase()}</h3>
                    </div>
                </a>
            `;
        });

    } catch (error) {
        console.error("Gagal membaca Google Drive API:", error);
        if (loading) loading.style.display = 'none';
        container.innerHTML = `
            <p style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 20px; font-weight: bold;">
                ❌ Gagal memuat galeri Drive: ${error.message}
            </p>
        `;
    }
}

// Daftarkan fungsi ke objek window agar bisa di-refresh manual dari file lain jika diperlukan
window.loadGaleriOtomatis = loadGaleriOtomatis;

// Jalankan fungsi secara otomatis saat file modul ini termuat
loadGaleriOtomatis();
