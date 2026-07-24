// ══════════════════════════════════════════════
// SIPENA: Presensi (Dengan Dukungan Backdate)
// ══════════════════════════════════════════════

window.renderPresensi = () => {
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
  tabs.querySelectorAll('.tab').forEach(t => { 
    t.onclick = () => { 
      currentClass = t.dataset.kelas; 
      window.renderPresensi(); 
    }; 
  });

  // 1. Atur tanggal default ke hari ini dan cegah pilih masa depan
  if (dateInput) {
    const today = window.todayStr();
    dateInput.value = today;
    dateInput.max = today; 
  }

  // 2. Muat data sesuai tanggal yang terpilih
  window.loadPresensiDataForDate(dateInput ? dateInput.value : window.todayStr());
};

// Fungsi baru: Memuat data absensi berdasarkan tanggal spesifik
window.loadPresensiDataForDate = (targetDate) => {
  // Reset data sementara
  attendanceData = {};
  
  // Cari apakah sudah ada log absensi untuk tanggal, kelas, dan user ini
  const existingLog = allData.find(d => 
    d.type === 'attendance_log' && 
    d.class_name === currentClass && 
    d.date === targetDate && 
    d.user_name === currentUser
  );

  // Jika ada, isi attendanceData dengan status yang sudah tersimpan
  if (existingLog && existingLog.records) {
    Object.keys(existingLog.records).forEach(sid => {
      attendanceData[sid] = existingLog.records[sid].status;
    });
  }

  // Render ulang tampilan daftar siswa
  window.renderDaftarSiswa();
};

window.renderDaftarSiswa = () => {
  const siswa = allData.filter(d => d.type === 'student' && d.class_name === currentClass && d.user_name === currentUser);
  const cont = document.getElementById('studentListContainer');

  if (!siswa.length) { 
    cont.innerHTML = '<div class="empty"><div class="ei">👥</div><p>Belum ada siswa di kelas ini.</p></div>'; 
    return; 
  }

  cont.innerHTML = siswa.map(s => {
    const st = attendanceData[s.__key] || '';
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

  cont.querySelectorAll('.status-btn').forEach(btn => {
    btn.onclick = () => { 
      attendanceData[btn.dataset.sid] = btn.dataset.st; 
      window.renderDaftarSiswa(); 
    };
  });
};

window.hadirSemua = () => {
  allData.filter(d => d.type === 'student' && d.class_name === currentClass && d.user_name === currentUser).forEach(s => { 
    attendanceData[s.__key] = 'HADIR'; 
  });
  window.renderDaftarSiswa();
  window.toast('✅ Semua siswa ditandai Hadir.', 'success');
};

window.simpanAbsensi = async () => {
  // 3. Ambil tanggal dari input, bukan hardcoded hari ini
  const targetDate = document.getElementById('inputTanggalPresensi')?.value;
  if (!targetDate) {
    window.toast('❌ Tanggal presensi harus diisi!', 'err');
    return;
  }

  const siswa = allData.filter(d => d.type === 'student' && d.class_name === currentClass && d.user_name === currentUser);
  if (!siswa.length) { window.toast('Tidak ada siswa!', 'err'); return; }

  const belum = siswa.filter(s => !attendanceData[s.__key]);
  if (belum.length && !confirm(`${belum.length} siswa belum diisi status → akan dianggap ALPA. Lanjutkan?`)) return;

  const btn = document.getElementById('btnKirimAbsen');
  btn.disabled = true; 
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

  const records = {};
  siswa.forEach(s => { 
    records[s.__key] = { student_name: s.student_name, status: attendanceData[s.__key] || 'ALPA' }; 
  });

  // Cari data existing berdasarkan targetDate
  const existing = allData.find(d => 
    d.type === 'attendance_log' && 
    d.class_name === currentClass && 
    d.date === targetDate && 
    d.user_name === currentUser
  );
  
  try {
    const payload = {
      type: 'attendance_log',
      class_name: currentClass,
      date: targetDate, // 🔑 Menggunakan tanggal yang dipilih
      user_name: currentUser,
      records,
      updated_at: window.nowISO()
    };

    if (existing) {
      // UPDATE data lama jika tanggalnya sama
      await ROOT.child(existing.__key).update(payload);
      window.toast(`✅ Data absensi tanggal ${targetDate} berhasil diperbarui!`, 'success');
    } else {
      // BUAT BARU jika belum pernah diisi
      payload.created_at = window.nowISO();
      await ROOT.push().set(payload);
      window.toast(`✅ Absensi tanggal ${targetDate} berhasil disimpan!`, 'success');
    }
    
    attendanceData = {}; // Reset setelah simpan
    
  } catch (e) { 
    window.toast('❌ Gagal: ' + e.message, 'err'); 
  }
  
  btn.disabled = false; 
  btn.textContent = '💾 Simpan Absensi';
};
