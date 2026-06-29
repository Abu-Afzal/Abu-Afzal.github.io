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
let uploadedPhotos = [];
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
// PHOTO UPLOAD (BASE64)
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
            // Kompres gambar
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

// Kompres gambar
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
        
        // Simpan foto sebagai base64
        const photoBase64Array = uploadedPhotos.map(p => p.base64);
        
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
            fotoBase64: photoBase64Array,
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
    renderPhotoPreview();
    setDefaultDate();
}

// ══════════════════════════════════════════════
// LOAD DAFTAR JURNAL (DENGAN FOTO)
// ══════════════════════════════════════════════
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
                
                const fotoCount = j.fotoCount || (j.fotoBase64 ? j.fotoBase64.length : 0);
                
                // Thumbnail foto pertama (jika ada)
                let fotoThumb = '-';
                if (fotoCount > 0 && j.fotoBase64[0]) {
                    fotoThumb = `
                        <img src="${j.fotoBase64[0]}" 
                             style="width:60px;height:60px;object-fit:cover;border-radius:6px;cursor:pointer;" 
                             onclick="viewPhoto('${j.id}', 0)"
                             title="Klik untuk lihat foto">
                        ${fotoCount > 1 ? `<span style="font-size:0.75rem;color:#64748b;">+${fotoCount-1}</span>` : ''}
                    `;
                }
                
                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${formatDate(j.tanggal)}</td>
                        <td>${j.jamKe}</td>
                        <td>${j.waktu}</td>
                        <td>${j.kegiatan}</td>
                        <td>${j.hasil || '-'}</td>
                        <td>${j.keterangan ? `<span class="badge ${badgeClass}">${j.keterangan}</span>` : '-'}</td>
                        <td>${fotoThumb}</td>
                        <td>
                            <button class="btn btn-warning btn-sm" onclick="editJurnal('${j.id}')" title="Edit">✏️</button>
                            <button class="btn btn-danger btn-sm" onclick="hapusJurnal('${j.id}')" style="margin-left: 4px;" title="Hapus">🗑️</button>
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
// VIEW PHOTO (MODAL)
// ══════════════════════════════════════════════
window.viewPhoto = function(jurnalId, photoIndex) {
    const jurnal = daftarJurnal.find(j => j.id === jurnalId);
    if (!jurnal || !jurnal.fotoBase64[photoIndex]) return;
    
    // Buat modal untuk lihat foto
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.9);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: zoom-out;
    `;
    
    const img = document.createElement('img');
    img.src = jurnal.fotoBase64[photoIndex];
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        border-radius: 8px;
    `;
    
    modal.appendChild(img);
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
};

// ══════════════════════════════════════════════
// EDIT & HAPUS
// ══════════════════════════════════════════════
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
        alert('❌ Gagal update: ' + error.message);
    }
}

window.hapusJurnal = async function(id) {
    if (!confirm('⚠️ Yakin ingin menghapus jurnal ini?')) return;
    
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
// EXPORT PDF (DENGAN FOTO)
// ══════════════════════════════════════════════
window.exportPDF = async function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    
    // Header
    doc.setFontSize(14);
    doc.text('LAPORAN CATATAN KINERJA HARIAN GURU (JURNAL HARIAN)', 148, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.text('MAN BANTAENG', 148, 22, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Nama: ${currentUser.nama}`, 14, 30);
    doc.text(`Jabatan: ${currentUser.role}`, 14, 35);
    doc.text(`Mata Pelajaran: Sejarah`, 14, 40);
    
    // Table dengan foto
    const tableData = daftarJurnal.map((j, index) => {
        // Siapkan foto untuk ditampilkan
        let fotoInfo = '';
        if (j.fotoBase64 && j.fotoBase64.length > 0) {
            fotoInfo = `${j.fotoBase64.length} foto`;
        } else {
            fotoInfo = '-';
        }
        
        return [
            index + 1,
            formatDate(j.tanggal),
            j.jamKe,
            j.waktu,
            j.kegiatan,
            j.hasil || '-',
            fotoInfo
        ];
    });
    
    doc.autoTable({
        startY: 45,
        head: [['No', 'Tanggal', 'Jam', 'Waktu', 'Uraian Kegiatan', 'Hasil/Output', 'Foto']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        columnStyles: {
            6: { halign: 'center' } // Kolom foto di tengah
        }
    });
    
    // Signature
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.text('Bantaeng, ' + new Date().toLocaleDateString('id-ID'), 200, finalY);
    doc.text('Mengetahui,', 14, finalY + 15);
    doc.text('Kepala Madrasah', 14, finalY + 25);
    doc.text('Guru Mata Pelajaran', 200, finalY + 25);
    doc.text('Muhammad Arief Pither, S.Ag.,MM.,M.Pd', 14, finalY + 45);
    doc.text(currentUser.nama, 200, finalY + 45);
    doc.text('NIP. 19710930 200710 1 001', 14, finalY + 50);
    
    doc.save(`Jurnal_${currentUser.nama}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ══════════════════════════════════════════════
// EXPORT EXCEL
// ══════════════════════════════════════════════
window.exportExcel = function() {
    let csv = 'No,Tanggal,Jam Ke,Waktu,Uraian Kegiatan,Hasil/Output,Keterangan,Jumlah Foto\n';
    
    daftarJurnal.forEach((j, index) => {
        const fotoCount = j.fotoBase64 ? j.fotoBase64.length : 0;
        csv += `${index + 1},${j.tanggal},${j.jamKe},"${j.waktu}","${j.kegiatan}","${j.hasil || ''}","${j.keterangan || ''}",${fotoCount}\n`;
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
