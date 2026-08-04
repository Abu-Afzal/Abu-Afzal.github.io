// ══════════════════════════════════════════════
// SIPENA: Penilaian (Dengan Urutan Siswa A-Z)
// ══════════════════════════════════════════════

window.renderPenilaian = () => {
  const kelas = allData.filter(d => d.type === 'class' && d.user_name === currentUser);
  const sel = document.getElementById('nilaiKelasSelect');
  const cont = document.getElementById('penilaianContent');
  const info = document.getElementById('infoSiswaKelas');

  // Atur visibilitas tombol berdasarkan tab yang aktif
  const isRekap = currentNilaiTab === 'rekap';
  const isAnalisisSoal = currentNilaiTab === 'analisis-soal';

  document.getElementById('btnSimpanNilai').style.display = (isRekap || isAnalisisSoal) ? 'none' : 'inline-flex';
  document.getElementById('btnAddKolom').style.display = currentNilaiTab === 'pengetahuan' ? 'inline-flex' : 'none';
  document.getElementById('btnAddKolomKet').style.display = currentNilaiTab === 'keterampilan' ? 'inline-flex' : 'none';
  document.getElementById('btnExportNilai').style.display = (isRekap || isAnalisisSoal) ? 'none' : 'inline-flex';
  
  // Tampilkan tombol khusus Analisis Soal
  const btnExportAnalisisSoal = document.getElementById('btnExportAnalisisSoal');
  if (btnExportAnalisisSoal) {
    btnExportAnalisisSoal.style.display = isAnalisisSoal ? 'inline-flex' : 'none';
  }

  if (!kelas.length) {
    cont.innerHTML = '<div class="empty"><div class="ei">🏫</div><p>Belum ada kelas.</p></div>';
    if (sel) sel.innerHTML = '<option>-- Belum ada kelas --</option>';
    return;
  }

  if (!currentNilaiClass || !kelas.find(k => k.class_name === currentNilaiClass)) {
    currentNilaiClass = kelas[0].class_name;
  }

  if (sel) {
    sel.innerHTML = kelas.map(k => `<option value="${k.class_name}" ${currentNilaiClass === k.class_name ? 'selected' : ''}>${k.class_name}</option>`).join('');
    
    // Binding event onchange pada select kelas
    sel.onchange = (e) => {
      currentNilaiClass = e.target.value;
      window.renderPenilaian();
    };
  }

  // Filter & Urutkan Nama Siswa A-Z
  const siswa = allData
    .filter(d => d.type === 'student' && d.class_name === currentNilaiClass && d.user_name === currentUser)
    .sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));

  if (info) info.textContent = `👥 ${siswa.length} siswa`;

  if (!siswa.length) {
    cont.innerHTML = '<div class="empty"><div class="ei">👥</div><p>Belum ada siswa di kelas ini.</p></div>';
    return;
  }

  // ROUTING: Arahkan ke fungsi yang sesuai
  if (currentNilaiTab === 'pengetahuan') window.renderNilaiPengetahuan(siswa);
  else if (currentNilaiTab === 'sikap') window.renderNilaiSikap(siswa);
  else if (currentNilaiTab === 'keterampilan') window.renderNilaiKeterampilan(siswa);
  else if (currentNilaiTab === 'rekap') window.renderRekapNilai(siswa);
  else if (currentNilaiTab === 'analisis-soal') window.renderAnalisisAsesmen(siswa);
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

