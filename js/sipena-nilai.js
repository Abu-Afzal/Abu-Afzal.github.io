// ══════════════════════════════════════════════
// SIPENA: Penilaian
// ══════════════════════════════════════════════

window.renderPenilaian = () => {
  const kelas = allData.filter(d => d.type === 'class' && d.user_name === currentUser);
  const sel = document.getElementById('nilaiKelasSelect');
  const cont = document.getElementById('penilaianContent');
  const info = document.getElementById('infoSiswaKelas');

  document.getElementById('btnAddKolom').style.display = currentNilaiTab === 'pengetahuan' ? 'inline-flex' : 'none';
  document.getElementById('btnAddKolomKet').style.display = currentNilaiTab === 'keterampilan' ? 'inline-flex' : 'none';

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

  if (currentNilaiTab === 'pengetahuan') window.renderNilaiPengetahuan(siswa);
  else if (currentNilaiTab === 'sikap') window.renderNilaiSikap(siswa);
  else if (currentNilaiTab === 'keterampilan') window.renderNilaiKeterampilan(siswa);
};

window.renderNilaiPengetahuan = (siswa) => {
  const kolomData = allData.find(d => d.type === 'nilai_kolom' && d.class_name === currentNilaiClass && d.user_name === currentUser);
  nilaiKolom = kolomData?.kolom ? JSON.parse(kolomData.kolom) : [];
  const cont = document.getElementById('penilaianContent');

  let bannerInfo = '';
  if (!nilaiKolom.length) {
    bannerInfo = `<div style="background:#fef3c7;border:1px solid #fde047;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
      <div style="font-size:1.8rem;">💡</div>
      <div style="flex:1;"><div style="font-weight:700;color:#854d0e;margin-bottom:2px;">Belum ada kolom penilaian pengetahuan</div>
      <div style="font-size:0.82rem;color:#92400e;">Klik tombol <strong>"+ Tambah Kolom"</strong> di atas.</div></div>
      <button onclick="document.getElementById('btnAddKolom').click()" style="padding:8px 16px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.85rem;">+ Tambah Kolom</button>
    </div>`;
  }

  let html = bannerInfo + `<div class="tbl-wrap"><table id="nilaiTable"><thead><tr><th width="40">No</th><th>Nama Siswa</th>`;
  if (nilaiKolom.length) {
    html += nilaiKolom.map((k, i) => `<th style="min-width:90px;"><div style="display:flex;align-items:center;justify-content:center;gap:4px;"><span>${k.label}</span><button data-kidx="${i}" data-action="hapuskolom" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.8rem;">×</button></div></th>`).join('');
    html += `<th width="80">Rerata</th>`;
  } else { html += `<th style="text-align:center;color:#94a3b8;font-style:italic;">Kolom penilaian belum ditambahkan</th>`; }
  html += `</tr></thead><tbody>`;

  siswa.forEach((s, idx) => {
    const nd = allData.find(d => d.type === 'nilai_pengetahuan' && d.student_key === s.__key && d.class_name === currentNilaiClass && d.user_name === currentUser);
    const nilai = nd?.nilai ? JSON.parse(nd.nilai) : {};
    html += `<tr><td style="color:#94a3b8;">${idx + 1}</td><td style="font-weight:600;">${s.student_name}</td>`;
    if (nilaiKolom.length) {
      const vals = nilaiKolom.map(k => parseFloat(nilai[k.id])).filter(v => !isNaN(v));
      const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '–';
      const avgColor = vals.length ? (parseFloat(avg) >= 75 ? '#10b981' : (parseFloat(avg) >= 60 ? '#f59e0b' : '#ef4444')) : '#94a3b8';
      html += nilaiKolom.map(k => `<td style="text-align:center;"><input type="number" class="nilai-input" data-sid="${s.__key}" data-kid="${k.id}" value="${nilai[k.id] ?? ''}" min="0" max="100"></td>`).join('');
      html += `<td style="text-align:center;font-weight:800;color:${avgColor};">${avg}</td>`;
    } else { html += `<td style="text-align:center;color:#cbd5e1;font-style:italic;padding:20px;">—</td>`; }
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  cont.innerHTML = html;

  if (nilaiKolom.length) {
    cont.querySelectorAll('.nilai-input').forEach(inp => { inp.oninput = () => window.updateRerataRow(inp, siswa); });
    cont.querySelectorAll('[data-action="hapuskolom"]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm(`Hapus kolom "${nilaiKolom[btn.dataset.kidx]?.label}"?`)) return;
        nilaiKolom.splice(parseInt(btn.dataset.kidx), 1);
        await window.simpanKonfigKolom('nilai_kolom', nilaiKolom);
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
  const cont = document.getElementById('penilaianContent');
  const opts = ['Sangat Baik', 'Baik', 'Cukup', 'Perlu Bimbingan'];
  const aspek = ['Beriman & Bertakwa', 'Gotong Royong', 'Mandiri', 'Bernalar Kritis', 'Kreatif'];
  let html = `<div style="font-size:0.82rem;color:#64748b;margin-bottom:12px;">💡 Penilaian sikap berdasarkan dimensi Profil Pelajar Pancasila.</div><div class="tbl-wrap"><table id="nilaiSikapTable"><thead><tr><th width="40">No</th><th style="min-width:160px;">Nama Siswa</th>${aspek.map(a => `<th style="min-width:130px;text-align:center;">${a}</th>`).join('')}<th style="min-width:140px;">Catatan</th></tr></thead><tbody>`;
  siswa.forEach((s, i) => {
    const sd = allData.find(d => d.type === 'nilai_sikap' && d.student_key === s.__key && d.class_name === currentNilaiClass && d.user_name === currentUser);
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
  const kolomData = allData.find(d => d.type === 'nilai_kolom_ket' && d.class_name === currentNilaiClass && d.user_name === currentUser);
  nilaiKolomKet = kolomData?.kolom ? JSON.parse(kolomData.kolom) : [];
  const cont = document.getElementById('penilaianContent');
  let bannerInfo = '';
  if (!nilaiKolomKet.length) {
    bannerInfo = `<div style="background:#fef3c7;border:1px solid #fde047;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
      <div style="font-size:1.8rem;">🛠️</div><div style="flex:1;"><div style="font-weight:700;color:#854d0e;margin-bottom:2px;">Belum ada kolom penilaian keterampilan</div>
      <div style="font-size:0.82rem;color:#92400e;">Klik tombol <strong>"+ Tambah Kolom"</strong> di atas.</div></div>
      <button onclick="document.getElementById('btnAddKolomKet').click()" style="padding:8px 16px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.85rem;">+ Tambah Kolom</button>
    </div>`;
  }
  let html = bannerInfo + `<div class="tbl-wrap"><table id="nilaiKetTable"><thead><tr><th width="40">No</th><th>Nama Siswa</th>`;
  if (nilaiKolomKet.length) {
    html += nilaiKolomKet.map((k, i) => `<th style="min-width:90px;"><div style="display:flex;align-items:center;justify-content:center;gap:4px;"><span>${k.label}</span><button data-kidx="${i}" data-action="hapuskolomket" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.8rem;">×</button></div></th>`).join('');
    html += `<th width="80">Rerata</th>`;
  } else { html += `<th style="text-align:center;color:#94a3b8;font-style:italic;">Kolom penilaian belum ditambahkan</th>`; }
  html += `</tr></thead><tbody>`;
  siswa.forEach((s, idx) => {
    const nd = allData.find(d => d.type === 'nilai_keterampilan' && d.student_key === s.__key && d.class_name === currentNilaiClass && d.user_name === currentUser);
    const nilai = nd?.nilai ? JSON.parse(nd.nilai) : {};
    html += `<tr><td style="color:#94a3b8;">${idx + 1}</td><td style="font-weight:600;">${s.student_name}</td>`;
    if (nilaiKolomKet.length) {
      const vals = nilaiKolomKet.map(k => parseFloat(nilai[k.id])).filter(v => !isNaN(v));
      const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '–';
      const avgColor = vals.length ? (parseFloat(avg) >= 75 ? '#10b981' : (parseFloat(avg) >= 60 ? '#f59e0b' : '#ef4444')) : '#94a3b8';
      html += nilaiKolomKet.map(k => `<td style="text-align:center;"><input type="number" class="nilai-ket-input" data-sid="${s.__key}" data-kid="${k.id}" value="${nilai[k.id] ?? ''}" min="0" max="100"></td>`).join('');
      html += `<td style="text-align:center;font-weight:800;color:${avgColor};">${avg}</td>`;
    } else { html += `<td style="text-align:center;color:#cbd5e1;font-style:italic;padding:20px;">—</td>`; }
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  cont.innerHTML = html;
  if (nilaiKolomKet.length) {
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
        if (!confirm(`Hapus kolom "${nilaiKolomKet[btn.dataset.kidx]?.label}"?`)) return;
        nilaiKolomKet.splice(parseInt(btn.dataset.kidx), 1);
        await window.simpanKonfigKolom('nilai_kolom_ket', nilaiKolomKet);
        window.renderPenilaian();
      };
    });
  }
};

window.simpanNilai = async () => {
  const btn = document.getElementById('btnSimpanNilai');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  try {
    if (currentNilaiTab === 'pengetahuan') {
      const inputs = document.querySelectorAll('.nilai-input');
      const dataPerSiswa = {};
      inputs.forEach(inp => { if (!dataPerSiswa[inp.dataset.sid]) dataPerSiswa[inp.dataset.sid] = {}; if (inp.value !== '') dataPerSiswa[inp.dataset.sid][inp.dataset.kid] = parseFloat(inp.value); });
      for (const [sid, nilai] of Object.entries(dataPerSiswa)) {
        const ex = allData.find(d => d.type === 'nilai_pengetahuan' && d.student_key === sid && d.class_name === currentNilaiClass && d.user_name === currentUser);
        const pl = { type: 'nilai_pengetahuan', student_key: sid, class_name: currentNilaiClass, user_name: currentUser, nilai: JSON.stringify(nilai), updated_at: window.nowISO() };
        if (ex) await ROOT.child(ex.__key).update(pl); else await ROOT.push().set({ ...pl, created_at: window.nowISO() });
      }
    } else if (currentNilaiTab === 'sikap') {
      const selects = document.querySelectorAll('.sikap-select'); const catatan = document.querySelectorAll('.sikap-catatan');
      const perSiswa = {};
      selects.forEach(sel => { const sid = sel.dataset.sid; const aspek = sel.dataset.aspek; if (!perSiswa[sid]) perSiswa[sid] = { sikap_detail: {}, catatan: '' }; if (sel.value) perSiswa[sid].sikap_detail[aspek] = sel.value; });
      catatan.forEach(c => { if (perSiswa[c.dataset.sid]) perSiswa[c.dataset.sid].catatan = c.value; });
      for (const [sid, data] of Object.entries(perSiswa)) {
        const ex = allData.find(d => d.type === 'nilai_sikap' && d.student_key === sid && d.class_name === currentNilaiClass && d.user_name === currentUser);
        const pl = { type: 'nilai_sikap', student_key: sid, class_name: currentNilaiClass, user_name: currentUser, sikap_detail: JSON.stringify(data.sikap_detail), catatan: data.catatan, updated_at: window.nowISO() };
        if (ex) await ROOT.child(ex.__key).update(pl); else await ROOT.push().set({ ...pl, created_at: window.nowISO() });
      }
    } else if (currentNilaiTab === 'keterampilan') {
      const inputs = document.querySelectorAll('.nilai-ket-input');
      const dataPerSiswa = {};
      inputs.forEach(inp => { if (!dataPerSiswa[inp.dataset.sid]) dataPerSiswa[inp.dataset.sid] = {}; if (inp.value !== '') dataPerSiswa[inp.dataset.sid][inp.dataset.kid] = parseFloat(inp.value); });
      for (const [sid, nilai] of Object.entries(dataPerSiswa)) {
        const ex = allData.find(d => d.type === 'nilai_keterampilan' && d.student_key === sid && d.class_name === currentNilaiClass && d.user_name === currentUser);
        const pl = { type: 'nilai_keterampilan', student_key: sid, class_name: currentNilaiClass, user_name: currentUser, nilai: JSON.stringify(nilai), updated_at: window.nowISO() };
        if (ex) await ROOT.child(ex.__key).update(pl); else await ROOT.push().set({ ...pl, created_at: window.nowISO() });
      }
    }
    window.toast('✅ Nilai berhasil disimpan!');
  } catch (e) { window.toast('Gagal: ' + e.message, 'err'); }
  btn.disabled = false; btn.textContent = '💾 Simpan Nilai';
};

window.tambahKolom = async (jenisNilai = 'pengetahuan') => {
  const jenis = document.getElementById('inputJenisKolom')?.value || 'PH';
  if (jenisNilai === 'pengetahuan') {
    const jumlahKolomSama = nilaiKolom.filter(k => k.jenis === jenis).length;
    nilaiKolom.push({ id: 'k_' + Date.now(), jenis, label: `${jenis} ${jumlahKolomSama + 1}` });
    await window.simpanKonfigKolom('nilai_kolom', nilaiKolom);
  } else {
    const jumlahKolomSama = nilaiKolomKet.filter(k => k.jenis === jenis).length;
    nilaiKolomKet.push({ id: 'kk_' + Date.now(), jenis, label: `${jenis} ${jumlahKolomSama + 1}` });
    await window.simpanKonfigKolom('nilai_kolom_ket', nilaiKolomKet);
  }
  window.closeModal('modalKolom');
  window.renderPenilaian();
};

window.simpanKonfigKolom = async (tipe, kolom) => {
  const ex = allData.find(d => d.type === tipe && d.class_name === currentNilaiClass && d.user_name === currentUser);
  const pl = { type: tipe, class_name: currentNilaiClass, user_name: currentUser, kolom: JSON.stringify(kolom), updated_at: window.nowISO() };
  if (ex) await ROOT.child(ex.__key).update(pl); else await ROOT.push().set({ ...pl, created_at: window.nowISO() });
};

window.eksporNilai = () => {
  const kelas = currentNilaiClass || '–';
  let rows = []; let filename = '';
  if (currentNilaiTab === 'pengetahuan') {
    if (!nilaiKolom.length) { window.toast('Tambahkan kolom penilaian terlebih dahulu.', 'err'); return; }
    const siswa = allData.filter(d => d.type === 'student' && d.class_name === currentNilaiClass && d.user_name === currentUser);
    rows.push(['No', 'Nama Siswa', ...nilaiKolom.map(k => k.label), 'Rerata']);
    siswa.forEach((s, i) => {
      const nd = allData.find(d => d.type === 'nilai_pengetahuan' && d.student_key === s.__key && d.class_name === currentNilaiClass && d.user_name === currentUser);
      const nilai = nd?.nilai ? JSON.parse(nd.nilai) : {};
      const vals = nilaiKolom.map(k => parseFloat(nilai[k.id])).filter(v => !isNaN(v));
      const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '';
      rows.push([i + 1, s.student_name, ...nilaiKolom.map(k => nilai[k.id] ?? ''), avg]);
    });
    filename = `Nilai_Pengetahuan_${kelas}.csv`;
  } else if (currentNilaiTab === 'sikap') {
    const aspek = ['Beriman & Bertakwa', 'Gotong Royong', 'Mandiri', 'Bernalar Kritis', 'Kreatif'];
    const siswa = allData.filter(d => d.type === 'student' && d.class_name === currentNilaiClass && d.user_name === currentUser);
    rows.push(['No', 'Nama Siswa', ...aspek, 'Catatan']);
    siswa.forEach((s, i) => {
      const sd = allData.find(d => d.type === 'nilai_sikap' && d.student_key === s.__key && d.class_name === currentNilaiClass && d.user_name === currentUser);
      let sikapVal = {}; try { sikapVal = sd?.sikap_detail ? JSON.parse(sd.sikap_detail) : {}; } catch (e) {}
      rows.push([i + 1, s.student_name, ...aspek.map(a => sikapVal[a] || ''), sd?.catatan || '']);
    });
    filename = `Nilai_Sikap_${kelas}.csv`;
  } else if (currentNilaiTab === 'keterampilan') {
    if (!nilaiKolomKet.length) { window.toast('Tambahkan kolom penilaian terlebih dahulu.', 'err'); return; }
    const siswa = allData.filter(d => d.type === 'student' && d.class_name === currentNilaiClass && d.user_name === currentUser);
    rows.push(['No', 'Nama Siswa', ...nilaiKolomKet.map(k => k.label), 'Rerata']);
    siswa.forEach((s, i) => {
      const nd = allData.find(d => d.type === 'nilai_keterampilan' && d.student_key === s.__key && d.class_name === currentNilaiClass && d.user_name === currentUser);
      const nilai = nd?.nilai ? JSON.parse(nd.nilai) : {};
      const vals = nilaiKolomKet.map(k => parseFloat(nilai[k.id])).filter(v => !isNaN(v));
      const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '';
      rows.push([i + 1, s.student_name, ...nilaiKolomKet.map(k => nilai[k.id] ?? ''), avg]);
    });
    filename = `Nilai_Keterampilan_${kelas}.csv`;
  }
  if (!rows.length) { window.toast('Tidak ada data untuk diekspor.', 'err'); return; }
  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  window.toast(`File ${filename} berhasil diekspor!`);
};
