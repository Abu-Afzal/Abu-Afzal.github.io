import { auth, db } from '../js/firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { renderCheckboxFitur, getSelectedFitur, SEMUA_FITUR } from './fitur.js';

// Render fitur awal saat halaman dimuat
renderCheckboxFitur('checkboxFitur');

const formTambah = document.getElementById('formTambahUser');
const btnTambah  = document.getElementById('btnTambah');
const alertTambah = document.getElementById('alertTambah');

// Fungsi pembantu untuk menampilkan pesan alert
function tampilkanAlert(pesan, tipe = 'success') {
    if (!alertTambah) return;
    alertTambah.style.display = 'block';
    alertTambah.style.background = tipe === 'success' ? '#dcfce7' : '#fee2e2';
    alertTambah.style.color = tipe === 'success' ? '#14532d' : '#991b1b';
    alertTambah.innerText = pesan;
    
    setTimeout(() => {
        alertTambah.style.display = 'none';
    }, 4000);
}

formTambah?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Ambil nilai dari form (termasuk NIP dan Mapel yang baru)
    const email    = document.getElementById('email').value.trim();
    const nama     = document.getElementById('nama').value.trim();
    const password = document.getElementById('password').value;
    const role     = document.getElementById('role').value;
    const fitur    = getSelectedFitur('checkboxFitur');
    
    // ✅ TAMBAHAN: Ambil NIP dan Mapel (gunakan optional chaining & fallback string kosong)
    const nip      = document.getElementById('nip')?.value.trim() || '';
    const mapel    = document.getElementById('mapel')?.value.trim() || '';

    try {
        btnTambah.disabled = true;
        btnTambah.innerHTML = '⌛ Menyimpan...';

        // 2. Daftarkan akun di Firebase Authentication
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        // 3. Simpan data profil detail di Firestore Database
        await setDoc(doc(db, 'users', email), {
            uid: cred.user.uid,
            email,
            nama,
            password, // ⚠️ Catatan: Menyimpan password plain text di Firestore tidak disarankan untuk produksi, tapi ini sesuai struktur Anda saat ini.
            role,
            fitur,
            nip,      // ✅ TAMBAHAN: Simpan NIP
            mapel,    // ✅ TAMBAHAN: Simpan Mata Pelajaran
            createdAt: new Date().toISOString()
        });

        tampilkanAlert('✅ User baru berhasil disimpan!');
        formTambah.reset(); // Ini akan otomatis mengosongkan input nip dan mapel juga
        renderCheckboxFitur('checkboxFitur');

        // 4. Muat ulang tabel jika fungsi loadUsers tersedia global
        if (typeof window.loadUsers === 'function') {
            window.loadUsers();
        }

    } catch (err) {
        console.error("Error Simpan User:", err);
        
        let pesanError = err.message;
        if (err.code === 'auth/email-already-in-use') {
            pesanError = '❌ Email ini sudah terdaftar di sistem!';
        } else if (err.code === 'auth/weak-password') {
            pesanError = '❌ Password terlalu lemah (minimal 6 karakter)!';
        }
        
        tampilkanAlert(pesanError, 'danger');
    }

    btnTambah.disabled = false;
    btnTambah.innerHTML = '💾 Simpan User';
});

// Otomatis centang semua fitur jika role dirubah menjadi Admin
document.getElementById('role')?.addEventListener('change', e => {
    if (e.target.value === 'admin') {
        SEMUA_FITUR.forEach(f => {
            const el = document.getElementById(`checkboxFitur_${f.id}`);
            if (el) el.checked = true;
        });
    }
});

/**
 * =================================================================
 * 🔥 FITUR TAMBAHAN: EKSPOR DATA USER KE EXCEL
 * =================================================================
 */
document.getElementById('btnExportExcel')?.addEventListener('click', () => {
    const tabel = document.querySelector('#tableUsers table');
    if (!tabel || tabel.offsetParent === null) {
        alert('❌ Tabel data tidak ditemukan atau data masih kosong!');
        return;
    }

    const cloneTabel = tabel.cloneNode(true);

    // Hapus kolom terakhir (Kolom Aksi) agar file Excel bersih
    const rows = cloneTabel.querySelectorAll('tr');
    rows.forEach(row => {
        if (row.lastElementChild) {
            row.removeChild(row.lastElementChild);
        }
    });

    try {
        // @ts-ignore
        const workbook = XLSX.utils.table_to_book(cloneTabel, { sheet: "Daftar Akun SIPELITA" });
        const tanggal = new Date().toISOString().split('T')[0];
        const namaFile = `Daftar_Akun_SIPELITA_${tanggal}.xlsx`;

        // @ts-ignore
        XLSX.writeFile(workbook, namaFile);
    } catch (error) {
        console.error("Gagal mengekspor Excel:", error);
        alert("❌ Terjadi kesalahan saat mengekspor ke Excel: " + error.message);
    }
});
