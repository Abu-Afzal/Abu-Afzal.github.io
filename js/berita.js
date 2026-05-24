// Import konfigurasi Firebase yang sudah Anda buat sebelumnya
import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const beritaContainer = document.getElementById('beritaContainer');

// Fungsi untuk mengambil data berita dari Firestore dan menampilkannya di halaman depan
async function tampilkanBeritaMuka() {
    if (!beritaContainer) return;
    
    beritaContainer.innerHTML = '<p style="text-align: center; width: 100%; color: #666;">⏳ Memuat berita terbaru...</p>';

    try {
        const querySnapshot = await getDocs(collection(db, "berita"));
        
        if (querySnapshot.empty) {
            beritaContainer.innerHTML = '<p style="text-align: center; width: 100%; color: #666;">📢 Belum ada berita atau pengumuman terbaru.</p>';
            return;
        }

        const listBerita = [];
        querySnapshot.forEach((doc) => {
            listBerita.push({ id: doc.id, ...doc.data() });
        });

        // Urutkan berdasarkan waktu pembuatan (Terbaru di atas)
        listBerita.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Batasi hanya menampilkan 3 berita terbaru saja di halaman depan agar layout tetap cantik
        const tigaBeritaTerbaru = listBerita.slice(0, 3);

        beritaContainer.innerHTML = ''; // Bersihkan loader

        tigaBeritaTerbaru.forEach(b => {
            const formatTanggal = new Date(b.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            // Potong isi berita jika terlalu panjang agar seragam di kartu grid
            const ringkasanIsi = b.isi.length > 120 ? b.isi.substring(0, 120) + '...' : b.isi;

            beritaContainer.innerHTML += `
                <div class="berita-card" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <span class="berita-tag" style="background: #e8f5e9; color: #2e7d32; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; display: inline-block; margin-bottom: 12px;">
                            ${b.kategori}
                        </span>
                        <h3 style="font-size: 1.2rem; margin-bottom: 8px; color: #333; line-height: 1.4;">${b.judul}</h3>
                        <p style="font-size: 0.85rem; color: #777; margin-bottom: 12px;">📅 ${formatTanggal}</p>
                        <p style="font-size: 0.95rem; color: #555; line-height: 1.6; margin-bottom: 15px;">${ringkasanIsi}</p>
                    </div>
                    <a href="pages/baca-berita.html?id=${b.id}" style="color: #2e7d32; text-decoration: none; font-weight: bold; font-size: 0.9rem; align-self: flex-start; transition: color 0.2s;">
                        Baca Selengkapnya →
                    </a>
                </div>
            `;
        });

    } catch (error) {
        console.error("Gagal memuat berita: ", error);
        beritaContainer.innerHTML = '<p style="text-align: center; width: 100%; color: red;">❌ Gagal memuat pengumuman terbaru.</p>';
    }
}

// Jalankan fungsi begitu halaman selesai dimuat
document.addEventListener('DOMContentLoaded', tampilkanBeritaMuka);
