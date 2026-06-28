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
const storage = firebase.storage();

// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
let currentUser = null;
let uploadedPhotos = []; // Array untuk menyimpan foto yang diupload (base64)
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
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Hide all content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // Show selected content
    document.getElementById(`tab-${tabName}`).style.display = 'block';
    
    // Load data if needed
    if (tabName === 'daftar') {
        loadDaftarJurnal();
    }
};

// ══════════════════════════════════════════════
// PHOTO UPLOAD
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
            alert(`️ File ${file.name} bukan gambar`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedPhotos.push({
                name: file.name,
                base64: e.target.result,
                size: file.size
            });
            renderPhotoPreview();
        };
        reader.readAsDataURL(file);
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
        
        // Upload foto ke Firebase Storage (jika ada)
        const photoUrls = [];
        for (let i = 0; i < uploadedPhotos.length; i++) {
            const photo = uploadedPhotos[i];
            const fileName = `jurnal/${currentUser.email}/${Date.now()}_${i}_${photo.name}`;
            const storageRef = storage.ref().child(fileName);
            
            // Convert base64 to blob
            const response = await fetch(photo.base64);
            const blob = await response.blob();
            
            await storageRef.put(blob);
            const url = await storageRef.getDownloadURL();
            photoUrls.push(url);
        }
        
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
            fotoUrls: photoUrls,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        showAlert('✅ Jurnal berhasil disimpan!', 'success', 'alertInput');
        resetForm();
        
    } catch (error) {
        console.error('Error saving jurnal:', error);
        showAlert(' Gagal menyimpan: ' + error.message, 'error', 'alertInput');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '💾 Simpan Jurnal';
    }
}

function resetForm() {
    document.getElementById('formJurnal').reset();
    uploadedPhotos = [];
    renderPhotoPreview();
    setDefaultDate();
}

// ══════════════════════════════════════════════
// LOAD DAFTAR JURNAL
// ═════════════════════════════════════════════
async function loadDaftarJurnal() {
    const loading = document.getElementById('loadingDaftar');
    const table = document.getElementById('tableDaftar');
    const tbody = document.getElementById('jurnalTableBody');
    
    loading.style.display = 'block';
    table.style.display = 'none';
    
    try {
        let query = db.collection('jurnal_mengajar')
            .where('userEmail', '==', currentUser.email);
        
        const snapshot = await query.get();
        daftarJurnal = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            daftarJurnal.push({ id: doc.id, ...data });
        });
        
        // Sort by tanggal desc, jamKe asc
        daftarJurnal.sort((a, b) => {
            if (b.tanggal !== a.tanggal) return b.tanggal.localeCompare(a.tanggal);
            return a.jamKe - b.jamKe;
        });
        
        // Filter by bulan/tahun
        const filterBulan = document.getElementById('filterBulan').value;
        const filterTahun = document.getElementById('filterTahun').value;
        
        let filtered = daftarJurnal;
        if (filterBulan) {
            filtered = filtered.filter(j => {
                const month = new Date(j.tanggal).getMonth() + 1;
                return month === parseInt(filterBulan);
            });
        }
        if (filterTahun) {
            filtered = filtered.filter(j => {
                const year = new Date(j.tanggal).getFullYear();
                return year === parseInt(filterTahun);
            });
        }
        
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: #64748b; padding: 20px;">
                        📭 Tidak ada data jurnal
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = filtered.map((j, index) => {
                const badgeClass = {
                    'Hadir': 'badge-hadir',
                    'Izin': 'badge-izin',
                    'Sakit': 'badge-sakit',
                    'Alpha': 'badge-alpha'
                }[j.keterangan] || '';
                
                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${formatDate(j.tanggal)}</td>
                        <td>${j.jamKe}</td>
                        <td>${j.waktu}</td>
                        <td>${j.kegiatan}</td>
                        <td>${j.hasil || '-'}</td>
                        <td>${j.keterangan ? `<span class="badge ${badgeClass}">${j.keterangan}</span>` : '-'}</td>
                        <td>${j.fotoUrls && j.fotoUrls.length > 0 ? `📷 ${j.fotoUrls.length}` : '-'}</td>
                        <td>
                            <button class="btn btn-warning btn-sm" onclick="editJurnal('${j.id}')">✏️</button>
                            <button class="btn btn-danger btn-sm" onclick="hapusJurnal('${j.id}')" style="margin-left: 4px;">🗑️</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        loading.style.display = 'none';
        table.style.display = 'block';
        
    } catch (error) {
        console.error('Error loading jurnal:', error);
        loading.innerHTML = `<div style="color: red; padding: 20px;">❌ Gagal memuat data: ${error.message}</div>`;
    }
}

