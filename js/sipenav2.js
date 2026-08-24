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
const auth = firebase.auth();

// State
let currentUser = null;
let currentUserData = null;
let currentKelasId = null;
let currentKelasNama = '';

// Variabel untuk menyimpan foto dalam base64
let fotoSiswaBase64 = '';

// Handle upload foto dari perangkat
function handleFotoUpload(event) {
  const file = event.target.files[0];
  
  if (!file) return;
  
  // Validasi ukuran file (maks 2MB)
  if (file.size > 2 * 1024 * 1024) {
    showToast('❌ Ukuran foto maksimal 2MB!', 'error');
    return;
  }
  
  // Validasi tipe file
  if (!file.type.startsWith('image/')) {
    showToast('❌ File harus berupa gambar!', 'error');
    return;
  }
  
  // Baca file dan konversi ke base64
  const reader = new FileReader();
  reader.onload = function(e) {
    fotoSiswaBase64 = e.target.result;
    
    // Tampilkan preview
    document.getElementById('fotoPreview').src = fotoSiswaBase64;
    document.getElementById('fotoPreviewContainer').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// Hapus foto preview
function hapusFotoPreview() {
  fotoSiswaBase64 = '';
  document.getElementById('inputFotoSiswaFile').value = '';
  document.getElementById('fotoPreviewContainer').style.display = 'none';
  document.getElementById('fotoPreview').src = '';
}

// ══════════════════════════════════════════════
// SEAMLESS LOGIN & SAPAAN PERSONAL
// ══════════════════════════════════════════════
function initSession() {
  const storedUser = localStorage.getItem('sipelita_user');
  
  if (storedUser) {
    try {
      currentUserData = JSON.parse(storedUser);
      currentUser = {
        uid: currentUserData.uid || currentUserData.email,
        email: currentUserData.email,
        displayName: currentUserData.nama || currentUserData.name
      };
      updateGreeting();
      loadPage('dashboard');
    } catch (e) {
      console.error("Error parsing user data", e);
      redirectToLogin();
    }
  } else {
    auth.onAuthStateChanged(user => {
      if (user) {
        currentUser = user;
        currentUserData = {
          nama: user.displayName || user.email.split('@')[0],
          email: user.email,
          role: 'guru'
        };
        localStorage.setItem('sipelita_user', JSON.stringify(currentUserData));
        updateGreeting();
        loadPage('dashboard');
      } else {
        redirectToLogin();
      }
    });
  }
}

function updateGreeting() {
  const greetingEl = document.getElementById('userGreeting');
  if (greetingEl && currentUserData) {
    const nama = currentUserData.nama || currentUserData.name || 'Bapak/Ibu Guru';
    const jam = new Date().getHours();
    let sapaanWaktu = 'Selamat Pagi';
    if (jam >= 11 && jam < 15) sapaanWaktu = 'Selamat Siang';
    else if (jam >= 15 && jam < 18) sapaanWaktu = 'Selamat Sore';
    else if (jam >= 18) sapaanWaktu = 'Selamat Malam';
    
    greetingEl.textContent = `${sapaanWaktu}, ${nama} 👋`;
  }
}

function redirectToLogin() {
  showToast('⚠️ Sesi Anda berakhir. Silakan login ulang.', 'warning');
  setTimeout(() => { window.location.href = 'home.html'; }, 1500);
}

// ══════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'exclamation-circle';
  toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function openModal(modalId) { document.getElementById(modalId).classList.add('active'); }
function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); }

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    loadPage(item.dataset.page);
  });
});

// ══════════════════════════════════════════════
// PAGE RENDERING
// ══════════════════════════════════════════════
function loadPage(page) {
  const content = document.getElementById('pageContent');
  switch(page) {
    case 'dashboard':
      content.innerHTML = renderDashboard();
      loadStats();
      break;
    case 'kelas':
      content.innerHTML = renderKelas();
      loadKelasList();
      break;
    case 'presensi': content.innerHTML = renderPresensi(); break;
    case 'penilaian': content.innerHTML = renderPenilaian(); break;
    case 'bank-soal': content.innerHTML = renderBankSoal(); break;
    case 'rekap': content.innerHTML = renderRekap(); break;
  }
}

