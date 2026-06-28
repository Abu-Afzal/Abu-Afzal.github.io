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
let uploadedPhotos = []; // Array untuk menyimpan foto (base64)
let daftarJurnal = [];

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    setupFormSubmit();
    setupPhotoUpload();
    setDefaultDate();
});

function loadUserInfo() {
    try {
        const userStr = localStorage.getItem('sipelita_user');
        if (userStr) {
            currentUser = JSON.parse(userStr);
            document.getElementById('userName').textContent = currentUser.nama || 'User';
            document.getElementById('userRole').textContent = currentUser.role || 'Guru';
        } else {
            alert('⛔ Anda harus login terlebih dahulu!');
            window.location.href = '../index.html';
        }
    } catch (e) {
        console.error('Error loading user:', e);
        window.location.href = '../index.html';
    }
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('jurnalTanggal').value = today;
    document.getElementById('filterTahun').value = new Date().getFullYear();
    document.getElementById('filterBulan').value = new Date().getMonth() + 1;
}

// ══════════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════════
window.switchTab = function(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    document.getElementById(`tab-${tabName}`).style.display = 'block';
    
    if (tabName === 'daftar') {
        loadDaftarJurnal();
    }
};

// ══════════════════════════════════════════════
// PHOTO UPLOAD (BASE64 - TANPA STORAGE)
// ══════════════════════════════════════════════
function setupPhotoUpload() {
    const uploadArea = document.getElementById('photoUploadArea');
    const photoInput = document.getElementById('photoInput');
    
    uploadArea.addEventListener('click', () => photoInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    photoInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
}

function handleFiles(files) {
    const remainingSlots = 3 - uploadedPhotos.length;
    
    if (remainingSlots <= 0) {
        alert('⚠️ Maksimal 3 foto per jurnal!');
        return;
    }
    
    Array.from(files).slice(0, remainingSlots).forEach(file => {
        if (file.size > 2 * 1024 * 1024) {
            alert(`⚠️ File ${file.name} terlalu besar (maks 2 MB)`);
            return;
        }
        
        if (!file.type.startsWith('image/')) {
            alert(`⚠️ File ${file.name} bukan gambar`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            // Kompres gambar untuk menghemat ruang di Firestore
            compressImage(e.target.result, 800, 0.7).then(compressed => {
                uploadedPhotos.push({
                    name: file.name,
                    base64: compressed,
                    size: file.size
                });
                renderPhotoPreview();
            });
        };
        reader.readAsDataURL(file);
    });
}

// Kompres gambar menggunakan canvas
function compressImage(base64, maxWidth, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = base64;
    });
}

function renderPhotoPreview() {
    const preview = document.getElementById('photoPreview');
    preview.innerHTML = uploadedPhotos.map((photo, index) => `
        <div class="photo-item">
            <img src="${photo.base64}" alt="Preview">
            <button type="button" class="photo-remove" onclick="removePhoto(${index})">✕</button>
        </div>
    `).join('');
}

window.removePhoto = function(index) {
    uploadedPhotos.splice(index, 1);
    renderPhotoPreview();
};

// ══════════════════════════════════════════════
// FORM SUBMIT
// ══════════════════════════════════════════════
function setupFormSubmit() {
    document.getElementById('formJurnal').addEventListener('submit', async (e) => {
        e.preventDefault();
        await simpanJurnal();
    });
    
    document.getElementById('formEdit').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateJurnal();
    });
}

async function simpanJurnal() {
    const btn = document.getElementById('btnSimpan');
    const alert = document.getElementById('alertInput');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    alert.classList.remove('show');
    
    try {
        const tanggal = document.getElementById('jurnalTanggal').value;
        const jamKe = document.getElementById('jurnalJamKe').value;
        const waktu = document.getElementById('jurnalWaktu').value;
        const kegiatan = document.getElementById('jurnalKegiatan').value;
        const hasil = document.getElementById('jurnalHasil').value;
        const keterangan = document.getElementById('jurnalKeterangan').value;
        
        // ✅ SIMPAN FOTO SEBAGAI BASE64 DI FIRESTORE (TANPA STORAGE)
        const photoBase64Array = uploadedPhotos.map(p => p.base64);
        
        // Simpan ke Firestore
        await db.collection('jurnal_mengajar').add({
            userEmail: currentUser.email,
            userName: currentUser.nama,
            userRole: currentUser.role,
            tanggal: tanggal,
            jamKe: parseInt(jamKe),
            waktu: waktu,
            kegiatan: kegiatan,
            hasil: hasil,
            keterangan: keterangan,
            fotoBase64: photoBase64Array, // ✅ Array base64
            fotoCount: photoBase64Array.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        showAlert('✅ Jurnal berhasil disimpan!', 'success', 'alertInput');
        resetForm();
        
    } catch (error) {
        console.error('Error saving jurnal:', error);
        showAlert('❌ Gagal menyimpan: ' + error.message, 'error', 'alertInput');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '💾 Simpan Jurnal';
    }
}

function resetForm() {
    document.getElementById('formJurnal').reset();
    uploadedPhotos = [];
    render
