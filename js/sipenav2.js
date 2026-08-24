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
let fotoSiswaBase64 = '';

// ══════════════════════════════════════════════
// HANDLE UPLOAD FOTO
// ══════════════════════════════════════════════
function handleFotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > 2 * 1024 * 1024) {
    showToast('❌ Ukuran foto maksimal 2MB!', 'error');
    return;
  }
  if (!file.type.startsWith('image/')) {
    showToast('❌ File harus berupa gambar!', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    fotoSiswaBase64 = e.target.result;
    document.getElementById('fotoPreview').src = fotoSiswaBase64;
    document.getElementById('fotoPreviewContainer').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function hapusFotoPreview() {
  fotoSiswaBase64 = '';
  document.getElementById('inputFotoSiswaFile').value = '';
  document.getElementById('fotoPreviewContainer').style.display = 'none';
  document.getElementById('fotoPreview').src = '';
}

// ══════════════════════════════════════════════
// SEAMLESS LOGIN & SAPAAN
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
  setTimeout(() => { window.location.href = '../home.html'; }, 1500);
}

// ═════════════════════════════════════════════
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

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    loadPage(item.dataset.page);
  });
});

// ══════════════════════════════════════════════
// PAGE RENDERING
// ═════════════════════════════════════════════
function loadPage(page) {
  const content = document.getElementById('pageContent');
  switch(page) {
    case 'dashboard': content.innerHTML = renderDashboard(); loadStats(); break;
    case 'kelas': content.innerHTML = renderKelas(); loadKelasList(); break;
    case 'presensi': content.innerHTML = renderPresensi(); initPresensiPage(); break;
    case 'penilaian': content.innerHTML = renderPenilaian(); break;
    case 'bank-soal': content.innerHTML = renderBankSoal(); break;
    case 'rekap': content.innerHTML = renderRekap(); break;
  }
}

function renderDashboard() {
  return `<div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
    <h3 style="margin-bottom: 1rem;">📊 Ringkasan Sistem</h3>
    <p>Selamat datang di SIPENA 2.0! Sistem terintegrasi dengan database SICAN.</p>
    <div style="margin-top: 1.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
      <div style="padding: 1rem; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
        <strong style="color: #166534;">✅ Firestore Database</strong>
        <p style="font-size: 0.875rem; color: #64748b; margin-top: 0.25rem;">Lebih aman dan scalable</p>
      </div>
      <div style="padding: 1rem; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <strong style="color: #1e40af;">🔄 Integrasi SICAN</strong>
        <p style="font-size: 0.875rem; color: #64748b; margin-top: 0.25rem;">Sinkronisasi data siswa otomatis</p>
      </div>
    </div>
  </div>`;
}

