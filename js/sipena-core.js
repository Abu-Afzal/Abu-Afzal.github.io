// ══════════════════════════════════════════════
// SIPENA CORE: Firebase Init, State & Helpers
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
const rtdb = firebase.database(); // Untuk data SIPENA
const firestore = firebase.firestore(); // Untuk integrasi SICAN
const ROOT = rtdb.ref("sipena2");

// Global State
let currentUser = '';
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

// Init App
window.initApp = () => {
  let userData = null;
  try {
    const s = localStorage.getItem('sipelita_user');
    if (s) {
      userData = JSON.parse(s);
      currentUser = userData.nama || userData.email || 'guru';
    } else {
      currentUser = 'guru';
    }
  } catch (e) { currentUser = 'guru'; }

  const userDisplay = document.getElementById('userDisplay');
  if (userDisplay) {
    const roleIcon = { 'admin': '👑', 'kepala': '👑', 'wakil': '⭐', 'guru': '👨‍🏫' }[userData?.role] || '👨‍🏫';
    userDisplay.innerHTML = `<div style="font-weight:700;color:#334155;font-size:0.95rem;">${roleIcon} Hi, ${currentUser}</div>`;
  }

  document.getElementById('currentDate').textContent = '📅 ' + new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  ROOT.on('value', snap => {
    allData = window.toArr(snap.val());
    window.renderActive();
    if (document.getElementById('modalKelolaSwiswa').classList.contains('active') && currentManajeKelas) {
      window.renderSiswaModal(currentManajeKelas);
    }
  }, err => {
    console.error(err);
    window.toast('Gagal terhubung ke database', 'err');
  });

  window.bindEvents();
  window.showContent('kelola-kelas');
};

window.addEventListener('load', window.initApp);
