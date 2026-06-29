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
            alert(`⚠️ File ${file.name} bukan gambar`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            compressImage(e.target.result, 800, 0.7).then(compressed => {
                uploadedPhotos.push({
                    name: file.name,
                    base64: compressed
                });
                renderPhotoPreview();
            });
        };
        reader.readAsDataURL(file);
    });
}

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
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
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
    const alertEl = document.getElementById('alertInput');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    alertEl.classList.remove('show');
    
    try {
        const tanggal = document.getElementById('jurnalTanggal').value;
        const waktu = document.getElementById('jurnalWaktu').value;
        const kegiatan = document.getElementById('jurnalKegiatan').value;
        const hasil = document.getElementById('jurnalHasil').value;
        const keterangan = document.getElementById('jurnalKeterangan').value;
        
        const photoBase64Array = uploadedPhotos.map(p => p.base64);
        
        await db.collection('jurnal_mengajar').add({
            userEmail: currentUser.email,
            userName: currentUser.nama,
            userRole: currentUser.role,
            tanggal: tanggal,
            waktu: waktu,
            kegiatan: kegiatan,
            hasil: hasil,
            keterangan: keterangan,
            fotoBase64: photoBase64Array,
            fotoCount: photoBase64Array.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        alertEl.textContent = '✅ Jurnal berhasil disimpan!';
        alertEl.className = 'alert alert-success show';
        resetForm();
        
        setTimeout(() => {
            alertEl.classList.remove('show');
        }, 3000);
        
    } catch (error) {
        console.error('Error saving jurnal:', error);
        alertEl.textContent = '❌ Gagal menyimpan: ' + error.message;
        alertEl.className = 'alert alert-error show';
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
// ══════════════════════════════════════════════
async function loadDaftarJurnal() {
    const loading = document.getElementById('loadingDaftar');
    const table = document.getElementById('tableDaftar');
    const tbody = document.getElementById('jurnalTableBody');
    
    loading.style.display = 'block';
    table.style.display = 'none';
    
    try {
        const snapshot = await db.collection('jurnal_mengajar')
            .where('userEmail', '==', currentUser.email)
            .get();
        
        daftarJurnal = [];
        snapshot.forEach(doc => {
            daftarJurnal.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by tanggal asc, waktu asc
        daftarJurnal.sort((a, b) => {
            if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
            return a.waktu.localeCompare(b.waktu);
        });
        
        // Filter
        const filterBulan = document.getElementById('filterBulan').value;
        const filterTahun = document.getElementById('filterTahun').value;
        
        let filtered = daftarJurnal;
        if (filterBulan) {
            filtered = filtered.filter(j => new Date(j.tanggal).getMonth() + 1 === parseInt(filterBulan));
        }
        if (filterTahun) {
            filtered = filtered.filter(j => new Date(j.tanggal).getFullYear() === parseInt(filterTahun));
        }
        
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:#64748b;">📭 Tidak ada data</td></tr>`;
        } else {
            tbody.innerHTML = filtered.map((j, index) => {
                const badgeClass = {
                    'Hadir': 'badge-hadir',
                    'Izin': 'badge-izin',
                    'Sakit': 'badge-sakit',
                    'Alpha': 'badge-alpha'
                }[j.keterangan] || '';
                
                const fotoCount = j.fotoCount || (j.fotoBase64 ? j.fotoBase64.length : 0);
                let fotoThumb = '-';
                if (fotoCount > 0 && j.fotoBase64[0]) {
                    fotoThumb = `<img src="${j.fotoBase64[0]}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;cursor:pointer;" onclick="viewPhoto('${j.id}', 0)">`;
                }
                
                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${formatDate(j.tanggal)}</td>
                        <td>${j.waktu}</td>
                        <td>${j.kegiatan}</td>
                        <td>${j.hasil || '-'}</td>
                        <td>${j.keterangan ? `<span class="badge ${badgeClass}">${j.keterangan}</span>` : '-'}</td>
                        <td>${fotoThumb}</td>
                        <td>
                            <button class="btn btn-warning btn-sm" onclick="editJurnal('${j.id}')">✏️</button>
                            <button class="btn btn-danger btn-sm" onclick="hapusJurnal('${j.id}')">🗑️</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        loading.style.display = 'none';
        table.style.display = 'block';
        
    } catch (error) {
        console.error('Error loading:', error);
        loading.innerHTML = `<div style="color:red;padding:20px;">❌ ${error.message}</div>`;
    }
}

window.viewPhoto = function(jurnalId, photoIndex) {
    const jurnal = daftarJurnal.find(j => j.id === jurnalId);
    if (!jurnal || !jurnal.fotoBase64[photoIndex]) return;
    
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
    const img = document.createElement('img');
    img.src = jurnal.fotoBase64[photoIndex];
    img.style.cssText = 'max-width:90%;max-height:90%;object-fit:contain;border-radius:8px;';
    modal.appendChild(img);
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
};

window.editJurnal = function(id) {
    const jurnal = daftarJurnal.find(j => j.id === id);
    if (!jurnal) return;
    
    document.getElementById('editId').value = id;
    document.getElementById('editTanggal').value = jurnal.tanggal;
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
            waktu: document.getElementById('editWaktu').value,
            kegiatan: document.getElementById('editKegiatan').value,
            hasil: document.getElementById('editHasil').value,
            keterangan: document.getElementById('editKeterangan').value,
            updatedAt: new Date().toISOString()
        });
        
        alert('✅ Jurnal berhasil diupdate!');
        document.getElementById('modalEdit').classList.remove('show');
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
// EXPORT PDF DENGAN FOTO EMBEDDED
// ═════════════════════════════════════════════
window.exportPDF = async function() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Membuat PDF...';
    
    try {
        // Filter data sesuai bulan/tahun yang dipilih
        const filterBulan = document.getElementById('filterBulan').value;
        const filterTahun = document.getElementById('filterTahun').value;
        
        let filtered = [...daftarJurnal];
        if (filterBulan) {
            filtered = filtered.filter(j => new Date(j.tanggal).getMonth() + 1 === parseInt(filterBulan));
        }
        if (filterTahun) {
            filtered = filtered.filter(j => new Date(j.tanggal).getFullYear() === parseInt(filterTahun));
        }
        
        if (filtered.length === 0) {
            alert('️ Tidak ada data untuk diekspor!');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }
        
        // Buat tabel HTML tersembunyi dengan foto embedded
        const pdfTable = document.getElementById('pdfExportTable');
        pdfTable.innerHTML = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="text-align: center; margin-bottom: 5px;">LAPORAN CATATAN KINERJA HARIAN GURU</h2>
                <h3 style="text-align: center; margin-bottom: 20px;">MAN BANTAENG</h3>
                
                <div style="margin-bottom: 20px;">
                    <p><strong>Nama:</strong> ${currentUser.nama}</p>
                    <p><strong>Mata Pelajaran:</strong> Sejarah</p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead>
                        <tr style="background: #10b981; color: white;">
                            <th style="border: 1px solid #333; padding: 8px; width: 30px;">No</th>
                            <th style="border: 1px solid #333; padding: 8px; width: 120px;">Hari, Tanggal</th>
                            <th style="border: 1px solid #333; padding: 8px; width: 80px;">Waktu</th>
                            <th style="border: 1px solid #333; padding: 8px;">Uraian Kegiatan</th>
                            <th style="border: 1px solid #333; padding: 8px;">Hasil/Output</th>
                            <th style="border: 1px solid #333; padding: 8px; width: 100px;">Keterangan/Gambar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map((j, index) => `
                            <tr>
                                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${index + 1}</td>
                                <td style="border: 1px solid #333; padding: 6px;">${formatDate(j.tanggal)}</td>
                                <td style="border: 1px solid #333; padding: 6px;">${j.waktu}</td>
                                <td style="border: 1px solid #333; padding: 6px;">${j.kegiatan}</td>
                                <td style="border: 1px solid #333; padding: 6px;">${j.hasil || '-'}</td>
                                <td style="border: 1px solid #333; padding: 6px; text-align: center;">
                                    ${j.fotoBase64 && j.fotoBase64.length > 0 ? 
                                        j.fotoBase64.map(foto => `<img src="${foto}" style="max-width: 80px; max-height: 80px; margin: 2px;">`).join('') 
                                        : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                    <div style="text-align: center;">
                        <p>Mengetahui,</p>
                        <p>Kepala Madrasah</p>
                        <br><br><br>
                        <p><strong>Muhammad Arief Pither, S.Ag.,MM.,M.Pd</strong></p>
                        <p>NIP. 19710930 200710 1 001</p>
                    </div>
                    <div style="text-align: center;">
                        <p>Bantaeng, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p>Guru Mata Pelajaran</p>
                        <br><br><br>
                        <p><strong>${currentUser.nama}</strong></p>
                        <p>NIP. ${currentUser.nip || '-'}</p>
                    </div>
                </div>
            </div>
        `;
        
        // Tunggu gambar load
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Convert HTML ke canvas menggunakan html2canvas
        const canvas = await html2canvas(pdfTable, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        // Convert canvas ke PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 10;
        
        pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        
        const fileName = `Jurnal_${currentUser.nama}_${filterTahun || new Date().getFullYear()}_${filterBulan || 'all'}.pdf`;
        pdf.save(fileName);
        
        alert('✅ PDF berhasil diekspor dengan foto!');
        
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('❌ Gagal export PDF: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// ══════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════
function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}
