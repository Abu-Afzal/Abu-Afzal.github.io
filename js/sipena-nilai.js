// ══════════════════════════════════════════════
// SIPENA: Penilaian (Dengan TP, Semester & Rekap)
// ══════════════════════════════════════════════

window.renderPenilaian = () => {
  const kelas = allData.filter(d => d.type === 'class' && d.user_name === currentUser);
  const sel = document.getElementById('nilaiKelasSelect');
  const cont = document.getElementById('penilaianContent');
  const info = document.getElementById('infoSiswaKelas');

  // PERBAIKAN: Atur visibilitas tombol berdasarkan tab yang aktif
  const isRekap = currentNilaiTab === 'rekap';
  const isAnalisis = currentNilaiTab === 'analisis'; // TAMBAHAN

  document.getElementById('btnSimpanNilai').style.display = (isRekap || isAnalisis) ? 'none' : 'inline-flex';
  document.getElementById('btnAddKolom').style.display = currentNilaiTab === 'pengetahuan' ? 'inline-flex' : 'none';
  document.getElementById('btnAddKolomKet').style.display = currentNilaiTab === 'keterampilan' ? 'inline-flex' : 'none';
  document.getElementById('btnExportNilai').style.display = (isRekap || isAnalisis) ? 'none' : 'inline-flex';
  
  // TAMBAHAN: Tampilkan tombol khusus analisis
  const btnExportAnalisis = document.getElementById('btnExportAnalisis');
  const btnCetakAnalisis = document.getElementById('btnCetakAnalisis');
  if (btnExportAnalisis) btnExportAnalisis.style.display = isAnalisis ? 'inline-flex' : 'none';
  if (btnCetakAnalisis) btnCetakAnalisis.style.display = isAnalisis ? 'inline-flex' : 'none';

  if (!kelas.length) {
    cont.innerHTML = '<div class="empty"><div class="ei">🏫</div><p>Belum ada kelas.</p></div>';
    sel.innerHTML = '<option>-- Belum ada kelas --</option>';
    return;
  }

  if (!currentNilaiClass || !kelas.find(k => k.class_name === currentNilaiClass)) currentNilaiClass = kelas[0].class_name;
  sel.innerHTML = kelas.map(k => `<option value="${k.class_name}" ${currentNilaiClass === k.class_name ? 'selected' : ''}>${k.class_name}</option>`).join('');

  const siswa = allData.filter(d => d.type === 'student' && d.class_name === currentNilaiClass && d.user_name === currentUser);
  info.textContent = `👥 ${siswa.length} siswa`;

  if (!siswa.length) {
    cont.innerHTML = '<div class="empty"><div class="ei">👥</div><p>Belum ada siswa di kelas ini.</p></div>';
    return;
  }

  // PERBAIKAN: Routing ke fungsi render yang sesuai (TAMBAHAN 'analisis')
  if (currentNilaiTab === 'pengetahuan') window.renderNilaiPengetahuan(siswa);
  else if (currentNilaiTab === 'sikap') window.renderNilaiSikap(siswa);
  else if (currentNilaiTab === 'keterampilan') window.renderNilaiKeterampilan(siswa);
  else if (currentNilaiTab === 'rekap') window.renderRekapNilai(siswa);
  else if (currentNilaiTab === 'analisis') window.renderAnalisisNilai(siswa); // <-- INI KUNCINYA
};

// Helper untuk mendapatkan filter dasar
window.getNilaiFilter = () => {
  return {
    class_name: currentNilaiClass,
    user_name: currentUser,
    semester: document.getElementById('nilaiSemesterSelect')?.value || 'ganjil',
    kode_tp: document.getElementById('nilaiKodeTP')?.value.trim() || ''
  };
};

window.renderNilaiPengetahuan = (siswa) => {
  const filter = window.getNilaiFilter();
  const kolomData = allData.find(d => d.type === 'nilai_kolom' && d.class_name === filter.class_name && d.user_name === filter.user_name);
  window.nilaiKolom = kolomData?.kolom ? JSON.parse(kolomData.kolom) : [];
  const cont = document.getElementById('penilaianContent');

  let bannerInfo = '';
  if (!filter.kode_tp) {
    bannerInfo = `<div style="background:#fef3c7;border:1px solid #fde047;border-radius:10px;padding:14px 18px;margin-bottom:16px;text-align:center;color:#92400e;">
      ⚠️ Silakan isi <strong>Kode TP/KD</strong> di atas untuk memuat atau membuat data penilaian.
    </div>`;
    cont.innerHTML = bannerInfo;
    return;
  }

  if (!window.nilaiKolom.length) {
    bannerInfo = `<div style="background:#fef3c7;border:1px solid #fde047;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
      <div style="font-size:1.8rem;">💡</div>
      <div style="flex:1;"><div style="font-weight:700;color:#854d0e;margin-bottom:2px;">Belum ada kolom penilaian pengetahuan</div>
      <div style="font-size:0.82rem;color:#92400e;">Klik tombol <strong>"+ Tambah Kolom"</strong> di atas.</div></div>
      <button onclick="document.getElementById('btnAddKolom').click()" style="padding:8px 16px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.85rem;">+ Tambah Kolom</button>
    </div>`;
  }

  let html = bannerInfo + `<div class="tbl-wrap"><table id="nilaiTable"><thead><tr><th width="40">No</th><th>Nama Siswa</th>`;
  if (window.nilaiKolom.length) {
    html += window.nilaiKolom.map((k, i) => `<th style="min-width:90px;"><div style="display:flex;align-items:center;justify-content:center;gap:4px;"><span>${k.label}</span><button data-kidx="${i}" data-action="hapuskolom" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.8rem;">×</button></div></th>`).join('');
    html += `<th width="80">Rerata</th>`;
  } else { html += `<th style="text-align:center;color:#94a3b8;font-style:italic;">Kolom penilaian belum ditambahkan</th>`; }
  html += `</tr></thead><tbody>`;

  siswa.forEach((s, idx) => {
    const nd = allData.find(d => d.type === 'nilai_pengetahuan' && d.student_key === s.__key && d.class_name === filter.class_name && d.user_name === filter.user_name && d.semester === filter.semester && d.kode_tp === filter.kode_tp);
    const nilai = nd?.nilai ? JSON.parse(nd.nilai) : {};
    
    html += `<tr><td style="color:#94a3b8;">${idx + 1}</td><td style="font-weight:600;">${s.student_name}</td>`;
    if (window.nilaiKolom.length) {
      const vals = window.nilaiKolom.map(k => parseFloat(nilai[k.id])).filter(v => !isNaN(v));
      const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '–';
      const avgColor = vals.length ? (parseFloat(avg) >= 75 ? '#10b981' : (parseFloat(avg) >= 60 ? '#f59e0b' : '#ef4444')) : '#94a3b8';
      html += window.nilaiKolom.map(k => `<td style="text-align:center;"><input type="number" class="nilai-input" data-sid="${s.__key}" data-kid="${k.id}" value="${nilai[k.id] ?? ''}" min="0" max="100"></td>`).join('');
      html += `<td style="text-align:center;font-weight:800;color:${avgColor};">${avg}</td>`;
    } else { html += `<td style="text-align:center;color:#cbd5e1;font-style:italic;padding:20px;">—</td>`; }
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  cont.innerHTML = html;

  if (window.nilaiKolom.length) {
    cont.querySelectorAll('.nilai-input').forEach(inp => { inp.oninput = () => window.updateRerataRow(inp, siswa); });
    cont.querySelectorAll('[data-action="hapuskolom"]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm(`Hapus kolom "${window.nilaiKolom[btn.dataset.kidx]?.label}"?`)) return;
        window.nilaiKolom.splice(parseInt(btn.dataset.kidx), 1);
        await window.simpanKonfigKolom('nilai_kolom', window.nilaiKolom);
        window.renderPenilaian();
      };
    });
  }
};

