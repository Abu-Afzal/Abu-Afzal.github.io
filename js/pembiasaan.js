import { db } from "./firebase-config.js";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =====================================
// SIMPAN KEGIATAN
// =====================================
const btnSimpan = document.getElementById('btnSimpan');

if (btnSimpan) {
    btnSimpan.addEventListener('click', async () => {
        const nama = document.getElementById('namaKegiatan').value.trim();
        const statusValue = document.getElementById('statusKegiatan').value;

        if (!nama) {
            alert('Nama kegiatan wajib diisi');
            return;
        }

        // SINKRONISASI FORMAT STATUS: Ubah string input menjadi boolean true/false untuk SICAN
        const isAktif = (statusValue === 'aktif' || statusValue === 'true');

        try {
            // SINKRONISASI KOLEKSI: Diubah dari 'master_kegiatan' menjadi 'Kegiatan Absensi'
            await addDoc(collection(db, 'Kegiatan Absensi'), {
                nama: nama,
                aktif: isAktif, // Menggunakan key 'aktif' berjenis Boolean sesuai sican-kegiatan.js
                status: statusValue, // Tetap simpan string asli untuk keperluan tampilan badge tabel
                createdAt: new Date().toISOString()
            });

            alert('Kegiatan berhasil disimpan');
            document.getElementById('namaKegiatan').value = '';
            loadKegiatan();

        } catch (err) {
            console.error(err);
            alert("Gagal menyimpan kegiatan: " + err.message);
        }
    });
}

// =====================================
// LOAD KEGIATAN
// =====================================
async function loadKegiatan() {
    const tbody = document.getElementById('tbodyKegiatan');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="3" style="text-align:center;">Memuat...</td>
        </tr>
    `;

    try {
        // SINKRONISASI KOLEKSI: Membaca dari 'Kegiatan Absensi'
        const snapshot = await getDocs(collection(db, 'Kegiatan Absensi'));
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align:center;">Belum ada kegiatan</td>
                </tr>
            `;
            return;
        }

        // Ambil data dan urutkan berdasarkan waktu pembuatan (terbaru di atas)
        const listKegiatan = [];
        snapshot.forEach(docSnap => {
            listKegiatan.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        listKegiatan.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        listKegiatan.forEach(data => {
            // Tentukan warna badge berdasarkan status aktif
            const badgeClass = data.aktif ? 'badge-aktif' : 'badge-tidak';
            const teksStatus = data.aktif ? 'Aktif' : 'Tidak Aktif';

            tbody.innerHTML += `
                <tr>
                    <td><b>${data.nama}</b></td>
                    <td>
                        <span class="badge ${badgeClass}">
                            ${teksStatus}
                        </span>
                    </td>
                    <td>
                        <button
                            class="btn-hapus"
                            onclick="hapusKegiatan('${data.id}')">
                            Hapus
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Gagal memuat list kegiatan:", err);
        tbody.innerHTML = `<tr><td colspan="3" style="color:red;">Gagal memuat data</td></tr>`;
    }
}

// Inisialisasi penampilan data pertama kali
loadKegiatan();

// =====================================
// HAPUS KEGIATAN
// =====================================
window.hapusKegiatan = async (id) => {
    if (!confirm('Hapus kegiatan ini?')) return;

    try {
        // SINKRONISASI KOLEKSI: Menghapus dari 'Kegiatan Absensi'
        await deleteDoc(doc(db, 'Kegiatan Absensi', id));
        loadKegiatan();
    } catch (err) {
        console.error("Gagal menghapus kegiatan:", err);
        alert("Gagal menghapus: " + err.message);
    }
};
