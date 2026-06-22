// ══════════════════════════════════════════════
//            FIREBASE CONFIG
// ══════════════════════════════════════════════
const firebaseConfig = {
  apiKey:"AIzaSyB24GCKSTPGlN9HG9E6uhCECVa4ibCpKEA",
  authDomain:"sipelita-digital.firebaseapp.com",
  databaseURL:"https://sipelita-digital-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:"sipelita-digital",
  storageBucket:"sipelita-digital.firebasestorage.app",
  messagingSenderId:"787840817745",
  appId:"1:787840817745:web:e6b5237cfbb5e51be93670"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ══════════════════════════════════════════════
//            GLOBAL VARIABLES
// ══════════════════════════════════════════════
let currentUser = null;
let currentSupervision = null;
let selectedScheduleId = null;
let currentInstrument = null;
let editingInstrumentId = null;
let componentCounter = 0;

// Folder variables
let editingFolderId = null;
let userFolders = [];
let currentFolderId = null; // null = root level

// ══════════════════════════════════════════════
//   🔐 INTEGRASI SESSION SIPELITA
// ══════════════════════════════════════════════
function showLoading() {
  document.getElementById('loadingPage').style.display = 'block';
  document.getElementById('accessDeniedPage').style.display = 'none';
  document.getElementById('dashboardPage').style.display = 'none';
}

function showAccessDenied(message) {
  document.getElementById('loadingPage').style.display = 'none';
  document.getElementById('accessDeniedPage').style.display = 'block';
  document.getElementById('dashboardPage').style.display = 'none';
  document.getElementById('accessDeniedMessage').innerHTML = message;
}

async function checkSipelitaSession() {
  let sipelitaUser = sessionStorage.getItem('sipelita_user');
  if (!sipelitaUser) sipelitaUser = localStorage.getItem('sipelita_user');
  
  if (!sipelitaUser) {
    showAccessDenied(`<strong>⛔ Session SIPELITA tidak ditemukan!</strong><br><br>Anda belum login ke portal SIPELITA.`);
    return false;
  }
  
  let userData;
  try { userData = JSON.parse(sipelitaUser); } 
  catch(e) { showAccessDenied('<strong>⚠️ Session SIPELITA tidak valid!</strong>'); return false; }
  
  if (!userData.email || !userData.nama) {
    showAccessDenied('<strong>⚠️ Data user tidak lengkap!</strong>');
    return false;
  }
  
  try {
    const userDoc = await db.collection('users').doc(userData.email).get();
    if (!userDoc.exists) {
      showAccessDenied(`<strong>⚠️ Akun tidak ditemukan!</strong><br>Email: ${userData.email}`);
      return false;
    }
    const firestoreData = userDoc.data();
    currentUser = {
      uid: userData.uid || userDoc.id,
      email: firestoreData.email || userData.email,
      nama: firestoreData.nama || userData.nama,
      role: firestoreData.role || userData.role || 'guru',
      fitur: firestoreData.fitur || userData.fitur
    };
  } catch(e) {
    currentUser = {
      uid: userData.uid || userData.email,
      email: userData.email,
      nama: userData.nama,
      role: userData.role || 'guru',
      fitur: userData.fitur
    };
  }
  
  if (!currentUser.fitur || !Array.isArray(currentUser.fitur) || !currentUser.fitur.includes('supervisi')) {
    showAccessDenied(`<strong>⛔ Akun Anda tidak memiliki akses ke fitur Supervisi!</strong><br><br>Login sebagai: <strong>${currentUser.nama}</strong> (${currentUser.email})`);
    return false;
  }
  
  sessionStorage.setItem('sipelita_user', JSON.stringify(currentUser));
  localStorage.setItem('sipelita_user', JSON.stringify(currentUser));
  return true;
}

// ══════════════════════════════════════════════
//            TABS
// ══════════════════════════════════════════════
window.switchTab = function(tabId) {
  const parent = document.getElementById(tabId).closest('.card');
  parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById(tabId).classList.add('active');
  
  if (tabId === 'tabJadwal') loadScheduleList();
  if (tabId === 'tabBuatJadwal') loadAvailableTeachers();
  if (tabId === 'tabSupervisi') { loadPendingSchedules(); loadInstruments(); }
  if (tabId === 'tabRiwayat') loadSupervisionList();
  if (tabId === 'tabJadwalSaya') loadMySchedule();
  if (tabId === 'tabUpload') { currentFolderId = null; loadFolderContents(); }
  if (tabId === 'tabHasil') loadMySupervisionList();
  if (tabId === 'tabKelolaInstrumen') loadInstrumentsList();
};

// ══════════════════════════════════════════════
//            DASHBOARD
// ══════════════════════════════════════════════
function showDashboard(){
  document.getElementById('loadingPage').style.display = 'none';
  document.getElementById('accessDeniedPage').style.display = 'none';
  document.getElementById('dashboardPage').style.display = 'block';
  document.getElementById('userNameDisplay').textContent = currentUser.nama;
  document.getElementById('userRoleDisplay').textContent = getRoleLabel(currentUser.role);
  
  if (currentUser.role === 'admin') {
    document.getElementById('adminBadge').style.display = 'block';
    document.getElementById('tabInstruments').style.display = 'block';
  }
  
  if (currentUser.role === 'kepala') {
    document.getElementById('supervisorTabs').style.display = 'block';
    document.getElementById('teacherTabs').style.display = 'none';
    loadScheduleList();
  }
  else if (currentUser.role === 'wakil') {
    document.getElementById('supervisorTabs').style.display = 'block';
    document.getElementById('teacherTabs').style.display = 'block';
    loadScheduleList();
    loadMySchedule();
    currentFolderId = null;
    loadFolderContents();
    loadMySupervisionList();
  }
  else {
    document.getElementById('supervisorTabs').style.display = 'none';
    document.getElementById('teacherTabs').style.display = 'block';
    loadMySchedule();
    currentFolderId = null;
    loadFolderContents();
    loadMySupervisionList();
  }
}

function getRoleLabel(role){
  return {kepala:'👑 Kepala Madrasah', wakil:'⭐ Wakil Kepala Madrasah', guru:'👨‍🏫 Guru', admin:'👑 Administrator'}[role] || role;
}

window.doLogout = function(){
  if(confirm('Apakah Anda yakin ingin keluar?')){
    sessionStorage.removeItem('supervisi_user');
    currentUser = null;
    window.location.href = '../index.html';
  }
};

// ══════════════════════════════════════════════
//   📅 JADWAL SUPERVISI (SUPERVISOR)
// ══════════════════════════════════════════════
async function loadAvailableTeachers() {
  const select = document.getElementById('scheduleTeacher');
  select.innerHTML = '<option value="">-- Memuat data... --</option>';
  try {
    let roleFilter = ['guru'];
    if (currentUser.role === 'kepala') roleFilter = ['guru', 'wakil'];
    
    const allUsersSnap = await db.collection('users').get();
    const allUsers = allUsersSnap.docs.map(d => ({id: d.id, ...d.data()}));
    const eligibleUsers = allUsers.filter(u => roleFilter.includes(u.role));
    
    const schedulesSnap = await db.collection('supervision_schedule')
      .where('status', 'in', ['scheduled', 'in-progress']).get();
    const scheduledTeacherIds = schedulesSnap.docs.map(d => d.data().teacherId);
    const availableUsers = eligibleUsers.filter(u => !scheduledTeacherIds.includes(u.id));
    
    if (availableUsers.length === 0) {
      select.innerHTML = '<option value="">-- Tidak ada yang tersedia --</option>';
      return;
    }
    
    select.innerHTML = '<option value="">-- Pilih --</option>';
    availableUsers.forEach(u => {
      const roleLabel = u.role === 'wakil' ? '⭐ Wakil Kepala' : '👨‍🏫 Guru';
      select.innerHTML += `<option value="${u.id}" data-nama="${u.nama}" data-email="${u.email}">${u.nama} (${roleLabel})</option>`;
    });
  } catch(e) {
    select.innerHTML = '<option value="">-- Error --</option>';
  }
}

window.createSchedule = async function() {
  const teacherSelect = document.getElementById('scheduleTeacher');
  const teacherId = teacherSelect.value;
  const teacherName = teacherSelect.options[teacherSelect.selectedIndex]?.dataset.nama;
  const teacherEmail = teacherSelect.options[teacherSelect.selectedIndex]?.dataset.email;
  const scheduledDate = document.getElementById('scheduleDate').value;
  const notes = document.getElementById('scheduleNotes').value.trim();
  const alert = document.getElementById('alertSchedule');
  const btn = document.getElementById('btnCreateSchedule');
  
  alert.classList.remove('show');
  
  if (!teacherId || !scheduledDate) {
    alert.textContent = '❌ Pilih guru/wakil dan tanggal supervisi!';
    alert.className = 'alert alert-error show';
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  
  try {
    const teacherDoc = await db.collection('users').doc(teacherEmail).get();
    const teacherRole = teacherDoc.exists ? teacherDoc.data().role : 'guru';
    
    await db.collection('supervision_schedule').add({
      supervisorId: currentUser.uid,
      supervisorName: currentUser.nama,
      supervisorEmail: currentUser.email,
      supervisorRole: currentUser.role,
      teacherId: teacherId,
      teacherName: teacherName,
      teacherEmail: teacherEmail,
      teacherRole: teacherRole,
      scheduledDate: scheduledDate,
      notes: notes,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    alert.textContent = `✅ Jadwal berhasil dibuat! ${teacherName} akan disupervisi pada ${formatDate(scheduledDate)}`;
    alert.className = 'alert alert-success show';
    
    teacherSelect.value = '';
    document.getElementById('scheduleDate').value = '';
    document.getElementById('scheduleNotes').value = '';
    loadAvailableTeachers();
  } catch(e) {
    alert.textContent = '❌ ' + e.message;
    alert.className = 'alert alert-error show';
  }
  btn.disabled = false;
  btn.textContent = '💾 Simpan Jadwal';
};

async function loadScheduleList() {
  const container = document.getElementById('scheduleList');
  container.innerHTML = '<div style="text-align:center;padding:20px;"><span class="spinner"></span> Memuat...</div>';
  try {
    const snap = await db.collection('supervision_schedule')
      .where('supervisorEmail', '==', currentUser.email).get();
    
    if (snap.empty) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📅</div><p>Belum ada jadwal supervisi</p></div>';
      return;
    }
    
    const schedules = snap.docs.map(d => ({id: d.id, ...d.data()}))
      .sort((a,b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    
    container.innerHTML = schedules.map(s => {
      const statusBadge = {
        'scheduled': '<span class="badge badge-scheduled">📅 Dijadwalkan</span>',
        'in-progress': '<span class="badge badge-progress">🔄 Berlangsung</span>',
        'completed': '<span class="badge badge-done">✅ Selesai</span>'
      }[s.status] || '<span class="badge badge-info">' + s.status + '</span>';
      
      const roleIcon = s.teacherRole === 'wakil' ? '⭐' : '👨‍🏫';
      
      return `
        <div class="schedule-card">
          <div class="schedule-info">
            <div class="schedule-title">${roleIcon} ${s.teacherName}</div>
            <div class="schedule-detail">📅 ${formatDate(s.scheduledDate)} | 👤 Supervisor: ${s.supervisorName} | ${statusBadge}</div>
            ${s.notes ? `<div class="schedule-detail">📝 ${s.notes}</div>` : ''}
          </div>
          <div class="schedule-actions">
            ${s.status !== 'completed' ? `<button class="btn btn-warning btn-sm" onclick="updateScheduleStatus('${s.id}','in-progress')">🔄 Mulai</button>` : ''}
            ${s.status === 'scheduled' ? `<button class="btn btn-danger btn-sm" onclick="deleteSchedule('${s.id}')">🗑️ Hapus</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch(e) {
    container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><p>Gagal memuat jadwal</p></div>';
  }
}

async function loadPendingSchedules() {
  const select = document.getElementById('supervisionSchedule');
  select.innerHTML = '<option value="">-- Memuat... --</option>';
  try {
    const snap = await db.collection('supervision_schedule')
      .where('supervisorEmail', '==', currentUser.email)
      .where('status', 'in', ['scheduled', 'in-progress']).get();
    
    if (snap.empty) {
      select.innerHTML = '<option value="">-- Tidak ada jadwal aktif --</option>';
      document.getElementById('scheduleDetailArea').style.display = 'none';
      return;
    }
    
    const schedules = snap.docs.map(d => ({id: d.id, ...d.data()}));
    select.innerHTML = '<option value="">-- Pilih Jadwal --</option>';
    schedules.forEach(s => {
      select.innerHTML += `<option value="${s.id}" data-teacher="${s.teacherName}" data-email="${s.teacherEmail}" data-date="${s.scheduledDate}">${s.teacherName} - ${formatDate(s.scheduledDate)}</option>`;
    });
  } catch(e) {
    select.innerHTML = '<option value="">-- Error --</option>';
  }
}

window.loadScheduleDetail = async function() {
  const select = document.getElementById('supervisionSchedule');
  const scheduleId = select.value;
  const detailArea = document.getElementById('scheduleDetailArea');
  
  if (!scheduleId) { detailArea.style.display = 'none'; return; }
  
  selectedScheduleId = scheduleId;
  detailArea.style.display = 'block';
  
  const teacherEmail = select.options[select.selectedIndex].dataset.email;
  const docContainer = document.getElementById('teacherDocuments');
  docContainer.innerHTML = '<div style="text-align:center;padding:10px;"><span class="spinner"></span> Memuat dokumen...</div>';
  
  try {
    const snap = await db.collection('supervision_documents')
      .where('userEmail', '==', teacherEmail).get();
    
    if (snap.empty) {
      docContainer.innerHTML = '<div class="empty-state" style="padding:20px;"><div class="icon">📭</div><p>Belum ada dokumen yang diupload</p></div>';
      return;
    }
    
    const docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
    docContainer.innerHTML = docs.map(d => {
      const icon = d.type==='link' ? '🔗' : (d.fileExt==='pdf'?'📕':['doc','docx'].includes(d.fileExt)?'📘':['xls','xlsx'].includes(d.fileExt)?'📗':'📄');
      
      let btnLihat = '';
      if (d.type === 'link') {
        btnLihat = `<a href="${d.link}" target="_blank" class="btn btn-warning btn-sm">👁️ Lihat</a>`;
      } else if (d.fileExt === 'pdf') {
        btnLihat = `<button class="btn btn-warning btn-sm" onclick="previewDoc('${d.id}')">👁️ Lihat</button>`;
      } else {
        btnLihat = `<button class="btn btn-warning btn-sm" onclick="previewDocOffice('${d.id}','${d.fileExt}')">👁️ Lihat</button>`;
      }
      
      let btnUnduh = '';
      if (d.type !== 'link') {
        btnUnduh = `<button class="btn btn-primary btn-sm" onclick="downloadDoc('${d.id}','${d.nama.replace(/'/g,"\\'")}','${d.fileExt}')">⬇️ Unduh</button>`;
      }
      
      const roleBadge = d.userRole === 'wakil' ? '<span class="badge" style="background:#ede9fe;color:#5b21b6;margin-left:5px;">⭐ Wakamad</span>' : '';
      
      return `
        <div class="doc-item">
          <div class="doc-icon">${icon}</div>
          <div class="doc-info">
            <div class="doc-name">${d.nama} ${roleBadge}</div>
            <div class="doc-meta">${d.kategori} • ${new Date(d.createdAt).toLocaleDateString('id-ID')}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${btnLihat}
            ${btnUnduh}
          </div>
        </div>
      `;
    }).join('');
  } catch(e) {
    docContainer.innerHTML = '<div class="empty-state" style="padding:20px;"><div class="icon">❌</div><p>Gagal memuat dokumen</p></div>';
  }
};

window.updateScheduleStatus = async function(scheduleId, status) {
  if (!confirm(`Ubah status jadwal menjadi "${status}"?`)) return;
  try {
    await db.collection('supervision_schedule').doc(scheduleId).update({
      status: status,
      updatedAt: new Date().toISOString()
    });
    loadScheduleList();
  } catch(e) { alert('❌ ' + e.message); }
};

window.deleteSchedule = async function(scheduleId) {
  if (!confirm('Hapus jadwal ini?')) return;
  try {
    await db.collection('supervision_schedule').doc(scheduleId).delete();
    loadScheduleList();
  } catch(e) { alert('❌ ' + e.message); }
};

// ══════════════════════════════════════════════
//   ⚙️ KELOLA INSTRUMEN (HANYA ADMIN)
// ══════════════════════════════════════════════
window.openInstrumentModal = function() {
  editingInstrumentId = null;
  document.getElementById('instrumentModalTitle').textContent = '➕ Tambah Instrumen Baru';
  document.getElementById('instrumentName').value = '';
  document.getElementById('instrumentType').value = '';
  document.getElementById('instrumentDesc').value = '';
  document.getElementById('componentsContainer').innerHTML = '';
  componentCounter = 0;
  openModal('instrumentModal');
};

window.addComponent = function() {
  componentCounter++;
  const container = document.getElementById('componentsContainer');
  const div = document.createElement('div');
  div.className = 'assessment-item';
  div.id = `component-${componentCounter}`;
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <strong>Komponen #${componentCounter}</strong>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeComponent(${componentCounter})">🗑️ Hapus</button>
    </div>
    <div class="form-group">
      <label>Nama Komponen *</label>
      <input type="text" class="component-name" placeholder="Nama komponen">
    </div>
    <div class="form-row">
      <div class="form-group"><label>Level 1 (Kurang)</label><textarea class="component-level1"></textarea></div>
      <div class="form-group"><label>Level 2 (Cukup)</label><textarea class="component-level2"></textarea></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Level 3 (Baik)</label><textarea class="component-level3"></textarea></div>
      <div class="form-group"><label>Level 4 (Sangat Baik)</label><textarea class="component-level4"></textarea></div>
    </div>
  `;
  container.appendChild(div);
};

window.removeComponent = function(id) {
  const el = document.getElementById(`component-${id}`);
  if (el) el.remove();
};

window.saveInstrument = async function() {
  const name = document.getElementById('instrumentName').value.trim();
  const type = document.getElementById('instrumentType').value;
  const desc = document.getElementById('instrumentDesc').value.trim();
  
  if (!name || !type) { alert('❌ Nama dan jenis instrumen wajib diisi!'); return; }
  
  const components = [];
  document.querySelectorAll('#componentsContainer .assessment-item').forEach((item, index) => {
    const compName = item.querySelector('.component-name').value.trim();
    if (compName) {
      components.push({
        id: `comp_${index + 1}`,
        name: compName,
        level1: item.querySelector('.component-level1').value.trim(),
        level2: item.querySelector('.component-level2').value.trim(),
        level3: item.querySelector('.component-level3').value.trim(),
        level4: item.querySelector('.component-level4').value.trim()
      });
    }
  });
  
  if (components.length === 0) { alert('❌ Minimal tambahkan 1 komponen!'); return; }
  
  const instrumentData = {
    name, type, description: desc, components,
    isActive: true,
    createdBy: currentUser.email,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  try {
    if (editingInstrumentId) {
      await db.collection('supervision_instruments').doc(editingInstrumentId).update(instrumentData);
      alert('✅ Instrumen berhasil diupdate!');
    } else {
      await db.collection('supervision_instruments').add(instrumentData);
      alert('✅ Instrumen berhasil ditambahkan!');
    }
    closeModal('instrumentModal');
    loadInstrumentsList();
  } catch(e) { alert('❌ ' + e.message); }
};

async function loadInstrumentsList() {
  const container = document.getElementById('instrumentsList');
  container.innerHTML = '<div style="text-align:center;padding:20px;"><span class="spinner"></span> Memuat...</div>';
  try {
    const snap = await db.collection('supervision_instruments').orderBy('createdAt', 'desc').get();
    if (snap.empty) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>Belum ada instrumen.</p></div>';
      return;
    }
    const typeLabels = {'administrasi': 'Administrasi', 'perencanaan': 'Perencanaan', 'pelaksanaan': 'Pelaksanaan', 'asesmen': 'Asesmen', 'bk': 'Bimbingan Konseling'};
    container.innerHTML = snap.docs.map(doc => {
      const data = doc.data();
      return `
        <div class="instrument-card">
          <div class="instrument-header">
            <div>
              <div class="instrument-name">${data.name}</div>
              <div class="instrument-type">${typeLabels[data.type] || data.type} • ${data.components.length} Komponen</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-warning btn-sm" onclick="editInstrument('${doc.id}')">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteInstrument('${doc.id}')">🗑️ Hapus</button>
            </div>
          </div>
          ${data.description ? `<div style="margin-top:10px;color:#6b7280;font-size:0.9rem;">${data.description}</div>` : ''}
        </div>
      `;
    }).join('');
  } catch(e) {
    container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><p>Gagal memuat instrumen</p></div>';
  }
}

window.editInstrument = async function(docId) {
  const snap = await db.collection('supervision_instruments').doc(docId).get();
  if (!snap.exists) return;
  const data = snap.data();
  editingInstrumentId = docId;
  document.getElementById('instrumentModalTitle').textContent = '✏️ Edit Instrumen';
  document.getElementById('instrumentName').value = data.name;
  document.getElementById('instrumentType').value = data.type;
  document.getElementById('instrumentDesc').value = data.description || '';
  document.getElementById('componentsContainer').innerHTML = '';
  componentCounter = 0;
  data.components.forEach(comp => {
    componentCounter++;
    const container = document.getElementById('componentsContainer');
    const div = document.createElement('div');
    div.className = 'assessment-item';
    div.id = `component-${componentCounter}`;
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <strong>Komponen #${componentCounter}</strong>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeComponent(${componentCounter})">🗑️ Hapus</button>
      </div>
      <div class="form-group"><label>Nama Komponen *</label><input type="text" class="component-name" value="${comp.name}"></div>
      <div class="form-row">
        <div class="form-group"><label>Level 1</label><textarea class="component-level1">${comp.level1 || ''}</textarea></div>
        <div class="form-group"><label>Level 2</label><textarea class="component-level2">${comp.level2 || ''}</textarea></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Level 3</label><textarea class="component-level3">${comp.level3 || ''}</textarea></div>
        <div class="form-group"><label>Level 4</label><textarea class="component-level4">${comp.level4 || ''}</textarea></div>
      </div>
    `;
    container.appendChild(div);
  });
  openModal('instrumentModal');
};

window.deleteInstrument = async function(docId) {
  if (!confirm('Hapus instrumen ini?')) return;
  try {
    await db.collection('supervision_instruments').doc(docId).delete();
    loadInstrumentsList();
  } catch(e) { alert('❌ ' + e.message); }
};

window.importDefaultInstruments = async function() {
  if (!confirm('Import 5 instrumen default KBC?')) return;
  const defaultInstruments = [
    { name: "Supervisi Administrasi Pembelajaran", type: "administrasi", description: "Menilai kelengkapan administrasi pembelajaran", components: [
      { name: "Kalender pendidikan", level1: "Tidak tersedia", level2: "Tersedia belum lengkap", level3: "Tersedia dan lengkap", level4: "Lengkap dan berkualitas" },
      { name: "Program Tahunan/Semester", level1: "Tidak tersedia", level2: "Tersedia belum lengkap", level3: "Tersedia dan lengkap", level4: "Lengkap dan berkualitas" },
      { name: "Capaian Pembelajaran", level1: "Tidak tersedia", level2: "Tersedia belum lengkap", level3: "Tersedia dan lengkap", level4: "Lengkap dan berkualitas" },
      { name: "Modul Ajar", level1: "Tidak tersedia", level2: "Tersedia belum lengkap", level3: "Tersedia dan lengkap", level4: "Lengkap dan berkualitas" },
      { name: "Daftar Penilaian", level1: "Tidak tersedia", level2: "Tersedia belum lengkap", level3: "Tersedia dan lengkap", level4: "Lengkap dan berkualitas" }
    ]},
    { name: "Supervisi Perencanaan Pembelajaran", type: "perencanaan", description: "Menilai perencanaan pembelajaran berbasis KBC", components: [
      { name: "Identifikasi Murid", level1: "Tidak sesuai", level2: "Sebagian sesuai", level3: "Sesuai dengan baik", level4: "Sangat sesuai dan empatik" },
      { name: "Dimensi Profil Lulusan", level1: "Tidak sesuai", level2: "Sebagian sesuai", level3: "Sesuai dengan baik", level4: "Sangat sesuai dan humanis" },
      { name: "Topik Panca Cinta", level1: "Tidak ada integrasi", level2: "Integrasi minimal", level3: "Integrasi baik", level4: "Integrasi sangat baik" },
      { name: "Tujuan Pembelajaran", level1: "Tidak jelas", level2: "Cukup jelas", level3: "Jelas dan terukur", level4: "Sangat jelas dan bermakna" },
      { name: "Praktek Pedagogis", level1: "Tidak sesuai", level2: "Sebagian sesuai", level3: "Sesuai dengan baik", level4: "Sangat sesuai dan aktif" }
    ]},
    { name: "Supervisi Pelaksanaan Pembelajaran", type: "pelaksanaan", description: "Menilai pelaksanaan pembelajaran dengan nilai KBC", components: [
      { name: "Penyampaian Tujuan", level1: "Tanpa integrasi", level2: "Integrasi minimal", level3: "Integrasi baik", level4: "Integrasi optimal" },
      { name: "Apersepsi & Motivasi", level1: "Tidak ada", level2: "Minimal", level3: "Baik", level4: "Sangat baik" },
      { name: "Penyajian Materi", level1: "Tidak runtut", level2: "Cukup runtut", level3: "Runtut dan jelas", level4: "Sangat runtut dan menarik" },
      { name: "Media Pembelajaran", level1: "Tidak relevan", level2: "Cukup relevan", level3: "Relevan dan interaktif", level4: "Sangat relevan dan optimal" },
      { name: "Keterlibatan Siswa", level1: "Tidak ada", level2: "Minimal", level3: "Aktif baik", level4: "Sangat aktif dan empatik" }
    ]},
    { name: "Supervisi Asesmen Pembelajaran", type: "asesmen", description: "Menilai asesmen pembelajaran berbasis KBC", components: [
      { name: "Instrumen Penilaian", level1: "Tidak selaras", level2: "Selaras umum", level3: "Selaras dengan nilai cinta", level4: "Sangat selaras dan humanis" },
      { name: "Penilaian Proses & Hasil", level1: "Hanya hasil", level2: "Proses & hasil minimal", level3: "Proses & hasil baik", level4: "Komprehensif dan konsisten" },
      { name: "Umpan Balik", level1: "Minimal", level2: "Diberikan", level3: "Membangun", level4: "Sangat membangun dan holistik" },
      { name: "Pemanfaatan Hasil", level1: "Tidak dimanfaatkan", level2: "Terbatas", level3: "Untuk perbaikan", level4: "Sistematis dan berkelanjutan" },
      { name: "Suasana Penilaian", level1: "Tidak aman", level2: "Cukup aman", level3: "Aman dan inklusif", level4: "Sangat aman dan berkarakter" }
    ]},
    { name: "Supervisi Guru BK", type: "bk", description: "Menilai layanan BK berbasis deep learning dan KBC", components: [
      { name: "Perencanaan Layanan", level1: "Tidak berbasis deep learning", level2: "Sebagian berbasis", level3: "Berbasis baik", level4: "Sepenuhnya berbasis optimal" },
      { name: "Program BK dengan KBC", level1: "Tanpa prinsip KBC", level2: "Prinsip minimal", level3: "Prinsip baik", level4: "Prinsip sangat baik" },
      { name: "Asesmen Kebutuhan", level1: "Tanpa humanis", level2: "Humanis minimal", level3: "Humanis baik", level4: "Humanis sangat baik" },
      { name: "Kolaborasi", level1: "Tidak ada", level2: "Minimal", level3: "Baik", level4: "Sangat baik dan komprehensif" },
      { name: "Ruang Konseling", level1: "Tidak aman", level2: "Cukup aman", level3: "Aman dan nyaman", level4: "Sangat aman dan penuh cinta" }
    ]}
  ];
  
  try {
    for (const instrument of defaultInstruments) {
      await db.collection('supervision_instruments').add({
        ...instrument,
        isActive: true,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    alert('✅ 5 instrumen default berhasil diimport!');
    loadInstrumentsList();
  } catch(e) { alert('❌ Gagal import: ' + e.message); }
};

async function loadInstruments() {
  const select = document.getElementById('instrumentSelect');
  select.innerHTML = '<option value="">-- Memuat... --</option>';
  try {
    const snap = await db.collection('supervision_instruments').where('isActive', '==', true).get();
    if (snap.empty) {
      select.innerHTML = '<option value="">-- Belum ada instrumen --</option>';
      return;
    }
    const instruments = snap.docs.map(d => ({id: d.id, ...d.data()}));
    select.innerHTML = '<option value="">-- Pilih Instrumen --</option>';
    instruments.forEach(inst => {
      select.innerHTML += `<option value="${inst.id}" data-name="${inst.name}" data-type="${inst.type}">${inst.name}</option>`;
    });
  } catch(e) { select.innerHTML = '<option value="">-- Error --</option>'; }
}

window.loadInstrumentForm = function() {
  const select = document.getElementById('instrumentSelect');
  const instrumentId = select.value;
  const formArea = document.getElementById('assessmentFormArea');
  
  if (!instrumentId) { formArea.style.display = 'none'; currentInstrument = null; return; }
  
  const instrumentData = select.options[select.selectedIndex];
  currentInstrument = { id: instrumentId, name: instrumentData.dataset.name, type: instrumentData.dataset.type };
  
  formArea.style.display = 'block';
  formArea.innerHTML = '<div style="text-align:center;padding:20px;"><span class="spinner"></span> Memuat form...</div>';
  
  db.collection('supervision_instruments').doc(instrumentId).get().then(doc => {
    if (!doc.exists) { formArea.innerHTML = '<div class="alert alert-error">❌ Instrumen tidak ditemukan</div>'; return; }
    const data = doc.data();
    currentInstrument = { ...currentInstrument, ...data };
    
    let html = `
      <div class="card" style="background:#f9fafb;margin-bottom:20px;">
        <h3 style="color:#1e40af;margin-bottom:15px;">📋 ${data.name}</h3>
        <div class="form-row">
          <div class="form-group"><label>Nama Madrasah</label><input type="text" id="schoolName" value="MAN Bantaeng"></div>
          <div class="form-group"><label>Mata Pelajaran</label><input type="text" id="subject" placeholder="Contoh: Matematika"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Kelas/Semester</label><input type="text" id="classSemester" placeholder="Contoh: VII/1"></div>
          <div class="form-group"><label>Jumlah Jam</label><input type="number" id="meetingHours" placeholder="Contoh: 4"></div>
        </div>
      </div>
      <div class="table-wrap">
        <table style="border-collapse:collapse;width:100%;">
          <thead>
            <tr style="background:#4CAF50;color:white;">
              <th style="border:1px solid #ddd;padding:10px;text-align:center;width:5%;">No</th>
              <th style="border:1px solid #ddd;padding:10px;text-align:left;width:55%;">Komponen</th>
              <th colspan="4" style="border:1px solid #ddd;padding:10px;text-align:center;background:#81C784;">Skor</th>
            </tr>
            <tr style="background:#81C784;">
              <th style="border:1px solid #ddd;"></th>
              <th style="border:1px solid #ddd;"></th>
              <th style="border:1px solid #ddd;padding:8px;text-align:center;width:10%;">1</th>
              <th style="border:1px solid #ddd;padding:8px;text-align:center;width:10%;">2</th>
              <th style="border:1px solid #ddd;padding:8px;text-align:center;width:10%;">3</th>
              <th style="border:1px solid #ddd;padding:8px;text-align:center;width:10%;">4</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    data.components.forEach((comp, index) => {
      html += `
        <tr style="background:${index % 2 === 0 ? '#E8F5E9' : 'white'};">
          <td style="border:1px solid #ddd;padding:8px;text-align:center;">${index + 1}</td>
          <td style="border:1px solid #ddd;padding:8px;">${comp.name}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;"><input type="checkbox" name="score_row_${index}" data-row="${index}" value="1" onchange="handleCheckbox(${index}, 1)"></td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;"><input type="checkbox" name="score_row_${index}" data-row="${index}" value="2" onchange="handleCheckbox(${index}, 2)"></td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;"><input type="checkbox" name="score_row_${index}" data-row="${index}" value="3" onchange="handleCheckbox(${index}, 3)"></td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;"><input type="checkbox" name="score_row_${index}" data-row="${index}" value="4" onchange="handleCheckbox(${index}, 4)"></td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
          <tfoot>
            <tr style="background:#C8E6C9;font-weight:bold;">
              <td colspan="2" style="border:1px solid #ddd;padding:10px;text-align:right;">Jumlah</td>
              <td style="border:1px solid #ddd;padding:10px;text-align:center;" id="count_1">0</td>
              <td style="border:1px solid #ddd;padding:10px;text-align:center;" id="count_2">0</td>
              <td style="border:1px solid #ddd;padding:10px;text-align:center;" id="count_3">0</td>
              <td style="border:1px solid #ddd;padding:10px;text-align:center;" id="count_4">0</td>
            </tr>
            <tr style="background:#A5D6A7;font-weight:bold;">
              <td colspan="2" style="border:1px solid #ddd;padding:10px;text-align:right;">Skor Total</td>
              <td colspan="4" style="border:1px solid #ddd;padding:10px;text-align:center;font-size:1.1rem;" id="totalScore">0</td>
            </tr>
            <tr style="background:#81C784;font-weight:bold;">
              <td colspan="2" style="border:1px solid #ddd;padding:10px;text-align:right;">Persentase</td>
              <td colspan="4" style="border:1px solid #ddd;padding:10px;text-align:center;font-size:1.1rem;" id="percentage">0%</td>
            </tr>
            <tr style="background:#4CAF50;color:white;font-weight:bold;">
              <td colspan="2" style="border:1px solid #ddd;padding:10px;text-align:right;">Predikat</td>
              <td colspan="4" style="border:1px solid #ddd;padding:10px;text-align:center;font-size:1.1rem;" id="predicate">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style="margin-top:15px;background:#FFF3E0;padding:12px;border-radius:8px;border-left:4px solid #FF9800;">
        <strong>Keterangan:</strong><br>
        • 91% - 100% = Sangat Baik<br>
        • 81% - 90% = Baik<br>
        • 71% - 80% = Cukup<br>
        • < 70% = Kurang
      </div>
    `;
    formArea.innerHTML = html;
  }).catch(e => { formArea.innerHTML = '<div class="alert alert-error">❌ Gagal memuat form: ' + e.message + '</div>'; });
};

window.handleCheckbox = function(rowIndex, value) {
  const rowCheckboxes = document.querySelectorAll(`input[data-row="${rowIndex}"]`);
  rowCheckboxes.forEach(cb => { if (parseInt(cb.value) !== value) cb.checked = false; });
  calculateScores();
};

function calculateScores() {
  const instrument = currentInstrument;
  if (!instrument) return;
  
  let count1 = 0, count2 = 0, count3 = 0, count4 = 0, totalScore = 0, scores = {};
  
  instrument.components.forEach((comp, index) => {
    const selected = document.querySelector(`input[data-row="${index}"]:checked`);
    if (selected) {
      const value = parseInt(selected.value);
      scores[comp.id] = value;
      totalScore += value;
      if (value === 1) count1++;
      else if (value === 2) count2++;
      else if (value === 3) count3++;
      else if (value === 4) count4++;
    }
  });
  
  currentInstrument._scores = scores;
  
  const count1El = document.getElementById('count_1');
  const count2El = document.getElementById('count_2');
  const count3El = document.getElementById('count_3');
  const count4El = document.getElementById('count_4');
  const totalScoreEl = document.getElementById('totalScore');
  const percentageEl = document.getElementById('percentage');
  const predicateEl = document.getElementById('predicate');
  
  if (count1El) count1El.textContent = count1;
  if (count2El) count2El.textContent = count2;
  if (count3El) count3El.textContent = count3;
  if (count4El) count4El.textContent = count4;
  if (totalScoreEl) totalScoreEl.textContent = totalScore;
  
  const maxScore = instrument.components.length * 4;
  const percentage = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(0) : 0;
  
  if (percentageEl) percentageEl.textContent = percentage + '%';
  
  let predicate = '-';
  if (percentage >= 91) predicate = 'Sangat Baik';
  else if (percentage >= 81) predicate = 'Baik';
  else if (percentage >= 71) predicate = 'Cukup';
  else if (percentage > 0) predicate = 'Kurang';
  
  if (predicateEl) predicateEl.textContent = predicate;
}

window.saveSupervision = async function() {
  if (!selectedScheduleId || !currentInstrument) { alert('❌ Pilih jadwal dan instrumen!'); return; }
  
  const notes = document.getElementById('supervisionNotes').value.trim();
  const actionPlan = document.getElementById('actionPlan').value.trim();
  const alert = document.getElementById('alertSup');
  const btn = document.getElementById('btnSaveSup');
  
  alert.classList.remove('show');
  
  const scores = {};
  let totalScore = 0;
  let maxScore = currentInstrument.components.length * 4;
  
  currentInstrument.components.forEach((comp, index) => {
    const selected = document.querySelector(`input[data-row="${index}"]:checked`);
    if (!selected) {
      alert.textContent = `❌ Lengkapi penilaian: ${comp.name}`;
      alert.className = 'alert alert-error show';
      return;
    }
    scores[`comp_${index}`] = parseInt(selected.value);
    totalScore += parseInt(selected.value);
  });
  
  const percentage = ((totalScore / maxScore) * 100).toFixed(0);
  let predicate = '-';
  if (percentage >= 91) predicate = 'Sangat Baik';
  else if (percentage >= 81) predicate = 'Baik';
  else if (percentage >= 71) predicate = 'Cukup';
  else predicate = 'Kurang';
  
  const schoolName = document.getElementById('schoolName').value.trim();
  const subject = document.getElementById('subject').value.trim();
  const classSemester = document.getElementById('classSemester').value.trim();
  const meetingHours = document.getElementById('meetingHours').value.trim();
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  
  try {
    const select = document.getElementById('supervisionSchedule');
    const superviseeName = select.options[select.selectedIndex].dataset.teacher;
    const superviseeEmail = select.options[select.selectedIndex].dataset.email;
    
    await db.collection('supervisions').add({
      scheduleId: selectedScheduleId,
      instrumentId: currentInstrument.id,
      instrumentName: currentInstrument.name,
      instrumentType: currentInstrument.type,
      supervisorId: currentUser.uid,
      supervisorEmail: currentUser.email,
      supervisorName: currentUser.nama,
      supervisorRole: currentUser.role,
      superviseeId: superviseeEmail,
      superviseeEmail: superviseeEmail,
      superviseeName: superviseeName,
      schoolName: schoolName,
      subject: subject,
      classSemester: classSemester,
      meetingHours: meetingHours,
      scores: scores,
      totalScore: totalScore,
      maxScore: maxScore,
      percentage: percentage,
      predicate: predicate,
      notes: notes,
      actionPlan: actionPlan,
      status: 'completed',
      createdAt: new Date().toISOString()
    });
    
    await db.collection('supervision_schedule').doc(selectedScheduleId).update({
      status: 'completed',
      updatedAt: new Date().toISOString()
    });
    
    alert.textContent = '✅ Supervisi berhasil disimpan!';
    alert.className = 'alert alert-success show';
    
    document.getElementById('supervisionSchedule').value = '';
    document.getElementById('instrumentSelect').value = '';
    document.getElementById('supervisionNotes').value = '';
    document.getElementById('actionPlan').value = '';
    document.getElementById('assessmentFormArea').innerHTML = '';
    document.getElementById('assessmentFormArea').style.display = 'none';
    document.getElementById('scheduleDetailArea').style.display = 'none';
    selectedScheduleId = null;
    currentInstrument = null;
  } catch(e) {
    alert.textContent = '❌ ' + e.message;
    alert.className = 'alert alert-error show';
  }
  btn.disabled = false;
  btn.textContent = '💾 Simpan Hasil Supervisi';
};

async function loadSupervisionList(){
  const snap = await db.collection('supervisions').where('supervisorEmail', '==', currentUser.email).get();
  const tbody = document.getElementById('supervisionList');
  
  if(snap.empty){
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px;">Belum ada supervisi</td></tr>';
    return;
  }
  
  const docs = snap.docs.sort((a,b) => new Date(b.data().createdAt) - new Date(a.data().createdAt));
  tbody.innerHTML = docs.map(d => {
    const data = d.data();
    return `
      <tr>
        <td>${new Date(data.createdAt).toLocaleDateString('id-ID')}</td>
        <td>${data.superviseeName}</td>
        <td>${data.instrumentName || '-'}</td>
        <td><strong>${data.totalScore}/${data.maxScore} (${data.percentage}%)</strong></td>
        <td><span class="badge badge-done">Selesai</span></td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="viewDetail('${d.id}')">👁️ Lihat</button>
          <button class="btn btn-primary btn-sm" onclick="downloadPDF('${d.id}')">📥 PDF</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ══════════════════════════════════════════════
//   📅 JADWAL & DOKUMEN (GURU/WAKAMAD)
// ══════════════════════════════════════════════
async function loadMySchedule() {
  const container = document.getElementById('myScheduleArea');
  container.innerHTML = '<div style="text-align:center;padding:20px;"><span class="spinner"></span> Memuat...</div>';
  try {
    const snap = await db.collection('supervision_schedule').where('teacherEmail', '==', currentUser.email).get();
    if (snap.empty) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📅</div><p>Anda belum dijadwalkan untuk supervisi</p></div>';
      return;
    }
    const schedules = snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    container.innerHTML = schedules.map(s => {
      const statusBadge = {'scheduled': '<span class="badge badge-scheduled">📅 Dijadwalkan</span>', 'in-progress': '<span class="badge badge-progress">🔄 Sedang Disupervisi</span>', 'completed': '<span class="badge badge-done">✅ Selesai</span>'}[s.status] || s.status;
      return `
        <div class="schedule-card">
          <div class="schedule-info">
            <div class="schedule-title">👤 Supervisor: ${s.supervisorName}</div>
            <div class="schedule-detail">📅 ${formatDate(s.scheduledDate)} | ${statusBadge}</div>
            ${s.notes ? `<div class="schedule-detail">📝 ${s.notes}</div>` : ''}
            <div class="schedule-detail" style="margin-top:6px;"><strong>💡 Upload dokumen di tab "Upload Dokumen"</strong></div>
          </div>
        </div>
      `;
    }).join('');
  } catch(e) { container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><p>Gagal memuat jadwal</p></div>'; }
}

// ══════════════════════════════════════════════
//   📁 FOLDER MANAGEMENT (NESTED - GOOGLE DRIVE STYLE)
// ══════════════════════════════════════════════

window.navigateFolder = function(folderId) {
  currentFolderId = folderId;
  loadFolderContents();
};

window.toggleUploadForm = function() {
  const form = document.getElementById('uploadFormArea');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

async function loadFolderContents() {
  const container = document.getElementById('folderFileList');
  const breadcrumb = document.getElementById('breadcrumbNav');
  const breadcrumbPath = document.getElementById('breadcrumbPath');
  const viewTitle = document.getElementById('folderViewTitle');
  const btnUpload = document.getElementById('btnToggleUpload');
  const uploadForm = document.getElementById('uploadFormArea');
  
  container.innerHTML = '<div style="text-align:center;padding:40px;color:#6b7280;grid-column:1/-1;"><span class="spinner"></span> Memuat...</div>';
  
  try {
    const foldersSnap = await db.collection('supervision_folders').where('userEmail', '==', currentUser.email).get();
    userFolders = foldersSnap.docs.map(d => ({id: d.id, ...d.data()}));
    
    let subFolders = userFolders.filter(f => (f.parentId || null) === currentFolderId);
    subFolders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    let files = [];
    if (currentFolderId) {
      const docsSnap = await db.collection('supervision_documents')
        .where('userEmail', '==', currentUser.email)
        .where('folderId', '==', currentFolderId).get();
      files = docsSnap.docs.map(d => ({id: d.id, ...d.data()}));
      files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    if (currentFolderId) {
      breadcrumb.style.display = 'block';
      btnUpload.style.display = 'inline-flex';
      uploadForm.style.display = 'none';
      
      let pathParts = [];
      let current = userFolders.find(f => f.id === currentFolderId);
      while (current) {
        pathParts.unshift(current);
        current = current.parentId ? userFolders.find(f => f.id === current.parentId) : null;
      }
      
      let pathHTML = '';
      pathParts.forEach((p, i) => {
        if (i > 0) pathHTML += ' <span style="color:#9ca3af;">›</span> ';
        if (i < pathParts.length - 1) {
          pathHTML += `<a href="#" onclick="navigateFolder('${p.id}');return false;" style="color:#3b82f6;text-decoration:none;font-weight:600;">${p.name}</a>`;
        } else {
          pathHTML += `<strong>${p.name}</strong>`;
        }
      });
      breadcrumbPath.innerHTML = pathHTML;
      viewTitle.textContent = '📂 Isi Folder: ' + pathParts[pathParts.length - 1].name;
    } else {
      breadcrumb.style.display = 'none';
      btnUpload.style.display = 'none';
      uploadForm.style.display = 'none';
      viewTitle.textContent = '📁 Semua Folder';
    }
    
    const allDocsSnap = await db.collection('supervision_documents').where('userEmail', '==', currentUser.email).get();
    const folderCounts = {};
    allDocsSnap.docs.forEach(d => {
      const fid = d.data().folderId;
      if (fid) folderCounts[fid] = (folderCounts[fid] || 0) + 1;
    });
    
    let html = '';
    
    subFolders.forEach(f => {
      const count = folderCounts[f.id] || 0;
      html += `
        <div class="folder-card" style="border-left:4px solid ${f.color || '#3b82f6'};cursor:pointer;" onclick="navigateFolder('${f.id}')">
          <div class="folder-icon">📁</div>
          <div class="folder-info">
            <div class="folder-name">${f.name}</div>
            <div class="folder-count">${count} dokumen</div>
          </div>
          <div class="folder-actions">
            <button class="btn btn-warning btn-sm" onclick="event.stopPropagation();openFolderModal('${f.id}')" title="Edit">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteFolder('${f.id}', '${f.name.replace(/'/g, "\\'")}', ${count})" title="Hapus">🗑️</button>
          </div>
        </div>
      `;
    });
    
    files.forEach(d => {
      const icon = d.type === 'link' ? '🔗' : (d.fileExt === 'pdf' ? '📕' : ['doc', 'docx'].includes(d.fileExt) ? '📘' : ['xls', 'xlsx'].includes(d.fileExt) ? '📗' : '📄');
      
      let btnLihat = '';
      if (d.type === 'link') {
        btnLihat = `<a href="${d.link}" target="_blank" class="btn btn-warning btn-sm">👁️</a>`;
      } else if (d.fileExt === 'pdf') {
        btnLihat = `<button class="btn btn-warning btn-sm" onclick="previewDoc('${d.id}')">👁️</button>`;
      } else {
        btnLihat = `<button class="btn btn-warning btn-sm" onclick="previewDocOffice('${d.id}','${d.fileExt}')">👁️</button>`;
      }
      
      let btnUnduh = '';
      if (d.type !== 'link') {
        btnUnduh = `<button class="btn btn-primary btn-sm" onclick="downloadMyDoc('${d.id}','${d.nama.replace(/'/g,"\\'")}','${d.fileExt}')">⬇️</button>`;
      }
      
      html += `
        <div class="file-grid-item">
          <div class="file-grid-icon">${icon}</div>
          <div class="file-grid-name">${d.nama}</div>
          <div class="file-grid-meta">${d.kategori}</div>
          <div class="file-grid-meta">${new Date(d.createdAt).toLocaleDateString('id-ID')}</div>
          <div class="file-grid-actions">
            ${btnLihat}
            ${btnUnduh}
            <button class="btn btn-danger btn-sm" onclick="deleteMyDoc('${d.id}')">🗑️</button>
          </div>
        </div>
      `;
    });
    
    if (subFolders.length === 0 && files.length === 0) {
      if (currentFolderId) {
        html = '<div style="text-align:center;padding:60px;color:#9ca3af;grid-column:1/-1;"><div style="font-size:4rem;margin-bottom:10px;">📭</div><p>Folder ini kosong.<br>Klik "Upload File" untuk menambahkan dokumen.</p></div>';
      } else {
        html = '<div style="text-align:center;padding:60px;color:#9ca3af;grid-column:1/-1;"><div style="font-size:4rem;margin-bottom:10px;">📁</div><p>Belum ada folder.<br>Klik "Folder Baru" untuk memulai.</p></div>';
      }
    }
    
    container.innerHTML = html;
  } catch(e) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;grid-column:1/-1;">❌ ${e.message}</div>`;
  }
}

window.openFolderModal = function(folderId = null) {
  editingFolderId = folderId;
  const title = document.getElementById('folderModalTitle');
  const nameInput = document.getElementById('folderName');
  
  if (folderId) {
    title.textContent = '✏️ Edit Folder';
    const folder = userFolders.find(f => f.id === folderId);
    if (folder) {
      nameInput.value = folder.name;
      document.querySelectorAll('input[name=folderColor]').forEach(radio => {
        const div = radio.parentElement.querySelector('div');
        if (radio.value === folder.color) {
          radio.checked = true;
          div.style.border = '3px solid #1e40af';
        } else {
          radio.checked = false;
          div.style.border = '3px solid transparent';
        }
      });
    }
  } else {
    title.textContent = '📁 Buat Folder Baru';
    nameInput.value = '';
    document.querySelector('input[name=folderColor][value="#3b82f6"]').checked = true;
    document.querySelectorAll('input[name=folderColor]').forEach(radio => {
      const div = radio.parentElement.querySelector('div');
      div.style.border = radio.value === '#3b82f6' ? '3px solid #1e40af' : '3px solid transparent';
    });
  }
  openModal('folderModal');
};

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('color-option') || e.target.closest('label')?.querySelector('input[name=folderColor]')) {
    const label = e.target.closest('label');
    if (label) {
      const radio = label.querySelector('input[name=folderColor]');
      if (radio) {
        radio.checked = true;
        document.querySelectorAll('input[name=folderColor]').forEach(r => {
          const div = r.parentElement.querySelector('div');
          div.style.border = r.checked ? '3px solid #1e40af' : '3px solid transparent';
        });
      }
    }
  }
});

window.saveFolder = async function() {
  const name = document.getElementById('folderName').value.trim();
  const color = document.querySelector('input[name=folderColor]:checked')?.value || '#3b82f6';
  
  if (!name) { alert('❌ Nama folder wajib diisi!'); return; }
  
  try {
    if (editingFolderId) {
      await db.collection('supervision_folders').doc(editingFolderId).update({
        name: name, color: color, updatedAt: new Date().toISOString()
      });
      alert('✅ Folder berhasil diupdate!');
    } else {
      await db.collection('supervision_folders').add({
        name: name, color: color,
        parentId: currentFolderId,
        userEmail: currentUser.email,
        userName: currentUser.nama,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert('✅ Folder berhasil dibuat!');
    }
    closeModal('folderModal');
    loadFolderContents();
  } catch(e) { alert('❌ Gagal menyimpan folder: ' + e.message); }
};

window.deleteFolder = async function(folderId, folderName, docCount) {
  const subFolders = userFolders.filter(f => f.parentId === folderId);
  let confirmMsg = `Hapus folder "${folderName}"?`;
  if (subFolders.length > 0) {
    confirmMsg = `⚠️ Folder "${folderName}" memiliki ${subFolders.length} sub-folder.\nSemua akan terhapus!\nYakin?`;
  } else if (docCount > 0) {
    confirmMsg = `⚠️ Folder berisi ${docCount} dokumen.\nSemua akan terhapus!\nYakin?`;
  }
  if (!confirm(confirmMsg)) return;
  
  try {
    await deleteFolderRecursive(folderId);
    await db.collection('supervision_folders').doc(folderId).delete();
    if (currentFolderId === folderId) currentFolderId = null;
    alert('✅ Folder berhasil dihapus!');
    loadFolderContents();
  } catch(e) { alert('❌ Gagal menghapus: ' + e.message); }
};

async function deleteFolderRecursive(folderId) {
  const docsSnap = await db.collection('supervision_documents').where('folderId', '==', folderId).get();
  const batch1 = db.batch();
  docsSnap.docs.forEach(doc => batch1.delete(doc.ref));
  await batch1.commit();
  
  const subFolders = userFolders.filter(f => f.parentId === folderId);
  for (const sub of subFolders) {
    await deleteFolderRecursive(sub.id);
    await db.collection('supervision_folders').doc(sub.id).delete();
  }
}

window.uploadDokumen = async function() {
  const kategori = document.getElementById('docKategori').value;
  const nama = document.getElementById('docNama').value.trim();
  const type = document.querySelector('input[name=docType]:checked').value;
  const alert = document.getElementById('alertUpload');
  const btn = document.getElementById('btnUploadDoc');
  
  alert.classList.remove('show');
  
  if (!currentFolderId) { alert.textContent = '❌ Buka folder terlebih dahulu!'; alert.className = 'alert alert-error show'; return; }
  if (!kategori || !nama) { alert.textContent = '❌ Kategori dan nama wajib diisi!'; alert.className = 'alert alert-error show'; return; }
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  
  try {
    let fileData = null, fileExt = '', fileSize = 0, link = '';
    if (type === 'file') {
      const file = document.getElementById('docFile').files[0];
      if (!file) throw new Error('Pilih file!');
      if (file.size > 5 * 1024 * 1024) throw new Error('Maksimal 5MB!');
      const reader = new FileReader();
      fileData = await new Promise((res, rej) => {
        reader.onload = e => res(e.target.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      fileExt = file.name.split('.').pop();
      fileSize = file.size;
    } else {
      link = document.getElementById('docLink').value.trim();
      if (!link) throw new Error('Masukkan link!');
    }
    
    const folder = userFolders.find(f => f.id === currentFolderId);
    await db.collection('supervision_documents').add({
      userId: currentUser.uid, userEmail: currentUser.email,
      userName: currentUser.nama, userRole: currentUser.role,
      folderId: currentFolderId, folderName: folder?.name || '',
      kategori, nama, type, fileData, fileExt, fileSize, link,
      createdAt: new Date().toISOString()
    });
    
    alert.textContent = '✅ Dokumen berhasil disimpan!';
    alert.className = 'alert alert-success show';
    
    document.getElementById('docKategori').value = '';
    document.getElementById('docNama').value = '';
    document.getElementById('docFile').value = '';
    document.getElementById('docLink').value = '';
    
    loadFolderContents();
  } catch(e) {
    alert.textContent = '❌ ' + e.message;
    alert.className = 'alert alert-error show';
  }
  btn.disabled = false;
  btn.textContent = '💾 Simpan Dokumen';
};

window.toggleDocType = function(){
  const type = document.querySelector('input[name=docType]:checked').value;
  document.getElementById('fileInputWrap').style.display = type==='file'?'block':'none';
  document.getElementById('linkInputWrap').style.display = type==='link'?'block':'none';
};

window.downloadMyDoc = async function(docId, nama, ext){
  const snap = await db.collection('supervision_documents').doc(docId).get();
  const data = snap.data();
  const a = document.createElement('a');
  a.href = data.fileData;
  a.download = nama + '.' + ext;
  a.click();
};

window.downloadDoc = window.downloadMyDoc;

window.deleteMyDoc = async function(docId){
  if(!confirm('Hapus dokumen ini?')) return;
  await db.collection('supervision_documents').doc(docId).delete();
  loadFolderContents();
};

async function loadMySupervisionList(){
  const snap = await db.collection('supervisions').where('superviseeEmail', '==', currentUser.email).get();
  const tbody = document.getElementById('mySupervisionList');
  if(snap.empty){
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px;">Belum ada supervisi</td></tr>';
    return;
  }
  const docs = snap.docs.sort((a,b) => new Date(b.data().createdAt) - new Date(a.data().createdAt));
  tbody.innerHTML = docs.map(d => {
    const data = d.data();
    return `
      <tr>
        <td>${new Date(data.createdAt).toLocaleDateString('id-ID')}</td>
        <td>${data.supervisorName} (${getRoleLabel(data.supervisorRole)})</td>
        <td>${data.instrumentName || '-'}</td>
        <td><strong>${data.totalScore}/${data.maxScore} (${data.percentage}%)</strong></td>
        <td><span class="badge badge-done">${data.predicate || 'Selesai'}</span></td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="viewDetail('${d.id}')">👁️ Lihat</button>
          <button class="btn btn-primary btn-sm" onclick="downloadPDF('${d.id}')">📥 PDF</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ══════════════════════════════════════════════
//   👁️ DETAIL & PDF
// ══════════════════════════════════════════════
window.viewDetail = async function(docId) {
  try {
    const snap = await db.collection('supervisions').doc(docId).get();
    if (!snap.exists) { alert('Data tidak ditemukan'); return; }
    currentSupervision = { id: docId, ...snap.data() };
    if (currentSupervision.instrumentId) {
      const instSnap = await db.collection('supervision_instruments').doc(currentSupervision.instrumentId).get();
      if (instSnap.exists) currentInstrument = { id: instSnap.id, ...instSnap.data() };
    }
    showDetailModal();
  } catch (error) { alert('❌ Gagal memuat detail: ' + error.message); }
};

function showDetailModal() {
  const data = currentSupervision;
  let tableHTML = '';
  if (currentInstrument && currentInstrument.components && currentInstrument.components.length > 0) {
    tableHTML = `<div class="table-wrap" style="margin:15px 0;"><table style="border-collapse:collapse;width:100%;font-size:0.85rem;"><thead><tr style="background:#4CAF50;color:white;"><th style="border:1px solid #ddd;padding:8px;text-align:center;width:5%;">No</th><th style="border:1px solid #ddd;padding:8px;text-align:left;width:60%;">Komponen</th><th style="border:1px solid #ddd;padding:8px;text-align:center;width:7%;">1</th><th style="border:1px solid #ddd;padding:8px;text-align:center;width:7%;">2</th><th style="border:1px solid #ddd;padding:8px;text-align:center;width:7%;">3</th><th style="border:1px solid #ddd;padding:8px;text-align:center;width:7%;">4</th><th style="border:1px solid #ddd;padding:8px;text-align:center;width:7%;">Skor</th></tr></thead><tbody>`;
    currentInstrument.components.forEach((comp, index) => {
      const score = data.scores[`comp_${index}`] || 0;
      tableHTML += `<tr style="background:${index % 2 === 0 ? '#E8F5E9' : 'white'};"><td style="border:1px solid #ddd;padding:6px;text-align:center;">${index + 1}</td><td style="border:1px solid #ddd;padding:6px;">${comp.name}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${score === 1 ? '✓' : ''}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${score === 2 ? '✓' : ''}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${score === 3 ? '✓' : ''}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;">${score === 4 ? '✓' : ''}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;font-weight:bold;">${score}/4</td></tr>`;
    });
    tableHTML += `</tbody><tfoot><tr style="background:#C8E6C9;font-weight:bold;"><td colspan="2" style="border:1px solid #ddd;padding:8px;text-align:right;">Jumlah</td><td style="border:1px solid #ddd;padding:8px;text-align:center;">${Object.values(data.scores).filter(s => s === 1).length}</td><td style="border:1px solid #ddd;padding:8px;text-align:center;">${Object.values(data.scores).filter(s => s === 2).length}</td><td style="border:1px solid #ddd;padding:8px;text-align:center;">${Object.values(data.scores).filter(s => s === 3).length}</td><td style="border:1px solid #ddd;padding:8px;text-align:center;">${Object.values(data.scores).filter(s => s === 4).length}</td><td style="border:1px solid #ddd;padding:8px;text-align:center;">${data.totalScore}/${data.maxScore}</td></tr><tr style="background:#A5D6A7;font-weight:bold;"><td colspan="2" style="border:1px solid #ddd;padding:8px;text-align:right;">Persentase</td><td colspan="5" style="border:1px solid #ddd;padding:8px;text-align:center;font-size:1.1rem;">${data.percentage}%</td></tr><tr style="background:#81C784;color:white;font-weight:bold;"><td colspan="2" style="border:1px solid #ddd;padding:8px;text-align:right;">Predikat</td><td colspan="5" style="border:1px solid #ddd;padding:8px;text-align:center;font-size:1.1rem;">${data.predicate || '-'}</td></tr></tfoot></table></div>`;
  } else { tableHTML = '<p style="color:#999;text-align:center;padding:20px;">Detail tidak tersedia</p>'; }
  
  const date = new Date(data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt);
  document.getElementById('detailContent').innerHTML = `
    <div style="margin-bottom:18px;">
      <div class="detail-row"><span class="detail-label">Tanggal</span><span class="detail-value">${date.toLocaleDateString('id-ID', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</span></div>
      <div class="detail-row"><span class="detail-label">Madrasah</span><span class="detail-value">${data.schoolName || 'MAN BANTAENG'}</span></div>
      <div class="detail-row"><span class="detail-label">Supervisor</span><span class="detail-value">${data.supervisorName} (${getRoleLabel(data.supervisorRole)})</span></div>
      <div class="detail-row"><span class="detail-label">Yang Disupervisi</span><span class="detail-value">${data.superviseeName}</span></div>
      <div class="detail-row"><span class="detail-label">Mata Pelajaran</span><span class="detail-value">${data.subject || '-'}</span></div>
      <div class="detail-row"><span class="detail-label">Kelas/Semester</span><span class="detail-value">${data.classSemester || '-'}</span></div>
      <div class="detail-row"><span class="detail-label">Instrumen</span><span class="detail-value">${data.instrumentName || '-'}</span></div>
    </div>
    <h4 style="color:#1e40af;margin-bottom:10px;">Detail Penilaian</h4>
    ${tableHTML}
    ${data.notes ? `<h4 style="color:#1e40af;margin:16px 0 10px;">Catatan</h4><div style="background:#eff6ff;padding:14px;border-radius:8px;white-space:pre-wrap;">${data.notes}</div>` : ''}
    ${data.actionPlan ? `<h4 style="color:#1e40af;margin:16px 0 10px;">Rencana Tindak Lanjut</h4><div style="background:#eff6ff;padding:14px;border-radius:8px;white-space:pre-wrap;">${data.actionPlan}</div>` : ''}
  `;
  document.getElementById('detailModal').classList.add('active');
}

window.downloadPDF = async function(docId) {
  try {
    const id = docId || currentSupervision.id;
    const snap = await db.collection('supervisions').doc(id).get();
    if (!snap.exists) { alert('Data tidak ditemukan'); return; }
    const data = snap.data();
    let components = [];
    if (data.instrumentId) {
      const instSnap = await db.collection('supervision_instruments').doc(data.instrumentId).get();
      if (instSnap.exists) components = instSnap.data().components;
    }
    if (!window.jspdf) { alert('Library PDF sedang dimuat'); return; }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    let y = 15;
    
    pdf.setFontSize(14); pdf.setFont(undefined, 'bold');
    pdf.text('HASIL SUPERVISI PEMBELAJARAN', pageWidth / 2, y, { align: 'center' });
    y += 7;
    pdf.setFontSize(11);
    pdf.text('KURIKULUM BERBASIS CINTA (KBC)', pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    pdf.setFontSize(9); pdf.setFont(undefined, 'normal');
    const date = new Date(data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt);
    pdf.text(`Tanggal: ${date.toLocaleDateString('id-ID')}`, margin, y); y += 5;
    pdf.text(`Madrasah: ${data.schoolName || 'MAN BANTAENG'}`, margin, y); y += 5;
    pdf.text(`Supervisor: ${data.supervisorName}`, margin, y); y += 5;
    pdf.text(`Yang Disupervisi: ${data.superviseeName}`, margin, y); y += 5;
    pdf.text(`Mata Pelajaran: ${data.subject || '-'}`, margin, y); y += 5;
    pdf.text(`Kelas/Semester: ${data.classSemester || '-'}`, margin, y); y += 5;
    pdf.text(`Instrumen: ${data.instrumentName || '-'}`, margin, y); y += 10;
    
    if (components.length > 0) {
      pdf.setFontSize(8); pdf.setFont(undefined, 'bold');
      const colWidths = [8, 82, 11, 11, 11, 11, 14];
      const headers = ['No', 'Komponen', '1', '2', '3', '4', 'Skor'];
      const col1X = margin + colWidths[0] + colWidths[1] + colWidths[2] / 2;
      const col2X = margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] / 2;
      const col3X = margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] / 2;
      const col4X = margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] / 2;
      const scoreX = margin + colWidths.slice(0, 6).reduce((a, b) => a + b, 0) + colWidths[6] / 2;
      
      pdf.setFillColor(76, 175, 80); pdf.setTextColor(255, 255, 255);
      pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.3);
      for (let i = 0; i < headers.length; i++) {
        const xPos = margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        pdf.rect(xPos, y, colWidths[i], 7, 'FD');
        pdf.text(headers[i], xPos + colWidths[i] / 2, y + 4.5, { align: 'center' });
      }
      y += 7;
      
      pdf.setTextColor(0, 0, 0); pdf.setFont(undefined, 'normal');
      components.forEach((comp, index) => {
        const score = data.scores[`comp_${index}`] || 0;
        const rowHeight = 7;
        if (y > 245) {
          pdf.addPage(); y = 15;
          pdf.setFillColor(76, 175, 80); pdf.setTextColor(255, 255, 255);
          for (let i = 0; i < headers.length; i++) {
            const xPos = margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
            pdf.rect(xPos, y, colWidths[i], 7, 'FD');
            pdf.text(headers[i], xPos + colWidths[i] / 2, y + 4.5, { align: 'center' });
          }
          y += 7;
          pdf.setTextColor(0, 0, 0);
        }
        if (index % 2 === 0) {
          pdf.setFillColor(232, 245, 233);
          pdf.rect(margin, y, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
        }
        pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.3);
        pdf.rect(margin, y, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'S');
        pdf.text(String(index + 1), margin + 4, y + 4.5);
        const compText = pdf.splitTextToSize(comp.name, colWidths[1] - 2);
        pdf.text(compText[0], margin + colWidths[0] + 2, y + 4.5);
        
        const boxSize = 4;
        [col1X, col2X, col3X, col4X].forEach((cx, idx) => {
          if (score === idx + 1) {
            pdf.setFillColor(76, 175, 80);
            pdf.rect(cx - boxSize/2, y + 1.5, boxSize, boxSize, 'FD');
            pdf.setDrawColor(255, 255, 255); pdf.setLineWidth(0.6);
            pdf.line(cx - 1.5, y + 3.5, cx - 0.3, y + 4.8);
            pdf.line(cx - 0.3, y + 4.8, cx + 1.5, y + 2.0);
            pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.3);
          } else {
            pdf.setFillColor(255, 255, 255);
            pdf.rect(cx - boxSize/2, y + 1.5, boxSize, boxSize, 'FD');
          }
        });
        pdf.text(`${score}/4`, scoreX, y + 4.5, { align: 'center' });
        y += rowHeight;
      });
      
      y += 2;
      pdf.setFillColor(200, 230, 201);
      pdf.rect(margin, y, colWidths.reduce((a, b) => a + b, 0), 7, 'FD');
      pdf.setFont(undefined, 'bold');
      pdf.text('Jumlah', margin + colWidths[0] + colWidths[1] - 2, y + 4.5, { align: 'right' });
      pdf.text(String(Object.values(data.scores).filter(s => s === 1).length), col1X, y + 4.5, { align: 'center' });
      pdf.text(String(Object.values(data.scores).filter(s => s === 2).length), col2X, y + 4.5, { align: 'center' });
      pdf.text(String(Object.values(data.scores).filter(s => s === 3).length), col3X, y + 4.5, { align: 'center' });
      pdf.text(String(Object.values(data.scores).filter(s => s === 4).length), col4X, y + 4.5, { align: 'center' });
      pdf.text(`${data.totalScore}/${data.maxScore}`, scoreX, y + 4.5, { align: 'center' });
      y += 7;
      
      pdf.setFillColor(165, 214, 167);
      pdf.rect(margin, y, colWidths.reduce((a, b) => a + b, 0), 7, 'FD');
      pdf.text('Persentase', margin + colWidths[0] + colWidths[1] - 2, y + 4.5, { align: 'right' });
      pdf.text(`${data.percentage}%`, margin + colWidths[0] + colWidths[1] + 5, y + 4.5);
      y += 7;
      
      pdf.setFillColor(76, 175, 80); pdf.setTextColor(255, 255, 255);
      pdf.rect(margin, y, colWidths.reduce((a, b) => a + b, 0), 7, 'FD');
      pdf.text('Predikat', margin + colWidths[0] + colWidths[1] - 2, y + 4.5, { align: 'right' });
      pdf.text(data.predicate || '-', margin + colWidths[0] + colWidths[1] + 5, y + 4.5);
    }
    
    if (data.notes) {
      y += 10; if (y > 200) { pdf.addPage(); y = 15; }
      pdf.setFont(undefined, 'bold'); pdf.setTextColor(0, 0, 0);
      pdf.text('Catatan Khusus:', margin, y); y += 5;
      pdf.setFont(undefined, 'normal');
      const splitNotes = pdf.splitTextToSize(data.notes, pageWidth - 2 * margin);
      pdf.text(splitNotes, margin, y);
      y += splitNotes.length * 4 + 5;
    }
    
    if (data.actionPlan) {
      y += 5; if (y > 200) { pdf.addPage(); y = 15; }
      pdf.setFont(undefined, 'bold');
      pdf.text('Rencana Tindak Lanjut:', margin, y); y += 5;
      pdf.setFont(undefined, 'normal');
      const splitPlan = pdf.splitTextToSize(data.actionPlan, pageWidth - 2 * margin);
      pdf.text(splitPlan, margin, y);
      y += splitPlan.length * 4 + 15;
    }
    
    y += 10; if (y > 220) { pdf.addPage(); y = 15; }
    const signY = y;
    const leftSignX = margin + 20;
    const rightSignX = pageWidth - margin - 60;
    pdf.setFont(undefined, 'normal');
    pdf.text('Bantaeng, ' + date.toLocaleDateString('id-ID'), rightSignX, signY);
    pdf.text('Guru yang disupervisi', leftSignX, signY + 20);
    pdf.text('Supervisor', rightSignX, signY + 20);
    pdf.line(leftSignX, signY + 38, leftSignX + 50, signY + 38);
    pdf.line(rightSignX, signY + 38, rightSignX + 50, signY + 38);
    pdf.setFont(undefined, 'bold');
    pdf.text(data.superviseeName, leftSignX, signY + 43);
    pdf.text(data.supervisorName, rightSignX, signY + 43);
    
    pdf.save(`Supervisi_${data.superviseeName.replace(/\s+/g, '_')}_${date.toISOString().split('T')[0]}.pdf`);
  } catch (error) { alert('❌ Gagal download PDF: ' + error.message); }
};

window.previewDoc = async function(docId) {
  try {
    const snap = await db.collection('supervision_documents').doc(docId).get();
    if (!snap.exists) { alert('Dokumen tidak ditemukan'); return; }
    const data = snap.data();
    if (data.type === 'link') { window.open(data.link, '_blank'); }
    else if (data.fileExt === 'pdf') {
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>${data.nama}</title><style>body{margin:0;background:#f3f4f6;}.header{background:#3b82f6;color:white;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;}iframe{width:100%;height:calc(100vh - 50px);border:none;}</style></head><body><div class="header"><h3 style="margin:0;font-size:1rem;">📄 ${data.nama}</h3><a href="${data.fileData}" download="${data.nama}.${data.fileExt}" style="color:white;text-decoration:none;background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:6px;">⬇️ Download</a></div><iframe src="${data.fileData}"></iframe></body></html>`);
    } else { window.previewDocOffice(docId, data.fileExt); }
  } catch(e) { alert('❌ Gagal preview: ' + e.message); }
};

window.previewDocOffice = async function(docId, fileExt) {
  try {
    const snap = await db.collection('supervision_documents').doc(docId).get();
    if (!snap.exists) { alert('Dokumen tidak ditemukan'); return; }
    const data = snap.data();
    if (data.type === 'link') { window.open(data.link, '_blank'); return; }
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${data.nama}</title><style>body{margin:0;background:#f3f4f6;font-family:'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;}.card{background:white;padding:30px;border-radius:14px;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:500px;text-align:center;}.icon{font-size:4rem;margin-bottom:15px;}h3{color:#1e40af;margin-bottom:10px;}.btn{display:inline-block;background:#3b82f6;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin:5px;}</style></head><body><div class="card"><div class="icon">${fileExt==='pdf'?'📕':['doc','docx'].includes(fileExt)?'📘':['xls','xlsx'].includes(fileExt)?'📗':'📄'}</div><h3>${data.nama}</h3><p style="color:#6b7280;">File ${fileExt.toUpperCase()} tidak bisa di-preview langsung.</p><a href="${data.fileData}" download="${data.nama}.${data.fileExt}" class="btn">⬇️ Download</a><br><button onclick="window.close()" class="btn" style="background:#6b7280;">Tutup</button></div></body></html>`);
  } catch(e) { alert('❌ Gagal preview: ' + e.message); }
};

window.closeModal = function(id){ document.getElementById(id).classList.remove('active'); };
function openModal(id) { document.getElementById(id).classList.add('active'); }
function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
}

window.addEventListener('load', async () => {
  showLoading();
  await new Promise(resolve => setTimeout(resolve, 500));
  const isValid = await checkSipelitaSession();
  if (isValid) showDashboard();
});

window.viewDetail = viewDetail;
window.downloadPDF = downloadPDF;
