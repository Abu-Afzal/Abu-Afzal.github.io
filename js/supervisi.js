//  ══════════════════════════════════════════════════════════════════════════
//  SIPELITA DIGITAL - MODUL SUPERVISI AKADEMIK UTUH & TERINTEGRASI
//  Mendukung Kurikulum Berbasis Cinta (KBC) & Framework Evaluasi Resmi
//  ══════════════════════════════════════════════════════════════════════════

//  ══════════════════════════════════════════════
//  1. FIREBASE CONFIGURATION & INITIALIZATION
//  ══════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyB24GCKSTPGlN9HG9E6uhCECVa4ibCpKEA",
  authDomain: "sipelita-digital.firebaseapp.com",
  databaseURL: "https://sipelita-digital-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sipelita-digital",
  storageBucket: "sipelita-digital.firebasestorage.app",
  messagingSenderId: "787840817745",
  appId: "1:787840817745:web:e6b5237cfbb5e51be93670"
};

// Pastikan firebase diinisialisasi dengan aman
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Global State Variables
let currentUser = null;
let currentSupervision = null;
let selectedScheduleId = null;
let currentInstrument = null;
let editingInstrumentId = null;
let componentCounter = 0;

// Folder & Document State Variables
let editingFolderId = null;
let userFolders = [];
let currentFolderId = null;

//  ══════════════════════════════════════════════
//  2. SESSION MANAGEMENT & DASHBOARD ORIENTATION
//  ══════════════════════════════════════════════
function showLoading() {
  if (document.getElementById('loadingPage')) document.getElementById('loadingPage').style.display = 'block';
  if (document.getElementById('accessDeniedPage')) document.getElementById('accessDeniedPage').style.display = 'none';
  if (document.getElementById('dashboardPage')) document.getElementById('dashboardPage').style.display = 'none';
}

function showAccessDenied(message) {
  if (document.getElementById('loadingPage')) document.getElementById('loadingPage').style.display = 'none';
  if (document.getElementById('accessDeniedPage')) document.getElementById('accessDeniedPage').style.display = 'block';
  if (document.getElementById('dashboardPage')) document.getElementById('dashboardPage').style.display = 'none';
  if (document.getElementById('accessDeniedMessage')) document.getElementById('accessDeniedMessage').innerHTML = message;
}

async function checkSipelitaSession() {
  let sipelitaUser = sessionStorage.getItem('sipelita_user') || localStorage.getItem('sipelita_user');
  if (!sipelitaUser) { 
    showAccessDenied(`<strong> ⛔ Session SIPELITA tidak ditemukan!</strong><br><br>Anda belum login ke portal utama SIPELITA.`); 
    return false; 
  }
  
  let userData;
  try { 
    userData = JSON.parse(sipelitaUser); 
  } catch(e) { 
    showAccessDenied('<strong> ⚠️ Session SIPELITA tidak valid!</strong>'); 
    return false; 
  }
  
  if (!userData.email || !userData.nama) { 
    showAccessDenied('<strong> ⚠️ Data user tidak lengkap!</strong>'); 
    return false; 
  }

  try {
    const userDoc = await db.collection('users').doc(userData.email).get();
    if (!userDoc.exists) { 
      showAccessDenied(`<strong> ⚠️ Akun tidak ditemukan di database!</strong><br>Email: ${userData.email}`); 
      return false; 
    }
    const firestoreData = userDoc.data();
    currentUser = { 
      uid: userData.uid || userDoc.id, 
      email: firestoreData.email || userData.email, 
      nama: firestoreData.nama || userData.nama, 
      role: firestoreData.role || userData.role || 'guru', 
      fitur: firestoreData.fitur || userData.fitur || []
    };
  } catch(e) { 
    currentUser = { 
      uid: userData.uid || userData.email, 
      email: userData.email, 
      nama: userData.nama, 
      role: userData.role || 'guru', 
      fitur: userData.fitur || [] 
    }; 
  }

  if (!currentUser.fitur || !Array.isArray(currentUser.fitur) || !currentUser.fitur.includes('supervisi')) {
    showAccessDenied(`<strong> ⛔ Akun Anda tidak memiliki hak akses ke modul Supervisi Akademik!</strong><br><br>Hubungi Administrator.<br>Login aktif: <strong>${currentUser.nama}</strong> (${currentUser.email})`);
    return false;
  }
  
  sessionStorage.setItem('sipelita_user', JSON.stringify(currentUser));
  localStorage.setItem('sipelita_user', JSON.stringify(currentUser));
  return true;
}

window.switchTab = function(tabId) {
  try {
    const targetEl = window.event ? window.event.currentTarget : null;
    const parent = document.getElementById(tabId).closest('.card');
    
    parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    if (targetEl) targetEl.classList.add('active');
    const targetContent = document.getElementById(tabId);
    if (targetContent) targetContent.classList.add('active');
    
    // Lazy load data berdasarkan tab yang aktif
    if (tabId === 'tabJadwal') loadScheduleList();
    if (tabId === 'tabBuatJadwal') loadAvailableTeachers();
    if (tabId === 'tabSupervisi') { loadPendingSchedules(); loadInstruments(); }
    if (tabId === 'tabRiwayat') loadSupervisionList();
    if (tabId === 'tabJadwalSaya') loadMySchedule();
    if (tabId === 'tabUpload') { currentFolderId = null; loadFolderContents(); }
    if (tabId === 'tabHasil') loadMySupervisionList();
    if (tabId === 'tabKelolaInstrumen') loadInstrumentsList();
  } catch (err) {
    console.error("Tab Switch Error: ", err);
  }
};

function showDashboard() {
  document.getElementById('loadingPage').style.display = 'none';
  document.getElementById('accessDeniedPage').style.display = 'none';
  document.getElementById('dashboardPage').style.display = 'block';
  document.getElementById('userNameDisplay').textContent = currentUser.nama;
  document.getElementById('userRoleDisplay').textContent = getRoleLabel(currentUser.role);
  
  // Kontrol visibilitas navigasi menu berdasarkan Role level
  if (currentUser.role === 'admin') { 
    if(document.getElementById('adminBadge')) document.getElementById('adminBadge').style.display = 'block'; 
    if(document.getElementById('tabInstruments')) document.getElementById('tabInstruments').style.display = 'block'; 
  }
  
  if (currentUser.role === 'kepala') { 
    document.getElementById('supervisorTabs').style.display = 'block'; 
    document.getElementById('teacherTabs').style.display = 'none'; 
    loadScheduleList(); 
  } else if (currentUser.role === 'wakil') { 
    document.getElementById('supervisorTabs').style.display = 'block'; 
    document.getElementById('teacherTabs').style.display = 'block'; 
    loadScheduleList(); 
    loadMySchedule(); 
    currentFolderId = null; 
    loadFolderContents(); 
    loadMySupervisionList(); 
  } else { 
    document.getElementById('supervisorTabs').style.display = 'none'; 
    document.getElementById('teacherTabs').style.display = 'block'; 
    loadMySchedule(); 
    currentFolderId = null; 
    loadFolderContents(); 
    loadMySupervisionList(); 
  }
}

function getRoleLabel(role) { 
  return {
    kepala: ' 👑 Kepala Madrasah', 
    wakil: ' ⭐ Wakil Kepala Madrasah', 
    guru: ' 👨‍🏫 Guru', 
    admin: ' 👑 Administrator'
  }[role] || role; 
}

window.doLogout = function() { 
  if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) { 
    sessionStorage.removeItem('sipelita_user'); 
    localStorage.removeItem('sipelita_user');
    currentUser = null; 
    window.location.href = '../index.html'; 
  } 
};

//  ══════════════════════════════════════════════
//  3. MANAGEMENT JADWAL SUPERVISI (SUPERVISOR)
//  ══════════════════════════════════════════════
async function loadAvailableTeachers() {
  const select = document.getElementById('scheduleTeacher');
  if (!select) return;
  select.innerHTML = '<option value="">-- Memuat data guru... --</option>';
  try {
    let roleFilter = ['guru'];
    if (currentUser.role === 'kepala') roleFilter = ['guru', 'wakil'];
    
    const allUsersSnap = await db.collection('users').get();
    const allUsers = allUsersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const eligibleUsers = allUsers.filter(u => roleFilter.includes(u.role));
    
    const schedulesSnap = await db.collection('supervision_schedule').where('status', 'in', ['scheduled', 'in-progress']).get();
    const scheduledTeacherIds = schedulesSnap.docs.map(d => d.data().teacherId);
    
    const availableUsers = eligibleUsers.filter(u => !scheduledTeacherIds.includes(u.id));
    if (availableUsers.length === 0) { 
      select.innerHTML = '<option value="">-- Tidak ada pendidik yang tersedia --</option>'; 
      return; 
    }
    
    select.innerHTML = '<option value="">-- Pilih Guru / Pendidik --</option>';
    availableUsers.forEach(u => {
      const roleLabel = u.role === 'wakil' ? ' ⭐ Wakil Kepala' : ' 👨‍🏫 Guru';
      select.innerHTML += `<option value="${u.id}" data-nama="${u.nama}" data-email="${u.email || u.id}">${u.nama} (${roleLabel})</option>`;
    });
  } catch(e) { 
    select.innerHTML = '<option value="">-- Gagal memuat data pendidik --</option>'; 
  }
}