function renderKelas() {
  return `<div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
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
  return `
    <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 700;">✅ Presensi Digital</h3>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <select id="presensiKelasSelect" class="form-control" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem;">
            <option value="">-- Pilih Kelas --</option>
          </select>
          <input type="date" id="presensiTanggal" class="form-control" style="padding: 0.5rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem;">
        </div>
      </div>

      <div id="presensiActionArea" style="display: none; margin-bottom: 1.5rem; padding: 1rem; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="font-weight: 600; color: #166534;">
             Presensi untuk: <span id="presensiInfoKelas" style="font-weight: 800;"></span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="hadirSemua()"><i class="fas fa-check-double"></i> Hadir Semua</button>
            <button class="btn btn-primary btn-sm" onclick="simpanPresensi()" id="btnSimpanPresensi"><i class="fas fa-save"></i> Simpan Presensi</button>
          </div>
        </div>
      </div>

      <div class="table-container">
        <table id="tabelPresensi" style="width: 100%;">
          <thead>
            <tr>
              <th width="50">No</th>
              <th width="60">Foto</th>
              <th>Nama Siswa</th>
              <th width="300">Status Kehadiran</th>
            </tr>
          </thead>
          <tbody id="bodyPresensi">
            <tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Silakan pilih kelas dan tanggal terlebih dahulu.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPenilaian() { return `<div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);"><h3>⭐ Penilaian</h3><p style="color: var(--text-secondary);">Sedang dalam pengembangan.</p></div>`; }
function renderBankSoal() { return `<div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);"><h3>📚 Bank Soal</h3><p style="color: var(--text-secondary);">Sedang dalam pengembangan.</p></div>`; }
function renderRekap() { return `<div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius); box-shadow: var(--shadow);"><h3>📊 Rekap & Laporan</h3><p style="color: var(--text-secondary);">Sedang dalam pengembangan.</p></div>`; }

// ══════════════════════════════════════════════
// DATA OPERATIONS
// ══════════════════════════════════════════════
async function loadStats() {
  if (!currentUser) return;
  try {
    // Query kelas yang diajar guru ini
    const kelasSnap = await db.collection('kelas')
      .where('pengajar_uids', 'array-contains', currentUser.uid)
      .where('archived', '==', false)
      .get();
    
    document.getElementById('statKelas').textContent = kelasSnap.size;

    const kelasIds = kelasSnap.docs.map(doc => doc.id);
    let totalSiswa = 0;
    
    // Ambil semua siswa dan filter di client
    const semuaSiswaSnap = await db.collection('siswa').get();
    semuaSiswaSnap.forEach(doc => {
      if (kelasIds.includes(doc.data().kelas_id)) {
        totalSiswa++;
      }
    });
    
    document.getElementById('statSiswa').textContent = totalSiswa;
    document.getElementById('statPresensi').textContent = '0%';
    document.getElementById('statSoal').textContent = '0';
  } catch (error) {
    console.error('Error loading stats:', error);
    // Fallback: tampilkan 0 jika error
    document.getElementById('statKelas').textContent = '0';
    document.getElementById('statSiswa').textContent = '0';
  }
}

async function loadKelasList() {
  const tbody = document.getElementById('kelasTableBody');
  if (!tbody || !currentUser) return;

  try {
    const snapshot = await db.collection('kelas')
      .where('pengajar_uids', 'array-contains', currentUser.uid)
      .where('archived', '==', false)
      .get();

    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Belum ada kelas. Klik "+ Tambah Kelas" untuk memulai.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    const semuaSiswaSnap = await db.collection('siswa').get();
    
    for (const docSnap of snapshot.docs) {
      const kelas = { id: docSnap.id, ...docSnap.data() };
      
      let siswaCount = 0;
      semuaSiswaSnap.forEach(doc => {
        if (doc.data().kelas_id === kelas.id) siswaCount++;
      });
      
      const mapelGuru = kelas.pengajar?.[currentUser.uid]?.mapel || '-';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600;">${kelas.nama}</td>
        <td>${kelas.tahun_ajaran}</td>
        <td>
          <span class="badge badge-green">👥 ${siswaCount} Siswa</span><br>
          <small style="color: var(--text-secondary);">📚 ${mapelGuru}</small>
        </td>
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
  const mapel = document.getElementById('inputMapel').value.trim();

  if (!nama || !tahun || !mapel) {
    showToast('Nama kelas, tahun ajaran, dan mapel wajib diisi!', 'error');
    return;
  }

  try {
    await db.collection('kelas').add({
      nama: nama,
      tingkat: extractTingkat(nama),
      tahun_ajaran: tahun,
      semester: semester,
      archived: false,
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      pengajar_uids: [currentUser.uid],
      pengajar: {
        [currentUser.uid]: {
          nama: currentUserData.nama || currentUser.email,
          email: currentUser.email,
          mapel: mapel
        }
      }
    });

    showToast(`Kelas "${nama}" berhasil ditambahkan!`, 'success');
    closeModal('modalTambahKelas');
    loadKelasList();
    loadStats();
    document.getElementById('inputNamaKelas').value = '';
    document.getElementById('inputMapel').value = '';
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
    const siswaQuery = await db.collection('siswa').where('kelas_id', '==', currentKelasId).get();
    const siswaDiKelas = [];
    const nisSudahAda = new Set();
    const namaSudahAda = new Set();

    siswaQuery.forEach(doc => {
      const s = { id: doc.id, ...doc.data() };
      siswaDiKelas.push(s);
      if (s.nis) nisSudahAda.add(s.nis.toLowerCase().trim());
      if (s.student_name) namaSudahAda.add(s.student_name.toLowerCase().trim());
    });

    const sicanQuery = await db.collection('sican_siswa').where('kelas', '==', currentKelasNama).get();
    const sicanSiswa = [];

    sicanQuery.forEach(doc => {
      const data = doc.data();
      const nisLower = (data.nis || '').toLowerCase().trim();
      const namaLower = (data.nama || '').toLowerCase().trim();
      if (!nisSudahAda.has(nisLower) && !namaSudahAda.has(namaLower)) {
        sicanSiswa.push({ id: doc.id, ...data, source: 'sican' });
      }
    });

    document.getElementById('totalSiswaKelas').textContent = siswaDiKelas.length;
    document.getElementById('totalSiswaSICAN').textContent = sicanSiswa.length;

    if (siswaDiKelas.length === 0 && sicanSiswa.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Belum ada siswa di kelas ini.</div>';
      return;
    }

    let html = '<table><thead><tr><th width="50">Foto</th><th>Nama</th><th width="150">Aksi</th></tr></thead><tbody>';

    if (siswaDiKelas.length > 0) {
      html += `<tr style="background: #fef3c7;"><td colspan="3" style="padding: 8px; font-weight: 600; color: #92400e;">✅ Siswa di Kelas (${siswaDiKelas.length})</td></tr>`;
      siswaDiKelas.forEach((s, i) => {
        const foto = s.student_photo ? `<img src="${s.student_photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` : '<div style="width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">👤</div>';
        html += `<tr><td>${foto}</td><td style="font-weight: 600;">${i + 1}. ${s.student_name}</td><td><button class="btn btn-danger btn-sm" onclick="hapusSiswa('${s.id}', '${s.student_name.replace(/'/g, "\\'")}')">🗑 Hapus</button></td></tr>`;
      });
    }

    if (sicanSiswa.length > 0) {
      html += `<tr style="background: #dcfce7;"><td colspan="3" style="padding: 8px; font-weight: 600; color: #166534;">📥 Dari SICAN - Kelas ${currentKelasNama} (${sicanSiswa.length})</td></tr>`;
      sicanSiswa.forEach((s, i) => {
        const foto = s.foto ? `<img src="${s.foto}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` : '<div style="width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">👤</div>';
        html += `<tr><td>${foto}</td><td style="font-weight: 600;">${s.nama} <span class="badge badge-blue" style="font-size: 0.65rem;">SICAN</span></td><td><button class="btn btn-success btn-sm" onclick="tambahSiswaDariSICAN('${s.id}', '${s.nama.replace(/'/g, "\\'")}', '${s.nis || ''}', '${s.foto || ''}')">+ Tambah</button></td></tr>`;
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
    const siswaQuery = await db.collection('siswa').where('kelas_id', '==', currentKelasId).get();
    const nisSudahAda = new Set();
    const namaSudahAda = new Set();

    siswaQuery.forEach(doc => {
      const s = doc.data();
      if (s.nis) nisSudahAda.add(s.nis.toLowerCase().trim());
      if (s.student_name) namaSudahAda.add(s.student_name.toLowerCase().trim());
    });

    const sicanQuery = await db.collection('sican_siswa').where('kelas', '==', currentKelasNama).get();
    const batch = db.batch();
    let count = 0;

    sicanQuery.forEach(doc => {
      const s = doc.data();
      const nisLower = (s.nis || '').toLowerCase().trim();
      const namaLower = (s.nama || '').toLowerCase().trim();
      
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
      }
    });

    if (count > 0) {
      await batch.commit();
      showToast(`✅ Berhasil menambahkan ${count} siswa ke kelas ${currentKelasNama}!`, 'success');
      await loadDaftarSiswa();
      await loadStats();
      await loadKelasList();
    } else {
      showToast('⚠️ Tidak ada siswa baru untuk ditambahkan.', 'warning');
    }
  } catch (error) {
    showToast(' Gagal: ' + error.message, 'error');
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
    await loadStats();
    await loadKelasList();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'error');
  }
}

async function tambahSiswaManual() {
  const nama = document.getElementById('inputNamaSiswaManual').value.trim();
  if (!nama) { showToast('Nama siswa wajib diisi!', 'error'); return; }

  try {
    await db.collection('siswa').add({
      kelas_id: currentKelasId,
      student_name: nama,
      nis: '',
      student_photo: fotoSiswaBase64 || '',
      sumber: 'manual',
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast(`Siswa "${nama}" berhasil ditambahkan!`, 'success');
    document.getElementById('inputNamaSiswaManual').value = '';
    hapusFotoPreview();
    await loadDaftarSiswa();
    await loadStats();
    await loadKelasList();
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
    await loadStats();
    await loadKelasList();
  } catch (error) {
    showToast('Gagal: ' + error.message, 'error');
  }
}

// ══════════════════════════════════════════════
// LOGIKA PRESENSI DIGITAL
// ══════════════════════════════════════════════
let currentPresensiData = {};
let currentSiswaList = [];

// Fungsi untuk mengisi dropdown kelas di halaman presensi
async function initPresensiPage() {
  if (!currentUser) return;
  
  const select = document.getElementById('presensiKelasSelect');
  const tanggalInput = document.getElementById('presensiTanggal');
  
  if (!select || !tanggalInput) return;
  
  // Set tanggal hari ini
  tanggalInput.valueAsDate = new Date();
  
  try {
    // Query kelas yang diajar guru ini (TANPA orderBy untuk hindari index)
    const kelasSnap = await db.collection('kelas')
      .where('pengajar_uids', 'array-contains', currentUser.uid)
      .where('archived', '==', false)
      .get();
    
    select.innerHTML = '<option value="">-- Pilih Kelas --</option>';
    
    if (kelasSnap.empty) {
      console.log('Tidak ada kelas untuk user ini');
      return;
    }
    
    // Ambil data dan sort di client-side
    const kelasList = [];
    kelasSnap.forEach(doc => {
      kelasList.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort berdasarkan nama
    kelasList.sort((a, b) => a.nama.localeCompare(b.nama));
    
    // Isi dropdown
    kelasList.forEach(kelas => {
      const mapel = kelas.pengajar?.[currentUser.uid]?.mapel || '';
      const option = document.createElement('option');
      option.value = kelas.id;
      option.textContent = `${kelas.nama} (${mapel})`;
      option.dataset.nama = kelas.nama;
      option.dataset.mapel = mapel;
      select.appendChild(option);
    });
    
  } catch (error) {
    console.error('Error initPresensiPage:', error);
  }

  // Event listener
  select.addEventListener('change', loadPresensiSiswa);
  tanggalInput.addEventListener('change', loadPresensiSiswa);
}

// Muat data siswa dan presensi yang sudah ada
async function loadPresensiSiswa() {
  const kelasId = document.getElementById('presensiKelasSelect').value;
  const tanggal = document.getElementById('presensiTanggal').value;
  const actionArea = document.getElementById('presensiActionArea');
  const tbody = document.getElementById('bodyPresensi');

  if (!kelasId || !tanggal) {
    actionArea.style.display = 'none';
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Silakan pilih kelas dan tanggal terlebih dahulu.</td></tr>';
    return;
  }

  tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;"><div class="spinner"></div> Memuat data...</td></tr>';
  actionArea.style.display = 'block';
  
  const kelasNama = document.getElementById('presensiKelasSelect').options[document.getElementById('presensiKelasSelect').selectedIndex].dataset.nama;
  document.getElementById('presensiInfoKelas').textContent = `${kelasNama} (${tanggal})`;

  try {
    // 1. Ambil daftar siswa di kelas ini
    const siswaSnap = await db.collection('siswa').where('kelas_id', '==', kelasId).get();
    const siswaList = [];
    siswaSnap.forEach(doc => siswaList.push({ id: doc.id, ...doc.data() }));
    
    // Urutkan berdasarkan nama
    siswaList.sort((a, b) => a.student_name.localeCompare(b.student_name));
    currentSiswaList = siswaList;

    // 2. Cek apakah sudah ada data presensi untuk tanggal ini
    const presensiSnap = await db.collection('presensi')
      .where('kelas_id', '==', kelasId)
      .where('tanggal', '==', tanggal)
      .get();
    
    currentPresensiData = {};
    if (!presensiSnap.empty) {
      currentPresensiData = presensiSnap.docs[0].data().records || {};
    }

    // 3. Render tabel
    if (siswaList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Tidak ada siswa di kelas ini.</td></tr>';
      return;
    }

    let html = '';
    siswaList.forEach((s, index) => {
      const status = currentPresensiData[s.id] || '';
      const foto = s.student_photo 
        ? `<img src="${s.student_photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` 
        : '<div style="width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">👤</div>';
      
      html += `
        <tr class="presensi-row">
          <td style="text-align: center;">${index + 1}</td>
          <td style="text-align: center;">${foto}</td>
          <td style="font-weight: 600;">${s.student_name}</td>
          <td>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="status-btn ${status === 'H' ? 'active-h' : ''}" onclick="setPresensiStatus('${s.id}', 'H')">H</button>
              <button class="status-btn ${status === 'I' ? 'active-i' : ''}" onclick="setPresensiStatus('${s.id}', 'I')">I</button>
              <button class="status-btn ${status === 'S' ? 'active-s' : ''}" onclick="setPresensiStatus('${s.id}', 'S')">S</button>
              <button class="status-btn ${status === 'A' ? 'active-a' : ''}" onclick="setPresensiStatus('${s.id}', 'A')">A</button>
              <button class="status-btn ${status === 'B' ? 'active-b' : ''}" onclick="setPresensiStatus('${s.id}', 'B')">B</button>
            </div>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;

  } catch (error) {
    console.error('Error load presensi:', error);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: red;">Gagal memuat data: ${error.message}</td></tr>`;
  }
}

// Ubah status siswa
function setPresensiStatus(siswaId, status) {
  if (currentPresensiData[siswaId] === status) {
    delete currentPresensiData[siswaId];
  } else {
    currentPresensiData[siswaId] = status;
  }
  loadPresensiSiswa();
}

// Hadir Semua
function hadirSemua() {
  if (currentSiswaList.length === 0) {
    showToast('Tidak ada siswa untuk ditandai!', 'warning');
    return;
  }
  
  currentSiswaList.forEach(siswa => {
    currentPresensiData[siswa.id] = 'H';
  });
  
  loadPresensiSiswa();
  showToast('✅ Semua siswa ditandai Hadir', 'success');
}

// Simpan ke Firestore
async function simpanPresensi() {
  const kelasId = document.getElementById('presensiKelasSelect').value;
  const tanggal = document.getElementById('presensiTanggal').value;
  const kelasNama = document.getElementById('presensiKelasSelect').options[document.getElementById('presensiKelasSelect').selectedIndex].dataset.nama;
  const btn = document.getElementById('btnSimpanPresensi');

  if (!kelasId || !tanggal) {
    showToast('Pilih kelas dan tanggal terlebih dahulu!', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

  try {
    const presensiData = {
      kelas_id: kelasId,
      kelas_nama: kelasNama,
      tanggal: tanggal,
      guru_uid: currentUser.uid,
      guru_nama: currentUser.displayName || currentUser.email,
      records: currentPresensiData,
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    };

    const existingSnap = await db.collection('presensi')
      .where('kelas_id', '==', kelasId)
      .where('tanggal', '==', tanggal)
      .get();

    if (!existingSnap.empty) {
      const docId = existingSnap.docs[0].id;
      await db.collection('presensi').doc(docId).update(presensiData);
      showToast('✅ Data presensi berhasil diperbarui!', 'success');
    } else {
      presensiData.created_at = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('presensi').add(presensiData);
      showToast('✅ Data presensi berhasil disimpan!', 'success');
    }
  } catch (error) {
    console.error('Error simpan presensi:', error);
    showToast('❌ Gagal menyimpan: ' + error.message, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save"></i> Simpan Presensi';
}

function extractTingkat(nama) {
  const upper = nama.toUpperCase();
  if (upper.includes('XII') || upper.includes('12')) return 'XII';
  if (upper.includes('XI') || upper.includes('11')) return 'XI';
  if (upper.includes('X') || upper.includes('10')) return 'X';
  return 'Lainnya';
}

// Init
window.addEventListener('load', initSession);