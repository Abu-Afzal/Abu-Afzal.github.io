// ══════════════════════════════════════════════
// SIPENA: Rekap Kehadiran (FIXED: Filter Bulan/Tahun + Sorting A-Z)
// ══════════════════════════════════════════════

// 🛡️ INISIALISASI VARIABLE DEFAULT (Mencegah Undefined)
if (typeof window.selectedMonth === 'undefined') window.selectedMonth = new Date().getMonth() + 1;
if (typeof window.selectedYear === 'undefined') window.selectedYear = new Date().getFullYear();
if (typeof window.selectedSemester === 'undefined') window.selectedSemester = 'ganjil';
if (typeof window.currentRekapTab === 'undefined') window.currentRekapTab = 'bulanan';

// 🔍 FUNGSI PARSER TANGGAL PINTAR (Mendukung YYYY-MM-DD, DD-MM-YYYY, & Date Object)
window.parseLogDate = (dateVal) => {
  if (!dateVal) return { y: 0, m: 0, d: 0 };
  
  if (dateVal instanceof Date) {
    return { y: dateVal.getFullYear(), m: dateVal.getMonth() + 1, d: dateVal.getDate() };
  }

  const str = String(dateVal).trim();

  // Format YYYY-MM-DD atau DD-MM-YYYY
  if (str.includes('-')) {
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return { y: parseInt(parts[0], 10), m: parseInt(parts[1], 10), d: parseInt(parts[2], 10) };
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY
        return { y: parseInt(parts[2], 10), m: parseInt(parts[1], 10), d: parseInt(parts[0], 10) };
      }
    }
  }

  // Format YYYY/MM/DD atau DD/MM/YYYY
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return { y: parseInt(parts[0], 10), m: parseInt(parts[1], 10), d: parseInt(parts[2], 10) };
      } else if (parts[2].length === 4) {
        return { y: parseInt(parts[2], 10), m: parseInt(parts[1], 10), d: parseInt(parts[0], 10) };
      }
    }
  }

  // Fallback ke JS Date standar
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }

  return { y: 0, m: 0, d: 0 };
};

