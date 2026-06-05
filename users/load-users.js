import { db } from '../js/firebase-config.js';

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Import fungsi penanganan fitur (pastikan fitur.js mengekspor fungsi ini)
import { labelFitur } from './fitur.js';

async function loadUsers(){

    const loadEl = document.getElementById('loadingUsers');
    const tblEl  = document.getElementById('tableUsers');
    const tbody  = document.getElementById('userTableBody');

    // Pengaman jika elemen HTML belum siap saat script dipanggil
    if(!loadEl || !tblEl || !tbody) return;

    try{
        // Tampilkan loading, sembunyikan tabel
        loadEl.style.display = 'block';
        tblEl.style.display  = 'none';

        // Ambil data dari koleksi 'users' di Firestore
        const snapshot = await getDocs(
            collection(db, 'users')
        );

        tbody.innerHTML = '';

        if(snapshot.empty){
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; color:#64748b; padding:20px;">
                        Belum ada user terdaftar.
                    </td>
                </tr>
            `;
        } else {
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                
                // Ambil string/badge fitur dengan aman
                let tampilanFitur = '-';
                try {
                    if (typeof labelFitur === 'function') {
                        tampilanFitur = labelFitur(data.fitur || []);
                    } else if (Array.isArray(data.fitur)) {
                        tampilanFitur = data.fitur.join(', ');
                    }
                } catch (e) {
                    console.warn("Gagal merender labelFitur:", e);
                    tampilanFitur = Array.isArray(data.fitur) ? data.fitur.join(', ') : '-';
                }

                // Kelola CSS Badge sesuai Role
                const badgeClass = data.role === 'admin' ? 'badge-admin' : 'badge-guru';
                const namaRole = data.role ? data.role.toUpperCase() : 'GURU';

                // Render struktur row (Disinkronkan menjadi 5 kolom sesuai HTML)
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${data.nama || '-'}</strong></td>
                        <td>${data.email || '-'}</td>
                        <td>
                            <span class="badge ${badgeClass}">
                                ${namaRole === 'ADMIN' ? '👑 Admin' : '👤 Guru'}
                            </span>
                        </td>
                        <td>${tampilanFitur}</td>
                        <td>
                            <button 
                                class="btn btn-warning btn-sm" 
                                onclick="if(window.bukaModalEdit){ window.bukaModalEdit('${docSnap.id}') }else{ alert('Fungsi Edit belum siap') }"
                            >
                                ✏️ Edit
                            </button>
                            <button 
                                class="btn btn-danger btn-sm" 
                                onclick="if(window.hapusUser){ window.hapusUser('${docSnap.id}') }else{ alert('Fungsi Hapus belum siap') }"
                            >
                                🗑️ Hapus
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        // AKHIRNYA: Matikan loading dan tampilkan tabel data
        loadEl.style.display = 'none';
        tblEl.style.display  = 'block';

    } catch(err) {
        console.error("Gagal memuat data user:", err);
        loadEl.innerHTML = `
            <div style="color:#ef4444; padding:20px; font-weight:600;">
                ❌ Gagal memuat data: ${err.message}
            </div>
        `;
    }
}

// Daftarkan ke global window agar bisa dipanggil kembali dari `tambah-user.js`
window.loadUsers = loadUsers;

// Jalankan otomatis saat halaman selesai memuat modul
loadUsers();