window.createSchedule = async function() {
  const teacherSelect = document.getElementById('scheduleTeacher');
  const teacherId = teacherSelect.value;
  const teacherName = teacherSelect.options[teacherSelect.selectedIndex]?.dataset.nama;
  const teacherEmail = teacherSelect.options[teacherSelect.selectedIndex]?.dataset.email;
  const scheduledDate = document.getElementById('scheduleDate').value;
  const notes = document.getElementById('scheduleNotes').value.trim();
  const alertBox = document.getElementById('alertSchedule');
  const btn = document.getElementById('btnCreateSchedule');
  
  if (!alertBox || !btn) return;
  alertBox.classList.remove('show');
  
  if (!teacherId || !scheduledDate) { 
    alertBox.textContent = ' ❌ Pilih guru/wakamad dan tanggal pelaksanaan supervisi!'; 
    alertBox.className = 'alert alert-error show';
    return; 
  }
  
  btn.disabled = true; 
  btn.innerHTML = '<span class="spinner"></span> Memproses Jadwal...';
  
  try {
    const teacherDoc = await db.collection('users').doc(teacherEmail).get();
    const teacherRole = teacherDoc.exists ? (teacherDoc.data().role || 'guru') : 'guru';
    
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
    
    alertBox.textContent = ` ✅ Jadwal berhasil disimpan! ${teacherName} akan disupervisi pada ${formatDate(scheduledDate)}`;
    alertBox.className = 'alert alert-success show';
    
    teacherSelect.value = ''; 
    document.getElementById('scheduleDate').value = ''; 
    document.getElementById('scheduleNotes').value = '';
    loadAvailableTeachers();
  } catch(e) { 
    alertBox.textContent = ' ❌ Gagal membuat jadwal: ' + e.message; 
    alertBox.className = 'alert alert-error show'; 
  }
  btn.disabled = false; 
  btn.textContent = ' Simpan Jadwal';
};

async function loadScheduleList() {
  const container = document.getElementById('scheduleList');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:20px;"><span class="spinner"></span> Memuat daftar jadwal...</div>';
  try {
    const snap = await db.collection('supervision_schedule').where('supervisorEmail', '==', currentUser.email).get();
    if (snap.empty) { 
      container.innerHTML = '<div class="empty-state"><div class="icon"> 📅 </div><p>Belum ada rancangan jadwal supervisi.</p></div>'; 
      return; 
    }
    
    const schedules = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    container.innerHTML = schedules.map(s => {
      const statusBadge = {
        'scheduled': '<span class="badge badge-scheduled"> 📅 Dijadwalkan</span>', 
        'in-progress': '<span class="badge badge-progress"> 🔄 Berlangsung</span>', 
        'completed': '<span class="badge badge-done"> ✅ Selesai</span>'
      }[s.status] || s.status;
      
      const roleIcon = s.teacherRole === 'wakil' ? ' ⭐ ' : ' 👨‍🏫 ';
      return `
        <div class="schedule-card" style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
          <div class="schedule-info">
            <div class="schedule-title" style="font-weight:600; color:#1f2937;">${roleIcon} ${s.teacherName}</div>
            <div class="schedule-detail" style="font-size:0.85rem; color:#6b7280; margin-top:4px;">
              📅 ${formatDate(s.scheduledDate)} | 👤 Supervisor: ${s.supervisorName} | ${statusBadge}
            </div>
            ${s.notes ? `<div class="schedule-detail" style="font-size:0.8rem; color:#4b5563; background:#f3f4f6; padding:4px 8px; border-radius:4px; margin-top:6px;">📝 ${s.notes}</div>` : ''}
          </div>
          <div class="schedule-actions" style="display:flex; gap:6px;">
            ${s.status === 'scheduled' ? `<button class="btn btn-warning btn-sm" onclick="updateScheduleStatus('${s.id}','in-progress')">Mulai</button>` : ''}
            ${s.status === 'scheduled' ? `<button class="btn btn-danger btn-sm" onclick="deleteSchedule('${s.id}')">Hapus</button>` : ''}
          </div>
        </div>`;
    }).join('');
  } catch(e) { 
    container.innerHTML = '<div class="empty-state"><div class="icon"> ❌ </div><p>Gagal memuat visualisasi jadwal.</p></div>'; 
  }
}

window.updateScheduleStatus = async function(scheduleId, status) { 
  if (!confirm(`Ubah status jadwal supervisi menjadi "${status}"?`)) return;
  try { 
    await db.collection('supervision_schedule').doc(scheduleId).update({ status: status, updatedAt: new Date().toISOString() }); 
    loadScheduleList(); 
  } catch(e) { 
    alert(' ❌ Gagal memperbarui status: ' + e.message); 
  } 
};

window.deleteSchedule = async function(scheduleId) { 
  if (!confirm('Anda yakin ingin membatalkan dan menghapus jadwal ini?')) return; 
  try { 
    await db.collection('supervision_schedule').doc(scheduleId).delete(); 
    loadScheduleList(); 
  } catch(e) { 
    alert(' ❌ Gagal menghapus jadwal: ' + e.message); 
  } 
};

//  ══════════════════════════════════════════════
//  4. PENGELOLAAN RUBRIK & INSTRUMEN (ADMIN)
//  ══════════════════════════════════════════════
window.openInstrumentModal = function() { 
  editingInstrumentId = null; 
  document.getElementById('instrumentModalTitle').textContent = ' ➕ Tambah Instrumen Baru'; 
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
  div.style = "background:#f9fafb; padding:15px; border-radius:8px; border:1px solid #e5e7eb; margin-bottom:12px;";
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <strong>Komponen Penilaian #${componentCounter}</strong>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeComponent(${componentCounter})"> 🗑️ Hapus</button>
    </div>
    <div class="form-group" style="margin-bottom:10px;">
      <label style="font-size:0.85rem; font-weight:600;">Nama Komponen *</label>
      <input type="text" class="component-name" placeholder="Contoh: Kesesuaian Alur Indikator dengan Tujuan" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc;">
    </div>
    <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
      <div class="form-group">
        <label style="font-size:0.8rem; color:#ef4444;">Level 1 (Kurang)</label>
        <textarea class="component-level1" style="width:100%; height:60px; border-radius:6px; border:1px solid #ccc;"></textarea>
      </div>
      <div class="form-group">
        <label style="font-size:0.8rem; color:#f59e0b;">Level 2 (Cukup)</label>
        <textarea class="component-level2" style="width:100%; height:60px; border-radius:6px; border:1px solid #ccc;"></textarea>
      </div>
    </div>
    <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
      <div class="form-group">
        <label style="font-size:0.8rem; color:#3b82f6;">Level 3 (Baik)</label>
        <textarea class="component-level3" style="width:100%; height:60px; border-radius:6px; border:1px solid #ccc;"></textarea>
      </div>
      <div class="form-group">
        <label style="font-size:0.8rem; color:#10b981;">Level 4 (Sangat Baik)</label>
        <textarea class="component-level4" style="width:100%; height:60px; border-radius:6px; border:1px solid #ccc;"></textarea>
      </div>
    </div>`;
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
  
  if (!name || !type) { alert(' ❌ Nama dan jenis rumpun instrumen wajib ditentukan!'); return; }
  
  const components = [];
  document.querySelectorAll('#componentsContainer .assessment-item').forEach((item, index) => { 
    const compName = item.querySelector('.component-name').value.trim(); 
    if (compName) { 
      components.push({ 
        id: `comp_${index + 1}`, 
        name: compName, 
        level1: item.querySelector('.component-level1').value.trim() || 'Tidak terpenuhi.', 
        level2: item.querySelector('.component-level2').value.trim() || 'Terpenuhi sebagian kecil.', 
        level3: item.querySelector('.component-level3').value.trim() || 'Terpenuhi sesuai standar.', 
        level4: item.querySelector('.component-level4').value.trim() || 'Terpenuhi melebihi standar mutu.' 
      }); 
    } 
  });
  
  if (components.length === 0) { alert(' ❌ Minimal harus menambahkan 1 komponen rubrik!'); return; }
  
  const instrumentData = { 
    name, 
    type, 
    description: desc, 
    components, 
    isActive: true, 
    createdBy: currentUser.email, 
    createdAt: new Date().toISOString(), 
    updatedAt: new Date().toISOString() 
  };
  
  try { 
    if (editingInstrumentId) { 
      await db.collection('supervision_instruments').doc(editingInstrumentId).update(instrumentData); 
      alert(' ✅ Instrumen berhasil diperbarui!'); 
    } else { 
      await db.collection('supervision_instruments').add(instrumentData);
      alert(' ✅ Instrumen baru berhasil ditambahkan!'); 
    } 
    closeModal('instrumentModal'); 
    loadInstrumentsList(); 
  } catch(e) { 
    alert(' ❌ Gagal menyimpan instrumen: ' + e.message); 
  }
};

async function loadInstrumentsList() {
  const container = document.getElementById('instrumentsList'); 
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:20px;"><span class="spinner"></span> Memuat bank instrumen...</div>';
  try {
    const snap = await db.collection('supervision_instruments').orderBy('createdAt', 'desc').get();
    if (snap.empty) { 
      container.innerHTML = '<div class="empty-state"><div class="icon"> 📋 </div><p>Belum ada ragam instrumen di database.</p></div>'; 
      return; 
    }
    const typeLabels = { 'administrasi': 'Administrasi', 'perencanaan': 'Perencanaan', 'pelaksanaan': 'Pelaksanaan', 'asesmen': 'Asesmen', 'bk': 'Bimbingan Konseling' };
    
    container.innerHTML = snap.docs.map(doc => { 
      const data = doc.data(); 
      return `
        <div class="instrument-card" style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:15px; margin-bottom:10px;">
          <div class="instrument-header" style="display:flex; justify-content:space-between; align-items:start;">
            <div>
              <div class="instrument-name" style="font-weight:600; font-size:1.05rem; color:#1f2937;">${data.name}</div>
              <div class="instrument-type" style="font-size:0.8rem; color:#2563eb; font-weight:500; margin-top:2px;">
                Rumpun: ${typeLabels[data.type] || data.type} • 📊 ${data.components.length} Komponen Rubrik
              </div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-warning btn-sm" onclick="editInstrument('${doc.id}')">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteInstrument('${doc.id}')">🗑️ Hapus</button>
            </div>
          </div>
          ${data.description ? `<div style="margin-top:8px; color:#6b7280; font-size:0.85rem; background:#f9fafb; padding:6px 10px; border-radius:6px;">${data.description}</div>` : ''}
        </div>`; 
    }).join('');
  } catch(e) { 
    container.innerHTML = '<div class="empty-state"><div class="icon"> ❌ </div><p>Gagal memuat instrumen.</p></div>'; 
  }
}

window.editInstrument = async function(docId) { 
  try {
    const snap = await db.collection('supervision_instruments').doc(docId).get(); 
    if (!snap.exists) return; 
    const data = snap.data(); 
    editingInstrumentId = docId;
    
    document.getElementById('instrumentModalTitle').textContent = ' ✏️ Edit Struktur Instrumen'; 
    document.getElementById('instrumentName').value = data.name; 
    document.getElementById('instrumentType').value = data.type; 
    document.getElementById('instrumentDesc').value = data.description || '';
    
    const container = document.getElementById('componentsContainer');
    container.innerHTML = ''; 
    componentCounter = 0; 
    
    data.components.forEach(comp => { 
      componentCounter++; 
      const div = document.createElement('div'); 
      div.className = 'assessment-item'; 
      div.id = `component-${componentCounter}`; 
      div.style = "background:#f9fafb; padding:15px; border-radius:8px; border:1px solid #e5e7eb; margin-bottom:12px;";
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <strong>Komponen Penilaian #${componentCounter}</strong>
          <button type="button" class="btn btn-danger btn-sm" onclick="removeComponent(${componentCounter})"> 🗑️ Hapus</button>
        </div>
        <div class="form-group" style="margin-bottom:10px;">
          <label style="font-size:0.85rem; font-weight:600;">Nama Komponen *</label>
          <input type="text" class="component-name" value="${comp.name}" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc;">
        </div>
        <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
          <div class="form-group">
            <label style="font-size:0.8rem; color:#ef4444;">Level 1</label>
            <textarea class="component-level1" style="width:100%; height:60px; border-radius:6px; border:1px solid #ccc;">${comp.level1 || ''}</textarea>
          </div>
          <div class="form-group">
            <label style="font-size:0.8rem; color:#f59e0b;">Level 2</label>
            <textarea class="component-level2" style="width:100%; height:60px; border-radius:6px; border:1px solid #ccc;">${comp.level2 || ''}</textarea>
          </div>
        </div>
        <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div class="form-group">
            <label style="font-size:0.8rem; color:#3b82f6;">Level 3</label>
            <textarea class="component-level3" style="width:100%; height:60px; border-radius:6px; border:1px solid #ccc;">${comp.level3 || ''}</textarea>
          </div>
          <div class="form-group">
            <label style="font-size:0.8rem; color:#10b981;">Level 4</label>
            <textarea class="component-level4" style="width:100%; height:60px; border-radius:6px; border:1px solid #ccc;">${comp.level4 || ''}</textarea>
          </div>
        </div>`; 
      container.appendChild(div); 
    }); 
    openModal('instrumentModal'); 
  } catch(e) { alert('Gagal memuat komponen: ' + e.message); }
};