function renderDashboard() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <h3 style="margin-bottom: 1rem;">📊 Ringkasan Sistem</h3>
      <p>Selamat datang di SIPENA 2.0! Sistem Penilaian dan Presensi Digital yang modern dan terintegrasi dengan database SICAN.</p>
      <div style="margin-top: 1.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div style="padding: 1rem; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
          <strong style="color: #166534;">✅ Firestore Database</strong>
          <p style="font-size: 0.875rem; color: #64748b; margin-top: 0.25rem;">Lebih aman dan scalable</p>
        </div>
        <div style="padding: 1rem; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <strong style="color: #1e40af;">🔄 Integrasi SICAN</strong>
          <p style="font-size: 0.875rem; color: #64748b; margin-top: 0.25rem;">Sinkronisasi data siswa otomatis</p>
        </div>
        <div style="padding: 1rem; background: #f5f3ff; border-radius: 8px; border-left: 4px solid #8b5cf6;">
          <strong style="color: #5b21b6;">Modern UI/UX</strong>
          <p style="font-size: 0.875rem; color: #64748b; margin-top: 0.25rem;">Desain bersih dan responsif</p>
        </div>
      </div>
    </div>`;
}

function renderKelas() {
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700;">🏫 Kelola Kelas</h3>
        <button class="btn btn-primary" onclick="openModal('modalTambahKelas')"><i class="fas fa-plus"></i> Tambah Kelas</button>
      </div>
      <div class="table-container">
        <table>
          <thead><tr><th>Nama Kelas</th><th>Tahun Ajaran</th><th>Jumlah Siswa</th><th>Aksi</th></tr></thead>
          <tbody id="kelasTableBody"><tr><td colspan="4" style="text-align: center;">Memuat data...</td></tr></tbody>
        </table>
      </div>
    </div>`;
}

function renderPresensi() {
  return `<div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
    <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">✅ Presensi Digital</h3>
    <p style="color: var(--text-secondary);">Fitur presensi sedang dalam pengembangan.</p>
  </div>`;
}

function renderPenilaian() {
  return `<div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
    <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">⭐ Penilaian</h3>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
      <div class="stat-card blue"><div class="stat-icon blue"><i class="fas fa-brain"></i></div><h4>Pengetahuan</h4><p style="font-size: 0.875rem; color: var(--text-secondary);">Tes tertulis & lisan</p></div>
      <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-tools"></i></div><h4>Keterampilan</h4><p style="font-size: 0.875rem; color: var(--text-secondary);">Praktik & proyek</p></div>
      <div class="stat-card orange"><div class="stat-icon orange"><i class="fas fa-heart"></i></div><h4>Sikap</h4><p style="font-size: 0.875rem; color: var(--text-secondary);">Observasi & jurnal</p></div>
    </div>
  </div>`;
}

function renderBankSoal() {
  return `<div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
      <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700;">Bank Soal</h3>
      <button class="btn btn-primary"><i class="fas fa-plus"></i> Tambah Soal</button>
    </div>
    <p style="color: var(--text-secondary);">Fitur bank soal sedang dalam pengembangan.</p>
  </div>`;
}

function renderRekap() {
  return `<div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
    <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Rekap & Laporan</h3>
    <p style="color: var(--text-secondary); margin-top: 0.5rem;">Fitur rekap sedang dalam pengembangan.</p>
  </div>`;
}