window.renderRekap = () => {
  // ✅ KELAS TERURUT A-Z
  const kelas = allData
    .filter(d => d.type === 'class' && d.user_name === currentUser)
    .sort((a, b) => (a.class_name || '').localeCompare(b.class_name || '', 'id-ID', { sensitivity: 'base', numeric: true }));

  if (!kelas.length) { 
    document.getElementById('rekapContent').innerHTML = '<div class="empty"><div class="ei">🏫</div><p>Belum ada kelas.</p></div>'; 
    return; 
  }
  if (!currentRekapClass || !kelas.find(k => k.class_name === currentRekapClass)) currentRekapClass = kelas[0].class_name;

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  let filterHtml = `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
    <div class="fg" style="margin:0;min-width:160px;"><label>Kelas</label>
      <select id="rekapKelasSelect">${kelas.map(k => `<option value="${k.class_name}" ${currentRekapClass === k.class_name ? 'selected' : ''}>${k.class_name}</option>`).join('')}</select>
    </div>`;

  if (currentRekapTab === 'bulanan') {
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
    filterHtml += `<div class="fg" style="margin:0;min-width:130px;"><label>Bulan</label><select id="rekapBulanSelect">${monthNames.map((m, i) => `<option value="${i + 1}" ${Number(selectedMonth) === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
    <div class="fg" style="margin:0;min-width:100px;"><label>Tahun</label><select id="rekapTahunSelect">${years.map(y => `<option value="${y}" ${Number(selectedYear) === y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>`;
  } else if (currentRekapTab === 'semester') {
    filterHtml += `<div class="fg" style="margin:0;min-width:160px;"><label>Semester</label><select id="rekapSemSelect"><option value="ganjil" ${selectedSemester === 'ganjil' ? 'selected' : ''}>Ganjil (Jul–Des)</option><option value="genap" ${selectedSemester === 'genap' ? 'selected' : ''}>Genap (Jan–Jun)</option></select></div>
    <div class="fg" style="margin:0;min-width:100px;"><label>Tahun</label><input type="number" id="rekapTahunSem" value="${selectedYear}" style="width:90px;"></div>`;
  }
  filterHtml += `<div class="fg" style="margin:0;align-self:flex-end;"><button class="btn btn-primary" id="btnTampilRekap"> Tampilkan</button></div></div>`;
  document.getElementById('rekapFilters').innerHTML = filterHtml;

  document.getElementById('rekapKelasSelect').onchange = e => { currentRekapClass = e.target.value; };
  
  document.getElementById('btnTampilRekap').onclick = () => {
    currentRekapClass = document.getElementById('rekapKelasSelect').value;
    if (currentRekapTab === 'bulanan') { 
      selectedMonth = parseInt(document.getElementById('rekapBulanSelect').value, 10); 
      selectedYear = parseInt(document.getElementById('rekapTahunSelect').value, 10); 
    } else if (currentRekapTab === 'semester') { 
      selectedSemester = document.getElementById('rekapSemSelect').value; 
      selectedYear = parseInt(document.getElementById('rekapTahunSem').value, 10); 
    }
    window.generateRekap();
  };

  window.generateRekap();
};

window.filterLog = (log) => {
    if (!log.date) return false;

    // Parse langsung dari string 'YYYY-MM-DD' — hindari timezone shift
    const parts = log.date.split('-');
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);

    if (currentRekapTab === 'harian')   return log.date === window.todayStr();
    if (currentRekapTab === 'bulanan')  return m === selectedMonth && y === selectedYear;
    if (currentRekapTab === 'semester') {
        if (selectedSemester === 'ganjil') return [7,8,9,10,11,12].includes(m) && y === selectedYear;
        else                               return [1,2,3,4,5,6].includes(m) && y === selectedYear;
    }
    return true;
};

window.generateRekap = () => {
  // ✅ SISWA TERURUT A-Z
  const siswa = allData
    .filter(d => d.type === 'student' && d.class_name === currentRekapClass && d.user_name === currentUser)
    .sort((a, b) => (a.student_name || '').localeCompare(b.student_name || '', 'id-ID', { sensitivity: 'base' }));

  // ✅ LOGS DIAMBIL SESUAI FILTER PERIODE DENGAN TIPE DATA YANG PRESISI
  const logs = allData.filter(d => 
    d.type === 'attendance_log' && 
    d.class_name === currentRekapClass && 
    d.user_name === currentUser && 
    window.filterLog(d)
  );
  
  const cont = document.getElementById('rekapContent');

  console.log(`📊 REKAP [${currentRekapClass}] Tab: ${currentRekapTab} | Bulan: ${selectedMonth} | Tahun: ${selectedYear} | Siswa: ${siswa.length} | Log absensi ditemukan: ${logs.length}`);

  if (!siswa.length) { cont.innerHTML = '<div class="empty"><div class="ei">👥</div><p>Tidak ada siswa di kelas ini.</p></div>'; return; }

  const stat = {};
  siswa.forEach(s => { stat[s.__key] = { nama: s.student_name, H: 0, I: 0, S: 0, A: 0, B: 0, detail: [] }; });

  // ✅ PENGHITUNGAN ABSENSI
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

  // ✅ RENDER BERDASARKAN URUTAN A-Z
  siswa.forEach((s, i) => {
    const data = stat[s.__key];
    if (!data) return;
    const total = data.H + data.I + data.S + data.A + data.B;
    const pct = total > 0 ? ((data.H / total) * 100).toFixed(1) : '0.0';
    const col = parseFloat(pct) >= 80 ? '#10b981' : (parseFloat(pct) >= 60 ? '#f59e0b' : '#ef4444');
    html += `<tr>
      <td>${i + 1}</td><td style="font-weight:600;">${data.nama}</td>
      <td style="color:#10b981;font-weight:700;">${data.H}</td><td style="color:#3b82f6;font-weight:700;">${data.I}</td>
      <td style="color:#f59e0b;font-weight:700;">${data.S}</td><td style="color:#ef4444;font-weight:700;">${data.A}</td>
      <td style="color:#8b5cf6;font-weight:700;">${data.B}</td><td><strong>${total}</strong></td>
      <td><strong style="color:${col};">${pct}%</strong></td>
      <td style="font-size:0.78rem;color:#64748b;">${data.detail.length ? data.detail.join(', ') : '–'}</td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  cont.innerHTML = html;
};

// ══════════════════════════════════════════════
// FITUR CETAK REKAP (PRINT CLEAN)
// ══════════════════════════════════════════════
window.cetakRekap = () => {
  const table = document.getElementById('rekapTable');
  if (!table) { 
    window.toast('Tampilkan rekap terlebih dahulu.', 'err'); 
    return; 
  }

  const kelasSelect = document.getElementById('rekapKelasSelect');
  const bulanSelect = document.getElementById('rekapBulanSelect');
  const tahunSelect = document.getElementById('rekapTahunSelect');
  const semSelect = document.getElementById('rekapSemSelect');
  const tahunSemInput = document.getElementById('rekapTahunSem');

  const kelasName = kelasSelect ? kelasSelect.value : currentRekapClass;
  let periodeText = '';
  let semesterText = '';
  let tahunText = '';
  
  if (currentRekapTab === 'bulanan') {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const bln = bulanSelect ? monthNames[parseInt(bulanSelect.value, 10) - 1] : '';
    tahunText = tahunSelect ? tahunSelect.value : new Date().getFullYear();
    periodeText = `Bulan ${bln} Tahun ${tahunText}`;
    semesterText = '-';
  } else if (currentRekapTab === 'semester') {
    semesterText = semSelect ? (semSelect.value === 'ganjil' ? 'Ganjil (Jul-Des)' : 'Genap (Jan-Jun)') : '';
    tahunText = tahunSemInput ? tahunSemInput.value : new Date().getFullYear();
    periodeText = `Semester ${semesterText} Tahun ${tahunText}`;
  } else {
    periodeText = `Harian (Tanggal ${window.todayStr()})`;
    semesterText = '-';
    tahunText = new Date().getFullYear();
  }

  const printHeader = document.createElement('div');
  printHeader.className = 'print-header-rekap';
  printHeader.style.cssText = `
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 3px double #1e40af;
  `;
  printHeader.innerHTML = `
    <h2 style="font-size:16pt; margin:0 0 5px 0; font-weight:bold; color:#1e40af;">REKAP KEHADIRAN SISWA</h2>
    <h3 style="font-size:14pt; margin:0 0 10px 0; font-weight:normal; color:#334155;">MAN BANTAENG</h3>
    <div style="display: flex; justify-content: center; gap: 40px; margin-top: 15px; font-size: 11pt;">
      <div><strong>Kelas:</strong> ${kelasName}</div>
      <div><strong>Periode:</strong> ${periodeText}</div>
    </div>
  `;

  const tblWrap = table.parentElement;
  tblWrap.insertBefore(printHeader, table);

  setTimeout(() => {
    window.print();
    setTimeout(() => {
      if (printHeader.parentNode) {
        printHeader.parentNode.removeChild(printHeader);
      }
    }, 500);
  }, 300);
};

window.exportRekap = () => {
  const table = document.getElementById('rekapTable');
  if (!table) { 
    window.toast('Tampilkan rekap terlebih dahulu.', 'err'); 
    return; 
  }

  const ws = XLSX.utils.table_to_sheet(table);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Kehadiran');
  XLSX.writeFile(wb, `Rekap_${currentRekapClass}_${currentRekapTab}.xlsx`);
  window.toast('✅ File Excel diekspor!', 'success');
};
