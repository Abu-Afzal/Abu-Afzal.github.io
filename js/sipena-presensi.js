// ══════════════════════════════════════════════
// SIPENA: Presensi (Versi Ultra-Aman & Backdate)
// ══════════════════════════════════════════════

// 1. Pastikan variabel global aman agar tidak error
window.attendanceData = window.attendanceData || {};

window.renderPresensi = () => {
  // CEK KEAMANAN: Pastikan data sudah dimuat dari Firebase
  if (typeof allData === 'undefined' || !allData) {
    console.warn('⏳ Data belum dimuat, menunggu...');
    return; 
  }

  const kelas = allData.filter(d => d.type === 'class' && d.user_name === currentUser);
  const tabs = document.getElementById('classTabs');
  const dateInput = document.getElementById('inputTanggalPresensi');

  if (!kelas.length) {
    tabs.innerHTML = '<div style="color:#ef4444;padding:10px;">⚠️ Buat kelas dulu di Kelola Kelas.</div>';
    document.getElementById('studentListContainer').innerHTML = '';
    return;
  }
  
  // Pastikan currentClass terdefinisi dengan aman
  if (typeof window.currentClass === 'undefined' || !window.currentClass || !kelas.find(k => k.class_name === window.currentClass)) {
    window.currentClass = kelas[0].class_name;
  }

  tabs.innerHTML = kelas.map(k => `<button class="tab ${window.currentClass === k.class_name ? 'active' : ''}" data-kelas="${k.class_name}">${k.class_name}</button>`).join('');
  tabs.querySelectorAll('.tab').forEach(t => { 
    t.onclick = () => { 
      window.currentClass = t.dataset.kelas; 
      window.renderPresensi(); 
    }; 
  });

  // 2. Atur tanggal default ke hari ini (format YYYY-MM-DD)
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.max = today; // Cegah pilih masa depan
  }

  // 3. Muat data sesuai tanggal yang terpilih
  const targetDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
  window.loadPresensiDataForDate(targetDate);
};

window.loadPresensiDataForDate = (targetDate) => {
  if (typeof allData === 'undefined' || !allData) return;
  
  // Reset data sementara agar tidak tertumpuk
  window.attendanceData = {};
  
  // Cari apakah sudah ada log absensi untuk tanggal, kelas, dan user ini
  const existingLog = allData.find(d => 
    d.type === 'attendance_log' && 
    d.class_name === window.currentClass && 
    d.date === targetDate && 
    d.user_name === currentUser
  );

  // Jika ada, isi attendanceData dengan status yang sudah tersimpan
  if (existingLog && existingLog.records) {
    Object.keys(existingLog.records).forEach(sid => {
      window.attendanceData[sid] = existingLog.records[sid].status;
    });
  }

  // Render ulang tampilan daftar siswa
  window.renderDaftarSiswa();
};

window.renderDaftarSiswa = () => {
  if (typeof allData === 'undefined' || !allData) return;

  const siswa = allData.filter(d => d.type === 'student' && d.class_name === window.currentClass && d.user_name === currentUser);
  const cont = document.getElementById('studentListContainer');

  if (!siswa.length) { 
    cont.innerHTML = '<div class="empty"><div class="ei">👥</div><p>Belum ada siswa di kelas ini.</p></div>'; 
    return; 
  }

  cont.innerHTML = siswa.map(s => {
    const st = window.attendanceData[s.__key] || '';
    const foto = s.student_photo ? `<img src="${s.student_photo}" onerror="this.outerHTML='👤'">` : '👤';
    return `<div class="student-card">
      <div class="student-photo">${foto}</div>
      <div style="flex:1;">
        <div class="student-name">${s.student_name}</div>
        <div class="status-buttons">
          ${['HADIR', 'IZIN', 'SAKIT', 'ALPA', 'BOLOS'].map(x => 
            `<button class="status-btn ${x.toLowerCase()} ${st === x ? 'active' : ''}" data-sid="${s.__key}" data-st="${x}">${x.charAt(0)}</button>`
          ).join('')}
        </div>
      </div>
    </div>`;
  }).join('');

  // Update status saat diklik (tanpa render ulang seluruh daftar agar lebih cepat)
  cont.querySelectorAll('.status-btn').forEach(btn => {
    btn.onclick = () => { 
      window.attendanceData[btn.dataset.sid] = btn.dataset.st; 
      btn.parentElement.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });
};

window.hadirSemua = () => {
  if (typeof allData === 'undefined' || !allData) return;
  
  allData.filter(d => d.type === 'student' && d.class_name === window.currentClass && d.user_name === currentUser).forEach(s => { 
    window.attendanceData[s.__key] = 'HADIR'; 
  });
  window.renderDaftarSiswa();
  window.toast('✅ Semua siswa ditandai Hadir.', 'success');
};

window.simpanAbsensi = async () => {
  const dateInput = document.getElementById('inputTanggalPresensi');
  const targetDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
  
  if (!targetDate) {
    window.toast('❌ Tanggal presensi harus diisi!', 'err');
    return;
  }

  if (typeof allData === 'undefined' || !allData) {
    window.toast('❌ Data belum dimuat! Refresh halaman.', 'err');
    return;
  }

  const siswa = allData.filter(d => d.type === 'student' && d.class_name === window.currentClass && d.user_name === currentUser);
  if (!siswa.length) { window.toast('Tidak ada siswa!', 'err'); return; }

  const belum = siswa.filter(s => !window.attendanceData[s.__key]);
  if (belum.length && !confirm(`${belum.length} siswa belum diisi status → akan dianggap ALPA. Lanjutkan?`)) return;

  const btn = document.getElementById('btnKirimAbsen');
  btn.disabled = true; 
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

  const records = {};
  siswa.forEach(s => { 
    records[s.__key] = { student_name: s.student_name, status: window.attendanceData[s.__key] || 'ALPA' }; 
  });

  const existing = allData.find(d => 
    d.type === 'attendance_log' && 
    d.class_name === window.currentClass && 
    d.date === targetDate && 
    d.user_name === currentUser
  );
  
  try {
    const payload = {
      type: 'attendance_log',
      class_name: window.currentClass,
      date: targetDate,
      user_name: currentUser,
      records,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      await ROOT.child(existing.__key).update(payload);
      window.toast(`✅ Data absensi tanggal ${targetDate} berhasil diperbarui!`, 'success');
    } else {
      payload.created_at = new Date().toISOString();
      await ROOT.push().set(payload);
      window.toast(`✅ Absensi tanggal ${targetDate} berhasil disimpan!`, 'success');
    }
    
    window.attendanceData = {}; // Reset setelah simpan
    
  } catch (e) { 
    window.toast('❌ Gagal: ' + e.message, 'err'); 
  }
  
  btn.disabled = false; 
  btn.textContent = '💾 Simpan Absensi';
};