// ══════════════════════════════════════════════
// DATA OPERATIONS (FIRESTORE)
// ══════════════════════════════════════════════
async function loadStats() {
  if (!currentUser) return;
  try {
    const kelasSnap = await db.collection('kelas').where('wali_kelas_uid', '==', currentUser.uid).where('archived', '==', false).get();
    document.getElementById('statKelas').textContent = kelasSnap.size;

    const kelasIds = kelasSnap.docs.map(doc => doc.id);
    let totalSiswa = 0;
    for (const kelasId of kelasIds) {
      const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelasId).get();
      totalSiswa += siswaSnap.size;
    }
    document.getElementById('statSiswa').textContent = totalSiswa;
    document.getElementById('statPresensi').textContent = '0%';
    document.getElementById('statSoal').textContent = '0';
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadKelasList() {
  const tbody = document.getElementById('kelasTableBody');
  if (!tbody || !currentUser) return;

  try {
    const snapshot = await db.collection('kelas').where('wali_kelas_uid', '==', currentUser.uid).where('archived', '==', false).get();

    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Belum ada kelas. Klik "+ Tambah Kelas" untuk memulai.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    for (const docSnap of snapshot.docs) {
      const kelas = { id: docSnap.id, ...docSnap.data() };
      const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelas.id).get();
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600;">${kelas.nama}</td>
        <td>${kelas.tahun_ajaran}</td>
        <td><span class="badge badge-green">👥 ${siswaSnap.size} Siswa</span></td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="bukaKelolaSiswa('${kelas.id}', '${kelas.nama}')">👥 Kelola Siswa</button>
          <button class="btn btn-danger btn-sm" onclick="hapusKelas('${kelas.id}', '${kelas.nama}')" style="margin-left: 0.5rem;">🗑 Hapus</button>
        </td>`;
      tbody.appendChild(tr);
    }
  } catch (error) {
    console.error('Error loading kelas:', error);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Gagal memuat data</td></tr>';
  }
}

async function tambahKelas() {
  const nama = document.getElementById('inputNamaKelas').value.trim();
  const tahun = document.getElementById('inputTahunAjaran').value.trim();
  const semester = document.getElementById('inputSemester').value;

  if (!nama || !tahun) {
    showToast('Nama kelas dan tahun ajaran wajib diisi!', 'error');
    return;
  }

  try {
    await db.collection('kelas').add({
      nama: nama,
      tingkat: extractTingkat(nama),
      tahun_ajaran: tahun,
      semester: semester,
      wali_kelas_uid: currentUser.uid,
      wali_kelas_email: currentUser.email,
      archived: false,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    showToast(`Kelas "${nama}" berhasil ditambahkan!`, 'success');
    closeModal('modalTambahKelas');
    loadKelasList();
    loadStats();
    document.getElementById('inputNamaKelas').value = '';
  } catch (error) {
    showToast('Gagal menyimpan: ' + error.message, 'error');
  }
}

async function hapusKelas(kelasId, className) {
  if (!confirm(`Arsipkan kelas "${className}"? Data siswa dan nilai tidak akan hilang.`)) return;
  try {
    await db.collection('kelas').doc(kelasId).update({
      archived: true,
      archived_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast(`Kelas "${className}" berhasil diarsipkan!`, 'success');
    loadKelasList();
    loadStats();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'error');
  }
}

async function bukaKelolaSiswa(kelasId, className) {
  currentKelasId = kelasId;
  currentKelasNama = className;
  document.getElementById('titleKelolaSiswa').textContent = `👥 Kelola Siswa — ${className}`;
  openModal('modalKelolaSiswa');
  await loadDaftarSiswa();
}

async function loadDaftarSiswa() {
  const container = document.getElementById('daftarSiswaModal');
  container.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div> Memuat data...</div>';

  try {
    // 1. Ambil siswa yang sudah ada di kelas ini
    const siswaQuery = await db.collection('siswa')
      .where('kelas_id', '==', currentKelasId)
      .get();
    
    const siswaDiKelas = [];
    const nisSudahAda = new Set();
    const namaSudahAda = new Set();

    siswaQuery.forEach(doc => {
      const s = { id: doc.id, ...doc.data() };
      siswaDiKelas.push(s);
      if (s.nis) nisSudahAda.add(s.nis.toLowerCase().trim());
      if (s.student_name) namaSudahAda.add(s.student_name.toLowerCase().trim());
    });

    // 2. ✅ PERBAIKAN: Ambil dari SICAN HANYA yang kelasnya sesuai
    const sicanQuery = await db.collection('sican_siswa')
      .where('kelas', '==', currentKelasNama)  // Filter berdasarkan kelas yang dipilih
      .get();
    
    const sicanSiswa = [];

    sicanQuery.forEach(doc => {
      const data = doc.data();
      const nisLower = (data.nis || '').toLowerCase().trim();
      const namaLower = (data.nama || '').toLowerCase().trim();
      
      // Hanya tampilkan yang belum ada di kelas
      if (!nisSudahAda.has(nisLower) && !namaSudahAda.has(namaLower)) {
        sicanSiswa.push({ id: doc.id, ...data, source: 'sican' });
      }
    });

    // Update counters
    document.getElementById('totalSiswaKelas').textContent = siswaDiKelas.length;
    document.getElementById('totalSiswaSICAN').textContent = sicanSiswa.length;

    // Render
    if (siswaDiKelas.length === 0 && sicanSiswa.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Belum ada siswa di kelas ini.</div>';
      return;
    }

    let html = '<table><thead><tr><th width="50">Foto</th><th>Nama</th><th width="150">Aksi</th></tr></thead><tbody>';

    // Siswa di kelas
    if (siswaDiKelas.length > 0) {
      html += `<tr style="background: #fef3c7;"><td colspan="3" style="padding: 8px; font-weight: 600; color: #92400e;">✅ Siswa di Kelas (${siswaDiKelas.length})</td></tr>`;
      siswaDiKelas.forEach((s, i) => {
        const foto = s.student_photo 
          ? `<img src="${s.student_photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` 
          : '<div style="width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">👤</div>';
        
        html += `
          <tr>
            <td>${foto}</td>
            <td style="font-weight: 600;">${i + 1}. ${s.student_name}</td>
            <td>
              <button class="btn btn-danger btn-sm" onclick="hapusSiswa('${s.id}', '${s.student_name.replace(/'/g, "\\'")}')">🗑 Hapus</button>
            </td>
          </tr>
        `;
      });
    }

    // Siswa dari SICAN (yang kelasnya sesuai)
    if (sicanSiswa.length > 0) {
      html += `<tr style="background: #dcfce7;"><td colspan="3" style="padding: 8px; font-weight: 600; color: #166534;">📥 Dari SICAN - Kelas ${currentKelasNama} (${sicanSiswa.length})</td></tr>`;
      sicanSiswa.forEach((s, i) => {
        const foto = s.foto 
          ? `<img src="${s.foto}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` 
          : '<div style="width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">👤</div>';
        
        html += `
          <tr>
            <td>${foto}</td>
            <td style="font-weight: 600;">${s.nama} <span class="badge badge-blue" style="font-size: 0.65rem;">SICAN</span></td>
            <td>
              <button class="btn btn-success btn-sm" onclick="tambahSiswaDariSICAN('${s.id}', '${s.nama.replace(/'/g, "\\'")}', '${s.nis || ''}', '${s.foto || ''}')">+ Tambah</button>
            </td>
          </tr>
        `;
      });
    }

    html += '</tbody></table>';
    container.innerHTML = html;

  } catch (error) {
    console.error(error);
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: red;">Gagal memuat data: ' + error.message + '</div>';
  }
}

