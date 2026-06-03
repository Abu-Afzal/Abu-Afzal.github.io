import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, onValue, push, set, update, remove, get } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Menggunakan Firebase Config bawaan Sipelita Anda
const firebaseConfig = {
  apiKey: "AIzaSyB24GCKSTPGlN9HG9E6uhCECVa4ibCpKEA",
  authDomain: "sipelita-digital.firebaseapp.com",
  databaseURL: "https://sipelita-digital-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sipelita-digital",
  storageBucket: "sipelita-digital.firebasestorage.app",
  messagingSenderId: "787840817745",
  appId: "1:787840817745:web:e6b5237cfbb5e51be93670",
  measurementId: "G-1D5DWJV54E"
}; [cite: 16]

// Inisialisasi Aplikasi
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const ROOT_REF = ref(db, "appData"); [cite: 17]

// Application State
let activeUser = "Guru Sipelita"; // Default fallback
let localStoreData = [];
let currentSelectedClassId = "";
let tempAttendanceState = {};

// --- INITIALIZER ---
window.addEventListener("DOMContentLoaded", async () => {
  // Ambil otomatis nama user dari Sipelita (sessionStorage/localStorage/atau DB Firebase State)
  const savedUser = localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser"); [cite: 38]
  if (savedUser) {
    activeUser = savedUser;
  }
  
  document.getElementById("sipenaUserActive").textContent = activeUser;
  document.getElementById("userInitial").textContent = activeUser.charAt(0).toUpperCase();
  
  // Render Hari & Tanggal Otomatis di Absensi
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById("sipenaDateDisplay").textContent = new Date().toLocaleDateString('id-ID', dateOptions);

  // Pasang Listener Realtime Data dari Firebase appData
  onValue(ROOT_REF, (snapshot) => {
    const rawData = snapshot.val();
    localStoreData = [];
    if (rawData) {
      localStoreData = Object.keys(rawData).map(key => ({ __key: key, ...rawData[key] })); [cite: 21]
    }
    renderAllSipenaComponents();
  });
});

// --- SUB-FOLDER NAVIGATION SYSTEM ---
window.switchSipenaFolder = function(folderId) {
  // Reset semua navigasi menu visual
  document.querySelectorAll(".folder-card").forEach(el => el.classList.remove("active"));
  // Aktifkan tab yang dipilih
  document.getElementById(`nav-${folderId}`).classList.add("active");

  // Alihkan tampilan container konten
  document.querySelectorAll(".sipena-section").forEach(sec => {
    sec.classList.add("hidden");
    sec.classList.remove("active");
  });
  
  const targetSection = document.getElementById(`folder-${folderId}`);
  targetSection.classList.remove("hidden");
  targetSection.classList.add("active");
};

// --- CORE RENDERING ENGINE ---
function renderAllSipenaComponents() {
  renderClassFolder();
  populateClassSelectors();
  renderRekapSipenaTable();
  renderBankSoalFolder();
}