window.updateRerataRow = (changedInput, siswa) => {
  const row = changedInput.closest('tr');
  const inputs = row.querySelectorAll('.nilai-input');
  const vals = [...inputs].map(i => parseFloat(i.value)).filter(v => !isNaN(v));
  const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '–';
  const lastTd = row.querySelector('td:last-child');
  if (lastTd) {
    const col = vals.length ? (parseFloat(avg) >= 75 ? '#10b981' : (parseFloat(avg) >= 60 ? '#f59e0b' : '#ef4444')) : '#94a3b8';
    lastTd.textContent = avg; lastTd.style.color = col;
  }
};

window.renderNilaiSikap = (siswa) => {
  const filter = window.getNilaiFilter();
  const cont = document.getElementById('penilaianContent');
  
  if (!filter.kode_tp) {
    cont.innerHTML = `<div style="background:#fef3c7;border:1px solid #fde047;border-radius:10px;padding:14px 18px;margin-bottom:16px;text-align:center;color:#92400e;">⚠️ Silakan isi <strong>Kode TP/KD</strong> di atas.</div>`;
    return;
  }

  const opts = ['Sangat Baik', 'Baik', 'Cukup', 'Perlu Bimbingan'];
  const aspek = ['Beriman & Bertakwa', 'Gotong Royong', 'Mandiri', 'Bernalar Kritis', 'Kreatif'];
  let html = `<div style="font-size:0.82rem;color:#64748b;margin-bottom:12px;">💡 Penilaian sikap berdasarkan dimensi Profil Pelajar Pancasila.</div><div class="tbl-wrap"><table id="nilaiSikapTable"><thead><tr><th width="40">No</th><th style="min-width:160px;">Nama Siswa</th>${aspek.map(a => `<th style="min-width:130px;text-align:center;">${a}</th>`).join('')}<th style="min-width:140px;">Catatan</th></tr></thead><tbody>`;
  
  siswa.forEach((s, i) => {
    const sd = allData.find(d => d.type === 'nilai_sikap' && d.student_key === s.__key && d.class_name === filter.class_name && d.user_name === filter.user_name && d.semester === filter.semester && d.kode_tp === filter.kode_tp);
    let sikapVal = {}; try { sikapVal = sd?.sikap_detail ? JSON.parse(sd.sikap_detail) : {}; } catch (e) {}
    if (sd?.sikap && !Object.keys(sikapVal).length) sikapVal[aspek[0]] = sd.sikap;
    
    html += `<tr><td style="color:#94a3b8;">${i + 1}</td><td style="font-weight:600;">${s.student_name}</td>`;
    aspek.forEach(a => {
      html += `<td style="text-align:center;"><select class="sikap-select" data-sid="${s.__key}" data-aspek="${a}" style="padding:5px 6px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:0.8rem;width:100%;"><option value="">–</option>${opts.map(o => `<option ${sikapVal[a] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></td>`;
    });
    html += `<td><input type="text" class="sikap-catatan" data-sid="${s.__key}" value="${sd?.catatan || ''}" placeholder="Catatan..." style="width:100%;padding:6px;border:1.5px solid #e2e8f0;border-radius:7px;font-size:0.82rem;"></td></tr>`;
  });
  html += `</tbody></table></div>`;
  cont.innerHTML = html;
};

window.renderNilaiKeterampilan = (siswa) => {
  const filter = window.getNilaiFilter();
  const kolomData = allData.find(d => d.type === 'nilai_kolom_ket' && d.class_name === filter.class_name && d.user_name === filter.user_name);
  window.nilaiKolomKet = kolomData?.kolom ? JSON.parse(kolomData.kolom) : [];
  const cont = document.getElementById('penilaianContent');
  
  let bannerInfo = '';
  if (!filter.kode_tp) {
    cont.innerHTML = `<div style="background:#fef3c7;border:1px solid #fde047;border-radius:10px;padding:14px 18px;margin-bottom:16px;text-align:center;color:#92400e;">⚠️ Silakan isi <strong>Kode TP/KD</strong> di atas.</div>`;
    return;
  }

  if (!window.nilaiKolomKet.length) {
    bannerInfo = `<div style="background:#fef3c7;border:1px solid #fde047;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
      <div style="font-size:1.8rem;">🛠️</div><div style="flex:1;"><div style="font-weight:700;color:#854d0e;margin-bottom:2px;">Belum ada kolom penilaian keterampilan</div>
      <div style="font-size:0.82rem;color:#92400e;">Klik tombol <strong>"+ Tambah Kolom"</strong> di atas.</div></div>
      <button onclick="document.getElementById('btnAddKolomKet').click()" style="padding:8px 16px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.85rem;">+ Tambah Kolom</button>
    </div>`;
  }
  
  let html = bannerInfo + `<div class="tbl-wrap"><table id="nilaiKetTable"><thead><tr><th width="40">No</th><th>Nama Siswa</th>`;
  if (window.nilaiKolomKet.length) {
    html += window.nilaiKolomKet.map((k, i) => `<th style="min-width:90px;"><div style="display:flex;align-items:center;justify-content:center;gap:4px;"><span>${k.label}</span><button data-kidx="${i}" data-action="hapuskolomket" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.8rem;">×</button></div></th>`).join('');
    html += `<th width="80">Rerata</th>`;
  } else { html += `<th style="text-align:center;color:#94a3b8;font-style:italic;">Kolom penilaian belum ditambahkan</th>`; }
  html += `</tr></thead><tbody>`;
  
  siswa.forEach((s, idx) => {
    const nd = allData.find(d => d.type === 'nilai_keterampilan' && d.student_key === s.__key && d.class_name === filter.class_name && d.user_name === filter.user_name && d.semester === filter.semester && d.kode_tp === filter.kode_tp);
    const nilai = nd?.nilai ? JSON.parse(nd.nilai) : {};
    html += `<tr><td style="color:#94a3b8;">${idx + 1}</td><td style="font-weight:600;">${s.student_name}</td>`;
    if (window.nilaiKolomKet.length) {
      const vals = window.nilaiKolomKet.map(k => parseFloat(nilai[k.id])).filter(v => !isNaN(v));
      const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '–';
      const avgColor = vals.length ? (parseFloat(avg) >= 75 ? '#10b981' : (parseFloat(avg) >= 60 ? '#f59e0b' : '#ef4444')) : '#94a3b8';
      html += window.nilaiKolomKet.map(k => `<td style="text-align:center;"><input type="number" class="nilai-ket-input" data-sid="${s.__key}" data-kid="${k.id}" value="${nilai[k.id] ?? ''}" min="0" max="100"></td>`).join('');
      html += `<td style="text-align:center;font-weight:800;color:${avgColor};">${avg}</td>`;
    } else { html += `<td style="text-align:center;color:#cbd5e1;font-style:italic;padding:20px;">—</td>`; }
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  cont.innerHTML = html;
  
  if (window.nilaiKolomKet.length) {
    cont.querySelectorAll('.nilai-ket-input').forEach(inp => {
      inp.oninput = () => {
        const row = inp.closest('tr'); const inputs = row.querySelectorAll('.nilai-ket-input');
        const vals = [...inputs].map(i => parseFloat(i.value)).filter(v => !isNaN(v));
        const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '–';
        const lastTd = row.querySelector('td:last-child');
        if (lastTd) { const col = vals.length ? (parseFloat(avg) >= 75 ? '#10b981' : (parseFloat(avg) >= 60 ? '#f59e0b' : '#ef4444')) : '#94a3b8'; lastTd.textContent = avg; lastTd.style.color = col; }
      };
    });
    cont.querySelectorAll('[data-action="hapuskolomket"]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm(`Hapus kolom "${window.nilaiKolomKet[btn.dataset.kidx]?.label}"?`)) return;
        window.nilaiKolomKet.splice(parseInt(btn.dataset.kidx), 1);
        await window.simpanKonfigKolom('nilai_kolom_ket', window.nilaiKolomKet);
        window.renderPenilaian();
      };
    });
  }
};

// ══════════════════════════════════════════════
// FITUR BARU: REKAP NILAI (SEMUA TP/KD)
// ══════════════════════════════════════════════
window.renderRekapNilai = (siswa) => {
  const filter = window.getNilaiFilter();
  const cont = document.getElementById('penilaianContent');
  
  // Ambil SEMUA data nilai (Pengetahuan & Keterampilan) untuk kelas & semester ini
  const allNilaiData = allData.filter(d => 
    (d.type === 'nilai_pengetahuan' || d.type === 'nilai_keterampilan') && 
    d.class_name === filter.class_name && 
    d.user_name === filter.user_name && 
    d.semester === filter.semester
  );

  // Dapatkan daftar unik Kode TP yang pernah diinput
  const uniqueTPs = [...new Set(allNilaiData.map(d => d.kode_tp))].sort();

  if (uniqueTPs.length === 0) {
    cont.innerHTML = `<div class="empty"><div class="ei">📊</div><p>Belum ada data nilai di semester ${filter.semester} ini.</p></div>`;
    return;
  }

  // Bangun Header Tabel
  let html = `<div class="tbl-wrap"><table id="rekapNilaiTable"><thead><tr>
    <th width="40">No</th>
    <th style="min-width:150px;">Nama Siswa</th>`;
  
  uniqueTPs.forEach(tp => {
    html += `<th style="min-width:100px; text-align:center;">TP ${tp}<br><small style="font-weight:400;color:#64748b;">Rerata</small></th>`;
  });
  
  html += `<th width="100" style="background:#f0fdf4; color:#065f46;">Nilai Akhir<br>Semester</th>
  </tr></thead><tbody>`;

  // Isi Data Per Siswa
  siswa.forEach((s, idx) => {
    html += `<tr><td style="color:#94a3b8;">${idx + 1}</td><td style="font-weight:600;">${s.student_name}</td>`;
    
    let totalNilaiSemester = 0;
    let countTP = 0;

    uniqueTPs.forEach(tp => {
      const dataTP = allNilaiData.find(d => d.student_key === s.__key && d.kode_tp === tp);
      
      if (dataTP && dataTP.nilai) {
        try {
          const nilaiObj = JSON.parse(dataTP.nilai);
          const vals = Object.values(nilaiObj).map(v => parseFloat(v)).filter(v => !isNaN(v));
          
          if (vals.length > 0) {
            const avgTP = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
            totalNilaiSemester += parseFloat(avgTP);
            countTP++;
            
            const color = avgTP >= 75 ? '#10b981' : (avgTP >= 60 ? '#f59e0b' : '#ef4444');
            html += `<td style="text-align:center;font-weight:700;color:${color};">${avgTP}</td>`;
          } else {
            html += `<td style="text-align:center;color:#cbd5e1;">-</td>`;
          }
        } catch (e) {
          html += `<td style="text-align:center;color:#cbd5e1;">-</td>`;
        }
      } else {
        html += `<td style="text-align:center;color:#cbd5e1;">-</td>`;
      }
    });

    // Hitung Nilai Akhir Semester (Rerata dari semua Rerata TP)
    const nilaiAkhir = countTP > 0 ? (totalNilaiSemester / countTP).toFixed(1) : '-';
    const colorAkhir = nilaiAkhir !== '-' ? (parseFloat(nilaiAkhir) >= 75 ? '#065f46' : (parseFloat(nilaiAkhir) >= 60 ? '#92400e' : '#991b1b')) : '#94a3b8';
    
    html += `<td style="text-align:center;font-weight:800;color:${colorAkhir};background:#f0fdf4;">${nilaiAkhir}</td></tr>`;
  });

  html += `</tbody></table></div>`;
  
  // Tambahkan info deskripsi di atas tabel
  const mapel = document.getElementById('nilaiMapel')?.value || 'Umum';
  html = `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px;margin-bottom:16px;font-size:0.9rem;color:#0369a1;">
    📌 <strong>Rekapitulasi Nilai Semester ${filter.semester === 'ganjil' ? 'Ganjil' : 'Genap'}</strong> | Mapel: ${mapel} | Total TP Terdata: ${uniqueTPs.length}
  </div>` + html;

  cont.innerHTML = html;
};

window.simpanNilai = async () => {
  const filter = window.getNilaiFilter();
  if (!filter.kode_tp) {
    window.toast('❌ Kode TP/KD harus diisi!', 'err');
    return;
  }

  const btn = document.getElementById('btnSimpanNilai');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  
  const mapel = document.getElementById('nilaiMapel').value.trim();
  const deskripsi = document.getElementById('nilaiDeskripsiTP').value.trim();

  try {
    if (currentNilaiTab === 'pengetahuan') {
      const inputs = document.querySelectorAll('.nilai-input');
      const dataPerSiswa = {};
      inputs.forEach(inp => { if (!dataPerSiswa[inp.dataset.sid]) dataPerSiswa[inp.dataset.sid] = {}; if (inp.value !== '') dataPerSiswa[inp.dataset.sid][inp.dataset.kid] = parseFloat(inp.value); });
      
      for (const [sid, nilai] of Object.entries(dataPerSiswa)) {
        const ex = allData.find(d => d.type === 'nilai_pengetahuan' && d.student_key === sid && d.class_name === filter.class_name && d.user_name === filter.user_name && d.semester === filter.semester && d.kode_tp === filter.kode_tp);
        const pl = { 
          type: 'nilai_pengetahuan', student_key: sid, class_name: filter.class_name, user_name: filter.user_name, 
          semester: filter.semester, kode_tp: filter.kode_tp, mapel: mapel, deskripsi_tp: deskripsi,
          nilai: JSON.stringify(nilai), updated_at: window.nowISO() 
        };
        if (ex) await ROOT.child(ex.__key).update(pl); else await ROOT.push().set({ ...pl, created_at: window.nowISO() });
      }
    } else if (currentNilaiTab === 'sikap') {
      const selects = document.querySelectorAll('.sikap-select'); const catatan = document.querySelectorAll('.sikap-catatan');
      const perSiswa = {};
      selects.forEach(sel => { const sid = sel.dataset.sid; const aspek = sel.dataset.aspek; if (!perSiswa[sid]) perSiswa[sid] = { sikap_detail: {}, catatan: '' }; if (sel.value) perSiswa[sid].sikap_detail[aspek] = sel.value; });
      catatan.forEach(c => { if (perSiswa[c.dataset.sid]) perSiswa[c.dataset.sid].catatan = c.value; });
      
      for (const [sid, data] of Object.entries(perSiswa)) {
        const ex = allData.find(d => d.type === 'nilai_sikap' && d.student_key === sid && d.class_name === filter.class_name && d.user_name === filter.user_name && d.semester === filter.semester && d.kode_tp === filter.kode_tp);
        const pl = { 
          type: 'nilai_sikap', student_key: sid, class_name: filter.class_name, user_name: filter.user_name,
          semester: filter.semester, kode_tp: filter.kode_tp, mapel: mapel, deskripsi_tp: deskripsi,
          sikap_detail: JSON.stringify(data.sikap_detail), catatan: data.catatan, updated_at: window.nowISO() 
        };
        if (ex) await ROOT.child(ex.__key).update(pl); else await ROOT.push().set({ ...pl, created_at: window.nowISO() });
      }
    } else if (currentNilaiTab === 'keterampilan') {
      const inputs = document.querySelectorAll('.nilai-ket-input');
      const dataPerSiswa = {};
      inputs.forEach(inp => { if (!dataPerSiswa[inp.dataset.sid]) dataPerSiswa[inp.dataset.sid] = {}; if (inp.value !== '') dataPerSiswa[inp.dataset.sid][inp.dataset.kid] = parseFloat(inp.value); });
      
      for (const [sid, nilai] of Object.entries(dataPerSiswa)) {
        const ex = allData.find(d => d.type === 'nilai_keterampilan' && d.student_key === sid && d.class_name === filter.class_name && d.user_name === filter.user_name && d.semester === filter.semester && d.kode_tp === filter.kode_tp);
        const pl = { 
          type: 'nilai_keterampilan', student_key: sid, class_name: filter.class_name, user_name: filter.user_name,
          semester: filter.semester, kode_tp: filter.kode_tp, mapel: mapel, deskripsi_tp: deskripsi,
          nilai: JSON.stringify(nilai), updated_at: window.nowISO() 
        };
        if (ex) await ROOT.child(ex.__key).update(pl); else await ROOT.push().set({ ...pl, created_at: window.nowISO() });
      }
    }
    window.toast('✅ Nilai berhasil disimpan!');
  } catch (e) { window.toast('Gagal: ' + e.message, 'err'); }
  btn.disabled = false; btn.textContent = '💾 Simpan Nilai';
};

window.tambahKolom = async (jenisNilai = 'pengetahuan') => {
  const filter = window.getNilaiFilter();
  if (!filter.kode_tp) { window.toast('❌ Isi Kode TP/KD terlebih dahulu!', 'err'); return; }
  
  const jenis = document.getElementById('inputJenisKolom')?.value || 'PH';
  if (jenisNilai === 'pengetahuan') {
    const jumlahKolomSama = window.nilaiKolom.filter(k => k.jenis === jenis).length;
    window.nilaiKolom.push({ id: 'k_' + Date.now(), jenis, label: `${jenis} ${jumlahKolomSama + 1}` });
    await window.simpanKonfigKolom('nilai_kolom', window.nilaiKolom);
  } else {
    const jumlahKolomSama = window.nilaiKolomKet.filter(k => k.jenis === jenis).length;
    window.nilaiKolomKet.push({ id: 'kk_' + Date.now(), jenis, label: `${jenis} ${jumlahKolomSama + 1}` });
    await window.simpanKonfigKolom('nilai_kolom_ket', window.nilaiKolomKet);
  }
  window.closeModal('modalKolom');
  window.renderPenilaian();
};

window.simpanKonfigKolom = async (tipe, kolom) => {
  const filter = window.getNilaiFilter();
  const ex = allData.find(d => d.type === tipe && d.class_name === filter.class_name && d.user_name === filter.user_name);
  const pl = { type: tipe, class_name: filter.class_name, user_name: filter.user_name, kolom: JSON.stringify(kolom), updated_at: window.nowISO() };
  if (ex) await ROOT.child(ex.__key).update(pl); else await ROOT.push().set({ ...pl, created_at: window.nowISO() });
};

window.eksporNilai = () => {
    if (typeof XLSX === 'undefined') {
        window.toast('⚠️ Library Excel belum siap.', 'err');
        return;
    }

    const filter = window.getNilaiFilter();
    const kelas = currentNilaiClass || 'Tanpa_Kelas';
    const tahunAjaran = document.getElementById('nilaiTahunAjaran')?.value || '2024/2025';
    const mapel = document.getElementById('nilaiMapel')?.value || '-';
    const deskripsi = document.getElementById('nilaiDeskripsiTP')?.value || '-';
    const semesterText = filter.semester === 'ganjil' ? 'Ganjil' : 'Genap';
    
    let rows = [];
    let filename = '';
    let sheetName = 'Data';

    // Header Laporan Lengkap (Default)
    rows.push([`LAPORAN NILAI`]);
    rows.push([`Kelas: ${kelas}`, `Semester: ${semesterText}`, `Tahun Ajaran: ${tahunAjaran}`]);
    
    if (currentNilaiTab !== 'rekap') {
        rows.push([`Kode TP/KD: ${filter.kode_tp || '-'}`, `Mata Pelajaran: ${mapel}`]);
        rows.push([`Deskripsi: ${deskripsi}`]);
    }
    rows.push([]); // Baris kosong pemisah

    if (currentNilaiTab === 'pengetahuan') {
        if (!window.nilaiKolom || !window.nilaiKolom.length) { window.toast('Tambahkan kolom penilaian terlebih dahulu.', 'err'); return; }
        const siswa = allData.filter(d => d.type === 'student' && d.class_name === kelas && d.user_name === currentUser);
        rows.push(['No', 'Nama Siswa', ...window.nilaiKolom.map(k => k.label), 'Rerata']);

        siswa.forEach((s, i) => {
            const inputs = document.querySelectorAll(`.nilai-input[data-sid="${s.__key}"]`);
            const vals = [];
            inputs.forEach(inp => vals.push(inp.value !== '' ? inp.value : ''));
            const numericVals = vals.map(v => parseFloat(v)).filter(v => !isNaN(v));
            const avg = numericVals.length ? (numericVals.reduce((a, b) => a + b, 0) / numericVals.length).toFixed(1) : '';
            rows.push([i + 1, s.student_name, ...vals, avg]);
        });
        filename = `SIPENA_Pengetahuan_${kelas}_${filter.semester}_${filter.kode_tp}.xlsx`;
        sheetName = 'Pengetahuan';

    } else if (currentNilaiTab === 'sikap') {
        const aspek = ['Beriman & Bertakwa', 'Gotong Royong', 'Mandiri', 'Bernalar Kritis', 'Kreatif'];
        const siswa = allData.filter(d => d.type === 'student' && d.class_name === kelas && d.user_name === currentUser);
        rows.push(['No', 'Nama Siswa', ...aspek, 'Catatan']);

        siswa.forEach((s, i) => {
            const selects = document.querySelectorAll(`.sikap-select[data-sid="${s.__key}"]`);
            const catatanInput = document.querySelector(`.sikap-catatan[data-sid="${s.__key}"]`);
            const sikapVals = [];
            aspek.forEach(a => {
                const sel = Array.from(selects).find(x => x.dataset.aspek === a);
                sikapVals.push(sel ? sel.value : '');
            });
            rows.push([i + 1, s.student_name, ...sikapVals, catatanInput ? catatanInput.value : '']);
        });
        filename = `SIPENA_Sikap_${kelas}_${filter.semester}_${filter.kode_tp}.xlsx`;
        sheetName = 'Sikap';

    } else if (currentNilaiTab === 'keterampilan') {
        if (!window.nilaiKolomKet || !window.nilaiKolomKet.length) { window.toast('Tambahkan kolom penilaian terlebih dahulu.', 'err'); return; }
        const siswa = allData.filter(d => d.type === 'student' && d.class_name === kelas && d.user_name === currentUser);
        rows.push(['No', 'Nama Siswa', ...window.nilaiKolomKet.map(k => k.label), 'Rerata']);

        siswa.forEach((s, i) => {
            const inputs = document.querySelectorAll(`.nilai-ket-input[data-sid="${s.__key}"]`);
            const vals = [];
            inputs.forEach(inp => vals.push(inp.value !== '' ? inp.value : ''));
            const numericVals = vals.map(v => parseFloat(v)).filter(v => !isNaN(v));
            const avg = numericVals.length ? (numericVals.reduce((a, b) => a + b, 0) / numericVals.length).toFixed(1) : '';
            rows.push([i + 1, s.student_name, ...vals, avg]);
        });
        filename = `SIPENA_Keterampilan_${kelas}_${filter.semester}_${filter.kode_tp}.xlsx`;
        sheetName = 'Keterampilan';
        
    } else if (currentNilaiTab === 'rekap') {
        // LOGIKA EXPORT KHUSUS REKAP
        const allNilaiData = allData.filter(d => 
            (d.type === 'nilai_pengetahuan' || d.type === 'nilai_keterampilan') && 
            d.class_name === filter.class_name && d.user_name === filter.user_name && d.semester === filter.semester
        );
        const uniqueTPs = [...new Set(allNilaiData.map(d => d.kode_tp))].sort();

        if (uniqueTPs.length === 0) { window.toast('Tidak ada data rekap untuk diekspor.', 'err'); return; }

        rows.push(['No', 'Nama Siswa', ...uniqueTPs.map(tp => `Rerata TP ${tp}`), 'Nilai Akhir Semester']);
        const siswa = allData.filter(d => d.type === 'student' && d.class_name === kelas && d.user_name === currentUser);

        siswa.forEach((s, i) => {
            const row = [i + 1, s.student_name];
            let totalSemester = 0, countTP = 0;

            uniqueTPs.forEach(tp => {
                const dataTP = allNilaiData.find(d => d.student_key === s.__key && d.kode_tp === tp);
                if (dataTP && dataTP.nilai) {
                    try {
                        const vals = Object.values(JSON.parse(dataTP.nilai)).map(v => parseFloat(v)).filter(v => !isNaN(v));
                        if (vals.length > 0) {
                            const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
                            row.push(avg);
                            totalSemester += parseFloat(avg);
                            countTP++;
                        } else { row.push(''); }
                    } catch(e) { row.push(''); }
                } else { row.push(''); }
            });

            const akhir = countTP > 0 ? (totalSemester / countTP).toFixed(1) : '';
            row.push(akhir);
            rows.push(row);
        });
        filename = `SIPENA_Rekap_Nilai_${kelas}_${filter.semester}.xlsx`;
        sheetName = 'Rekap Nilai';
    }

    if (rows.length <= 5) { window.toast('Tidak ada data untuk diekspor.', 'err'); return; }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const lastColIndex = rows[rows.length > 5 ? 4 : (rows.length - 1)].length - 1; 
    
    // Merge cell untuk Judul Laporan
    ws['!merges'] = [ { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIndex } } ];

    const colWidths = [{ wch: 5 }, { wch: 30 }];
    for (let i = 2; i <= lastColIndex; i++) colWidths.push({ wch: 15 });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);

    window.toast(`✅ File ${filename} berhasil diunduh!`, 'success');
};

// Event Listeners untuk perubahan filter
document.addEventListener('DOMContentLoaded', () => {
  const elSemester = document.getElementById('nilaiSemesterSelect');
  const elKodeTP = document.getElementById('nilaiKodeTP');
  
  if (elSemester) elSemester.addEventListener('change', () => window.renderPenilaian());
  if (elKodeTP) elKodeTP.addEventListener('change', () => window.renderPenilaian());
});

// ══════════════════════════════════════════════
// FITUR ANALISIS NILAI - SIPENA
// ══════════════════════════════════════════════

// Variabel global untuk chart (agar bisa di-destroy saat re-render)
let chartHistogram = null;
let chartRadar = null;

// Helper: Hitung KKM default berdasarkan kelas
window.getKKMDefault = (className) => {
  if (!className) return 75;
  const kelas = className.toString().toUpperCase();
  if (kelas.includes('XII') || kelas.includes('12')) return 80;
  if (kelas.includes('XI') || kelas.includes('11')) return 78;
  if (kelas.includes('X') || kelas.includes('10')) return 75;
  return 75;
};

// Helper: Hitung rata-rata nilai siswa untuk satu TP
window.hitungRerataSiswaPerTP = (studentKey, kodeTP, semuaNilaiData) => {
  const dataTP = semuaNilaiData.find(d => 
    d.student_key === studentKey && d.kode_tp === kodeTP && d.nilai
  );
  if (!dataTP) return null;
  
  try {
    const nilaiObj = JSON.parse(dataTP.nilai);
    const vals = Object.values(nilaiObj).map(v => parseFloat(v)).filter(v => !isNaN(v));
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  } catch (e) {
    return null;
  }
};

// Fungsi utama render Analisis
window.renderAnalisisNilai = (siswa) => {
  const filter = window.getNilaiFilter();
  const cont = document.getElementById('penilaianContent');
  
  // Sembunyikan tombol yang tidak relevan
  document.getElementById('btnSimpanNilai').style.display = 'none';
  document.getElementById('btnAddKolom').style.display = 'none';
  document.getElementById('btnAddKolomKet').style.display = 'none';
  document.getElementById('btnExportNilai').style.display = 'none';
  document.getElementById('btnExportAnalisis').style.display = 'inline-flex';
  document.getElementById('btnCetakAnalisis').style.display = 'inline-flex';
  
  // Ambil semua data nilai untuk kelas & semester ini
  const semuaNilaiData = allData.filter(d => 
    (d.type === 'nilai_pengetahuan' || d.type === 'nilai_keterampilan') && 
    d.class_name === filter.class_name && 
    d.user_name === filter.user_name && 
    d.semester === filter.semester
  );
  
  // Dapatkan daftar unik TP
  const uniqueTPs = [...new Set(semuaNilaiData.map(d => d.kode_tp))].sort();
  
  if (uniqueTPs.length === 0 || siswa.length === 0) {
    cont.innerHTML = `<div class="empty"><div class="ei"></div><p>Belum ada data nilai untuk dianalisis di semester ${filter.semester}.</p></div>`;
    return;
  }
  
  // KKM (ambil dari input atau default)
  const kkmInput = document.getElementById('nilaiKKM');
  let kkm = kkmInput ? parseFloat(kkmInput.value) : window.getKKMDefault(filter.class_name);
  if (isNaN(kkm) || kkm < 0 || kkm > 100) kkm = 75;
  
  // ══════════════════════════════════════════
  // 1. HITUNG STATISTIK PER SISWA
  // ══════════════════════════════════════════
  const statistikSiswa = siswa.map(s => {
    let totalRerataTP = 0;
    let countTP = 0;
    
    uniqueTPs.forEach(tp => {
      const rerata = window.hitungRerataSiswaPerTP(s.__key, tp, semuaNilaiData);
      if (rerata !== null) {
        totalRerataTP += rerata;
        countTP++;
      }
    });
    
    const nilaiAkhir = countTP > 0 ? totalRerataTP / countTP : null;
    return {
      student: s,
      nilaiAkhir: nilaiAkhir,
      tuntas: nilaiAkhir !== null && nilaiAkhir >= kkm
    };
  }).filter(s => s.nilaiAkhir !== null);
  
  // ══════════════════════════════════════════
  // 2. STATISTIK KELAS
  // ══════════════════════════════════════════
  const nilaiAkhirList = statistikSiswa.map(s => s.nilaiAkhir);
  const rataKelas = nilaiAkhirList.reduce((a, b) => a + b, 0) / nilaiAkhirList.length;
  const nilaiTertinggi = Math.max(...nilaiAkhirList);
  const nilaiTerendah = Math.min(...nilaiAkhirList);
  const siswaTuntas = statistikSiswa.filter(s => s.tuntas).length;
  const siswaRemedial = statistikSiswa.length - siswaTuntas;
  const persentaseTuntas = ((siswaTuntas / statistikSiswa.length) * 100).toFixed(1);
  
  // ══════════════════════════════════════════
  // 3. ANALISIS PER TP
  // ══════════════════════════════════════════
  const analisisTP = uniqueTPs.map(tp => {
    const rerataPerSiswa = siswa.map(s => window.hitungRerataSiswaPerTP(s.__key, tp, semuaNilaiData))
                                .filter(v => v !== null);
    const rerataTP = rerataPerSiswa.length > 0 
      ? rerataPerSiswa.reduce((a, b) => a + b, 0) / rerataPerSiswa.length 
      : 0;
    
    let status, statusColor;
    if (rerataTP >= kkm + 5) { status = '✅ Dikuasai'; statusColor = '#10b981'; }
    else if (rerataTP >= kkm - 5) { status = '⚠️ Perlu Penguatan'; statusColor = '#f59e0b'; }
    else { status = ' Kritikal'; statusColor = '#ef4444'; }
    
    return { kode: tp, rerata: rerataTP.toFixed(1), status, statusColor };
  });
  
  // ══════════════════════════════════════════
  // 4. DISTRIBUSI NILAI (HISTOGRAM)
  // ══════════════════════════════════════════
  const distribusi = { '0-59': 0, '60-69': 0, '70-79': 0, '80-89': 0, '90-100': 0 };
  nilaiAkhirList.forEach(n => {
    if (n < 60) distribusi['0-59']++;
    else if (n < 70) distribusi['60-69']++;
    else if (n < 80) distribusi['70-79']++;
    else if (n < 90) distribusi['80-89']++;
    else distribusi['90-100']++;
  });
  
  // ══════════════════════════════════════════
  // 5. DAFTAR SISWA REMEDIAL & PENGAYAAN
  // ══════════════════════════════════════════
  const daftarRemedial = statistikSiswa
    .filter(s => !s.tuntas)
    .sort((a, b) => a.nilaiAkhir - b.nilaiAkhir);
  
  const daftarPengayaan = statistikSiswa
    .filter(s => s.nilaiAkhir >= 90)
    .sort((a, b) => b.nilaiAkhir - a.nilaiAkhir);
  
  // ══════════════════════════════════════════
  // RENDER HTML
  // ══════════════════════════════════════════
  let html = `
    <div id="analisisContent">
      <!-- Input KKM -->
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <div style="font-weight:700;color:#0369a1;">🎯 Kriteria Ketuntasan Minimal (KKM):</div>
        <input type="number" id="nilaiKKM" value="${kkm}" min="0" max="100" 
               style="width:80px;padding:6px 10px;border:2px solid #0284c7;border-radius:6px;font-weight:700;font-size:1rem;text-align:center;">
        <button onclick="window.renderAnalisisNilai(allData.filter(d => d.type === 'student' && d.class_name === '${filter.class_name}' && d.user_name === '${filter.user_name}'))" 
                style="padding:6px 14px;background:#0284c7;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">🔄 Hitung Ulang</button>
        <div style="font-size:0.82rem;color:#64748b;margin-left:auto;">Default: X=75, XI=78, XII=80</div>
      </div>
      
      <!-- 4 KARTU STATISTIK -->
      <div class="stat-row" style="grid-template-columns:repeat(4,1fr);">
        <div class="stat-box sb-h">
          <h4>${rataKelas.toFixed(1)}</h4>
          <p>📊 Rata-rata Kelas</p>
        </div>
        <div class="stat-box sb-i">
          <h4>${nilaiTertinggi.toFixed(0)}<small style="font-size:0.9rem;color:#64748b;"> / ${nilaiTerendah.toFixed(0)}</small></h4>
          <p>🏆 Tertinggi / Terendah</p>
        </div>
        <div class="stat-box sb-s">
          <h4>${siswaTuntas}<small style="font-size:0.9rem;"> / ${statistikSiswa.length}</small></h4>
          <p>✅ Tuntas (${persentaseTuntas}%)</p>
        </div>
        <div class="stat-box sb-a">
          <h4>${siswaRemedial}</h4>
          <p>⚠️ Perlu Remedial</p>
        </div>
      </div>
      
      <!-- HISTOGRAM -->
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin-bottom:18px;">
        <div style="font-weight:700;color:#1e293b;margin-bottom:12px;">📊 Distribusi Nilai Siswa</div>
        <div style="height:250px;position:relative;">
          <canvas id="chartHistogram"></canvas>
        </div>
      </div>
      
      <!-- TABEL ANALISIS PER TP -->
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin-bottom:18px;">
        <div style="font-weight:700;color:#1e293b;margin-bottom:12px;">📋 Analisis Pencapaian per TP/KD</div>
        <div class="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th width="80">Kode TP</th>
                <th>Rata-rata Kelas</th>
                <th width="180">Status</th>
              </tr>
            </thead>
            <tbody>
              ${analisisTP.map(tp => `
                <tr>
                  <td style="font-weight:700;">TP ${tp.kode}</td>
                  <td style="text-align:center;font-weight:700;color:${tp.statusColor};">${tp.rerata}</td>
                  <td style="color:${tp.statusColor};font-weight:600;">${tp.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- DAFTAR SISWA -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;">
          <div style="font-weight:700;color:#991b1b;margin-bottom:10px;">🔴 Siswa Perlu Remedial (${daftarRemedial.length})</div>
          ${daftarRemedial.length === 0 
            ? '<div style="color:#64748b;font-size:0.85rem;">Tidak ada siswa remedial. 🎉</div>'
            : '<ul style="list-style:none;padding:0;margin:0;">' + 
              daftarRemedial.map(s => `<li style="padding:6px 0;border-bottom:1px dashed #fecaca;display:flex;justify-content:space-between;">
                <span style="font-weight:600;color:#1e293b;">${s.student.student_name}</span>
                <span style="font-weight:700;color:#ef4444;">${s.nilaiAkhir.toFixed(1)}</span>
              </li>`).join('') + '</ul>'}
        </div>
        
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;">
          <div style="font-weight:700;color:#166534;margin-bottom:10px;">🟢 Siswa Perlu Pengayaan (${daftarPengayaan.length})</div>
          ${daftarPengayaan.length === 0 
            ? '<div style="color:#64748b;font-size:0.85rem;">Belum ada siswa dengan nilai ≥ 90.</div>'
            : '<ul style="list-style:none;padding:0;margin:0;">' + 
              daftarPengayaan.map(s => `<li style="padding:6px 0;border-bottom:1px dashed #bbf7d0;display:flex;justify-content:space-between;">
                <span style="font-weight:600;color:#1e293b;">${s.student.student_name}</span>
                <span style="font-weight:700;color:#10b981;">${s.nilaiAkhir.toFixed(1)}</span>
              </li>`).join('') + '</ul>'}
        </div>
      </div>
    </div>
  `;
  
  cont.innerHTML = html;
  
  // ══════════════════════════════════════════
  // RENDER CHART HISTOGRAM
  // ══════════════════════════════════════════
  if (chartHistogram) chartHistogram.destroy();
  const ctx = document.getElementById('chartHistogram');
  if (ctx) {
    chartHistogram = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(distribusi),
        datasets: [{
          label: 'Jumlah Siswa',
          data: Object.values(distribusi),
          backgroundColor: ['#ef4444', '#f59e0b', '#eab308', '#3b82f6', '#10b981'],
          borderRadius: 8,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { size: 12 } }
          },
          x: {
            ticks: { font: { size: 12, weight: 'bold' } }
          }
        }
      }
    });
  }
};

// ══════════════════════════════════════════
// EXPORT ANALISIS KE EXCEL
// ══════════════════════════════════════════
window.exportAnalisisNilai = () => {
  if (typeof XLSX === 'undefined') {
    window.toast('⚠️ Library Excel belum siap.', 'err');
    return;
  }
  
  const filter = window.getNilaiFilter();
  const kelas = currentNilaiClass || 'Tanpa_Kelas';
  const semesterText = filter.semester === 'ganjil' ? 'Ganjil' : 'Genap';
  const kkm = parseFloat(document.getElementById('nilaiKKM')?.value) || 75;
  
  const semuaNilaiData = allData.filter(d => 
    (d.type === 'nilai_pengetahuan' || d.type === 'nilai_keterampilan') && 
    d.class_name === filter.class_name && 
    d.user_name === filter.user_name && 
    d.semester === filter.semester
  );
  
  const uniqueTPs = [...new Set(semuaNilaiData.map(d => d.kode_tp))].sort();
  const siswa = allData.filter(d => d.type === 'student' && d.class_name === kelas && d.user_name === currentUser);
  
  const rows = [];
  rows.push(['LAPORAN ANALISIS NILAI']);
  rows.push([`Kelas: ${kelas}`, `Semester: ${semesterText}`, `KKM: ${kkm}`]);
  rows.push([]);
  
  // Statistik kelas
  const statistikSiswa = siswa.map(s => {
    let total = 0, count = 0;
    uniqueTPs.forEach(tp => {
      const rerata = window.hitungRerataSiswaPerTP(s.__key, tp, semuaNilaiData);
      if (rerata !== null) { total += rerata; count++; }
    });
    return { name: s.student_name, nilai: count > 0 ? total / count : null };
  }).filter(s => s.nilai !== null);
  
  const nilaiList = statistikSiswa.map(s => s.nilai);
  const rata = nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length;
  const tuntas = statistikSiswa.filter(s => s.nilai >= kkm).length;
  
  rows.push(['STATISTIK KELAS']);
  rows.push(['Rata-rata', rata.toFixed(2)]);
  rows.push(['Tertinggi', Math.max(...nilaiList).toFixed(2)]);
  rows.push(['Terendah', Math.min(...nilaiList).toFixed(2)]);
  rows.push(['Siswa Tuntas', `${tuntas} dari ${statistikSiswa.length} (${((tuntas/statistikSiswa.length)*100).toFixed(1)}%)`]);
  rows.push([]);
  
  // Analisis per TP
  rows.push(['ANALISIS PER TP/KD']);
  rows.push(['Kode TP', 'Rata-rata Kelas', 'Status']);
  uniqueTPs.forEach(tp => {
    const rerataPerSiswa = siswa.map(s => window.hitungRerataSiswaPerTP(s.__key, tp, semuaNilaiData)).filter(v => v !== null);
    const rerata = rerataPerSiswa.length > 0 ? rerataPerSiswa.reduce((a, b) => a + b, 0) / rerataPerSiswa.length : 0;
    let status = rerata >= kkm + 5 ? 'Dikuasai' : (rerata >= kkm - 5 ? 'Perlu Penguatan' : 'Kritikal');
    rows.push([`TP ${tp}`, rerata.toFixed(2), status]);
  });
  rows.push([]);
  
  // Daftar siswa
  rows.push(['DAFTAR NILAI SISWA']);
  rows.push(['No', 'Nama Siswa', 'Nilai Akhir', 'Status']);
  statistikSiswa.sort((a, b) => b.nilai - a.nilai).forEach((s, i) => {
    rows.push([i + 1, s.name, s.nilai.toFixed(2), s.nilai >= kkm ? 'Tuntas' : 'Remedial']);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 20 }];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Analisis Nilai');
  XLSX.writeFile(wb, `SIPENA_Analisis_${kelas}_${filter.semester}.xlsx`);
  
  window.toast('✅ File analisis berhasil diunduh!', 'success');
};

// ══════════════════════════════════════════
// CETAK ANALISIS KE PDF
// ══════════════════════════════════════════
window.cetakAnalisisPDF = async () => {
  const { jsPDF } = window.jspdf;
  const btn = document.getElementById('btnCetakAnalisis');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Membuat PDF...';
  
  try {
    const element = document.getElementById('analisisContent');
    if (!element) {
      window.toast('⚠️ Tidak ada data analisis untuk dicetak.', 'err');
      return;
    }
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    const filter = window.getNilaiFilter();
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text(`ANALISIS NILAI - ${currentNilaiClass} (${filter.semester === 'ganjil' ? 'Ganjil' : 'Genap'})`, 10, 10);
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text(`MAN Bantaeng | KKM: ${document.getElementById('nilaiKKM')?.value || 75}`, 10, 16);
    
    pdf.addImage(imgData, 'PNG', 10, 22, pdfWidth - 20, pdfHeight);
    pdf.save(`Analisis_Nilai_${currentNilaiClass}_${filter.semester}.pdf`);
    
    window.toast('✅ PDF berhasil dibuat!', 'success');
  } catch (e) {
    console.error('Error cetak PDF:', e);
    window.toast('❌ Gagal membuat PDF: ' + e.message, 'err');
  }
  
  btn.disabled = false;
  btn.innerHTML = '🖨️ Cetak PDF';
};
