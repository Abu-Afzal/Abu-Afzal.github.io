// ══════════════════════════════════════════════
// SIPENA: Presensi
// ══════════════════════════════════════════════

window.renderPresensi = () => {
  const kelas = allData.filter(d => d.type === 'class' && d.user_name === currentUser);
  const tabs = document.getElementById('classTabs');

  if (!kelas.length) {
    tabs.innerHTML = '<div style="color:#ef4444;padding:10px;">⚠️ Buat kelas dulu di Kelola Kelas.</div>';
    document.getElementById('studentListContainer').innerHTML = '';
    return;
  }
  if (!currentClass || !kelas.find(k => k.class_name === currentClass)) currentClass = kelas[0].class_name;

  tabs.innerHTML = kelas.map(k => `<button class="tab ${currentClass === k.class_name ? 'active' : ''}" data-kelas="${k.class_name}">${k.class_name}</button>`).join('');
  tabs.querySelectorAll('.tab').forEach(t => { t.onclick = () => { currentClass = t.dataset.kelas; window.renderPresensi(); }; });

  window.renderDaftarSiswa();
};

window.renderDaftarSiswa = () => {
  const siswa = allData.filter(d => d.type === 'student' && d.class_name === currentClass && d.user_name === currentUser);
  const cont = document.getElementById('studentListContainer');

  if (!siswa.length) { cont.innerHTML = '<div class="empty"><div class="ei">👥</div><p>Belum ada siswa di kelas ini.</p></div>'; return; }

  cont.innerHTML = siswa.map(s => {
    const st = attendanceData[s.__key] || '';
    const foto = s.student_photo ? `<img src="${s.student_photo}" onerror="this.outerHTML='👤'">` : '👤';
    return `<div class="student-card">
      <div class="student-photo">${foto}</div>
      <div style="flex:1;">
        <div class="student-name">${s.student_name}</div>
        <div class="status-buttons">
          ${['HADIR', 'IZIN', 'SAKIT', 'ALPA', 'BOLOS'].map(x => `<button class="status-btn ${x.toLowerCase()} ${st === x ? 'active' : ''}" data-sid="${s.__key}" data-st="${x}">${x}</button>`).join('')}
        </div>
      </div>
    </div>`;
  }).join('');

  cont.querySelectorAll('.status-btn').forEach(btn => {
    btn.onclick = () => { attendanceData[btn.dataset.sid] = btn.dataset.st; window.renderDaftarSiswa(); };
  });
};

window.hadirSemua = () => {
  allData.filter(d => d.type === 'student' && d.class_name === currentClass && d.user_name === currentUser).forEach(s => { attendanceData[s.__key] = 'HADIR'; });
  window.renderDaftarSiswa();
  window.toast('Semua siswa ditandai Hadir.');
};

window.simpanAbsensi = async () => {
  const siswa = allData.filter(d => d.type === 'student' && d.class_name === currentClass && d.user_name === currentUser);
  if (!siswa.length) { window.toast('Tidak ada siswa!', 'err'); return; }

  const belum = siswa.filter(s => !attendanceData[s.__key]);
  if (belum.length && !confirm(`${belum.length} siswa belum diisi status → akan dianggap ALPA. Lanjutkan?`)) return;

  const btn = document.getElementById('btnKirimAbsen');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

  const records = {};
  siswa.forEach(s => { records[s.__key] = { student_name: s.student_name, status: attendanceData[s.__key] || 'ALPA' }; });

  const today = window.todayStr();
  const existing = allData.find(d => d.type === 'attendance_log' && d.class_name === currentClass && d.date === today && d.user_name === currentUser);
  try {
    if (existing) await ROOT.child(existing.__key).update({ records, updated_at: window.nowISO() });
    else await ROOT.push().set({ type: 'attendance_log', class_name: currentClass, date: today, user_name: currentUser, records, created_at: window.nowISO() });
    attendanceData = {};
    window.toast('Absensi berhasil disimpan!');
  } catch (e) { window.toast('Gagal: ' + e.message, 'err'); }
  btn.disabled = false; btn.textContent = '💾 Simpan Absensi';
};