// ══════════════════════════════════════════════
// EDIT & HAPUS
// ═════════════════════════════════════════════
window.editJurnal = function(id) {
    const jurnal = daftarJurnal.find(j => j.id === id);
    if (!jurnal) return;
    
    document.getElementById('editId').value = id;
    document.getElementById('editTanggal').value = jurnal.tanggal;
    document.getElementById('editJamKe').value = jurnal.jamKe;
    document.getElementById('editWaktu').value = jurnal.waktu;
    document.getElementById('editKegiatan').value = jurnal.kegiatan;
    document.getElementById('editHasil').value = jurnal.hasil || '';
    document.getElementById('editKeterangan').value = jurnal.keterangan || '';
    
    document.getElementById('modalEdit').classList.add('show');
};

async function updateJurnal() {
    const id = document.getElementById('editId').value;
    
    try {
        await db.collection('jurnal_mengajar').doc(id).update({
            tanggal: document.getElementById('editTanggal').value,
            jamKe: parseInt(document.getElementById('editJamKe').value),
            waktu: document.getElementById('editWaktu').value,
            kegiatan: document.getElementById('editKegiatan').value,
            hasil: document.getElementById('editHasil').value,
            keterangan: document.getElementById('editKeterangan').value,
            updatedAt: new Date().toISOString()
        });
        
        alert('✅ Jurnal berhasil diupdate!');
        tutupModal();
        loadDaftarJurnal();
        
    } catch (error) {
        alert(' Gagal update: ' + error.message);
    }
}

window.hapusJurnal = async function(id) {
    if (!confirm('️ Yakin ingin menghapus jurnal ini?')) return;
    
    try {
        await db.collection('jurnal_mengajar').doc(id).delete();
        alert('✅ Jurnal berhasil dihapus!');
        loadDaftarJurnal();
        
    } catch (error) {
        alert('❌ Gagal hapus: ' + error.message);
    }
};

window.tutupModal = function() {
    document.getElementById('modalEdit').classList.remove('show');
};

// ══════════════════════════════════════════════
// EXPORT PDF
// ═════════════════════════════════════════════
window.exportPDF = async function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    
    // Header
    doc.setFontSize(14);
    doc.text('LAPORAN CATATAN KINERJA HARIAN GURU (JURNAL HARIAN)', 148, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Nama: ${currentUser.nama}`, 14, 25);
    doc.text(`Jabatan: ${currentUser.role}`, 14, 30);
    doc.text(`Mata Pelajaran: Sejarah`, 14, 35);
    
    // Table
    const tableData = daftarJurnal.map((j, index) => [
        index + 1,
        formatDate(j.tanggal),
        j.jamKe,
        j.waktu,
        j.kegiatan,
        j.hasil || '-',
        j.keterangan || '-'
    ]);
    
    doc.autoTable({
        startY: 40,
        head: [['No', 'Tanggal', 'Jam', 'Waktu', 'Uraian Kegiatan', 'Hasil/Output', 'Ket.']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255 }
    });
    
    // Signature
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.text('Bantaeng, ' + new Date().toLocaleDateString('id-ID'), 200, finalY);
    doc.text('Kepala Madrasah', 14, finalY + 20);
    doc.text('Guru Mata Pelajaran', 200, finalY + 20);
    doc.text('Muhammad Arief Pither, S.Ag.,MM.,M.Pd', 14, finalY + 40);
    doc.text(currentUser.nama, 200, finalY + 40);
    doc.text('NIP. 19710930 200710 1 001', 14, finalY + 45);
    
    doc.save(`Jurnal_${currentUser.nama}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ══════════════════════════════════════════════
// EXPORT EXCEL
// ══════════════════════════════════════════════
window.exportExcel = function() {
    let csv = 'No,Tanggal,Jam Ke,Waktu,Uraian Kegiatan,Hasil/Output,Keterangan\n';
    
    daftarJurnal.forEach((j, index) => {
        csv += `${index + 1},${j.tanggal},${j.jamKe},"${j.waktu}","${j.kegiatan}","${j.hasil || ''}","${j.keterangan || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Jurnal_${currentUser.nama}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function showAlert(message, type, elementId) {
    const alert = document.getElementById(elementId);
    alert.textContent = message;
    alert.className = `alert alert-${type} show`;
    
    setTimeout(() => {
        alert.classList.remove('show');
    }, 4000);
}