// Helper: Hitung KKM default berdasarkan kelas
window.getKKMDefault = (className) => {
  if (!className) return 75;
  const kelas = className.toString().toUpperCase();
  if (kelas.includes('XII') || kelas.includes('12')) return 80;
  if (kelas.includes('XI') || kelas.includes('11')) return 78;
  if (kelas.includes('X') || kelas.includes('10')) return 75;
  return 75;
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

window.renderRekapNilai = (siswa) => {
  const filter = window.getNilaiFilter();
  const cont = document.getElementById('penilaianContent');
  
  const allNilaiData = allData.filter(d => 
    (d.type === 'nilai_pengetahuan' || d.type === 'nilai_keterampilan') && 
    d.class_name === filter.class_name && 
    d.user_name === filter.user_name && 
    d.semester === filter.semester
  );

  const uniqueTPs = [...new Set(allNilaiData.map(d => d.kode_tp))].sort();

  if (uniqueTPs.length === 0) {
    cont.innerHTML = `<div class="empty"><div class="ei">📊</div><p>Belum ada data nilai di semester ${filter.semester} ini.</p></div>`;
    return;
  }

  let html = `<div class="tbl-wrap"><table id="rekapNilaiTable"><thead><tr>
    <th width="40">No</th>
    <th style="min-width:150px;">Nama Siswa</th>`;
  
  uniqueTPs.forEach(tp => {
    html += `<th style="min-width:100px; text-align:center;">TP ${tp}<br><small style="font-weight:400;color:#64748b;">Rerata</small></th>`;
  });
  
  html += `<th width="100" style="background:#f0fdf4; color:#065f46;">Nilai Akhir<br>Semester</th>
  </tr></thead><tbody>`;

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

    const nilaiAkhir = countTP > 0 ? (totalNilaiSemester / countTP).toFixed(1) : '-';
    const colorAkhir = nilaiAkhir !== '-' ? (parseFloat(nilaiAkhir) >= 75 ? '#065f46' : (parseFloat(nilaiAkhir) >= 60 ? '#92400e' : '#991b1b')) : '#94a3b8';
    
    html += `<td style="text-align:center;font-weight:800;color:${colorAkhir};background:#f0fdf4;">${nilaiAkhir}</td></tr>`;
  });

  html += `</tbody></table></div>`;
  
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
    
    // Ambil data siswa & urutkan A-Z
    const siswa = allData
      .filter(d => d.type === 'student' && d.class_name === kelas && d.user_name === currentUser)
      .sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));

    let rows = [];
    let filename = '';
    let sheetName = 'Data';

    rows.push([`LAPORAN NILAI`]);
    rows.push([`Kelas: ${kelas}`, `Semester: ${semesterText}`, `Tahun Ajaran: ${tahunAjaran}`]);
    
    if (currentNilaiTab !== 'rekap') {
        rows.push([`Kode TP/KD: ${filter.kode_tp || '-'}`, `Mata Pelajaran: ${mapel}`]);
        rows.push([`Deskripsi: ${deskripsi}`]);
    }
    rows.push([]);

    if (currentNilaiTab === 'pengetahuan') {
        if (!window.nilaiKolom || !window.nilaiKolom.length) { window.toast('Tambahkan kolom penilaian terlebih dahulu.', 'err'); return; }
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
        const allNilaiData = allData.filter(d => 
            (d.type === 'nilai_pengetahuan' || d.type === 'nilai_keterampilan') && 
            d.class_name === filter.class_name && d.user_name === filter.user_name && d.semester === filter.semester
        );
        const uniqueTPs = [...new Set(allNilaiData.map(d => d.kode_tp))].sort();

        if (uniqueTPs.length === 0) { window.toast('Tidak ada data rekap untuk diekspor.', 'err'); return; }

        rows.push(['No', 'Nama Siswa', ...uniqueTPs.map(tp => `Rerata TP ${tp}`), 'Nilai Akhir Semester']);

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
  const elKelas = document.getElementById('nilaiKelasSelect');
  const elSemester = document.getElementById('nilaiSemesterSelect');
  const elKodeTP = document.getElementById('nilaiKodeTP');
  
  if (elKelas) {
    elKelas.addEventListener('change', (e) => {
      currentNilaiClass = e.target.value;
      window.renderPenilaian();
    });
  }
  if (elSemester) elSemester.addEventListener('change', () => window.renderPenilaian());
  if (elKodeTP) elKodeTP.addEventListener('change', () => window.renderPenilaian());
});

// ══════════════════════════════════════════════
// FITUR: ANALISIS SOAL ASESMEN (PER BUTIR SOAL)
// ══════════════════════════════════════════════

window.renderAnalisisAsesmen = (siswa) => {
  const filter = window.getNilaiFilter();
  const cont = document.getElementById('penilaianContent');
  
  document.getElementById('btnSimpanNilai').style.display = 'none';
  document.getElementById('btnAddKolom').style.display = 'none';
  document.getElementById('btnAddKolomKet').style.display = 'none';
  document.getElementById('btnExportNilai').style.display = 'none';
  
  const btnExportAnalisisSoal = document.getElementById('btnExportAnalisisSoal');
  if (btnExportAnalisisSoal) btnExportAnalisisSoal.style.display = 'inline-flex';
  const btnPreviewPDF = document.getElementById('btnPreviewPDF');
  if (btnPreviewPDF) btnPreviewPDF.style.display = 'inline-flex';
  
  const setupAsesmen = allData.find(d => 
    d.type === 'asesmen_setup' && 
    d.class_name === filter.class_name && 
    d.user_name === filter.user_name && 
    d.semester === filter.semester
  );
  
  if (!setupAsesmen) {
    cont.innerHTML = `
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:20px;margin-bottom:20px;">
        <h3 style="margin:0 0 15px;color:#0369a1;">🎯 Setup Analisis Soal Asesmen</h3>
        <p style="margin:0 0 20px;color:#64748b;">Konfigurasi asesmen untuk kelas <strong>${filter.class_name}</strong> semester <strong>${filter.semester}</strong></p>
        
        <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px;">
          <div class="form-group">
            <label>Mata Pelajaran *</label>
            <input type="text" id="asesmenMapel" placeholder="Contoh: Sosiologi" style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:8px;">
          </div>
          <div class="form-group">
            <label>Jumlah Soal *</label>
            <input type="number" id="asesmenJumlahSoal" min="1" max="50" value="10" style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:8px;">
          </div>
        </div>
        
        <div class="form-group" style="margin-bottom:15px;">
          <label>KKM (Kriteria Ketuntasan Minimal) *</label>
          <input type="number" id="asesmenKKM" min="0" max="100" value="${window.getKKMDefault(filter.class_name)}" style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:8px;">
        </div>
        
        <div class="form-group" style="margin-bottom:20px;">
          <label>Skor Maksimal Per Nomor Soal *</label>
          <div id="skorMaxContainer" style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:10px;"></div>
          <p style="font-size:0.85rem;color:#64748b;margin-top:10px;">💡 Masukkan skor maksimal untuk setiap nomor soal (misal: 5, 5, 10, 15, dst.)</p>
        </div>
        
        <button onclick="window.simpanSetupAsesmen()" style="padding:12px 24px;background:#10b981;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:1rem;">
          💾 Simpan Setup & Lanjut ke Input Nilai
        </button>
      </div>
    `;
    
    setTimeout(() => {
      const jumlahSoal = parseInt(document.getElementById('asesmenJumlahSoal').value) || 10;
      const container = document.getElementById('skorMaxContainer');
      container.innerHTML = '';
      for (let i = 1; i <= jumlahSoal; i++) {
        container.innerHTML += `
          <div>
            <label style="font-size:0.85rem;font-weight:600;color:#475569;">Soal ${i}</label>
            <input type="number" class="skor-max-input" data-nomor="${i}" min="1" max="100" value="10" style="width:100%;padding:8px;border:1.5px solid #e2e8f0;border-radius:6px;text-align:center;">
          </div>
        `;
      }
      
      document.getElementById('asesmenJumlahSoal').addEventListener('change', (e) => {
        const newJumlah = parseInt(e.target.value) || 10;
        const container = document.getElementById('skorMaxContainer');
        container.innerHTML = '';
        for (let i = 1; i <= newJumlah; i++) {
          container.innerHTML += `
            <div>
              <label style="font-size:0.85rem;font-weight:600;color:#475569;">Soal ${i}</label>
              <input type="number" class="skor-max-input" data-nomor="${i}" min="1" max="100" value="10" style="width:100%;padding:8px;border:1.5px solid #e2e8f0;border-radius:6px;text-align:center;">
            </div>
          `;
        }
      });
    }, 100);
    
  } else {
    window.tampilkanInputAsesmen(setupAsesmen, siswa);
  }
};