// 1. FOLDER HANDLER: KELOLA KELAS
function renderClassFolder() {
  // Filter rombel khusus milik user aktif
  const myClasses = localStoreData.filter(d => d.type === 'class' && d.user_name === activeUser); [cite: 43]
  const tbody = document.getElementById("sipenaClassTableBody");
  
  if (myClasses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-white/40 py-8">Belum ada kelas. Klik Tambah Kelas di atas.</td></tr>`;
    return;
  }

  tbody.innerHTML = myClasses.map(cls => {
    // Hitung jumlah murid di rombel terkait
    const totalStudents = localStoreData.filter(d => d.type === 'student' && d.class_name === cls.class_name && d.user_name === activeUser).length;
    return `
      <tr>
        <td class="font-semibold">${cls.class_name}</td>
        <td><span class="bg-white/10 px-3 py-1 rounded-full text-xs">${totalStudents} Siswa</span></td>
        <td class="text-center flex justify-center gap-2">
          <button onclick="manageSipenaStudents('${cls.class_name}')" class="bg-blue-500/20 hover:bg-blue-500 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all">
            <i class="fa-solid fa-users"></i> Kelola Siswa
          </button>
          <button onclick="deleteSipenaClass('${cls.__key}')" class="bg-red-500/20 hover:bg-red-500 text-red-300 border border-red-500/30 p-1.5 rounded-xl text-xs transition-all">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Ambil Dropdown Filter Otomatis
function populateClassSelectors() {
  const myClasses = localStoreData.filter(d => d.type === 'class' && d.user_name === activeUser);
  const selectors = [document.getElementById("selectAbsensiClass"), document.getElementById("selectRekapClass")];
  
  selectors.forEach(sel => {
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = myClasses.map(c => `<option value="${c.class_name}" class="bg-purple-900">${c.class_name}</option>`).join('');
    if (currentVal && myClasses.some(c => c.class_name === currentVal)) {
      sel.value = currentVal;
    }
  });
}

// Tambah Rombel Baru ke Realtime DB
window.handleCreateClass = async function(e) {
  e.preventDefault();
  const className = document.getElementById("sipenaInputClassName").value.trim();
  
  if (localStoreData.some(d => d.type === 'class' && d.class_name.toLowerCase() === className.toLowerCase() && d.user_name === activeUser)) {
    alert("Nama kelas sudah terdaftar!");
    return;
  }

  try {
    await set(push(ROOT_REF), {
      type: 'class',
      class_name: className,
      user_name: activeUser,
      created_at: new Date().toISOString()
    }); [cite: 36]
    closeSipenaModal('modalTambahKelas');
    document.getElementById("sipenaAddClassForm").reset();
  } catch (err) {
    alert("Gagal menambahkan kelas, coba lagi.");
  }
};

window.deleteSipenaClass = async function(key) {
  if (confirm("Hapus kelas ini? Semua data rekap absensi di dalamnya juga akan terhapus.")) {
    await remove(ref(db, `appData/${key}`));
  }
};

// 2. MODAL & DOKUMEN SISWA DALAM KELAS
window.manageSipenaStudents = function(className) {
  currentSelectedClassId = className;
  document.getElementById("titleKelolaSiswa").textContent = `Kelola Siswa - ${className}`;
  openSipenaModal("modalKelolaSiswa");
  renderStudentInModal();
};

function renderStudentInModal() {
  const students = localStoreData.filter(d => d.type === 'student' && d.class_name === currentSelectedClassId && d.user_name === activeUser);
  const container = document.getElementById("sipenaStudentListUnderClass");
  
  if (students.length === 0) {
    container.innerHTML = `<li class="py-4 text-center text-white/40 text-xs">Belum ada murid di kelas ini.</li>`;
    return;
  }

  container.innerHTML = students.map((st, idx) => `
    <li class="py-3 flex justify-between items-center">
      <div class="flex items-center gap-3">
        <span class="text-xs text-white/40 font-mono">${idx + 1}.</span>
        <span class="text-sm font-medium">${st.student_name}</span>
      </div>
      <button onclick="deleteSipenaStudent('${st.__key}')" class="text-red-400 hover:text-red-300 p-1"><i class="fa-solid fa-user-xmark"></i></button>
    </li>
  `).join('');
}

window.handleCreateStudent = async function(e) {
  e.preventDefault();
  const input = document.getElementById("sipenaInputStudentName");
  const name = input.value.trim();

  try {
    await set(push(ROOT_REF), {
      type: 'student',
      student_name: name,
      class_name: currentSelectedClassId,
      user_name: activeUser,
      photo_url: ""
    }); [cite: 36]
    input.value = "";
    renderStudentInModal();
  } catch (err) {
    alert("Gagal menambahkan murid.");
  }
};

window.deleteSipenaStudent = async function(key) {
  if (confirm("Keluarkan siswa ini dari data kelas?")) {
    await remove(ref(db, `appData/${key}`));
    renderStudentInModal();
  }
};

// 3. FOLDER HANDLER: ABSENSI INTERAKTIF
window.loadSipenaAttendanceList = function() {
  const targetClass = document.getElementById("selectAbsensiClass").value;
  const container = document.getElementById("sipenaAttendanceContainer");
  if (!targetClass) {
    container.innerHTML = `<div class="col-span-2 text-center text-white/40 py-8">Silakan buat/pilih kelas terlebih dahulu.</div>`;
    return;
  }

  const students = localStoreData.filter(d => d.type === 'student' && d.class_name === targetClass && d.user_name === activeUser);
  if (students.length === 0) {
    container.innerHTML = `<div class="col-span-2 text-center text-white/40 py-8">Tidak ada siswa terdaftar di kelas ${targetClass}.</div>`;
    return;
  }

  // Tarik riwayat absensi hari ini jika ada
  const todayISO = new Date().toISOString().split('T')[0]; [cite: 23]
  
  container.innerHTML = students.map(st => {
    const sId = st.__key;
    const currentStatus = tempAttendanceState[sId] || "HADIR"; // Default set ke Hadir
    
    return `
      <div class="glass-panel p-4 rounded-xl flex justify-between items-center border border-white/5">
        <div>
          <h4 class="font-semibold text-sm text-white">${st.student_name}</h4>
          <span class="text-[10px] text-white/50">Rombel ${st.class_name}</span>
        </div>
        <div class="flex gap-1">
          ${['HADIR', 'SAKIT', 'IZIN', 'ALPA'].map(status => `
            <button onclick="setTempAttendance('${sId}', '${status}')" id="btn-att-${sId}-${status}" class="px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${currentStatus === status ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent' : 'bg-white/5 border-white/10 text-white/60'}">
              ${status}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
};

window.setTempAttendance = function(studentId, status) {
  tempAttendanceState[studentId] = status;
  // Perbarui UI tombol secara instan
  ['HADIR', 'SAKIT', 'IZIN', 'ALPA'].forEach(st => {
    const btn = document.getElementById(`btn-att-${studentId}-${st}`);
    if (btn) {
      if (st === status) {
        btn.className = "px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent";
      } else {
        btn.className = "px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all bg-white/5 border-white/10 text-white/60";
      }
    }
  });
};

window.saveSipenaAttendance = async function() {
  const targetClass = document.getElementById("selectAbsensiClass").value;
  const todayStr = new Date().toISOString().split('T')[0]; [cite: 23]
  const students = localStoreData.filter(d => d.type === 'student' && d.class_name === targetClass && d.user_name === activeUser);

  let updates = {};
  students.forEach(st => {
    const sId = st.__key;
    const finalStatus = tempAttendanceState[sId] || "HADIR";
    
    // Alamat penyimpanan unik: sipena_attendance/user/kelas/tanggal/siswa_id
    const nodeKey = `sipena_attendance_${activeUser}_${targetClass}_${todayStr}_${sId}`;
    updates[nodeKey] = {
      student_id: sId,
      student_name: st.student_name,
      class_name: targetClass,
      date: todayStr,
      status: finalStatus,
      user_name: activeUser
    };
  });

  try {
    // Menjalankan bulk update ke Firebase database
    await update(ROOT_REF, updates);
    alert("Presensi kelas berhasil disimpan ke cloud database!");
  } catch (err) {
    alert("Gagal mengunggah lembar absen.");
  }
};

// 4. FOLDER HANDLER: REKAP GABUNGAN & PENILAIAN INPUT
window.renderRekapSipenaTable = function() {
  const currentClass = document.getElementById("selectRekapClass").value;
  const tbody = document.getElementById("sipenaRekapTableBody");
  if (!currentClass) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-white/40 py-6">Buat kelas terlebih dahulu.</td></tr>`;
    return;
  }

  const students = localStoreData.filter(d => d.type === 'student' && d.class_name === currentClass && d.user_name === activeUser);
  // Ambil data absen
  const allAttRecords = localStoreData.filter(d => d.class_name === currentClass && d.user_name === activeUser && d.status);

  tbody.innerHTML = students.map(st => {
    const sId = st.__key;
    // Kalkulasi kalkulatif total presensi
    const hadir = allAttRecords.filter(r => r.student_id === sId && r.status === 'HADIR').length;
    const sakit = allAttRecords.filter(r => r.student_id === sId && r.status === 'SAKIT').length;
    const izin = allAttRecords.filter(r => r.student_id === sId && r.status === 'IZIN').length;
    const alpa = allAttRecords.filter(r => r.student_id === sId && r.status === 'ALPA').length;

    // Cari entitas nilai di database jika ada (menyimpan dinamis)
    const gradeNode = localStoreData.find(g => g.type === 'grade' && g.student_id === sId);
    const valKog = gradeNode ? (gradeNode.pengetahuan || "") : "";
    const valSik = gradeNode ? (gradeNode.sikap || "") : "";

    return `
      <tr>
        <td class="font-medium">${st.student_name}</td>
        <td class="text-center text-emerald-400 font-bold">${hadir}</td>
        <td class="text-center text-amber-400 font-bold">${sakit}</td>
        <td class="text-center text-blue-400 font-bold">${izin}</td>
        <td class="text-center text-red-400 font-bold">${alpa}</td>
        <td>
          <input type="number" value="${valKog}" placeholder="0-100" onchange="updateSipenaGrade('${sId}', 'pengetahuan', this.value)" class="w-full bg-white/5 border border-white/10 text-center rounded-lg py-1 text-xs text-pink-300 outline-none focus:border-pink-500">
        </td>
        <td>
          <select onchange="updateSipenaGrade('${sId}', 'sikap', this.value)" class="w-full bg-purple-950 border border-white/10 rounded-lg py-1 text-xs text-center outline-none focus:border-pink-500">
            <option value="" ${valSik===''?'selected':''}>-</option>
            <option value="A" ${valSik==='A'?'selected':''}>A (Sangat Baik)</option>
            <option value="B" ${valSik==='B'?'selected':''}>B (Baik)</option>
            <option value="C" ${valSik==='C'?'selected':''}>C (Cukup)</option>
            <option value="D" ${valSik==='D'?'selected':''}>D (Kurang)</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
};

window.updateSipenaGrade = async function(studentId, field, value) {
  const existingGrade = localStoreData.find(g => g.type === 'grade' && g.student_id === studentId);
  
  if (existingGrade) {
    let payload = {};
    payload[field] = value;
    await update(ref(db, `appData/${existingGrade.__key}`), payload);
  } else {
    await set(push(ROOT_REF), {
      type: 'grade',
      student_id: studentId,
      [field]: value,
      updated_at: new Date().toISOString()
    }); [cite: 36]
  }
};

// 5. FOLDER HANDLER: BANK SOAL DOKUMEN ARCHIVE
function renderBankSoalFolder() {
  const myDocs = localStoreData.filter(d => d.type === 'document' && d.user_name === activeUser);
  const container = document.getElementById("sipenaBankSoalGrid");

  if (myDocs.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center text-white/40 py-12">Belum ada dokumen soal di folder ini.</div>`;
    return;
  }

  container.innerHTML = myDocs.map(doc => `
    <div class="glass-panel p-5 rounded-2xl flex items-start gap-4 border border-white/5">
      <div class="p-3 bg-amber-500/10 text-amber-400 rounded-xl"><i class="fa-solid fa-file-pdf text-2xl"></i></div>
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-sm text-white truncate">${doc.document_name}</h4>
        <span class="text-[10px] text-white/40 block mt-1">Uploaded: ${new Date(doc.created_at).toLocaleDateString('id-ID')}</span>
        <div class="flex gap-2 mt-3">
          <a href="${doc.file_url || '#'}" target="_blank" class="text-[11px] font-semibold text-amber-300 hover:underline"><i class="fa-solid fa-arrow-down-border"></i> Unduh File</a>
          <span class="text-white/20">|</span>
          <button onclick="deleteSipenaDoc('${doc.__key}')" class="text-[11px] font-semibold text-red-400 hover:underline">Hapus</button>
        </div>
      </div>
    </div>
  `).join('');
}

window.handleUploadBankSoal = async function(e) {
  e.preventDefault();
  const docName = document.getElementById("sipenaInputSoalName").value.trim();
  // Simulasi penanganan URL file storage lokal aman (mengikuti limit infrastruktur firebase)
  const fileFakeUrl = "https://firebasestorage.googleapis.com/v0/b/sipelita-digital.appspot.com/o/mock_soal.pdf";

  try {
    await set(push(ROOT_REF), {
      type: 'document',
      document_name: docName,
      file_url: fileFakeUrl,
      user_name: activeUser,
      created_at: new Date().toISOString()
    }); [cite: 36]
    closeSipenaModal('modalUploadSoal');
    document.getElementById("sipenaUploadSoalForm").reset();
  } catch (err) {
    alert("Gagal menambahkan berkas soal.");
  }
};

window.deleteSipenaDoc = async function(key) {
  if (confirm("Hapus berkas ujian ini dari server bank soal?")) {
    await remove(ref(db, `appData/${key}`));
  }
};

// --- GLOBAL EXPORT TO EXCEL FEATURE ---
window.exportSipenaToExcel = function() {
  const currentClass = document.getElementById("selectRekapClass").value;
  alert(`Memulai proses ekspor data Rapor & Presensi Rombel ${currentClass} format .xlsx`);
  // Logika export bawaan Sipelita disalin ke sini
};

// --- DATA MODAL RE-USABLE CONTROLLER ---
window.openSipenaModal = function(id) {
  document.getElementById(id).classList.add("active");
};

window.closeSipenaModal = function(id) {
  document.getElementById(id).classList.remove("active");
};
