// ══════════════════════════════════════════════
// SIPENA: Rekap Kehadiran
// ══════════════════════════════════════════════

window.renderRekap = () => {
  const kelas = allData.filter(d => d.type === 'class' && d.user_name === currentUser);
  if (!kelas.length) { document.getElementById('rekapContent').innerHTML = '<div class="empty"><div class="ei">🏫</div><p>Belum ada kelas.</p></div>'; return; }
  if (!currentRekapClass || !kelas.find(k => k.class_name === currentRekapClass)) currentRekapClass = kelas[0].class_name;

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  let filterHtml = `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
    <div class="fg" style="margin:0;min-width:160px;"><label>Kelas</label>
      <select id="rekapKelasSelect">${kelas.map(k => `<option value="${k.class_name}" ${currentRekapClass === k.class_name ? 'selected' : ''}>${k.class_name}</option>`).join('')}</select>
    </div>`;

  if (currentRekapTab === 'bulanan') {
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
    filterHtml += `<div class="fg" style="margin:0;min-width:130px;"><label>Bulan</label><select id="rekapBulanSelect">${monthNames.map((m, i) => `<option value="${i + 1}" ${selectedMonth === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
    <div class="fg" style="margin:0;min-width:100px;"><label>Tahun</label><select id="rekapTahunSelect">${years.map(y => `<option value="${y}" ${selectedYear === y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>`;
  } else if (currentRekapTab === 'semester') {
    filterHtml += `<div class="fg" style="margin:0;min-width:160px;"><label>Semester</label><select id="rekapSemSelect"><option value="ganjil" ${selectedSemester === 'ganjil' ? 'selected' : ''}>Ganjil (Jul–Des)</option><option value="genap" ${selectedSemester === 'genap' ? 'selected' : ''}>Genap (Jan–Jun)</option></select></div>
    <div class="fg" style="margin:0;min-width:100px;"><label>Tahun</label><input type="number" id="rekapTahunSem" value="${selectedYear}" style="width:90px;"></div>`;
  }
  filterHtml += `<div class="fg" style="margin:0;align-self:flex-end;"><button class="btn btn-primary" id="btnTampilRekap">🔍 Tampilkan</button></div></div>`;
  document.getElementById('rekapFilters').innerHTML = filterHtml;

  document.getElementById('rekapKelasSelect').onchange = e => { currentRekapClass = e.target.value; };
  document.getElementById('btnTampilRekap').onclick = () => {
    currentRekapClass = document.getElementById('rekapKelasSelect').value;
    if (currentRekapTab === 'bulanan') { selectedMonth = parseInt(document.getElementById('rekapBulanSelect').value); selectedYear = parseInt(document.getElementById('rekapTahunSelect').value); }
    else if (currentRekapTab === 'semester') { selectedSemester = document.getElementById('rekapSemSelect').value; selectedYear = parseInt(document.getElementById('rekapTahunSem').value); }
    window.generateRekap();
  };
  window.generateRekap();
};

window.filterLog = (log) => {
  const d = new Date(log.date), m = d.getMonth() + 1, y = d.getFullYear();
  if (currentRekapTab === 'harian') return log.date === window.todayStr();
  if (currentRekapTab === 'bulanan') return m === selectedMonth && y === selectedYear;
  if (currentRekapTab === 'semester') {
    if (selectedSemester === 'ganjil') return [7, 8, 9, 10, 11, 12].includes(m) && y === selectedYear;
    else return [1, 2, 3, 4, 5, 6].includes(m) && y === selectedYear;
  }
  return true;
};

window.generateRekap = () => {
  const siswa = allData.filter(d => d.type === 'student' && d.class_name === currentRekapClass && d.user_name === currentUser);
  const logs = allData.filter(d => d.type === 'attendance_log' && d.class_name === currentRekapClass && d.user_name === currentUser && window.filterLog(d));
  const cont = document.getElementById('rekapContent');

  if (!siswa.length) { cont.innerHTML = '<div class="empty"><div class="ei">👥</div><p>Tidak ada siswa di kelas ini.</p></div>'; return; }

  const stat = {};
  siswa.forEach(s => { stat[s.__key] = { nama: s.student_name, H: 0, I: 0, S: 0, A: 0, B: 0, detail: [] }; });

  logs.forEach(log => {
    if (!log.records) return;
    Object.keys(log.records).forEach(sid => {
      if (!stat[sid]) return;
      const st = log.records[sid].status || 'ALPA';
      const map = { HADIR: 'H', IZIN: 'I', SAKIT: 'S', ALPA: 'A', BOLOS: 'B' };
      if (map[st]) stat[sid][map[st]]++;
      if (st !== 'HADIR') stat[sid].detail.push(log.date.split('-').reverse().join('/') + `(${st})`);
    });
  });

  const totalH = Object.values(stat).reduce((a, s) => a + s.H, 0);
  const totalI = Object.values(stat).reduce((a, s) => a + s.I, 0);
  const totalS = Object.values(stat).reduce((a, s) => a + s.S, 0);
  const totalA = Object.values(stat).reduce((a, s) => a + s.A, 0);
  const totalB = Object.values(stat).reduce((a, s) => a + s.B, 0);

  let html = `<div class="stat-row">
    <div class="stat-box sb-h"><h4>${totalH}</h4><p>Hadir</p></div>
    <div class="stat-box sb-i"><h4>${totalI}</h4><p>Izin</p></div>
    <div class="stat-box sb-s"><h4>${totalS}</h4><p>Sakit</p></div>
    <div class="stat-box sb-a"><h4>${totalA}</h4><p>Alpa</p></div>
    <div class="stat-box sb-b"><h4>${totalB}</h4><p>Bolos</p></div>
  </div>
  <div class="tbl-wrap"><table id="rekapTable">
    <thead><tr><th>No</th><th>Nama Siswa</th><th>H</th><th>I</th><th>S</th><th>A</th><th>B</th><th>Total</th><th>% Hadir</th><th>Rincian</th></tr></thead><tbody>`;

  Object.values(stat).forEach((s, i) => {
    const total = s.H + s.I + s.S + s.A + s.B;
    const pct = total > 0 ? ((s.H / total) * 100).toFixed(1) : '0.0';
    const col = parseFloat(pct) >= 80 ? '#10b981' : (parseFloat(pct) >= 60 ? '#f59e0b' : '#ef4444');
    html += `<tr>
      <td>${i + 1}</td><td style="font-weight:600;">${s.nama}</td>
      <td style="color:#10b981;font-weight:700;">${s.H}</td><td style="color:#3b82f6;font-weight:700;">${s.I}</td>
      <td style="color:#f59e0b;font-weight:700;">${s.S}</td><td style="color:#ef4444;font-weight:700;">${s.A}</td>
      <td style="color:#8b5cf6;font-weight:700;">${s.B}</td><td><strong>${total}</strong></td>
      <td><strong style="color:${col};">${pct}%</strong></td>
      <td style="font-size:0.78rem;color:#64748b;">${s.detail.length ? s.detail.join(', ') : '–'}</td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  cont.innerHTML = html;
};

window.exportRekap = () => {
  const table = document.getElementById('rekapTable');
  if (!table) { window.toast('Tampilkan rekap terlebih dahulu.', 'err'); return; }
  let csv = '';
  table.querySelectorAll('tr').forEach(row => {
    const cols = [...row.querySelectorAll('th,td')].map(c => `"${c.textContent.trim()}"`);
    csv += cols.join(',') + '\n';
  });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `Rekap_${currentRekapClass}_${currentRekapTab}.csv`; a.click();
  window.toast('File CSV diekspor!');
};
