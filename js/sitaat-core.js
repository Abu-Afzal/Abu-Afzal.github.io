// ══════════════════════════════════════════════
// SITAAT CORE - Firebase, State, Routing
// ══════════════════════════════════════════════

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyB24GCKSTPGlN9HG9E6uhCECVa4ibCpKEA",
    authDomain: "sipelita-digital.firebaseapp.com",
    databaseURL: "https://sipelita-digital-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sipelita-digital",
    storageBucket: "sipelita-digital.firebasestorage.app",
    messagingSenderId: "787840817745",
    appId: "1:787840817745:web:e6b5237cfbb5e51be93670"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// State Global
let currentUser = null;
let daftarPelanggaran = [];
let daftarSiswa = [];
let daftarJenisPelanggaran = [];

// ══════════════════════════════════════════════
// UTILITIES
// ═════════════════════════════════════════════
function getCurrentUser() {
    try {
        const userStr = localStorage.getItem('sipelita_user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        return null;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function getLevelSanksi(poin) {
    if (poin <= 10) return { level: 'aman', label: 'Dibina', class: 'level-aman' };
    if (poin <= 20) return { level: 'peringatan1', label: 'Peringatan I', class: 'level-peringatan1' };
    if (poin <= 30) return { level: 'peringatan2', label: 'Peringatan II', class: 'level-peringatan2' };
    if (poin <= 75) return { level: 'peringatan3', label: 'Peringatan III', class: 'level-peringatan3' };
    return { level: 'kritis', label: 'Dikembalikan', class: 'level-kritis' };
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = getCurrentUser();
    
    if (!currentUser) {
        alert('Anda harus login!');
        window.location.href = '../index.html';
        return;
    }
    
    // Set info user
    const roleBadge = document.getElementById('userRole');
    if (roleBadge) {
        const role = currentUser.role || 'guru';
        roleBadge.textContent = role === 'admin' || role === 'kepala' ? '👑 ADMIN/KEPALA' : '👨‍🏫 GURU';
    }
    
    // Set pelapor
    const pelaporEl = document.getElementById('pelapor');
    if (pelaporEl) {
        pelaporEl.value = currentUser.nama || 'Guru';
    }
    
    // Set tanggal hari ini
    const tanggalEl = document.getElementById('tanggalPelanggaran');
    if (tanggalEl) {
        tanggalEl.value = new Date().toISOString().split('T')[0];
    }
    
    // Load data
    await loadJenisPelanggaran();
    await loadDashboard();
    await loadSiswa();
    
    console.log('✅ SITAAT initialized');
});

// ══════════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════════
window.switchTab = function(tabName, element) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    if (element) element.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    const target = document.getElementById('tab-' + tabName);
    if (target) target.style.display = 'block';
    
    // Load data sesuai tab
    if (tabName === 'dashboard') loadDashboard();
    if (tabName === 'siswa') loadSiswa();
    if (tabName === 'jenis') loadJenisPelanggaran();
    if (tabName === 'laporan') generateLaporan();
};

// ══════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════
window.closeModal = function() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
};

// Close modal saat klik di luar
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});
