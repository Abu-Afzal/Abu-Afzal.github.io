import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function loadKegiatan(){
    const select = document.getElementById('kegiatanSelect');
    
    // Set teks awal saat loading data
    select.innerHTML = '<option value="">Pilih Kegiatan</option>';

    try {
        // SINKRONISASI: Nama koleksi disamakan menjadi 'Kegiatan Absensi'
        const snapshot = await getDocs(collection(db, 'Kegiatan Absensi'));

        // Flag untuk menandai apakah ada kegiatan aktif yang berhasil dimasukkan
        let adaKegiatan = false;

        snapshot.forEach(doc => {
            const data = doc.data();

            // Pengecekan field 'aktif' (boolean) dan 'nama' (string)
            if (data.aktif === true && data.nama) {
                adaKegiatan = true;
                select.innerHTML += `
                    <option value="${data.nama}">
                        ${data.nama}
                    </option>
                `;
            }
        });

        // Jika setelah di-loop ternyata tidak ada satu pun kegiatan dengan status aktif: true
        if (!adaKegiatan) {
            select.innerHTML = '<option value="">Tidak ada kegiatan aktif</option>';
        }

    } catch(err) {
        console.error("Gagal memuat dokumen kegiatan:", err);
        select.innerHTML = '<option>Gagal memuat</option>';
    }
}