async function tambahkanSemuaSiswa() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Memproses...';

  try {
    // 1. Ambil siswa yang sudah ada di kelas ini
    const siswaQuery = await db.collection('siswa')
      .where('kelas_id', '==', currentKelasId)
      .get();
    
    const nisSudahAda = new Set();
    const namaSudahAda = new Set();

    siswaQuery.forEach(doc => {
      const s = doc.data();
      if (s.nis) nisSudahAda.add(s.nis.toLowerCase().trim());
      if (s.student_name) namaSudahAda.add(s.student_name.toLowerCase().trim());
    });

    // 2. ✅ PERBAIKAN: Ambil dari SICAN HANYA yang kelasnya sesuai
    const sicanQuery = await db.collection('sican_siswa')
      .where('kelas', '==', currentKelasNama)  // Filter berdasarkan kelas
      .get();
    
    const batch = db.batch();
    let count = 0;
    let skippedCount = 0;

    sicanQuery.forEach(doc => {
      const s = doc.data();
      const nisLower = (s.nis || '').toLowerCase().trim();
      const namaLower = (s.nama || '').toLowerCase().trim();
      
      // Hanya tambahkan yang belum ada
      if (!nisSudahAda.has(nisLower) && !namaSudahAda.has(namaLower)) {
        const newRef = db.collection('siswa').doc();
        batch.set(newRef, {
          kelas_id: currentKelasId,
          student_name: s.nama,
          nis: s.nis || '',
          student_photo: s.foto || '',
          sumber: 'sican',
          created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        count++;
      } else {
        skippedCount++;
      }
    });

    if (count > 0) {
      await batch.commit();
      showToast(`✅ Berhasil menambahkan ${count} siswa ke kelas ${currentKelasNama}!`, 'success');
      await loadDaftarSiswa();
    } else {
      showToast(`⚠️ Tidak ada siswa baru untuk ditambahkan. ${skippedCount > 0 ? `(${skippedCount} siswa sudah ada)` : ''}`, 'warning');
    }

  } catch (error) {
    showToast('❌ Gagal: ' + error.message, 'error');
    console.error(error);
  }

  btn.disabled = false;
  btn.innerHTML = '➕ Tambahkan Semua';
}

async function tambahSiswaDariSICAN(sicanId, nama, nis, foto) {
  try {
    await db.collection('siswa').add({
      kelas_id: currentKelasId,
      student_name: nama,
      nis: nis,
      student_photo: foto || '',
      sumber: 'sican',
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast(`Siswa "${nama}" berhasil ditambahkan!`, 'success');
    await loadDaftarSiswa();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'error');
  }
}

async function tambahSiswaManual() {
  const nama = document.getElementById('inputNamaSiswaManual').value.trim();

  if (!nama) {
    showToast('Nama siswa wajib diisi!', 'error');
    return;
  }

  try {
    await db.collection('siswa').add({
      kelas_id: currentKelasId,
      student_name: nama,
      nis: '',
      student_photo: fotoSiswaBase64 || '', // Gunakan base64
      sumber: 'manual',
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    showToast(`Siswa "${nama}" berhasil ditambahkan!`, 'success');
    
    // Reset form
    document.getElementById('inputNamaSiswaManual').value = '';
    hapusFotoPreview();
    
    await loadDaftarSiswa();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'error');
  }
}

async function hapusSiswa(siswaId, nama) {
  if (!confirm(`Hapus siswa "${nama}" dari kelas ini?`)) return;
  try {
    await db.collection('siswa').doc(siswaId).delete();
    showToast(`Siswa "${nama}" dihapus.`, 'success');
    await loadDaftarSiswa();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'error');
  }
}

function extractTingkat(nama) {
  const upper = nama.toUpperCase();
  if (upper.includes('XII') || upper.includes('12')) return 'XII';
  if (upper.includes('XI') || upper.includes('11')) return 'XI';
  if (upper.includes('X') || upper.includes('10')) return 'X';
  return 'Lainnya';
}

// ══════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════
window.addEventListener('load', initSession);