window.simpanSetupAsesmen = async () => {
  const filter = window.getNilaiFilter();
  const mapel = document.getElementById('asesmenMapel').value.trim();
  const jumlahSoal = parseInt(document.getElementById('asesmenJumlahSoal').value);
  const kkm = parseFloat(document.getElementById('asesmenKKM').value);
  
  if (!mapel || !jumlahSoal || !kkm) {
    window.toast('❌ Lengkapi semua field!', 'err');
    return;
  }
  
  const skorMaxInputs = document.querySelectorAll('.skor-max-input');
  const skorMaxPerSoal = [];
  let totalSkorMax = 0;
  
  skorMaxInputs.forEach(input => {
    const skor = parseFloat(input.value) || 0;
    skorMaxPerSoal.push(skor);
    totalSkorMax += skor;
  });
  
  if (totalSkorMax === 0) {
    window.toast('❌ Total skor maksimal harus lebih dari 0!', 'err');
    return;
  }
  
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  
  try {
    const payload = {
      type: 'asesmen_setup',
      class_name: filter.class_name,
      user_name: filter.user_name,
      semester: filter.semester,
      mata_pelajaran: mapel,
      jumlah_soal: jumlahSoal,
      skor_max_per_soal: skorMaxPerSoal,
      total_skor_max: totalSkorMax,
      kkm: kkm,
      created_at: window.nowISO()
    };
    
    await ROOT.push().set(payload);
    window.toast('✅ Setup asesmen berhasil disimpan!', 'success');
    
    const siswa = allData
      .filter(d => d.type === 'student' && d.class_name === filter.class_name && d.user_name === filter.user_name)
      .sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));

    window.renderAnalisisAsesmen(siswa);
    
  } catch (error) {
    window.toast('❌ Gagal menyimpan: ' + error.message, 'err');
  }
  
  btn.disabled = false;
  btn.innerHTML = '💾 Simpan Setup & Lanjut ke Input Nilai';
};

