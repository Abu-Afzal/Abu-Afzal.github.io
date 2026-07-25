// ══════════════════════════════════════════════
// SIPENA: Presensi (Versi Final & Stabil)
// ══════════════════════════════════════════════

window.attendanceData = window.attendanceData || {};
window.presensiDate = window.presensiDate || new Date().toISOString().split('T')[0];

window.renderPresensi = () => {
  // PENGAMAN: Jika data belum siap, hentikan sementara agar tidak error
  if (typeof allData === 'undefined' || !allData) return;

  const kelas = allData.filter(d => d.type === 'class' && d.user_name === currentUser);
  const tabs = document.getElementById('classTabs');
  const dateInput = document.getElementById('inputTanggalPresensi');

  if (!kelas.length) {
    tabs.innerHTML = '<div style="color:#ef4444;padding:10px;">⚠️ Buat kelas dulu di Kelola Kelas.</div>';
    document.getElementById('studentListContainer').innerHTML = '';
    return;
  }
  
  if (!currentClass || !kelas.find(k => k.class_name === currentClass)) currentClass = kelas[0].class_name;

  tabs.innerHTML = kelas.map(k => `<button class="tab ${currentClass === k.class_name ? 'active' : ''}" data-kelas="${k.class_name}">${k.class_name}</button>`).join('');
  tabs.querySelectorAll('.tab').forEach(t => { t.onclick = () => { currentClass = t.dataset.kelas; window.renderPresensi(); }; });

  // Setup Date Picker secara internal (AMAN)
  if (dateInput) {
    if (!dateInput.value) {
        dateInput.value = window.presensiDate;
        dateInput.max = new Date().toISOString().split('T')[0];
    }
    // Saat tanggal diubah, muat ulang data untuk tanggal tersebut
    dateInput.onchange = (e) => {
        window.presensiDate = e.target.value;
        window.loadPresensiDataForDate(window.presensiDate);
    };
  }

  window.loadPresensiDataForDate(window.presensiDate);
};

window.loadPresensiDataForDate = (targetDate) => {
  try {
    if (typeof allData === 'undefined' || !allData) return;
    
    window.attendanceData = {}; // Reset sementara
    
    // Cari data absensi yang sudah ada di tanggal & kelas tersebut
    const existingLog = allData.find(d => 
      d.type === 'attendance_log' && 
      d.class_name === currentClass && 
      d.date === targetDate && 
      d.user_name === currentUser
    );

    if (existingLog && existingLog.records) {
      Object.keys(existingLog.records).forEach(sid => {
        window.attendanceData[sid] = existingLog.records[sid].status;
      });
    }

    window.renderDaftarSiswa();
  } catch (err) {
    console.error("Error loadPresensiDataForDate:", err);
    window.renderDaftarSiswa(); // Fallback: tetap render meski ada error kecil
  }
};

window.renderDaftarSiswa = () => {
  if (typeof allData === 'undefined' || !allData) return;

  const siswa = allData.filter(d => d.type === 'student' && d.class_name === currentClass && d.user_name === currentUser);
  const cont = document.getElementById('studentListContainer');

  if (!siswa.length) { cont.innerHTML = '<div class="empty"><div class="ei">👥</div><p>Belum ada siswa di kelas ini.</p></div>'; return; }

  cont.innerHTML = siswa.map(s => {
    const st = window.attendanceData[s.__key] || '';
    const foto = s.student_photo ? `<img src="${s.student_photo}" onerror="this.outerHTML='👤'">` : '👤';
    return `<div class="student-card">
      <div class="student-photo">${foto}</div>
      <div style="flex:1;">
        <div class="student-name">${s.student_name}</div>
        <div class="status-buttons">
          ${['HADIR', 'IZIN', 'SAKIT', 'ALPA', 'BOLOS'].map(x => `<button class="status-btn ${x.toLowerCase()} ${st === x ? 'active' : ''}" data-sid="${s.__key}" data-st="${x}">${x.charAt(0)}</button>`).join('')}
        </div>
      </div>
    </div>`;
  }).join('');

  cont.querySelectorAll('.status-btn').forEach(btn => {
    btn.onclick = () => { 
      window.attendanceData[btn.dataset.sid] = btn.dataset.st; 
      // Update UI saja tanpa render ulang semua agar lebih cepat
      btn.parentElement.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });
};

window.hadirSemua = () => {
  if (typeof allData === 'undefined' || !allData) return;
  allData.filter(d => d.type === 'student' && d.class_name === currentClass && d.user_name === currentUser).forEach(s => { 
    window.attendanceData[s.__key] = 'HADIR'; 
  });
  window.renderDaftarSiswa();
  window.toast('Semua siswa ditandai Hadir.');
};

window.simpanAbsensi = async () => {
  if (typeof allData === 'undefined' || !allData) return;

  const targetDate = window.presensiDate || new Date().toISOString().split('T')[0];

  const siswa = allData.filter(d => d.type === 'student' && d.class_name === currentClass && d.user_name === currentUser);
  if (!siswa.length) { window.toast('Tidak ada siswa!', 'err'); return; }

  const belum = siswa.filter(s => !window.attendanceData[s.__key]);
  if (belum.length && !confirm(`${belum.length} siswa belum diisi status → akan dianggap ALPA. Lanjutkan?`)) return;

  const btn = document.getElementById('btnKirimAbsen');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

  const records = {};
  siswa.forEach(s => { records[s.__key] = { student_name: s.student_name, status: window.attendanceData[s.__key] || 'ALPA' }; });

  const existing = allData.find(d => d.type === 'attendance_log' && d.class_name === currentClass && d.date === targetDate && d.user_name === currentUser);
  try {
    const payload = {
        type: 'attendance_log',
        class_name: currentClass,
        date: targetDate,
        user_name: currentUser,
        records,
        updated_at: new Date().toISOString()
    };

    if (existing) await ROOT.child(existing.__key).update(payload);
    else await ROOT.push().set({ ...payload, created_at: new Date().toISOString() });
    
    window.attendanceData = {};
    window.toast('Absensi berhasil disimpan!');
  } catch (e) { window.toast('Gagal: ' + e.message, 'err'); }
  btn.disabled = false; btn.textContent = '💾 Simpan Absensi';
};
