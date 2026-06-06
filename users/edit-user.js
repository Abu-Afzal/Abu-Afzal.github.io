import { db } from '../js/firebase-config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 1. Buat fungsi bukaModalEdit tersedia secara global
window.bukaModalEdit = async function(docId) {
    console.log("Membuka data edit untuk ID:", docId);
    
    const modal = document.getElementById('modalEdit');
    if(modal) modal.style.display = 'flex';

    try {
        // Ambil data user spesifik dari Firestore berdasarkan ID (Email)
        const docRef = doc(db, 'users', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Isi form modal edit sesuai data di Firestore
            document.getElementById('editDocId').value = docId;
            document.getElementById('editNama').value = data.nama || '';
            document.getElementById('editRole').value = data.role || 'guru';
            
            // Jika Anda memiliki fungsi untuk mencentang checkbox di edit-user.js:
            // contoh: setCheckboxEdit(data.fitur || []);
        }
    } catch (err) {
        console.error("Gagal mengambil detail user:", err);
    }
};

// Fungsi menutup modal (opsional, jika belum ada di file modal.js)
window.tutupModalEdit = function() {
    const modal = document.getElementById('modalEdit');
    if(modal) modal.style.display = 'none';
};
