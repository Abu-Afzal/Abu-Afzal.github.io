// ══════════════════════════════════════════════
// FIREBASE CONFIG
// ══════════════════════════════════════════════
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

// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
let currentUser = null;
let daftarKelas = [];

// ══════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════
function toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.style.opacity = '0', 3000);
    setTimeout(() => t.remove(), 3400);
}

function getCurrentUser() {
    try {
        const userStr = localStorage.getItem('sipelita_user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        return null;
    }
}

function sanitizeEmail(email) {
    return email ? email.replace(/[.#$\[\]]/g, '_') : '';
}

// ══════════════════════════════════════════════
// INIT - Form Jurnal Online
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    // Cek apakah ini halaman form
    const formJurnal = document.getElementById('formJurnal');
    if (!formJurnal) return;
    
    currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Anda harus login!');
        window.location.href = '../login.html';
        return;
    }
    
    // Auto-fill nama guru
    const namaGuru = currentUser.nama || currentUser.email || 'Guru';
    document.getElementById('namaGuru').value = namaGuru;
    
    // Load NIP dari localStorage jika pernah diisi
    const savedNip = localStorage.getItem('sipelita_nip_' + sanitizeEmail(namaGuru));
    if (savedNip) {
        document.getElementById('nipGuru').value = savedNip;
    }
    
    // Set tanggal hari ini
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggal').value = today;
    
    // Load daftar kelas dari SIPENA
    await loadDaftarKelas();
    
    // Setup form submit
    formJurnal.addEventListener('submit', simpanJurnal);
});

async function loadDaftarKelas() {
    try {
        const namaGuru = currentUser.nama || currentUser.email || 'guru';
        
        // Coba load dari Realtime Database (SIPENA)
        const rtDb = firebase.database();
        const snap = await rtDb.ref('sipena2').once('value');
        const data = snap.val();
        
        if (data) {
            const kelasList = Object.keys(data)
                .map(k => ({ __key: k, ...data[k] }))
                .filter(d => d.type === 'class' && d.user_name === namaGuru);
            
            daftarKelas = kelasList;
            
            const kelasSelect = document.getElementById('kelas');
            kelasSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>';
            
            kelasList.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k.class_name;
                opt.textContent = k.class_name;
                kelasSelect.appendChild(opt);
            });
            
            if (kelasList.length === 0) {
                kelasSelect.innerHTML = '<option value="">Belum ada kelas di SIPENA</option>';
            }
        }
    } catch (error) {
        console.error('Error load kelas:', error);
        // Fallback: input manual
        const kelasSelect = document.getElementById('kelas');
        kelasSelect.innerHTML = '<option value="">-- Ketik Manual --</option>';
        kelasSelect.outerHTML = `<input type="text" id="kelas" placeholder="Contoh: X.1" required 
            style="width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:8px;">`;
    }
}

async function simpanJurnal(e) {
    e.preventDefault();
    
    const btn = document.getElementById('btnSimpan');
    const alertEl = document.getElementById('alertInfo');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    alertEl.classList.remove('show');
    
    try {
        const namaGuru = document.getElementById('namaGuru').value.trim();
        const nip = document.getElementById('nipGuru').value.trim();
        const tanggal = document.getElementById('tanggal').value;
        const jamKe = document.getElementById('jamKe').value;
        const kelas = document.getElementById('kelas').value.trim();
        const muridHadir = parseInt(document.getElementById('muridHadir').value) || 0;
        const muridTidakHadir = parseInt(document.getElementById('muridTidakHadir').value) || 0;
        const materi = document.getElementById('materi').value.trim();
        const keterangan = document.getElementById('keterangan').value.trim();
        
        // Validasi
        if (!namaGuru) throw new Error('Nama guru wajib diisi');
        if (!nip) throw new Error('NIP wajib diisi');
        if (!tanggal) throw new Error('Tanggal wajib diisi');
        if (!kelas) throw new Error('Kelas wajib diisi');
        if (!materi) throw new Error('Materi/Tugas wajib diisi');
        if (!keterangan) throw new Error('Keterangan wajib diisi');
        
        // ✅ PENTING: Pastikan user sudah login via Firebase Auth
        const firebaseUser = firebase.auth().currentUser;
        if (!firebaseUser) {
            throw new Error('Sesi Firebase Auth tidak valid. Silakan login ulang.');
        }
        
        // Simpan NIP ke localStorage
        localStorage.setItem('sipelita_nip_' + sanitizeEmail(namaGuru), nip);
        
        // ✅ Struktur data yang benar
        const data = {
            userId: firebaseUser.email,  // ✅ EMAIL, bukan UID!
            guruNama: namaGuru,
            nip: nip,
            tanggal: tanggal,
            jamKe: jamKe,
            kelas: kelas,
            muridHadir: muridHadir,
            muridTidakHadir: muridTidakHadir,
            materi: materi,
            keterangan: keterangan,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await db.collection('jurnal_online').add(data);
        
        alertEl.textContent = '✅ Jurnal berhasil disimpan!';
        alertEl.className = 'alert alert-success show';
        toast('✅ Jurnal berhasil disimpan!');
        
        setTimeout(() => {
            resetForm();
            alertEl.classList.remove('show');
        }, 1500);
        
    } catch (error) {
        console.error('Error:', error);
        alertEl.textContent = '❌ ' + error.message;
        alertEl.className = 'alert alert-error show';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '💾 Simpan Jurnal';
    }
}
window.resetForm = function() {
    document.getElementById('jamKe').value = '';
    document.getElementById('kelas').value = '';
    document.getElementById('muridHadir').value = '0';
    document.getElementById('muridTidakHadir').value = '0';
    document.getElementById('materi').value = '';
    document.getElementById('keterangan').value = '';
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggal').value = today;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
