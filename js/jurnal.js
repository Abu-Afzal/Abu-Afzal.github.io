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
let activityCounter = 0;

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    setupFormSubmit();
    setupPhotoUpload();
    setDefaultDate();
    addActivity(); // Tambah 1 kegiatan awal
});

function loadUserInfo() {
    try {
        const userStr = localStorage.getItem('sipelita_user');
        if (userStr) {
            currentUser = JSON.parse(userStr);
            document.getElementById('userName').textContent = currentUser.nama || 'User';
            document.getElementById('userRole').textContent = currentUser.role || 'Guru';
            // ✅ Tampilkan NIP
const nipElement = document.getElementById('userNip');
if (nipElement) {
    if (currentUser.nip) {
        nipElement.textContent = `NIP: ${currentUser.nip}`;
        nipElement.style.color = '#64748b';
    } else {
        nipElement.textContent = 'NIP: Belum diisi (hubungi Admin)';
        nipElement.style.color = '#ef4444';
    }
}
        } else {
            alert('⛔ Anda harus login terlebih dahulu!');
            window.location.href = '../index.html';
        }
    } catch (e) {
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
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(`tab-${tabName}`).style.display = 'block';
    if (tabName === 'daftar') loadDaftarJurnal();
};

// ══════════════════════════════════════════════
// ACTIVITY MANAGEMENT (Tambah/Hapus Kegiatan)
// ══════════════════════════════════════════════
window.addActivity = function() {
    activityCounter++;
    const container = document.getElementById('activitiesContainer');
    const div = document.createElement('div');
    div.className = 'activity-item';
    div.id = `activity-${activityCounter}`;
    div.innerHTML = `
        <h4>Kegiatan #${activityCounter}</h4>
        <button type="button" class="activity-remove" onclick="removeActivity(${activityCounter})">×</button>
        <div class="form-row">
            <div class="form-group" style="margin:0;">
                <label>Waktu *</label>
                <input type="text" class="act-waktu" placeholder="Contoh: 07.30-08.50" required>
            </div>
            <div class="form-group" style="margin:0;">
                <label>Uraian Kegiatan *</label>
                <input type="text" class="act-kegiatan" placeholder="Contoh: Mengajar Mapel Sejarah Kelas X.2" required>
            </div>
        </div>
        <div class="form-group" style="margin:0;">
            <label>Hasil/Output</label>
            <input type="text" class="act-hasil" placeholder="Contoh: Terlaksananya PBM di kelas X.2">
        </div>
    `;
    container.appendChild(div);
};

window.removeActivity = function(id) {
    const el = document.getElementById(`activity-${id}`);
    if (el) el.remove();
    
    // Renumber remaining activities
    const items = document.querySelectorAll('.activity-item');
    items.forEach((item, index) => {
        item.querySelector('h4').textContent = `Kegiatan #${index + 1}`;
    });
    
    // Pastikan minimal ada 1 kegiatan
    if (items.length === 0) addActivity();
};

// ══════════════════════════════════════════════
// PHOTO UPLOAD
// ══════════════════════════════════════════════
function setupPhotoUpload() {
    const uploadArea = document.getElementById('photoUploadArea');
    const photoInput = document.getElementById('photoInput');
    
    uploadArea.addEventListener('click', () => photoInput.click());
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    photoInput.addEventListener('change', (e) => handleFiles(e.target.files));
}

function handleFiles(files) {
    const remaining = 3 - uploadedPhotos.length;
    if (remaining <= 0) { alert('⚠️ Maksimal 3 foto!'); return; }
    
    Array.from(files).slice(0, remaining).forEach(file => {
        if (file.size > 2 * 1024 * 1024) { alert(`⚠️ ${file.name} terlalu besar (maks 2 MB)`); return; }
        if (!file.type.startsWith('image/')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            compressImage(e.target.result, 800, 0.7).then(compressed => {
                uploadedPhotos.push({ name: file.name, base64: compressed });
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
            let w = img.width, h = img.height;
            if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = base64;
    });
}

function renderPhotoPreview() {
    const preview = document.getElementById('photoPreview');
    preview.innerHTML = uploadedPhotos.map((p, i) => `
        <div class="photo-item">
            <img src="${p.base64}" alt="Preview">
            <button type="button" class="photo-remove" onclick="removePhoto(${i})">✕</button>
        </div>
    `).join('');
}

window.removePhoto = function(i) { uploadedPhotos.splice(i, 1); renderPhotoPreview(); };

// ══════════════════════════════════════════════
// FORM SUBMIT - Simpan semua kegiatan hari itu
// ══════════════════════════════════════════════
function setupFormSubmit() {
    document.getElementById('formJurnal').addEventListener('submit', async (e) => {
        e.preventDefault();
        await simpanJurnal();
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
        const keterangan = document.getElementById('jurnalKeterangan').value;
        
        // Kumpulkan semua kegiatan
        const activities = [];
        document.querySelectorAll('.activity-item').forEach(item => {
            const waktu = item.querySelector('.act-waktu').value.trim();
            const kegiatan = item.querySelector('.act-kegiatan').value.trim();
            const hasil = item.querySelector('.act-hasil').value.trim();
            
            if (waktu && kegiatan) {
                activities.push({ waktu, kegiatan, hasil });
            }
        });
        
        if (activities.length === 0) {
            alertEl.textContent = '❌ Minimal 1 kegiatan harus diisi!';
            alertEl.className = 'alert alert-error show';
            btn.disabled = false;
            btn.innerHTML = '💾 Simpan Jurnal';
            return;
        }
        
        const photoBase64Array = uploadedPhotos.map(p => p.base64);
        
        // Simpan 1 dokumen per hari (semua kegiatan dalam array)
        await db.collection('jurnal_mengajar').add({
            userEmail: currentUser.email,
            userName: currentUser.nama,
            userRole: currentUser.role,
            tanggal: tanggal,
            keterangan: keterangan,
            activities: activities, // Array of {waktu, kegiatan, hasil}
            vol: activities.length,
            fotoBase64: photoBase64Array,
            fotoCount: photoBase64Array.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        alertEl.textContent = '✅ Jurnal berhasil disimpan!';
        alertEl.className = 'alert alert-success show';
        resetForm();
        
    } catch (error) {
        console.error('Error saving:', error);
        alertEl.textContent = '❌ Gagal menyimpan: ' + error.message;
        alertEl.className = 'alert alert-error show';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '💾 Simpan Jurnal';
    }
}

function resetForm() {
    document.getElementById('formJurnal').reset();
    document.getElementById('activitiesContainer').innerHTML = '';
    activityCounter = 0;
    uploadedPhotos = [];
    renderPhotoPreview();
    setDefaultDate();
    addActivity();
}

// ══════════════════════════════════════════════
// LOAD DAFTAR JURNAL (Format LCKH)
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
        snapshot.forEach(doc => daftarJurnal.push({ id: doc.id, ...doc.data() }));
        
        // Sort by tanggal asc
        daftarJurnal.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        
        // Filter bulan/tahun
        const filterBulan = document.getElementById('filterBulan').value;
        const filterTahun = document.getElementById('filterTahun').value;
        
        let filtered = daftarJurnal.filter(j => {
            const d = new Date(j.tanggal);
            const monthMatch = !filterBulan || (d.getMonth() + 1) === parseInt(filterBulan);
            const yearMatch = !filterTahun || d.getFullYear() === parseInt(filterTahun);
            return monthMatch && yearMatch;
        });
        
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:#64748b;">📭 Tidak ada data jurnal</td></tr>`;
        } else {
            tbody.innerHTML = filtered.map((j, index) => {
                // Support format lama (field tunggal) dan format baru (array activities)
                let activities = j.activities || [];
                
                // Fallback untuk data lama yang belum punya array activities
                if (activities.length === 0 && j.kegiatan) {
                    activities = [{ waktu: j.waktu || '', kegiatan: j.kegiatan, hasil: j.hasil || '' }];
                }
                
                const vol = activities.length || j.vol || 1;
                
                // Format Jam: 1. 07.30-08.50  2. 10.00-12.00
                const jamText = activities.map((a, i) => `${i + 1}. ${a.waktu}`).join('<br>');
                
                // Format Kegiatan: 1. Mengajar...  2. Rapat...
                const kegiatanText = activities.map((a, i) => `${i + 1}. ${a.kegiatan}`).join('<br>');
                
                // Format Output: 1. Terlaksana...  2. Terlaksana...
                const outputText = activities.map((a, i) => {
                    const h = a.hasil || '-';
                    return `${i + 1}. ${h}`;
                }).join('<br>');
                
                // Foto thumbnail
                const fotoCount = j.fotoCount || (j.fotoBase64 ? j.fotoBase64.length : 0);
                let fotoHtml = '-';
                if (fotoCount > 0 && j.fotoBase64) {
                    fotoHtml = j.fotoBase64.map((foto, fi) => 
                        `<img src="${foto}" style="max-width:80px;max-height:60px;border-radius:4px;margin:2px;cursor:pointer;" onclick="viewPhoto('${j.id}', ${fi})">`
                    ).join('');
                }
                
                // Keterangan badge
                let badgeHtml = '';
                if (j.keterangan) {
                    const badgeClass = { 'Hadir': 'badge-hadir', 'Izin': 'badge-izin', 'Sakit': 'badge-sakit', 'Alpha': 'badge-alpha' }[j.keterangan] || '';
                    badgeHtml = `<span class="badge ${badgeClass}">${j.keterangan}</span>`;
                }
                
                return `
                    <tr>
                        <td style="text-align:center;font-weight:700;">${index + 1}</td>
                        <td>${formatDate(j.tanggal)}${badgeHtml ? '<br>' + badgeHtml : ''}</td>
                        <td style="font-size:0.82rem;">${jamText}</td>
                        <td style="font-size:0.82rem;">${kegiatanText}</td>
                        <td style="text-align:center;font-weight:700;">${vol}</td>
                        <td style="font-size:0.82rem;">${outputText}</td>
                        <td style="text-align:center;">${fotoHtml}</td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="hapusJurnal('${j.id}')">🗑️</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        loading.style.display = 'none';
        table.style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
        loading.innerHTML = `<div style="color:red;padding:20px;">❌ ${error.message}</div>`;
    }
}

// ══════════════════════════════════════════════
// VIEW PHOTO
// ══════════════════════════════════════════════
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

// ══════════════════════════════════════════════
// HAPUS
// ══════════════════════════════════════════════
window.hapusJurnal = async function(id) {
    if (!confirm('⚠️ Hapus jurnal ini?')) return;
    try {
        await db.collection('jurnal_mengajar').doc(id).delete();
        loadDaftarJurnal();
    } catch (error) { alert('❌ ' + error.message); }
};

window.hapusSemuaJurnal = async function() {
    const filterBulan = document.getElementById('filterBulan').value;
    const filterTahun = document.getElementById('filterTahun').value;
    const monthNames = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    
    if (!confirm(`⚠️ Hapus SEMUA jurnal bulan ${monthNames[filterBulan]} ${filterTahun}?\n\nTindakan ini TIDAK bisa dibatalkan!`)) return;
    
    try {
        const filtered = daftarJurnal.filter(j => {
            const d = new Date(j.tanggal);
            return (d.getMonth() + 1) === parseInt(filterBulan) && d.getFullYear() === parseInt(filterTahun);
        });
        
        for (const j of filtered) {
            await db.collection('jurnal_mengajar').doc(j.id).delete();
        }
        
        alert(`✅ ${filtered.length} jurnal berhasil dihapus!`);
        loadDaftarJurnal();
    } catch (error) { alert('❌ ' + error.message); }
};

// ══════════════════════════════════════════════
// PREVIEW PDF (Sebelum Export)
// ══════════════════════════════════════════════
window.previewPDF = async function() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Loading...';
    
    try {
        await generatePDF(true); // true = mode preview
    } catch (error) {
        console.error('Error preview:', error);
        alert('❌ Gagal preview PDF: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// ══════════════════════════════════════════════
// EXPORT PDF
// ══════════════════════════════════════════════
window.exportPDF = async function() {
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Membuat PDF...';
    
    try {
        await generatePDF(false); // false = mode export
    } catch (error) {
        console.error('Error export:', error);
        alert('❌ Gagal export PDF: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// ══════════════════════════════════════════════
// GENERATE PDF (Shared function untuk preview & export)
// ══════════════════════════════════════════════
async function generatePDF(isPreview = false) {
    const filterBulan = document.getElementById('filterBulan').value;
    const filterTahun = document.getElementById('filterTahun').value;
    const monthNames = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    
    let filtered = daftarJurnal.filter(j => {
        const d = new Date(j.tanggal);
        return (d.getMonth() + 1) === parseInt(filterBulan) && d.getFullYear() === parseInt(filterTahun);
    });
    
    if (filtered.length === 0) {
        alert('⚠️ Tidak ada data untuk diekspor!');
        return;
    }
    
    // Build HTML table untuk PDF
    const pdfArea = document.getElementById('pdfExportArea');
    pdfArea.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px 30px; width: 1050px; background: white;">
            <h2 style="text-align:center; font-size:16px; margin-bottom:5px; font-weight:bold;">LAPORAN CAPAIAN KINERJA HARIAN (LCKH)</h2>
            <h3 style="text-align:center; font-size:13px; margin-bottom:3px;">BULAN ${monthNames[filterBulan].toUpperCase()} TP. ${filterTahun}/${parseInt(filterTahun)+1}</h3>
            <h3 style="text-align:center; font-size:13px; margin-bottom:20px; font-weight:bold;">MAN BANTAENG</h3>
            
            <table style="width:100%; margin-bottom:20px; font-size:11px;">
                <tr>
                    <td style="width:200px;"><strong>NAMA</strong></td>
                    <td style="width:300px;">: ${currentUser.nama}</td>
                    <td style="width:200px; text-align:right;"><strong>MATA PELAJARAN</strong></td>
                    <td style="width:350px;">: Sejarah</td>
                </tr>
                <tr>
                    <td><strong>NIP</strong></td>
                    <td>: ${currentUser.nip || '-'}</td>
                    <td style="text-align:right;"><strong>JABATAN</strong></td>
                    <td>: Guru</td>
                </tr>
            </table>
            
            <table style="width:100%; border-collapse:collapse; font-size:10px;">
                <thead>
                    <tr style="background:#1e40af; color:white;">
                        <th style="border:1px solid #333; padding:8px; width:30px; text-align:center;">NO</th>
                        <th style="border:1px solid #333; padding:8px; width:150px;">HARI, TANGGAL</th>
                        <th style="border:1px solid #333; padding:8px; width:180px;">JAM</th>
                        <th style="border:1px solid #333; padding:8px;">URAIAN KEGIATAN</th>
                        <th style="border:1px solid #333; padding:8px; width:40px; text-align:center;">VOL</th>
                        <th style="border:1px solid #333; padding:8px;">OUTPUT</th>
                        <th style="border:1px solid #333; padding:8px; width:120px; text-align:center;">KETERANGAN/<br>GAMBAR</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map((j, index) => {
                        let activities = j.activities || [];
                        if (activities.length === 0 && j.kegiatan) {
                            activities = [{ waktu: j.waktu || '', kegiatan: j.kegiatan, hasil: j.hasil || '' }];
                        }
                        
                        const vol = activities.length || 1;
                        const jamText = activities.map((a, i) => `${i+1}. ${a.waktu}`).join('<br>');
                        const kegiatanText = activities.map((a, i) => `${i+1}. ${a.kegiatan}`).join('<br>');
                        const outputText = activities.map((a, i) => `${i+1}. ${a.hasil || '-'}`).join('<br>');
                        
                        let fotoHtml = '';
                        if (j.fotoBase64 && j.fotoBase64.length > 0) {
                            fotoHtml = j.fotoBase64.map(f => `<img src="${f}" style="max-width:100px;max-height:70px;margin:2px;display:block;border:1px solid #ddd;">`).join('');
                        } else {
                            fotoHtml = '-';
                        }
                        
                        return `
                            <tr>
                                <td style="border:1px solid #333; padding:6px; text-align:center; vertical-align:top;">${index + 1}</td>
                                <td style="border:1px solid #333; padding:6px; vertical-align:top;">${formatDate(j.tanggal)}</td>
                                <td style="border:1px solid #333; padding:6px; font-size:9px; vertical-align:top;">${jamText}</td>
                                <td style="border:1px solid #333; padding:6px; font-size:9px; vertical-align:top;">${kegiatanText}</td>
                                <td style="border:1px solid #333; padding:6px; text-align:center; vertical-align:top; font-weight:bold;">${vol}</td>
                                <td style="border:1px solid #333; padding:6px; font-size:9px; vertical-align:top;">${outputText}</td>
                                <td style="border:1px solid #333; padding:6px; text-align:center; vertical-align:top;">${fotoHtml}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div style="margin-top:40px; display:flex; justify-content:space-between; font-size:11px; min-height:150px;">
                <div style="text-align:left; width:45%;">
                    <p style="margin-bottom:8px;">Mengetahui,</p>
                    <p style="margin-bottom:8px; font-weight:bold;">Kepala Madrasah</p>
                    <br><br><br>
                    <p style="font-weight:bold; margin-bottom:4px;">Muhammad Arief Pither, S.Ag.,M.M.,M.Pd</p>
                    <p>NIP. 19710930 200710 1 001</p>
                </div>
                <div style="text-align:left; width:45%;">
                    <p style="margin-bottom:8px;">Bantaeng, ${new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}</p>
                    <p style="margin-bottom:8px;">Guru Mata Pelajaran</p>
                    <br><br><br>
                    <p style="font-weight:bold; margin-bottom:4px;">${currentUser.nama}</p>
                    <p>NIP. ${currentUser.nip || '-'}</p>
                </div>
            </div>
        </div>
    `;
    
    // Tunggu gambar load
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (isPreview) {
        // Buka preview di tab/window baru
        const printWindow = window.open('', '_blank');
        const pdfContent = pdfArea.innerHTML;
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Preview LCKH - ${monthNames[filterBulan]} ${filterTahun}</title>
                <style>
                    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f5f5f5; }
                    .preview-container { background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
                    .print-btn { 
                        position: fixed; 
                        top: 20px; 
                        right: 20px; 
                        padding: 12px 24px; 
                        background: #10b981; 
                        color: white; 
                        border: none; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        font-weight: 600;
                        font-size: 14px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    }
                    .print-btn:hover { background: #059669; }
                    @media print {
                        body { background: white; }
                        .preview-container { box-shadow: none; }
                        .print-btn { display: none; }
                    }
                </style>
            </head>
            <body>
                <button class="print-btn" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
                <div class="preview-container">${pdfContent}</div>
            </body>
            </html>
        `);
        printWindow.document.close();
    } else {
        // Export ke PDF file
        const canvas = await html2canvas(pdfArea.firstElementChild, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4');
        
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();
        const imgW = canvas.width;
        const imgH = canvas.height;
        
        // Hitung rasio agar muat di halaman
        const ratio = pdfW / imgW;
        const scaledH = imgH * ratio;
        
        // Jika lebih tinggi dari 1 halaman, bagi jadi beberapa halaman
        if (scaledH <= pdfH) {
            pdf.addImage(imgData, 'JPEG', 0, 5, pdfW, scaledH);
        } else {
            // Multi-page
            const pageH = pdfH - 10;
            const totalPages = Math.ceil(scaledH / pageH);
            
            for (let p = 0; p < totalPages; p++) {
                if (p > 0) pdf.addPage();
                const yOffset = -(p * pageH) + 5;
                pdf.addImage(imgData, 'JPEG', 0, yOffset, pdfW, scaledH);
            }
        }
        
        pdf.save(`LCKH_${monthNames[filterBulan]}_${filterTahun}_${currentUser.nama.replace(/\s+/g, '_')}.pdf`);
    }
}
        
    } catch (error) {
        console.error('Error export:', error);
        alert('❌ Gagal export PDF: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