window.deleteInstrument = async function(docId) { 
  if (!confirm('Hapus instrumen rubrik ini secara permanen dari pangkalan data?')) return; 
  try { 
    await db.collection('supervision_instruments').doc(docId).delete(); 
    loadInstrumentsList(); 
  } catch(e) { alert(' ❌ Gagal menghapus: ' + e.message); } 
};

window.importDefaultInstruments = async function() {
  if (!confirm('Import paket instrumen default Kurikulum Berbasis Cinta (KBC)? Tindakan ini akan menambahkan 5 instrumen standar nasional dengan rubrik lengkap secara otomatis.')) return;
  
  const defaultInstruments = [
    { 
      name: "Supervisi Administrasi Pembelajaran Pendidik", 
      type: "administrasi", 
      description: "Instrumen penilaian kelengkapan, kesesuaian, dan legalitas dokumen administrasi mengajar guru.", 
      components: [ 
        { name: "Kalender Pendidikan Khusus Madrasah & Analisis Alokasi Waktu", level1: "Tidak tersedia", level2: "Tersedia, namun belum dianalisis kesesuaian efektifnya", level3: "Tersedia, lengkap dianalisis berdasarkan jam efektif kurikulum", level4: "Sangat lengkap, adaptif terhadap KBC dan disahkan pimpinan" }, 
        { name: "Program Tahunan (Prota) & Program Semester (Prosem)", level1: "Tidak tersedia", level2: "Tersedia butuh penyelarasan distribusi materi", level3: "Tersedia lengkap, distribusi target KD/TP presisi", level4: "Tersedia, mengintegrasikan proyek Profil Pelajar secara runtut" },
        { name: "Modul Ajar Pembelajaran / RPP Aktif Berbasis IT", level1: "Tidak tersedia", level2: "Tersedia namun hasil salinan massal belum kontekstual", level3: "Tersedia lengkap, berpusat pada murid dan terstruktur", level4: "Inovatif, adaptif KSE (Sosial-Emosional), multimedia kaya" }
      ] 
    },
    { 
      name: "Supervisi Perencanaan Pembelajaran (Desain MA/RPP)", 
      type: "perencanaan", 
      description: "Menilai kompetensi guru merancang skenario pembelajaran berdiferensiasi.", 
      components: [
        { name: "Perumusan Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)", level1: "Tidak dirumuskan", level2: "Dirumuskan secara umum tanpa grading deskriptor", level3: "Dirumuskan secara spesifik dan operasional", level4: "Komprehensif, mencakup asesmen diagnostik & performa" },
        { name: "Integrasi Kompetensi Sosial Emosional (KSE / CASEL Framework)", level1: "Belum terintegrasi", level2: "Disebutkan dalam modul namun belum mewarnai langkah inti", level3: "Terintegrasi jelas dalam alur apersepsi maupun refleksi", level4: "Tercermin kuat dalam interaksi, role-modeling, dan metode kelompok" }
      ]
    },
    { 
      name: "Supervisi Pelaksanaan Pembelajaran (Observasi Kelas)", 
      type: "pelaksanaan", 
      description: "Penilaian langsung saat guru mengajar, mengelola kelas, dan mengaktifkan siswa.", 
      components: [
        { name: "Kegiatan Pendahuluan (Apersepsi & Motivasi)", level1: "Langsung masuk materi pokok", level2: "Apersepsi ringkas tanpa mengaitkan konteks riil siswa", level3: "Menarik, menyampaikan tujuan & mengaitkan materi prasyarat", level4: "Sangat inspiratif, memicu critical thinking semenjak awal" },
        { name: "Penerapan Strategi Pembelajaran Berpusat pada Siswa (Student-Centered)", level1: "Metode ceramah monoton (Teacher-centered)", level2: "Mulai melibatkan tanya jawab namun didominasi siswa tertentu", level3: "Menerapkan active learning / problem-based secara merata", level4: "Siswa mengeksplorasi mandiri, berdiferensiasi proses & produk" }
      ]
    },
    { 
      name: "Supervisi Asesmen & Penilaian Pembelajaran", 
      type: "asesmen", 
      description: "Mengevaluasi metode guru dalam mengukur capaian belajar serta pemberian feedback.", 
      components: [
        { name: "Pelaksanaan Asesmen Formatif & Umpan Balik Kontruktif", level1: "Hanya ujian sumatif akhir", level2: "Asesmen formatif dilakukan sekadar cek lisan tanpa tindak lanjut", level3: "Menerapkan asesmen formatif berkala dengan catatan korektif", level4: "Umpan balik real-time, siswa melakukan self/peer assessment" }
      ]
    },
    { 
      name: "Supervisi Pelayanan Bimbingan Konseling (Guru BK)", 
      type: "bk", 
      description: "Khusus mengevaluasi efektivitas program dan penanganan psikososial siswa oleh Guru BK.", 
      components: [
        { name: "Penyusunan Program Layanan & Asesmen Kebutuhan (Need Assessment)", level1: "Tidak menyusun program resmi", level2: "Program ada namun tidak berbasis instrumen masalah siswa", level3: "Program disusun matang menggunakan hasil ITP / AUM siswa", level4: "Program kolaboratif dengan wali kelas & komite secara berkala" }
      ]
    }
  ];

  try {
    for (const inst of defaultInstruments) {
      await db.collection('supervision_instruments').add({
        ...inst,
        isActive: true,
        createdBy: currentUser.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    alert(' ✅ Sukses mengimpor 5 Paket Instrumen Mutu KBC!');
    loadInstrumentsList();
  } catch (err) {
    alert(' ❌ Gagal impor instrumen: ' + err.message);
  }
};

//  ══════════════════════════════════════════════
//  5. EKSEKUSI PENILAIAN SUPERVISI AKADEMIK
//  ══════════════════════════════════════════════
async function loadPendingSchedules() {
  const select = document.getElementById('supervisionSchedule');
  if(!select) return;
  select.innerHTML = '<option value="">-- Memuat jadwal aktif... --</option>';
  try {
    const snap = await db.collection('supervision_schedule')
      .where('supervisorEmail', '==', currentUser.email)
      .where('status', 'in', ['scheduled', 'in-progress']).get();
      
    if (snap.empty) { 
      select.innerHTML = '<option value="">-- Tidak ada jadwal aktif/berlangsung --</option>'; 
      if(document.getElementById('scheduleDetailArea')) document.getElementById('scheduleDetailArea').style.display = 'none'; 
      return; 
    }
    const schedules = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    select.innerHTML = '<option value="">-- Pilih Guru & Jadwal --</option>';
    schedules.forEach(s => { 
      select.innerHTML += `<option value="${s.id}" data-teacher="${s.teacherName}" data-email="${s.teacherEmail}" data-date="${s.scheduledDate}">${s.teacherName} - ${formatDate(s.scheduledDate)}</option>`; 
    });
  } catch(e) { select.innerHTML = '<option value="">-- Error pemuatan --</option>'; }
}

async function loadInstruments() {
  const select = document.getElementById('supervisionInstrument');
  if(!select) return;
  select.innerHTML = '<option value="">-- Memuat berkas rumpun instrumen... --</option>';
  try {
    const snap = await db.collection('supervision_instruments').where('isActive', '==', true).get();
    if (snap.empty) { select.innerHTML = '<option value="">-- Tidak ada rumpun instrumen aktif --</option>'; return; }
    select.innerHTML = '<option value="">-- Pilih Format Rumpun Instrumen --</option>';
    snap.docs.forEach(doc => { select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`; });
  } catch(e) { select.innerHTML = '<option value="">-- Error instrumen --</option>'; }
}

window.loadScheduleDetail = async function() {
  const select = document.getElementById('supervisionSchedule');
  const scheduleId = select?.value;
  const detailArea = document.getElementById('scheduleDetailArea');
  if (!scheduleId || !detailArea) { if(detailArea) detailArea.style.display = 'none'; return; }
  
  selectedScheduleId = scheduleId; 
  detailArea.style.display = 'block';
  
  const teacherEmail = select.options[select.selectedIndex].dataset.email;
  const docContainer = document.getElementById('teacherDocuments');
  docContainer.innerHTML = '<div style="text-align:center;padding:10px;"><span class="spinner"></span> Menghubungkan ke portofolio digital pendidik...</div>';
  
  try {
    const snap = await db.collection('supervision_documents').where('userEmail', '==', teacherEmail).get();
    if (snap.empty) { 
      docContainer.innerHTML = '<div class="empty-state" style="padding:15px;"><div class="icon"> 📭 </div><p>Pendidik belum menautkan berkas administrasi apapun.</p></div>'; 
      return; 
    }
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docContainer.innerHTML = docs.map(d => {
      const icon = d.type === 'link' ? ' 🔗 ' : (d.fileExt === 'pdf' ? ' 📕 ' : ['doc', 'docx'].includes(d.fileExt) ? ' 📘 ' : ['xls', 'xlsx'].includes(d.fileExt) ? ' 📗 ' : ' 📄 ');
      let btnLihat = d.type === 'link' ? `<a href="${d.link}" target="_blank" class="btn btn-warning btn-sm">👁️ Buka Link</a>` : (d.fileExt === 'pdf' ? `<button class="btn btn-warning btn-sm" onclick="previewDoc('${d.id}')">👁️ Lihat</button>` : `<button class="btn btn-warning btn-sm" onclick="previewDocOffice('${d.id}','${d.fileExt}')">👁️ Preview</button>`);
      let btnUnduh = d.type !== 'link' ? `<button class="btn btn-primary btn-sm" onclick="downloadDoc('${d.id}','${d.nama.replace(/'/g,"\\'")}','${d.fileExt}')">⬇ Unduh</button>` : '';
      const roleBadge = d.userRole === 'wakil' ? '<span class="badge" style="background:#ede9fe;color:#5b21b6;margin-left:5px;">⭐ Wakamad</span>' : '';
      
      return `
        <div class="doc-item" style="display:flex; justify-content:space-between; align-items:center; background:#f9fafb; padding:10px; border-radius:8px; margin-bottom:6px; border:1px solid #f0f0f0;">
          <div class="doc-info" style="display:flex; align-items:center; gap:8px;">
            <div style="font-size:1.3rem;">${icon}</div>
            <div>
              <div class="doc-name" style="font-weight:600; font-size:0.9rem;">${d.nama} ${roleBadge}</div>
              <div class="doc-meta" style="font-size:0.75rem; color:#6b7280;">Kategori: ${d.kategori} • Diunggah: ${new Date(d.createdAt).toLocaleDateString('id-ID')}</div>
            </div>
          </div>
          <div style="display:flex; gap:4px;">${btnLihat}${btnUnduh}</div>
        </div>`;
    }).join('');
  } catch(e) { docContainer.innerHTML = '<div class="empty-state" style="padding:15px;"><p>Gagal memetakan portofolio digital.</p></div>'; }
};

window.selectInstrument = async function() {
  const instrumentId = document.getElementById('supervisionInstrument').value;
  const container = document.getElementById('instrumentAssessmentArea');
  if (!instrumentId || !container) { if(container) container.innerHTML = ''; currentInstrument = null; return; }
  
  container.innerHTML = '<div style="text-align:center;padding:20px;"><span class="spinner"></span> Menyusun lembar instrumen dinamis...</div>';
  try {
    const doc = await db.collection('supervision_instruments').doc(instrumentId).get();
    if (!doc.exists) { container.innerHTML = '<p>Kriteria penilaian tidak ditemukan.</p>'; return; }
    
    currentInstrument = { id: doc.id, ...doc.data() };
    let html = `
      <div class="table-wrap" style="margin-top:15px; overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
          <thead>
            <tr style="background:#2563eb; color:white; text-align:center;">
              <th style="padding:10px; border:1px solid #ddd; width:5%;">No</th>
              <th style="padding:10px; border:1px solid #ddd; width:45%;">Komponen Indikator Mutu</th>
              <th style="padding:10px; border:1px solid #ddd; width:12.5%;">Skor 1<br>(Kurang)</th>
              <th style="padding:10px; border:1px solid #ddd; width:12.5%;">Skor 2<br>(Cukup)</th>
              <th style="padding:10px; border:1px solid #ddd; width:12.5%;">Skor 3<br>(Baik)</th>
              <th style="padding:10px; border:1px solid #ddd; width:12.5%;">Skor 4<br>(Sangat Baik)</th>
            </tr>
          </thead>
          <tbody>`;
          
    currentInstrument.components.forEach((comp, idx) => {
      html += `
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px; border:1px solid #ddd; text-align:center; font-weight:bold;">${idx + 1}</td>
          <td style="padding:10px; border:1px solid #ddd;">
            <div style="font-weight:600; color:#1f2937;">${comp.name}</div>
          </td>
          <td style="padding:10px; border:1px solid #ddd; text-align:center; background:#fffdfd;" title="${comp.level1}">
            <input type="radio" name="score_${idx}" data-row="${idx}" value="1" onclick="calculateScore()" style="transform:scale(1.2); cursor:pointer;">
            <div style="font-size:0.7rem; color:#ef4444; margin-top:5px; max-height:40px; overflow:hidden;">${comp.level1.substring(0,35)}...</div>
          </td>
          <td style="padding:10px; border:1px solid #ddd; text-align:center; background:#fffdf7;" title="${comp.level2}">
            <input type="radio" name="score_${idx}" data-row="${idx}" value="2" onclick="calculateScore()" style="transform:scale(1.2); cursor:pointer;">
            <div style="font-size:0.7rem; color:#f59e0b; margin-top:5px; max-height:40px; overflow:hidden;">${comp.level2.substring(0,35)}...</div>
          </td>
          <td style="padding:10px; border:1px solid #ddd; text-align:center; background:#f7faff;" title="${comp.level3}">
            <input type="radio" name="score_${idx}" data-row="${idx}" value="3" onclick="calculateScore()" style="transform:scale(1.2); cursor:pointer;">
            <div style="font-size:0.7rem; color:#3b82f6; margin-top:5px; max-height:40px; overflow:hidden;">${comp.level3.substring(0,35)}...</div>
          </td>
          <td style="padding:10px; border:1px solid #ddd; text-align:center; background:#f6fff9;" title="${comp.level4}">
            <input type="radio" name="score_${idx}" data-row="${idx}" value="4" onclick="calculateScore()" style="transform:scale(1.2); cursor:pointer;">
            <div style="font-size:0.7rem; color:#10b981; margin-top:5px; max-height:40px; overflow:hidden;">${comp.level4.substring(0,35)}...</div>
          </td>
        </tr>`;
    });
    html += `</tbody></table></div>`;
    container.innerHTML = html;
    calculateScore();
  } catch(e) { container.innerHTML = '<p>Gagal memilah komponen rubrik.</p>'; }
};

window.calculateScore = function() {
  if (!currentInstrument || !currentInstrument.components) return;
  let count1 = 0, count2 = 0, count3 = 0, count4 = 0, totalScore = 0;
  
  currentInstrument.components.forEach((comp, idx) => {
    const selected = document.querySelector(`input[name="score_${idx}"]:checked`);
    if (selected) {
      const val = parseInt(selected.value);
      totalScore += val;
      if (val === 1) count1++;
      if (val === 2) count2++;
      if (val === 3) count3++;
      if (val === 4) count4++;
    }
  });
  
  if(document.getElementById('countLevel1')) document.getElementById('countLevel1').textContent = count1;
  if(document.getElementById('countLevel2')) document.getElementById('countLevel2').textContent = count2;
  if(document.getElementById('countLevel3')) document.getElementById('countLevel3').textContent = count3;
  if(document.getElementById('countLevel4')) document.getElementById('countLevel4').textContent = count4;
  if(document.getElementById('totalScoreDisplay')) document.getElementById('totalScoreDisplay').textContent = totalScore;
  
  const maxScore = currentInstrument.components.length * 4;
  const percentage = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(0) : 0;
  if(document.getElementById('percentageDisplay')) document.getElementById('percentageDisplay').textContent = percentage + '%';
  
  let predicate = '-';
  if(totalScore > 0) {
    if (percentage >= 91) predicate = 'Sangat Baik';
    else if (percentage >= 81) predicate = 'Baik';
    else if (percentage >= 71) predicate = 'Cukup';
    else predicate = 'Kurang';
  }
  if(document.getElementById('predicateDisplay')) document.getElementById('predicateDisplay').textContent = predicate;
};

window.saveSupervision = async function() {
  if (!selectedScheduleId || !currentInstrument) { alert(' ❌ Selesaikan seleksi jadwal dan format instrumen penilaian!'); return; }
  const notes = document.getElementById('supervisionNotes').value.trim();
  const actionPlan = document.getElementById('actionPlan').value.trim();
  const alertBox = document.getElementById('alertSup');
  const btn = document.getElementById('btnSaveSup');
  
  if(!alertBox || !btn) return;
  alertBox.classList.remove('show');
  
  const scores = {};
  let totalScore = 0;
  let maxScore = currentInstrument.components.length * 4;
  let complete = true;
  
  currentInstrument.components.forEach((comp, index) => {
    const selected = document.querySelector(`input[name="score_${index}"]:checked`);
    if (!selected) { complete = false; } 
    else {
      scores[`comp_${index + 1}`] = parseInt(selected.value);
      totalScore += parseInt(selected.value);
    }
  });
  
  if (!complete) {
    alertBox.textContent = ' ❌ Penilaian belum tuntas! Seluruh komponen matriks rubrik wajib ditentukan skoringnya.';
    alertBox.className = 'alert alert-error show';
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Mengunci & Menyimpan Berita Acara...';
  
  try {
    const schedDoc = await db.collection('supervision_schedule').doc(selectedScheduleId).get();
    const schedData = schedDoc.data();
    const percentage = Math.round((totalScore / maxScore) * 100);
    
    let predicate = 'Kurang';
    if (percentage >= 91) predicate = 'Sangat Baik';
    else if (percentage >= 81) predicate = 'Baik';
    else if (percentage >= 71) predicate = 'Cukup';
    
    await db.collection('supervisions').add({
      scheduleId: selectedScheduleId,
      instrumentId: currentInstrument.id,
      instrumentName: currentInstrument.name,
      instrumentType: currentInstrument.type,
      supervisorId: currentUser.uid,
      supervisorName: currentUser.nama,
      supervisorEmail: currentUser.email,
      supervisorRole: currentUser.role,
      superviseeId: schedData.teacherId,
      superviseeName: schedData.teacherName,
      superviseeEmail: schedData.teacherEmail,
      superviseeRole: schedData.teacherRole,
      scores,
      totalScore,
      maxScore,
      percentage,
      predicate,
      notes,
      actionPlan,
      schoolName: 'MAN BANTAENG',
      createdAt: new Date().toISOString()
    });
    
    await db.collection('supervision_schedule').doc(selectedScheduleId).update({
      status: 'completed',
      updatedAt: new Date().toISOString()
    });
    
    alertBox.textContent = ' ✅ Penilaian Berhasil Disimpan & Status Jadwal Terupdate Menjadi Selesai!';
    alertBox.className = 'alert alert-success show';
    
    // Clear Form inputs
    document.getElementById('supervisionSchedule').value = '';
    document.getElementById('supervisionInstrument').value = '';
    document.getElementById('instrumentAssessmentArea').innerHTML = '';
    document.getElementById('supervisionNotes').value = '';
    document.getElementById('actionPlan').value = '';
    
    ['countLevel1', 'countLevel2', 'countLevel3', 'countLevel4', 'totalScoreDisplay', 'percentageDisplay', 'predicateDisplay'].forEach(id => {
      if(document.getElementById(id)) document.getElementById(id).textContent = '-';
    });
    
    loadPendingSchedules();
  } catch(e) {
    alertBox.textContent = ' ❌ Kendala tulis basis data: ' + e.message;
    alertBox.className = 'alert alert-error show';
  }
  btn.disabled = false;
  btn.textContent = ' 💾 Simpan Hasil Supervisi';
};

//  ══════════════════════════════════════════════
//  6. HISTORI, PORTAL DETAIL & EKSPOR LAPORAN PDF
//  ══════════════════════════════════════════════
async function loadSupervisionList() {
  const tbody = document.getElementById('supervisionHistoryBody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;"><span class="spinner"></span> Mengakses riwayat penilaian...</td></tr>';
  try {
    const snap = await db.collection('supervisions').where('supervisorEmail', '==', currentUser.email).get();
    if(snap.empty) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px;">Belum mengeksekusi penilaian supervisi</td></tr>';
      return;
    }
    const docs = snap.docs.sort((a,b) => new Date(b.data().createdAt) - new Date(a.data().createdAt));
    tbody.innerHTML = docs.map(d => {
      const data = d.data();
      return `
        <tr>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${new Date(data.createdAt).toLocaleDateString('id-ID')}</td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb; font-weight:600;">${data.superviseeName}</td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${data.instrumentName || '-'}</td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;"><strong>${data.totalScore}/${data.maxScore} (${data.percentage}%)</strong></td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;"><span class="badge badge-done">Selesai</span></td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb; display:flex; gap:4px; justify-content:center;">
            <button class="btn btn-primary btn-sm" onclick="viewDetail('${d.id}')">👁️ Lihat</button>
            <button class="btn btn-warning btn-sm" onclick="downloadPDF('${d.id}')">📄 PDF</button>
          </td>
        </tr>`;
    }).join('');
  } catch(e) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Gagal sinkronisasi data histori.</td></tr>'; }
}

async function loadMySupervisionList() {
  const tbody = document.getElementById('mySupervisionHistoryBody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;"><span class="spinner"></span> Menghimpun lembar penilaian rapor Anda...</td></tr>';
  try {
    const snap = await db.collection('supervisions').where('superviseeEmail', '==', currentUser.email).get();
    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:20px;">Belum ada berkas pelaporan supervisi untuk Anda.</td></tr>';
      return;
    }
    const docs = snap.docs.sort((a,b) => new Date(b.data().createdAt) - new Date(a.data().createdAt));
    tbody.innerHTML = docs.map(d => {
      const data = d.data();
      return `
        <tr>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${new Date(data.createdAt).toLocaleDateString('id-ID')}</td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb; font-weight:600;">${data.supervisorName}</td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb;">${data.instrumentName}</td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;"><strong>${data.totalScore}/${data.maxScore} (${data.percentage}%)</strong></td>
          <td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;">
            <button class="btn btn-primary btn-sm" onclick="viewDetail('${d.id}')">👁️ Rincian Rubrik</button>
          </td>
        </tr>`;
    }).join('');
  } catch(e) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Gagal memuat arsip penilaian pribadi.</td></tr>'; }
}

window.viewDetail = async function(docId) { 
  try { 
    const snap = await db.collection('supervisions').doc(docId).get(); 
    if (!snap.exists) { alert('Dokumen lembar hasil tidak ditemukan'); return; } 
    currentSupervision = { id: docId, ...snap.data() }; 
    
    if (currentSupervision.instrumentId) { 
      const instSnap = await db.collection('supervision_instruments').doc(currentSupervision.instrumentId).get(); 
      if (instSnap.exists) { currentInstrument = { id: instSnap.id, ...instSnap.data() }; } 
    } 
    showDetailModal(); 
  } catch (error) { alert(' ❌ Gagal memuat lembar detail: ' + error.message); } 
};

function showDetailModal() {
  const data = currentSupervision;
  const date = new Date(data.createdAt);
  let tableHTML = '';
  
  if (currentInstrument && currentInstrument.components) {
    tableHTML = `
      <div class="table-wrap" style="margin:15px 0; overflow-x:auto;">
        <table style="border-collapse:collapse; width:100%; font-size:0.85rem; border:1px solid #ddd;">
          <thead>
            <tr style="background:#10b981; color:white; text-align:center;">
              <th style="border:1px solid #ddd; padding:8px; width:5%;">No</th>
              <th style="border:1px solid #ddd; padding:8px; text-align:left; width:65%;">Komponen Penilaian</th>
              <th style="border:1px solid #ddd; padding:8px; width:6%;">1</th>
              <th style="border:1px solid #ddd; padding:8px; width:6%;">2</th>
              <th style="border:1px solid #ddd; padding:8px; width:6%;">3</th>
              <th style="border:1px solid #ddd; padding:8px; width:6%;">4</th>
              <th style="border:1px solid #ddd; padding:8px; width:12%;">Skor Terpilih</th>
            </tr>
          </thead>
          <tbody>`;
          
    currentInstrument.components.forEach((comp, idx) => {
      const score = data.scores ? data.scores[`comp_${idx + 1}`] : null;
      tableHTML += `
        <tr>
          <td style="border:1px solid #ddd; padding:8px; text-align:center; font-weight:bold;">${idx + 1}</td>
          <td style="border:1px solid #ddd; padding:8px;"><strong>${comp.name}</strong></td>
          <td style="border:1px solid #ddd; padding:8px; text-align:center; background:${score===1?'#fee2e2':''}; font-weight:${score===1?'bold':''};">${score===1?'✔️':''}</td>
          <td style="border:1px solid #ddd; padding:8px; text-align:center; background:${score===2?'#fef3c7':''}; font-weight:${score===2?'bold':''};">${score===2?'✔️':''}</td>
          <td style="border:1px solid #ddd; padding:8px; text-align:center; background:${score===3?'#dbeafe':''}; font-weight:${score===3?'bold':''};">${score===3?'✔️':''}</td>
          <td style="border:1px solid #ddd; padding:8px; text-align:center; background:${score===4?'#d1fae5':''}; font-weight:${score===4?'bold':''};">${score===4?'✔️':''}</td>
          <td style="border:1px solid #ddd; padding:8px; text-align:center; font-weight:700; color:#111827;">Skor: ${score || '-'}/4</td>
        </tr>`;
    });
    tableHTML += `</tbody></table></div>`;
  }
  
  document.getElementById('detailContent').innerHTML = `
    <div style="font-family:sans-serif; color:#374151; line-height:1.5;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:#f3f4f6; padding:12px; border-radius:8px; margin-bottom:15px; font-size:0.85rem;">
        <div><strong>Tanggal Supervisi:</strong> ${date.toLocaleDateString('id-ID', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</div>
        <div><strong>Lembaga/Madrasah:</strong> ${data.schoolName || 'MAN BANTAENG'}</div>
        <div><strong>Nama Supervisor:</strong> ${data.supervisorName}</div>
        <div><strong>Guru Disupervisi:</strong> ${data.superviseeName}</div>
        <div style="grid-column:1/-1; margin-top:5px; border-top:1px solid #ccc; padding-top:5px;"><strong>Nama Instrumen:</strong> <span style="color:#2563eb; font-weight:600;">${data.instrumentName}</span></div>
      </div>
      ${tableHTML}
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px; margin:15px 0; display:flex; justify-content:space-around; text-align:center;">
        <div><div style="font-size:0.75rem; color:#4b5563;">Kalkulasi Skor</div><div style="font-size:1.2rem; font-weight:700;">${data.totalScore} / ${data.maxScore}</div></div>
        <div><div style="font-size:0.75rem; color:#4b5563;">Persentase Kelulusan</div><div style="font-size:1.2rem; font-weight:700; color:#2563eb;">${data.percentage}%</div></div>
        <div><div style="font-size:0.75rem; color:#4b5563;">Predikat Kualitatif</div><div style="font-size:1.2rem; font-weight:700; color:#16a34a;">${data.predicate}</div></div>
      </div>
      <div style="margin-top:12px; background:#fff; border:1px solid #e5e7eb; padding:10px; border-radius:6px;">
        <strong>Catatan Khusus Komparatif Hasil Observasi:</strong>
        <p style="margin:5px 0 0 0; font-size:0.85rem; color:#4b5563; white-space:pre-wrap;">${data.notes || 'Tidak ada catatan khusus.'}</p>
      </div>
      <div style="margin-top:12px; background:#fff; border:1px solid #e5e7eb; padding:10px; border-radius:6px;">
        <strong>Rencana Tindak Lanjut (RTL) Pasca Supervisi:</strong>
        <p style="margin:5px 0 0 0; font-size:0.85rem; color:#4b5563; white-space:pre-wrap;">${data.actionPlan || 'Tidak ada rancangan tindak lanjut spesifik.'}</p>
      </div>
    </div>`;
  openModal('detailSupervisionModal');
}

window.downloadPDF = async function(docId) {
  try {
    const snap = await db.collection('supervisions').doc(docId).get();
    if (!snap.exists) { alert('Data arsip bermasalah.'); return; }
    const data = snap.data();
    
    let instComponents = [];
    if (data.instrumentId) {
      const instSnap = await db.collection('supervision_instruments').doc(data.instrumentId).get();
      if (instSnap.exists) instComponents = instSnap.data().components || [];
    }
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;
    
    // Kop Surat Dinas Kementerian Agama Republik Indonesia Resmi 
    pdf.setFont('Helvetica', 'bold'); pdf.setFontSize(14);
    pdf.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', pageWidth / 2, y, { align: 'center' }); y += 5.5;
    pdf.setFontSize(11);
    pdf.text('KANTOR KEMENTERIAN AGAMA KABUPATEN BANTAENG', pageWidth / 2, y, { align: 'center' }); y += 5.5;
    pdf.setFontSize(13);
    pdf.text('MADRASAH ALIYAH NEGERI (MAN) BANTAENG', pageWidth / 2, y, { align: 'center' }); y += 4.5;
    pdf.setFont('Helvetica', 'normal'); pdf.setFontSize(9);
    pdf.text('Jl. Sipanjong No. 25, Kecamatan Bantaeng, Kabupaten Bantaeng - Sulawesi Selatan 92411', pageWidth / 2, y, { align: 'center' }); y += 3.5;
    
    // Double line separator kop dinas
    pdf.setLineWidth(0.8); pdf.line(margin, y, pageWidth - margin, y);
    pdf.setLineWidth(0.2); pdf.line(margin, y + 0.8, pageWidth - margin, y + 0.8); y += 10;
    
    pdf.setFont('Helvetica', 'bold'); pdf.setFontSize(12);
    pdf.text('BERITA ACARA & LAPORAN HASIL SUPERVISI AKADEMIK GURU', pageWidth / 2, y, { align: 'center' }); y += 8;
    
    // Metadata block rendering
    pdf.setFont('Helvetica', 'normal'); pdf.setFontSize(10);
    const mLabels = [
      { l: 'Hari / Tanggal Penilaian', v: new Date(data.createdAt).toLocaleDateString('id-ID', {weekday:'long', year:'numeric', month:'long', day:'numeric'}) },
      { l: 'Nama Madrasah Satker', v: data.schoolName || 'MAN BANTAENG' },
      { l: 'Pejabat Supervisor', v: `${data.supervisorName} (${getRoleLabel(data.supervisorRole)})` },
      { l: 'Guru yang Disupervisi', v: `${data.superviseeName} (${getRoleLabel(data.superviseeRole)})` },
      { l: 'Rumpun Format Instrumen', v: data.instrumentName }
    ];
    
    mLabels.forEach(item => {
      pdf.setFont(undefined, 'bold'); pdf.text(item.l, margin, y);
      pdf.setFont(undefined, 'normal'); pdf.text(`:  ${item.v}`, margin + 48, y);
      y += 6;
    });
    y += 4;
    
    // Draw Matrix Table Header
    pdf.setFont(undefined, 'bold'); pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, y, pageWidth - (2 * margin), 8, 'FD');
    pdf.text('No', margin + 2, y + 5.5);
    pdf.text('Komponen Aspek Penilaian Mutu Pembelajaran', margin + 12, y + 5.5);
    
    const col1X = pageWidth - margin - 35;
    const col2X = pageWidth - margin - 28;
    const col3X = pageWidth - margin - 21;
    const col4X = pageWidth - margin - 14;
    const scoreX = pageWidth - margin - 6;
    
    pdf.text('1', col1X, y + 5.5, { align: 'center' });
    pdf.text('2', col2X, y + 5.5, { align: 'center' });
    pdf.text('3', col3X, y + 5.5, { align: 'center' });
    pdf.text('4', col4X, y + 5.5, { align: 'center' });
    pdf.text('Skor', scoreX, y + 5.5, { align: 'center' });
    
    y += 8;
    pdf.setFont(undefined, 'normal');
    
    // Draw Matrix Table Body rows
    instComponents.forEach((comp, idx) => {
      if (y > 265) { pdf.addPage(); y = 20; }
      const score = data.scores ? data.scores[`comp_${idx + 1}`] : 0;
      const rowH = 8;
      
      pdf.rect(margin, y, pageWidth - (2 * margin), rowH, 'D');
      pdf.text(`${idx + 1}`, margin + 3, y + 5.5, { align: 'center' });
      
      let truncName = comp.name;
      if (truncName.length > 55) truncName = truncName.substring(0, 52) + '...';
      pdf.text(truncName, margin + 12, y + 5.5);
      
      // Draw skoring check boxes
      const bSz = 3.5;
      [col1X, col2X, col3X, col4X].forEach((cx, iBox) => {
        const vBox = iBox + 1;
        if (score === vBox) {
          pdf.setFillColor(76, 175, 80);
          pdf.rect(cx - bSz/2, y + 2.2, bSz, bSz, 'FD');
          pdf.setDrawColor(255,255,255); pdf.setLineWidth(0.4);
          pdf.line(cx - 1, y + 3.8, cx - 0.2, y + 4.6);
          pdf.line(cx - 0.2, y + 4.6, cx + 1, y + 2.8);
          pdf.setDrawColor(0,0,0); pdf.setLineWidth(0.2);
        } else {
          pdf.setFillColor(255, 255, 255);
          pdf.rect(cx - bSz/2, y + 2.2, bSz, bSz, 'FD');
        }
      });
      
      pdf.setFont(undefined, 'bold');
      pdf.text(`${score}/4`, scoreX, y + 5.5, { align: 'center' });
      pdf.setFont(undefined, 'normal');
      y += rowH;
    });
    
    // Summary Cards block
    y += 5; if (y > 245) { pdf.addPage(); y = 20; }
    pdf.setFillColor(245, 247, 250); pdf.rect(margin, y, pageWidth - (2 * margin), 14, 'FD');
    pdf.setFont(undefined, 'bold');
    pdf.text(`TOTAL SKOR AKUMULASI: ${data.totalScore} / ${data.maxScore}`, margin + 4, y + 8.5);
    pdf.text(`PERSENTASE NILAI: ${data.percentage}%`, margin + 72, y + 8.5);
    pdf.text(`PREDIKAT: ${data.predicate.toUpperCase()}`, margin + 132, y + 8.5);
    y += 20;
    
    // Notes and Action Plans wrapped nicely
    pdf.setFontSize(10);
    if (data.notes) {
      if (y > 240) { pdf.addPage(); y = 20; }
      pdf.setFont(undefined, 'bold'); pdf.text('Catatan Khusus Hasil Supervisi:', margin, y); y += 5;
      pdf.setFont(undefined, 'normal');
      const splitNotes = pdf.splitTextToSize(data.notes, pageWidth - (2 * margin));
      pdf.text(splitNotes, margin, y); y += (splitNotes.length * 4.5) + 6;
    }
    
    if (data.actionPlan) {
      if (y > 240) { pdf.addPage(); y = 20; }
      pdf.setFont(undefined, 'bold'); pdf.text('Rencana Tindak Lanjut (RTL) / Rekomendasi Mutu:', margin, y); y += 5;
      pdf.setFont(undefined, 'normal');
      const splitPlan = pdf.splitTextToSize(data.actionPlan, pageWidth - (2 * margin));
      pdf.text(splitPlan, margin, y); y += (splitPlan.length * 4.5) + 12;
    }
    
    // Legalitas Tanda Tangan Bersama Pejabat & Pendidik 
    if (y > 240) { pdf.addPage(); y = 20; }
    const leftX = margin + 10;
    const rightX = pageWidth - margin - 50;
    
    pdf.text('Guru yang Disupervisi,', leftX, y);
    pdf.text('Pejabat Supervisor,', rightX, y);
    y += 24;
    
    pdf.setFont(undefined, 'bold');
    pdf.text(data.superviseeName, leftX, y);
    pdf.text(data.supervisorName, rightX, y);
    y += 4;
    
    pdf.setFont(undefined, 'normal');
    pdf.text('NIP. ------------------------------------', leftX, y);
    pdf.text('NIP. ------------------------------------', rightX, y);
    
    pdf.save(`Laporan_Supervisi_${data.superviseeName.replace(/\s+/g, '_')}.pdf`);
  } catch (err) { alert('Gagal memproses berkas PDF laporan: ' + err.message); }
};

//  ══════════════════════════════════════════════
//  7. PORTOFOLIO GURU (FOLDER & FILE BERSTRUKTUR)
//  ══════════════════════════════════════════════
async function loadFolderContents() {
  const fGrid = document.getElementById('folderGrid');
  const fList = document.getElementById('fileListArea');
  const breadcrumb = document.getElementById('folderBreadcrumb');
  
  if (!fGrid || !fList || !breadcrumb) return;
  
  fGrid.innerHTML = '<div style="text-align:center;width:100%;"><span class="spinner"></span> Sinkronisasi direktori...</div>';
  fList.innerHTML = '<div style="text-align:center;width:100%;"><span class="spinner"></span> Menghimpun berkas...</div>';
  
  try {
    const foldersSnap = await db.collection('supervision_folders').where('userEmail', '==', currentUser.email).get();
    userFolders = foldersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    let subFolders = userFolders.filter(f => (f.parentId || null) === currentFolderId);
    subFolders.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Render Breadcrumb Jejak Folder Bersama Navigasi Klik Mandiri
    if (!currentFolderId) {
      breadcrumb.innerHTML = '<span style="font-weight:600; color:#1f2937;">📁 Berkas Utama (Root)</span>';
    } else {
      let current = userFolders.find(f => f.id === currentFolderId);
      let path = [];
      while(current) { path.unshift(current); current = userFolders.find(f => f.id === current.parentId); }
      breadcrumb.innerHTML = `<span onclick="navigateToFolder(null)" style="color:#2563eb; cursor:pointer;">📁 Root</span>` + 
        path.map((p, i) => ` <span style="color:#9ca3af;">/</span> <span onclick="navigateToFolder('${p.id}')" style="${i === path.length-1 ? 'font-weight:600;color:#1f2937;' : 'color:#2563eb;cursor:pointer;'}">${p.name}</span>`).join('');
    }
    
    // Folder Cards Rendering
    if (subFolders.length === 0) { fGrid.innerHTML = ''; } 
    else {
      fGrid.innerHTML = subFolders.map(f => {
        return `
          <div class="folder-card" style="background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.05);" onclick="navigateToFolder('${f.id}')">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="font-size:1.8rem; color:${f.color || '#3b82f6'};">📁</div>
              <div style="font-weight:600; color:#374151; font-size:0.9rem;">${f.name}</div>
            </div>
            <div style="display:flex; gap:4px;" onclick="event.stopPropagation();">
              <button class="btn btn-warning btn-sm" style="padding:2px 6px;" onclick="editFolder('${f.id}','${f.name}','${f.color}')">✏️</button>
              <button class="btn btn-danger btn-sm" style="padding:2px 6px;" onclick="deleteFolder('${f.id}','${f.name}', 0)">🗑️</button>
            </div>
          </div>`;
      }).join('');
    }
    
    // File Items Rendering
    let filesSnap = currentFolderId ? 
      await db.collection('supervision_documents').where('userEmail', '==', currentUser.email).where('folderId', '==', currentFolderId).get() :
      await db.collection('supervision_documents').where('userEmail', '==', currentUser.email).where('folderId', '==', null).get();
      
    const files = filesSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (files.length === 0 && subFolders.length === 0) {
      fGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1; padding:20px;"><p>Direktori/Folder ini kosong.</p></div>';
      fList.innerHTML = '';
    } else if (files.length === 0) {
      fList.innerHTML = '<div style="color:#9ca3af; text-align:center; font-size:0.85rem; padding:10px;">Tidak ada lampiran dokumen di folder ini.</div>';
    } else {
      fList.innerHTML = files.map(d => {
        const icon = d.type === 'link' ? '🔗' : (d.fileExt === 'pdf' ? '📕' : ['doc', 'docx'].includes(d.fileExt) ? '📘' : ['xls', 'xlsx'].includes(d.fileExt) ? '📗' : '📄');
        let btnLihat = d.type === 'link' ? `<a href="${d.link}" target="_blank" class="btn btn-warning btn-sm">👁️ Buka</a>` : (d.fileExt === 'pdf' ? `<button class="btn btn-warning btn-sm" onclick="previewDoc('${d.id}')">👁️ Lihat</button>` : `<button class="btn btn-warning btn-sm" onclick="previewDocOffice('${d.id}','${d.fileExt}')">👁️ Preview</button>`);
        let btnUnduh = d.type !== 'link' ? `<button class="btn btn-primary btn-sm" onclick="downloadDoc('${d.id}','${d.nama.replace(/'/g,"\\'")}','${d.fileExt}')">⬇ Unduh</button>` : '';
        
        return `
          <div class="doc-item" style="background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:10px; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="font-size:1.4rem;">${icon}</div>
              <div>
                <div style="font-weight:600; color:#1f2937; font-size:0.85rem;">${d.nama}</div>
                <div style="font-size:0.7rem; color:#6b7280;">Kategori: ${d.kategori} • Tanggal upload: ${new Date(d.createdAt).toLocaleDateString('id-ID')}</div>
              </div>
            </div>
            <div style="display:flex; gap:4px;">
              ${btnLihat}${btnUnduh}
              <button class="btn btn-danger btn-sm" onclick="deleteDoc('${d.id}')">🗑️</button>
            </div>
          </div>`;
      }).join('');
    }
  } catch(e) { console.error(e); }
}

window.navigateToFolder = function(folderId) {
  currentFolderId = folderId;
  loadFolderContents();
};

window.openFolderModal = function() {
  editingFolderId = null;
  document.getElementById('folderModalTitle').textContent = '➕ Buat Direktori Folder Baru';
  document.getElementById('folderName').value = '';
  document.getElementById('folderColor').value = '#3b82f6';
  openModal('folderModal');
};

window.editFolder = function(id, name, color) {
  editingFolderId = id;
  document.getElementById('folderModalTitle').textContent = '✏️ Ubah Nama/Warna Folder';
  document.getElementById('folderName').value = name;
  document.getElementById('folderColor').value = color || '#3b82f6';
  openModal('folderModal');
};

window.saveFolder = async function() {
  const name = document.getElementById('folderName').value.trim();
  const color = document.getElementById('folderColor').value;
  if (!name) { alert('Nama direktori wajib diisi!'); return; }
  try {
    if (editingFolderId) {
      await db.collection('supervision_folders').doc(editingFolderId).update({ name, color, updatedAt: new Date().toISOString() });
      alert(' ✅ Folder berhasil diubah!');
    } else {
      await db.collection('supervision_folders').add({
        name, color,
        parentId: currentFolderId || null,
        userEmail: currentUser.email,
        userName: currentUser.nama,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert(' ✅ Folder berhasil dibuat!');
    }
    closeModal('folderModal');
    loadFolderContents();
  } catch(e) { alert(' ❌ Gagal menyimpan folder: ' + e.message); }
};

window.deleteFolder = async function(folderId, folderName, docCount) {
  const subFolders = userFolders.filter(f => f.parentId === folderId);
  let msg = `Apakah Anda yakin menghapus folder "${folderName}"?`;
  if (subFolders.length > 0) msg = ` ⚠️ Peringatan!\nFolder "${folderName}" memiliki ${subFolders.length} sub-folder bersarang.\n\nSemua struktur di bawahnya akan ikut terhapus secara berantai!\n\nApakah Anda setuju?`;
  
  if (!confirm(msg)) return;
  try {
    await deleteFolderRecursive(folderId);
    await db.collection('supervision_folders').doc(folderId).delete();
    if (currentFolderId === folderId) currentFolderId = null;
    loadFolderContents();
    alert(' ✅ Folder bersama struktur relasinya sukses dibersihkan!');
  } catch(e) { alert(' ❌ Gagal operasional hapus: ' + e.message); }
};

async function deleteFolderRecursive(folderId) {
  const filesSnap = await db.collection('supervision_documents').where('folderId', '==', folderId).get();
  for (const fDoc of filesSnap.docs) { await db.collection('supervision_documents').doc(fDoc.id).delete(); }
  const subDirs = userFolders.filter(f => f.parentId === folderId);
  for (const dir of subDirs) {
    await deleteFolderRecursive(dir.id);
    await db.collection('supervision_folders').doc(dir.id).delete();
  }
}

window.openDocModal = function() {
  document.getElementById('docModalTitle').textContent = '➕ Upload Dokumen / Tautan Portofolio';
  document.getElementById('docKategori').value = '';
  document.getElementById('docNama').value = '';
  document.getElementById('docFile').value = '';
  document.getElementById('docLink').value = '';
  if(document.getElementById('alertDoc')) document.getElementById('alertDoc').classList.remove('show');
  openModal('docModal');
};

window.toggleDocType = function() {
  const type = document.querySelector('input[name="docType"]:checked').value;
  if (type === 'file') {
    document.getElementById('formGroupFile').style.display = 'block';
    document.getElementById('formGroupLink').style.display = 'none';
  } else {
    document.getElementById('formGroupFile').style.display = 'none';
    document.getElementById('formGroupLink').style.display = 'block';
  }
};

window.saveDocument = async function() {
  const kategori = document.getElementById('docKategori').value;
  const nama = document.getElementById('docNama').value.trim();
  const type = document.querySelector('input[name="docType"]:checked').value;
  const alertBox = document.getElementById('alertDoc');
  const btn = document.getElementById('btnSaveDoc');
  
  if (!kategori || !nama || !alertBox || !btn) { alert('Lengkapi entri formulir!'); return; }
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menyimpan dokumen...';
  
  try {
    let fileData = null, fileExt = '', fileSize = 0, link = '';
    if (type === 'file') {
      const file = document.getElementById('docFile').files[0];
      if (!file) throw new Error('File belum dipilih pada storage lokal Anda!');
      if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran file melebihi limitasi sistem (Maksimal 5MB)!');
      
      fileExt = file.name.split('.').pop().toLowerCase();
      fileSize = file.size;
      
      const reader = new FileReader();
      fileData = await new Promise((resolve, reject) => {
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } else {
      link = document.getElementById('docLink').value.trim();
      if (!link) throw new Error('Kolom url / tautan cloud drive wajib dilampirkan!');
    }
    
    const targetFolder = userFolders.find(f => f.id === currentFolderId);
    await db.collection('supervision_documents').add({
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.nama,
      userRole: currentUser.role,
      folderId: currentFolderId || null,
      folderName: targetFolder ? targetFolder.name : 'Root',
      kategori, nama, type, fileData, fileExt, fileSize, link,
      createdAt: new Date().toISOString()
    });
    
    alertBox.textContent = ' ✅ Arsip portofolio pembelajaran sukses terunggah!';
    alertBox.className = 'alert alert-success show';
    
    closeModal('docModal');
    loadFolderContents();
  } catch(e) {
    alertBox.textContent = ' ❌ Gagal upload berkas: ' + e.message;
    alertBox.className = 'alert alert-error show';
  }
  btn.disabled = false;
  btn.textContent = ' 💾 Simpan Dokumen';
};

window.previewDoc = async function(docId) {
  try {
    const doc = await db.collection('supervision_documents').doc(docId).get();
    if (!doc.exists || !doc.data().fileData) { alert('Konten data tidak terbaca.'); return; }
    const data = doc.data();
    const win = window.open();
    if (win) {
      win.document.write(`<iframe src="${data.fileData}" style="width:100%; height:100vh; border:none;"></iframe>`);
      win.document.title = data.nama;
    }
  } catch(e) { alert('Gagal rendering preview: ' + e.message); }
};

window.previewDocOffice = async function(docId, fileExt) {
  try {
    const doc = await db.collection('supervision_documents').doc(docId).get();
    if (!doc.exists) { alert('File tidak ditemukan'); return; }
    const data = doc.data();
    const win = window.open();
    if (win) {
      win.document.write(`<html><head><title>Preview - ${data.nama}</title><style>body{font-family:sans-serif;background:#f3f4f6;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}.card{background:white;padding:30px;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.05);text-align:center;max-width:400px;}.icon{font-size:3.5rem;margin-bottom:15px;}.btn{display:inline-block;background:#3b82f6;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin:5px;}.btn:hover{background:#2563eb;}.btn-secondary{background:#6b7280;}.btn-secondary:hover{background:#4b5563;}</style></head><body><div class="card"><div class="icon">${fileExt==='pdf'?' 📕 ':['doc','docx'].includes(fileExt)?' 📘 ':['xls','xlsx'].includes(fileExt)?' 📗 ':' 📄 '}</div><h3>${data.nama}</h3><p>${data.kategori} • ${data.fileSize?(data.fileSize/1024/1024).toFixed(2)+' MB':''}</p><p style="font-size:0.85rem;">File ${fileExt.toUpperCase()} tidak bisa di-preview langsung.</p><a href="${data.fileData}" download="${data.nama}.${data.fileExt}" class="btn"> Download untuk Melihat</a><br><button onclick="window.close()" class="btn btn-secondary">Tutup</button></div></body></html>`);
    }
  } catch(e) { alert(' ❌ Gagal membuka preview: ' + e.message); }
};

window.downloadDoc = function(docId, name, ext) {
  db.collection('supervision_documents').doc(docId).get().then(doc => {
    if(!doc.exists || !doc.data().fileData) { alert('Data base64 corrupt.'); return; }
    const a = document.createElement('a');
    a.href = doc.data().fileData;
    a.download = `${name}.${ext}`;
    a.click();
  }).catch(e => alert('Unduhan dibatalkan sistem: ' + e.message));
};

window.deleteDoc = async function(docId) {
  if (!confirm('Hapus dokumen portofolio ini dari server?')) return;
  try {
    await db.collection('supervision_documents').doc(docId).delete();
    loadFolderContents();
    alert(' ✅ Sukses menghapus berkas.');
  } catch(e) { alert(' ❌ Gagal operasi hapus berkas.'); }
};

async function loadMySchedule() {
  const container = document.getElementById('myScheduleArea');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:15px;"><span class="spinner"></span> Membuka catatan agenda Anda...</div>';
  try {
    const snap = await db.collection('supervision_schedule').where('teacherEmail', '==', currentUser.email).get();
    if (snap.empty) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📅</div><p>Anda belum masuk dalam antrean jadwal supervisi manapun.</p></div>';
      return;
    }
    const schedules = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    container.innerHTML = schedules.map(s => {
      const statusBadge = {
        'scheduled': '<span class="badge badge-scheduled">📅 Dijadwalkan</span>', 
        'in-progress': '<span class="badge badge-progress">🔄 Sedang Kelas Observasi</span>', 
        'completed': '<span class="badge badge-done">✅ Penilaian Selesai</span>'
      }[s.status] || s.status;
      
      return `
        <div class="schedule-card" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:15px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:600; color:#1f2937;">Supervisor Pembina: ${s.supervisorName}</div>
            <div style="font-size:0.8rem; color:#6b7280; margin-top:3px;">Rencana Tanggal: ${formatDate(s.scheduledDate)} | Status: ${statusBadge}</div>
            ${s.notes ? `<div style="font-size:0.8rem; color:#4b5563; background:#fff; border-left:3px solid #2563eb; padding:4px 8px; margin-top:6px;">Pesan Supervisor: ${s.notes}</div>` : ''}
          </div>
        </div>`;
    }).join('');
  } catch(e) { container.innerHTML = '<p style="color:red;">Gagal sinkronisasi data agenda pribadi.</p>'; }
}

//  ══════════════════════════════════════════════
//  8. GENERAL WINDOW UTILITIES & FORMATTER
//  ══════════════════════════════════════════════
window.closeModal = function(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.remove('active'); 
};

function openModal(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.add('active'); 
}

function formatDate(dateStr) { 
  if (!dateStr) return '-'; 
  const date = new Date(dateStr); 
  return date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); 
}

//  ══════════════════════════════════════════════
//  9. RUNTIME INITIALIZATION BLOCK
//  ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  showLoading();
  const sessionActive = await checkSipelitaSession();
  if (sessionActive) {
    showDashboard();
  }
});