window.tampilkanInputAsesmen = (setupAsesmen, siswa) => {
  const btnPreviewPDF = document.getElementById('btnPreviewPDF');
  if (btnPreviewPDF) btnPreviewPDF.style.display = 'inline-flex';
  const cont = document.getElementById('penilaianContent');
  const { mata_pelajaran, jumlah_soal, skor_max_per_soal, total_skor_max, kkm } = setupAsesmen;
  
  let html = `
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:15px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h3 style="margin:0 0 5px;color:#0369a1;">📝 Asesmen: ${mata_pelajaran}</h3>
          <p style="margin:0;color:#64748b;font-size:0.9rem;">Kelas: ${setupAsesmen.class_name} | Semester: ${setupAsesmen.semester} | KKM: ${kkm} | Total Skor: ${total_skor_max}</p>
        </div>
        <button onclick="window.resetSetupAsesmen('${setupAsesmen.__key}')" style="padding:8px 16px;background:#ef4444;color:white;border:none;border-radius:6px;font-size:0.85rem;cursor:pointer;">
          🔄 Reset Setup
        </button>
      </div>
    </div>
    
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th width="40">No</th>
            <th width="100">Induk</th>
            <th>Nama Peserta</th>
            <th width="50">L/P</th>
            ${Array.from({length: jumlah_soal}, (_, i) => `<th width="60">Soal ${i+1}<br><small style="font-weight:400;">(${skor_max_per_soal[i]})</small></th>`).join('')}
            <th width="70">Jml Skor</th>
            <th width="100">% Ketercapaian</th>
            <th width="80">Tuntas</th>
            <th width="80">Remedial I</th>
            <th width="80">Remedial II</th>
            <th width="80">Nilai Akhir</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  siswa.forEach((s, idx) => {
    const nilaiAsesmen = allData.find(d => 
      d.type === 'asesmen_nilai' && 
      d.student_key === s.__key && 
      d.class_name === setupAsesmen.class_name && 
      d.user_name === setupAsesmen.user_name && 
      d.semester === setupAsesmen.semester
    );
    
    const skorPerSoal = nilaiAsesmen?.skor_per_soal || Array(jumlah_soal).fill(0);
    const jumlahSkor = skorPerSoal.reduce((a, b) => a + b, 0);
    const persenKetercapaian = total_skor_max > 0 ? ((jumlahSkor / total_skor_max) * 100).toFixed(1) : 0;
    const tuntas = parseFloat(persenKetercapaian) >= kkm;
    
    html += `
      <tr>
        <td style="text-align:center;color:#94a3b8;">${idx + 1}</td>
        <td style="text-align:center;color:#94a3b8;">-</td>
        <td style="font-weight:600;">${s.student_name}</td>
        <td style="text-align:center;">-</td>
        ${skorPerSoal.map((skor, i) => `
          <td style="text-align:center;">
            <input type="number" class="skor-asesmen-input" 
                   data-sid="${s.__key}" data-nomor="${i+1}" 
                   value="${skor}" min="0" max="${skor_max_per_soal[i]}"
                   style="width:50px;padding:4px;text-align:center;border:1px solid #e2e8f0;border-radius:4px;">
          </td>
        `).join('')}
        <td style="text-align:center;font-weight:700;">${jumlahSkor}</td>
        <td style="text-align:center;font-weight:700;color:${parseFloat(persenKetercapaian) >= kkm ? '#10b981' : '#ef4444'};">${persenKetercapaian}%</td>
        <td style="text-align:center;font-weight:700;color:${tuntas ? '#10b981' : '#ef4444'};">${tuntas ? 'Ya' : 'Tidak'}</td>
        <td style="text-align:center;">-</td>
        <td style="text-align:center;">-</td>
        <td style="text-align:center;font-weight:700;">${persenKetercapaian}</td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
    
    <div style="margin-top:20px;text-align:right;">
      <button onclick="window.simpanNilaiAsesmen()" style="padding:12px 24px;background:#10b981;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:1rem;">
        💾 Simpan Semua Nilai Asesmen
      </button>
    </div>
  `;
  
  cont.innerHTML = html;
  
  cont.querySelectorAll('.skor-asesmen-input').forEach(input => {
    input.addEventListener('change', () => {
      const row = input.closest('tr');
      const inputs = row.querySelectorAll('.skor-asesmen-input');
      let total = 0;
      inputs.forEach(inp => {
        total += parseFloat(inp.value) || 0;
      });
      const persen = ((total / total_skor_max) * 100).toFixed(1);
      const tuntas = parseFloat(persen) >= kkm;
      
      row.cells[row.cells.length - 4].textContent = total;
      row.cells[row.cells.length - 3].textContent = persen + '%';
      row.cells[row.cells.length - 3].style.color = tuntas ? '#10b981' : '#ef4444';
      row.cells[row.cells.length - 2].textContent = tuntas ? 'Ya' : 'Tidak';
      row.cells[row.cells.length - 2].style.color = tuntas ? '#10b981' : '#ef4444';
      row.cells[row.cells.length - 1].textContent = persen;
    });
  });
};

window.simpanNilaiAsesmen = async () => {
  const setupAsesmen = allData.find(d => d.type === 'asesmen_setup' && d.class_name === currentNilaiClass);
  if (!setupAsesmen) {
    window.toast('❌ Setup asesmen tidak ditemukan!', 'err');
    return;
  }
  
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  
  try {
    const inputs = document.querySelectorAll('.skor-asesmen-input');
    const dataPerSiswa = {};
    
    inputs.forEach(input => {
      const sid = input.dataset.sid;
      const nomor = input.dataset.nomor;
      const skor = parseFloat(input.value) || 0;
      
      if (!dataPerSiswa[sid]) dataPerSiswa[sid] = [];
      dataPerSiswa[sid][nomor - 1] = skor;
    });
    
    for (const [sid, skorPerSoal] of Object.entries(dataPerSiswa)) {
      const existing = allData.find(d => 
        d.type === 'asesmen_nilai' && 
        d.student_key === sid && 
        d.class_name === setupAsesmen.class_name && 
        d.user_name === setupAsesmen.user_name && 
        d.semester === setupAsesmen.semester
      );
      
      const payload = {
        type: 'asesmen_nilai',
        student_key: sid,
        class_name: setupAsesmen.class_name,
        user_name: setupAsesmen.user_name,
        semester: setupAsesmen.semester,
        skor_per_soal: skorPerSoal,
        updated_at: window.nowISO()
      };
      
      if (existing) {
        await ROOT.child(existing.__key).update(payload);
      } else {
        await ROOT.push().set({ ...payload, created_at: window.nowISO() });
      }
    }
    
    window.toast('✅ Nilai asesmen berhasil disimpan!', 'success');
    
  } catch (error) {
    window.toast('❌ Gagal menyimpan: ' + error.message, 'err');
  }
  
  btn.disabled = false;
  btn.innerHTML = '💾 Simpan Semua Nilai Asesmen';
};

window.resetSetupAsesmen = async (setupKey) => {
  if (!confirm('⚠️ Yakin ingin reset setup asesmen? Semua nilai yang sudah diinput akan hilang.')) return;
  
  try {
    await ROOT.child(setupKey).remove();
    window.toast('✅ Setup asesmen berhasil direset!', 'success');
    const siswa = allData
      .filter(d => d.type === 'student' && d.class_name === currentNilaiClass && d.user_name === currentUser)
      .sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));

    window.renderAnalisisAsesmen(siswa);
  } catch (error) {
    window.toast('❌ Gagal mereset: ' + error.message, 'err');
  }
};

// ══════════════════════════════════════════════
// EXPORT ANALISIS SOAL ASESMEN (FORMAT PRINT-READY)
// ══════════════════════════════════════════════
window.exportAnalisisAsesmenExcel = () => {
  if (typeof XLSX === 'undefined') {
    window.toast('⚠️ Library Excel belum siap.', 'err');
    return;
  }
  
  const setupAsesmen = allData.find(d => d.type === 'asesmen_setup' && d.class_name === currentNilaiClass);
  if (!setupAsesmen) {
    window.toast('❌ Setup asesmen tidak ditemukan!', 'err');
    return;
  }
  
  const { mata_pelajaran, jumlah_soal, skor_max_per_soal, total_skor_max, kkm, class_name, semester } = setupAsesmen;
  
  // Ambil data siswa & urutkan A-Z
  const siswa = allData
    .filter(d => d.type === 'student' && d.class_name === class_name && d.user_name === currentUser)
    .sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));
  
  const rows = [];
  const jmlSiswa = siswa.length || 1;
  
  // HEADER
  rows.push(['Analisis Hasil Asesmen']);
  rows.push([]);
  rows.push(['Mata Pelajaran', ':', mata_pelajaran]);
  rows.push(['Kelas', ':', class_name]);
  rows.push(['Semester', ':', semester === 'ganjil' ? 'Ganjil' : 'Genap']);
  rows.push([]);
  
  // TABEL HEADER (3 Baris)
  const headerRow1 = ['Nomor', 'Induk', 'Nama Peserta', 'L/P'];
  for (let i = 1; i <= jumlah_soal; i++) {
    headerRow1.push(i);
  }
  headerRow1.push('Jml Skor', '% Ketercapaian', 'Tuntas', 'Remedial I', 'Remedial II', 'Nilai Akhir');
  rows.push(headerRow1);
  
  const headerRow2 = ['', '', '', ''];
  for (let i = 1; i <= jumlah_soal; i++) {
    headerRow2.push(skor_max_per_soal[i-1]);
  }
  headerRow2.push('', '', '', '', '', '');
  rows.push(headerRow2);
  
  // DATA SISWA
  let totalSkorPerSoal = Array(jumlah_soal).fill(0);
  let jumlahTuntas = 0;
  let jumlahTidakTuntas = 0;
  
  siswa.forEach((s, idx) => {
    const nilaiAsesmen = allData.find(d => 
      d.type === 'asesmen_nilai' && d.student_key === s.__key && 
      d.class_name === class_name && d.user_name === currentUser && d.semester === semester
    );
    
    const skorPerSoal = nilaiAsesmen?.skor_per_soal || Array(jumlah_soal).fill(0);
    const jumlahSkor = skorPerSoal.reduce((a, b) => a + b, 0);
    const persenKetercapaian = total_skor_max > 0 ? ((jumlahSkor / total_skor_max) * 100).toFixed(1) : 0;
    const tuntas = parseFloat(persenKetercapaian) >= kkm;
    
    if (tuntas) jumlahTuntas++; else jumlahTidakTuntas++;
    
    skorPerSoal.forEach((skor, i) => { totalSkorPerSoal[i] += skor; });
    
    const row = [idx + 1, '', s.student_name, ''];
    skorPerSoal.forEach(skor => row.push(skor));
    row.push(jumlahSkor, persenKetercapaian + '%', tuntas ? 'Ya' : 'Tidak', '', '', persenKetercapaian);
    rows.push(row);
  });
  
  // BARIS JUMLAH TOTAL
  const rowJumlah = ['Jumlah Total', '', '', ''];
  totalSkorPerSoal.forEach(skor => rowJumlah.push(skor));
  const totalJmlSkor = totalSkorPerSoal.reduce((a, b) => a + b, 0);
  rowJumlah.push(totalJmlSkor, '', '', '', '', '');
  rows.push(rowJumlah);
  
  // BARIS RATA-RATA
  const rowRata = ['Rata-rata/daya serap', '', '', ''];
  totalSkorPerSoal.forEach(skor => rowRata.push((skor / jmlSiswa).toFixed(1)));
  rowRata.push((totalJmlSkor / jmlSiswa).toFixed(1), '', '', '', '', '');
  rows.push(rowRata);
  
  rows.push([]);
  
  // HASIL ANALISIS
  rows.push(['Hasil Analisis:']);
  
  // 1. Jumlah skor yang diperoleh
  const row1 = ['1', 'Jumlah skor yang diperoleh', '', ''];
  totalSkorPerSoal.forEach(skor => row1.push(skor));
  row1.push('', '', '', '', '', '');
  rows.push(row1);
  
  // 2. Jumlah skor Ideal
  const row2 = ['2', 'Juml. skor Ideal (seharusnya)', '', ''];
  skor_max_per_soal.forEach(skorMax => row2.push(skorMax * jmlSiswa));
  row2.push('', '', '', '', '', '');
  rows.push(row2);
  
  // 3. % Ketercapaian
  const row3 = ['3', '% Ketercapaian', '', ''];
  totalSkorPerSoal.forEach((skor, i) => {
    const skorIdeal = skor_max_per_soal[i] * jmlSiswa;
    row3.push(skorIdeal > 0 ? ((skor / skorIdeal) * 100).toFixed(2) : 0);
  });
  row3.push('', '', '', '', '', '');
  rows.push(row3);
  
  // 4. % Kegagalan
  const row4 = ['4', '% Kegagalan', '', ''];
  totalSkorPerSoal.forEach((skor, i) => {
    const skorIdeal = skor_max_per_soal[i] * jmlSiswa;
    row4.push(skorIdeal > 0 ? (((skorIdeal - skor) / skorIdeal) * 100).toFixed(2) : 0);
  });
  row4.push('', '', '', '', '', '');
  rows.push(row4);
  
  // 5. Skor maksimal tiap nomor
  const row5 = ['5', 'Skor maksimal tiap nomor', '', ''];
  skor_max_per_soal.forEach(skorMax => row5.push(skorMax));
  row5.push('', '', '', '', '', '');
  rows.push(row5);
  
  // 6. Jumlah peserta ujian
  const row6 = ['6', 'Jumlah peserta ujian', '', jmlSiswa];
  for (let i = 0; i < jumlah_soal; i++) row6.push(jmlSiswa);
  row6.push('', '', '', '', '', '');
  rows.push(row6);
  
  // 7. Jumlah peserta yang tidak tuntas
  const row7 = ['7', 'Jumlah peserta yang tidak tuntas', '', jumlahTidakTuntas, 'Orang'];
  for (let i = 0; i < jumlah_soal - 1; i++) row7.push('');
  row7.push('', '', '', '', '', '');
  rows.push(row7);
  
  // 8. Jumlah peserta yang tuntas
  const row8 = ['8', 'Jumlah peserta yang tuntas', '', jumlahTuntas, 'Orang'];
  for (let i = 0; i < jumlah_soal - 1; i++) row8.push('');
  row8.push('', '', '', '', '', '');
  rows.push(row8);
  
  rows.push([]);
  
  // KESIMPULAN
  const persentaseKlasikal = ((jumlahTuntas / jmlSiswa) * 100).toFixed(1);
  rows.push(['Kesimpulan:']);
  rows.push(['a. Ketuntasan klasikal: ' + persentaseKlasikal + '%']);
  rows.push(['b. Ketuntasan individual: ' + jumlahTuntas + ' siswa tuntas, ' + jumlahTidakTuntas + ' siswa perlu remedial']);
  rows.push(['c. Bentuk remedial: Pemberian tugas individu untuk menjawab soal-soal dan melaporkan hasilnya']);
  
  rows.push([]);
  rows.push([]);
  rows.push([]);
  
  // TANDA TANGAN
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Guru Mata Pelajaran']);
  rows.push([]);
  rows.push([]);
  rows.push([]);
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'ELIS HARIANTO, S.Pd']);
  rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'NIP. 19900211 202012 1 007']);
  
  // EXPORT KE EXCEL
  const ws = XLSX.utils.aoa_to_sheet(rows);
  
  // SET COLUMN WIDTHS
  const colWidths = [
    { wch: 5 },   // No
    { wch: 10 },  // Induk
    { wch: 30 },  // Nama
    { wch: 5 },   // L/P
    ...Array(jumlah_soal).fill({ wch: 6 }), // Skor per soal
    { wch: 10 },  // Jml Skor
    { wch: 15 },  // % Ketercapaian
    { wch: 10 },  // Tuntas
    { wch: 12 },  // Remedial I
    { wch: 12 },  // Remedial II
    { wch: 12 }   // Nilai Akhir
  ];
  ws['!cols'] = colWidths;
  
  // MERGE CELLS FOR HEADER
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: jumlah_soal + 7 } }, // Title
    { s: { r: 8, c: 0 }, e: { r: 8, c: jumlah_soal + 7 } }, // Hasil Analisis header
    { s: { r: 18, c: 0 }, e: { r: 18, c: jumlah_soal + 7 } } // Kesimpulan header
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Analisis Asesmen');
  XLSX.writeFile(wb, `Analisis_Asesmen_${mata_pelajaran}_${class_name}_${semester}.xlsx`);
  
  window.toast('✅ File analisis asesmen berhasil diunduh!', 'success');
};

// ══════════════════════════════════════════════
// PREVIEW & CETAK PDF ANALISIS SOAL ASESMEN
// ═════════════════════════════════════════════

window.previewAnalisisPDF = () => {
  const setupAsesmen = allData.find(d => d.type === 'asesmen_setup' && d.class_name === currentNilaiClass);
  if (!setupAsesmen) {
    window.toast('❌ Setup asesmen tidak ditemukan!', 'err');
    return;
  }
  
  const { mata_pelajaran, jumlah_soal, skor_max_per_soal, total_skor_max, kkm, class_name, semester } = setupAsesmen;
  
  // Ambil data siswa & urutkan A-Z
  const siswa = allData
    .filter(d => d.type === 'student' && d.class_name === class_name && d.user_name === currentUser)
    .sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));
  
  // Ambil data user untuk tanda tangan
  const userData = JSON.parse(localStorage.getItem('sipelita_user') || '{}');
  const namaGuru = userData.nama || currentUser || 'ELIS HARIANTO, S.Pd';
  const nipGuru = userData.nip || '19900211 202012 1 007';
  
  const jmlSiswa = siswa.length || 1;
  let totalSkorPerSoal = Array(jumlah_soal).fill(0);
  let jumlahTuntas = 0;
  let jumlahTidakTuntas = 0;
  let dataSiswa = [];
  
  siswa.forEach((s, idx) => {
    const nilaiAsesmen = allData.find(d => 
      d.type === 'asesmen_nilai' && d.student_key === s.__key && 
      d.class_name === class_name && d.user_name === currentUser && d.semester === semester
    );
    
    const skorPerSoal = nilaiAsesmen?.skor_per_soal || Array(jumlah_soal).fill(0);
    const jumlahSkor = skorPerSoal.reduce((a, b) => a + b, 0);
    const persenKetercapaian = total_skor_max > 0 ? ((jumlahSkor / total_skor_max) * 100).toFixed(1) : 0;
    const tuntas = parseFloat(persenKetercapaian) >= kkm;
    
    if (tuntas) jumlahTuntas++; else jumlahTidakTuntas++;
    skorPerSoal.forEach((skor, i) => { totalSkorPerSoal[i] += skor; });
    
    dataSiswa.push({
      no: idx + 1,
      nama: s.student_name,
      skor: skorPerSoal,
      total: jumlahSkor,
      persen: persenKetercapaian,
      tuntas: tuntas ? 'Ya' : 'Tidak'
    });
  });
  
  const persentaseKlasikal = ((jumlahTuntas / jmlSiswa) * 100).toFixed(1);
  const tanggalSekarang = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  
  let html = `
    <div id="pdfContent" style="font-family:Arial,sans-serif;font-size:11px;line-height:1.3;padding:15px;">
      <div style="text-align:center;margin-bottom:15px;">
        <h2 style="margin:0 0 5px 0;font-size:16px;color:#000;">Analisis Hasil Asesmen</h2>
        <p style="margin:0;font-size:11px;color:#000;">Mata Pelajaran: <strong>${mata_pelajaran}</strong> | Kelas: <strong>${class_name}</strong> | Semester: <strong>${semester === 'ganjil' ? 'Ganjil' : 'Genap'}</strong></p>
      </div>
      
      <table style="width:100%;border-collapse:collapse;margin-bottom:15px;font-size:10px;">
        <thead>
          <tr>
            <th rowspan="2" style="border:1px solid #000;padding:4px;text-align:center;background:#e0e0e0;color:#000;font-weight:bold;">No</th>
            <th rowspan="2" style="border:1px solid #000;padding:4px;text-align:center;background:#e0e0e0;color:#000;font-weight:bold;">Nama Peserta</th>
            <th colspan="${jumlah_soal}" style="border:1px solid #000;padding:4px;text-align:center;background:#e0e0e0;color:#000;font-weight:bold;">Nomor Soal</th>
            <th rowspan="2" style="border:1px solid #000;padding:4px;text-align:center;background:#e0e0e0;color:#000;font-weight:bold;">Jml<br>Skor</th>
            <th rowspan="2" style="border:1px solid #000;padding:4px;text-align:center;background:#e0e0e0;color:#000;font-weight:bold;">%<br>Ketercapaian</th>
            <th rowspan="2" style="border:1px solid #000;padding:4px;text-align:center;background:#e0e0e0;color:#000;font-weight:bold;">Tuntas</th>
          </tr>
          <tr>
            ${Array.from({length: jumlah_soal}, (_, i) => `<th style="border:1px solid #000;padding:3px;text-align:center;background:#e0e0e0;color:#000;font-weight:bold;font-size:9px;">${i+1}<br><small>(${skor_max_per_soal[i]})</small></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${dataSiswa.map(s => `
            <tr>
              <td style="border:1px solid #000;padding:4px;text-align:center;color:#000;">${s.no}</td>
              <td style="border:1px solid #000;padding:4px;color:#000;">${s.nama}</td>
              ${s.skor.map(skor => `<td style="border:1px solid #000;padding:4px;text-align:center;color:#000;">${skor}</td>`).join('')}
              <td style="border:1px solid #000;padding:4px;text-align:center;font-weight:bold;color:#000;">${s.total}</td>
              <td style="border:1px solid #000;padding:4px;text-align:center;color:#000;">${s.persen}%</td>
              <td style="border:1px solid #000;padding:4px;text-align:center;color:${s.tuntas === 'Ya' ? 'green' : 'red'};">${s.tuntas}</td>
            </tr>
          `).join('')}
          <tr style="background:#f9f9f9;">
            <td colspan="2" style="border:1px solid #000;padding:4px;font-weight:bold;color:#000;">Jumlah Total</td>
            ${totalSkorPerSoal.map(skor => `<td style="border:1px solid #000;padding:4px;text-align:center;color:#000;">${skor}</td>`).join('')}
            <td style="border:1px solid #000;padding:4px;text-align:center;font-weight:bold;color:#000;">${totalSkorPerSoal.reduce((a,b) => a+b, 0)}</td>
            <td colspan="2" style="border:1px solid #000;padding:4px;"></td>
          </tr>
          <tr style="background:#f9f9f9;">
            <td colspan="2" style="border:1px solid #000;padding:4px;font-weight:bold;color:#000;">Rata-rata/Daya Serap</td>
            ${totalSkorPerSoal.map(skor => `<td style="border:1px solid #000;padding:4px;text-align:center;color:#000;">${(skor/jmlSiswa).toFixed(1)}</td>`).join('')}
            <td style="border:1px solid #000;padding:4px;text-align:center;font-weight:bold;color:#000;">${(totalSkorPerSoal.reduce((a,b) => a+b, 0)/jmlSiswa).toFixed(1)}</td>
            <td colspan="2" style="border:1px solid #000;padding:4px;"></td>
          </tr>
        </tbody>
      </table>
      
      <div style="margin-bottom:15px;">
        <h3 style="margin:0 0 8px 0;font-size:12px;color:#000;">Hasil Analisis:</h3>
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <tr>
            <td style="border:1px solid #000;padding:4px;width:25px;color:#000;">1</td>
            <td style="border:1px solid #000;padding:4px;color:#000;">Jumlah skor yang diperoleh</td>
            ${totalSkorPerSoal.map(skor => `<td style="border:1px solid #000;padding:4px;text-align:center;color:#000;width:30px;">${skor}</td>`).join('')}
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px;color:#000;">2</td>
            <td style="border:1px solid #000;padding:4px;color:#000;">Jumlah skor Ideal (seharusnya)</td>
            ${skor_max_per_soal.map(skorMax => `<td style="border:1px solid #000;padding:4px;text-align:center;color:#000;width:30px;">${skorMax * jmlSiswa}</td>`).join('')}
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px;color:#000;">3</td>
            <td style="border:1px solid #000;padding:4px;color:#000;">% Ketercapaian</td>
            ${totalSkorPerSoal.map((skor, i) => {
              const skorIdeal = skor_max_per_soal[i] * jmlSiswa;
              const ketercapaian = skorIdeal > 0 ? ((skor / skorIdeal) * 100).toFixed(2) : 0;
              return `<td style="border:1px solid #000;padding:4px;text-align:center;color:#000;width:30px;">${ketercapaian}</td>`;
            }).join('')}
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px;color:#000;">4</td>
            <td style="border:1px solid #000;padding:4px;color:#000;">% Kegagalan</td>
            ${totalSkorPerSoal.map((skor, i) => {
              const skorIdeal = skor_max_per_soal[i] * jmlSiswa;
              const kegagalan = skorIdeal > 0 ? (((skorIdeal - skor) / skorIdeal) * 100).toFixed(2) : 0;
              return `<td style="border:1px solid #000;padding:4px;text-align:center;color:#000;width:30px;">${kegagalan}</td>`;
            }).join('')}
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px;color:#000;">5</td>
            <td style="border:1px solid #000;padding:4px;color:#000;">Skor maksimal tiap nomor</td>
            ${skor_max_per_soal.map(skorMax => `<td style="border:1px solid #000;padding:4px;text-align:center;color:#000;width:30px;">${skorMax}</td>`).join('')}
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px;color:#000;">6</td>
            <td style="border:1px solid #000;padding:4px;color:#000;">Jumlah peserta ujian</td>
            ${Array(jumlah_soal).fill(jmlSiswa).map(n => `<td style="border:1px solid #000;padding:4px;text-align:center;color:#000;width:30px;">${n}</td>`).join('')}
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px;color:#000;">7</td>
            <td style="border:1px solid #000;padding:4px;color:#000;">Jumlah peserta yang tidak tuntas</td>
            <td colspan="${jumlah_soal}" style="border:1px solid #000;padding:4px;color:#000;">${jumlahTidakTuntas} Orang</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px;color:#000;">8</td>
            <td style="border:1px solid #000;padding:4px;color:#000;">Jumlah peserta yang tuntas</td>
            <td colspan="${jumlah_soal}" style="border:1px solid #000;padding:4px;color:#000;">${jumlahTuntas} Orang</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-bottom:15px;">
        <h3 style="margin:0 0 8px 0;font-size:12px;color:#000;">Kesimpulan:</h3>
        <p style="margin:3px 0;font-size:10px;color:#000;">a. Ketuntasan klasikal: <strong>${persentaseKlasikal}%</strong></p>
        <p style="margin:3px 0;font-size:10px;color:#000;">b. Ketuntasan individual: <strong>${jumlahTuntas}</strong> siswa tuntas, <strong>${jumlahTidakTuntas}</strong> siswa perlu remedial</p>
        <p style="margin:3px 0;font-size:10px;color:#000;">c. Bentuk remedial: Pemberian tugas individu untuk menjawab soal-soal dan melaporkan hasilnya</p>
      </div>
      
      <div style="margin-top:30px; text-align: right; padding-right: 5px;">
        <div style="display: inline-block; text-align: left; width: 220px;">
          <p style="margin:0 0 10px 0;color:#000;">Bantaeng, ${tanggalSekarang}</p>
          <p style="margin:0 0 5px 0;color:#000;">Guru Mata Pelajaran</p>
          <div style="height:60px;"></div>
          <p style="margin:0;font-weight:bold;color:#000;">${namaGuru}</p>
          <p style="margin:3px 0 0 0;color:#000;">NIP. ${nipGuru}</p>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('pdfPreviewContent').innerHTML = html;
  window.openModal('modalPreviewPDF');
};

window.cetakAnalisisPDF = () => {
  const element = document.getElementById('pdfContent');
  if (!element) {
    window.toast('❌ Tidak ada data preview!', 'err');
    return;
  }
  
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    window.toast('❌ Browser memblokir popup. Izinkan popup untuk fitur ini.', 'err');
    return;
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Analisis Asesmen - ${currentNilaiClass}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; color: #000; margin: 0; padding: 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
        th, td { border: 1px solid #000; padding: 4px; color: #000; }
        th { background: #e0e0e0; font-weight: bold; text-align: center; }
        h2 { text-align: center; font-size: 16px; margin: 0 0 5px 0; color: #000; }
        h3 { font-size: 12px; margin: 0 0 8px 0; color: #000; }
        p { margin: 3px 0; font-size: 10px; color: #000; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          th { background: #e0e0e0 !important; }
        }
      </style>
    </head>
    <body>
      ${element.innerHTML}
    </body>
    </html>
  `);
  
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
  
  window.toast('✅ Dialog print terbuka. Pilih printer atau "Save as PDF".', 'success');
};
