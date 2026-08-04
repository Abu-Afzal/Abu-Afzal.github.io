// ══════════════════════════════════════════════
// SIPENA CORE: Firebase Init, State & Helpers (SECURE VERSION)
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
const rtdb = firebase.database();
const firestore = firebase.firestore();
const ROOT = rtdb.ref("sipena2");

// Global State
let currentUser = '';
let currentUserEmail = ''; // ✅ BARU: simpan email untuk rules ownership
let currentUserRole = 'guru'; // ✅ BARU: simpan role untuk logika admin/kepala
let allData = [];
let currentClass = '';
let currentRekapClass = '';
let currentNilaiClass = '';
let currentManajeKelas = '';
let currentRekapTab = 'harian';
let currentNilaiTab = 'pengetahuan';
let attendanceData = {};
let selectedMonth = new Date().getMonth() + 1;
let selectedYear = new Date().getFullYear();
let selectedSemester = 'ganjil';
let nilaiKolom = [];
let nilaiKolomKet = [];
let selectedFileData = null;

// Helpers
window.toArr = (val) => val ? Object.keys(val).map(k => ({ __key: k, ...val[k] })) : [];
window.nowISO = () => new Date().toISOString();
window.todayStr = () => new Date().toISOString().split('T')[0];

window.toast = (msg, type = 'ok') => {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;padding:13px 20px;border-radius:10px;font-weight:700;font-size:0.88rem;background:${type === 'ok' ? '#10b981' : '#ef4444'};color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.2);`;
  t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.style.opacity = '0', 2500);
  setTimeout(() => t.remove(), 2900);
};

window.openModal = (id) => document.getElementById(id).classList.add('active');
window.closeModal = (id) => document.getElementById(id).classList.remove('active');

window.setMenuActive = (target) => {
  document.querySelectorAll('.menu-card').forEach(c => c.classList.remove('active-menu'));
  const card = document.querySelector(`.menu-card[data-target="${target}"]`);
  if (card) card.classList.add('active-menu');
};

window.showContent = (id) => {
  document.querySelectorAll('.content-area').forEach(a => a.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  setMenuActive(id);
  window.renderActive();
};

window.renderActive = () => {
  const a = document.querySelector('.content-area.active');
  if (!a) return;
  switch (a.id) {
    case 'kelola-kelas': window.renderKelolaKelas(); break;
    case 'presensi': window.renderPresensi(); break;
    case 'rekap': window.renderRekap(); break;
    case 'penilaian': window.renderPenilaian(); break;
    case 'bank-soal': window.renderBankSoal(); break;
  }
};

// ✅ BARU: Tampilkan loading screen saat menunggu auth
function showAuthLoading(msg) {
  const loading = document.createElement('div');
  loading.id = 'authLoadingScreen';
  loading.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: #f8fafc; z-index: 99999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  loading.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 15px;">🔐</div>
      <div style="font-weight: 700; color: #1e293b; font-size: 1.1rem; margin-bottom: 8px;">
        Memverifikasi Login...
      </div>
      <div style="color: #64748b; font-size: 0.9rem;">${msg}</div>
    </div>
  `;
  document.body.appendChild(loading);
}

function hideAuthLoading() {
  const el = document.getElementById('authLoadingScreen');
  if (el) el.remove();
}

// ✅ DIPERBAIKI: Init App yang menunggu Firebase Auth
window.initApp = () => {
  showAuthLoading('Mohon tunggu sebentar...');

  // Gunakan onAuthStateChanged sebagai GERBANG UTAMA
  firebase.auth().onAuthStateChanged(user => {
    // KASUS 1: User tidak login via Firebase Auth → redirect ke login
    if (!user) {
      console.warn('⚠️ Tidak terautentikasi via Firebase Auth. Mengalihkan ke login...');
      hideAuthLoading();
      window.toast('⚠️ Sesi berakhir. Silakan login ulang.', 'err');
      setTimeout(() => {
        window.location.href = '../index.html';
      }, 1500);
      return;
    }

    // KASUS 2: User terautentikasi → lanjut
    console.log('✅ Auth siap:', user.email);
    currentUserEmail = user.email;

    // Ambil data tambahan dari localStorage (nama, role) sebagai fallback
    let userData = null;
    try {
      const s = localStorage.getItem('sipelita_user');
      if (s) userData = JSON.parse(s);
    } catch (e) {}

    // Set currentUser: prioritas nama dari localStorage, fallback ke email
    if (userData && userData.nama) {
      currentUser = userData.nama;
      currentUserRole = userData.role || 'guru';
    } else {
      currentUser = user.email;
      currentUserRole = 'guru';
    }

    // Tampilkan nama user di header
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
      const roleIcon = { 'admin': '👑', 'kepala': '👑', 'wakil': '⭐', 'guru': '👨‍🏫' }[currentUserRole] || '👨‍🏫';
      userDisplay.innerHTML = `<div style="font-weight:700;color:#334155;font-size:0.95rem;">${roleIcon} Hi, ${currentUser}</div>`;
    }

    // Set tanggal hari ini
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
      currentDateEl.textContent = '📅 ' + new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
    }

        // ✅ BARU: Listener RTDB dipasang HANYA SETELAH auth siap
    ROOT.on('value', snap => {
      allData = window.toArr(snap.val());
      hideAuthLoading();
      window.renderActive();
      if (document.getElementById('modalKelolaSwiswa').classList.contains('active') && currentManajeKelas) {
        window.renderSiswaModal(currentManajeKelas);
      }
    }, err => {
      console.error('❌ Error listener RTDB:', err);
      hideAuthLoading();
      if (err.code === 'PERMISSION_DENIED') {
        window.toast('❌ Akses ditolak. Sesi tidak valid. Login ulang.', 'err');
        setTimeout(() => window.location.href = '../index.html', 2000);
      } else {
        window.toast('Gagal terhubung ke database: ' + err.message, 'err');
      }
    });
    // ✅ DEBUG: expose info auth untuk console
    console.log('🔐 Auth Info:', {
      email: currentUserEmail,
      displayName: currentUser,
      role: currentUserRole,
      uid: user.uid
    });

    window.bindEvents();
    window.showContent('kelola-kelas');
  });
};

window.addEventListener('load', window.initApp);
