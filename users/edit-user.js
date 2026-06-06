// Pastikan db dan fungsi Firestore sudah di-import di atas file ini
import { db } from '../js/firebase-config.js';
import { 
    doc, 
    getDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Import fungsi penanganan checkbox fitur agar checkbox di modal edit ikut ter-render
import { renderCheckboxFitur, getSelectedFitur, SEMUA_FITUR } from './fitur.js';

const modal = document.getElementById('modalEdit');
const formEdit = document.getElementById('formEditUser');

// 1. Buat fungsi bukaModalEdit tersedia secara global
window.bukaModalEdit = async function(docId) {
    console.log("Membuka data edit untuk ID:", docId);
    
    if(modal) modal.style.display = 'flex';

    // Reset notifikasi alert lama jika ada
    const alertEdit = document.getElementById('alertEdit');
    if (alertEdit) alertEdit.style.display = 'none';

    try {
        // Render ulang checkbox kosong khusus di dalam kontainer modal edit
        if (typeof renderCheckboxFitur === 'function') {
            renderCheckboxFitur('editCheckboxFitur');
        }

        // Ambil data user spesifik dari Firestore berdasarkan ID (Email)
        const docRef = doc(db, 'users', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Isi form modal edit sesuai data di Firestore
            document.getElementById('editDocId').value = docId;
            document.getElementById('editNama').value = data.nama || '';
            document.getElementById('editRole').value = data.role || 'guru';
            
            // Centang otomatis checkbox akses fitur berdasarkan data lama user
            if (data.fitur && Array.isArray(data.fitur)) {
                data.fitur.forEach(fiturId => {
                    const cb = document.getElementById(`editCheckboxFitur_${fiturId}`);
                    if (cb) cb.checked = true;
                });
            }
        }
    } catch (err) {
        console.error("Gagal mengambil detail user:", err);
    }
};

// Fungsi menutup modal secara global
window.tutupModalEdit = function() {
    if(modal) modal.style.display = 'none';
};

/**
 * =================================================================
 * 🔥 LOGIKA UTAMA: MENYIMPAN DATA YANG SUDAH DIEDIT KE FIRESTORE
 * =================================================================
 */
formEdit?.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const docId = document.getElementById('editDocId').value;
    const nama  = document.getElementById('editNama').value.trim();
    const role  = document.getElementById('editRole').value;
    
    let fitur = [];
    if (typeof getSelectedFitur === 'function') {
        fitur = getSelectedFitur('editCheckboxFitur');
    }

    try {
        const docRef = doc(db, 'users', docId);

        // 1. Kirim data ke Firestore
        await updateDoc(docRef, {
            nama: nama,
            role: role,
            fitur: fitur,
            updatedAt: new Date().toISOString()
        });

        // 2. TUTUP MODAL SECARA OTOMATIS DAN INSTAN
        window.tutupModalEdit();
        alert('✅ Perubahan berhasil disimpan!');

        // 3. Refresh tabel di latar belakang halaman utama
        if (typeof window.loadUsers === 'function') {
            window.loadUsers();
        }

    } catch (err) {
        console.error("Gagal mengupdate data user:", err);
        const alertEdit = document.getElementById('alertEdit');
        if (alertEdit) {
            alertEdit.style.display = 'block';
            alertEdit.style.background = '#fee2e2';
            alertEdit.style.color = '#991b1b';
            alertEdit.innerText = '❌ Gagal menyimpan: ' + err.message;
        }
    }
});

// Otomatis centang semua fitur jika role diubah ke admin di dalam modal edit
document.getElementById('editRole')?.addEventListener('change', e => {
    if (e.target.value === 'admin' && Array.isArray(SEMUA_FITUR)) {
        SEMUA_FITUR.forEach(f => {
            const el = document.getElementById(`editCheckboxFitur_${f.id}`);
            if (el) el.checked = true;
        });
    }
});
