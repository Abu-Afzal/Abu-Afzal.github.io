// ══════════════════════════════════════════════
// SIPENA: Kelola Kelas & Integrasi SICAN
// ══════════════════════════════════════════════

window.renderKelolaKelas = () => {
  const kelas = allData.filter(d => d.type === 'class' && d.user_name === currentUser);
  const tbody = document.getElementById('classTableBody');
  if (!kelas.length) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="empty"><div class="ei">🏫</div><p>Belum ada kelas. Klik "+ Tambah Kelas Baru".</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = kelas.map(k => {
    const cnt = allData.filter(d => d.type === 'student' && d.class_name === k.class_name && d.user_name === currentUser).length;
    return `<tr>
      <td style="font-weight:700;">${k.class_name}<br><small style="color:#94a3b8;font-weight:400;">${new Date(k.created_at).toLocaleDateString('id-ID')}</small></td>
      <td><span class="badge badge-green">👥 ${cnt} Siswa</span></td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" data-action="kelola" data-class="${k.class_name}">👥 Kelola Siswa</button>
          <button class="btn btn-danger btn-sm" data-action="hapuskelas" data-key="${k.__key}" data-class="${k.class_name}">🗑 Hapus</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    if (btn.dataset.action === 'kelola') btn.onclick = () => window.bukaKelolaSwiswa(btn.dataset.class);
    if (btn.dataset.action === 'hapuskelas') btn.onclick = () => window.hapusKelas(btn.dataset.key, btn.dataset.class);
  });
};

window.simpanKelas = async () => {
  const nama = document.getElementById('inputNamaKelas').value.trim();
  if (!nama) { window.toast('Nama kelas tidak boleh kosong!', 'err'); return; }
  const duplikat = allData.some(d => d.type === 'class' && d.user_name === currentUser && d.class_name.toLowerCase() === nama.toLowerCase());
  if (duplikat) { window.toast('Nama kelas sudah ada!', 'err'); return; }

  const btn = document.getElementById('btnSimpanKelas');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  try {
    await ROOT.push().set({ type: 'class', class_name: nama, user_name: currentUser, created_at: window.nowISO() });
    window.closeModal('modalTambahKelas');
    window.toast(`Kelas "${nama}" berhasil ditambahkan!`);
  } catch (e) { window.toast('Gagal menyimpan: ' + e.message, 'err'); }
  btn.disabled = false; btn.textContent = 'Simpan';
};

window.hapusKelas = async (key, className) => {
  const cnt = allData.filter(d => d.type === 'student' && d.class_name === className && d.user_name === currentUser).length;
  if (!confirm(`Hapus kelas "${className}"${cnt > 0 ? ` dan ${cnt} siswanya` : ''}? Tindakan ini tidak bisa dibatalkan.`)) return;

  const batch = [];
  batch.push(ROOT.child(key).remove());
  allData.filter(d => (d.type === 'student' || d.type === 'attendance_log' || d.type === 'nilai_pengetahuan' || d.type === 'nilai_sikap' || d.type === 'nilai_kolom' || d.type === 'nilai_kolom_ket' || d.type === 'nilai_keterampilan') && d.class_name === className && d.user_name === currentUser)
    .forEach(d => batch.push(ROOT.child(d.__key).remove()));
  try {
    await Promise.all(batch);
    if (currentClass === className) currentClass = '';
    window.toast(`Kelas "${className}" dihapus!`);
  } catch (e) { window.toast('Gagal hapus: ' + e.message, 'err'); }
};

// ── KELOLA SISWA & INTEGRASI SICAN ──
window.bukaKelolaSwiswa = (className) => {
  currentManajeKelas = className;
  document.getElementById('titleKelolaSwiswa').textContent = `👥 Kelola Siswa — ${className}`;
  document.getElementById('inputNamaSiswa').value = '';
  document.getElementById('inputFotoSiswa').value = '';
  window.openModal('modalKelolaSwiswa');
  window.renderSiswaModal(className);
};

window.renderSiswaModal = async (className) => {
  const tbody = document.getElementById('siswaTableBody');
  tbody.innerHTML = '<tr><td colspan="3" class="text-center"><div class="spinner"></div> Memuat data...</td></tr>';

  try {
    // 1. Ambil dari SICAN (Firestore)
    const sicanSnap = await firestore.collection('sican_siswa').where('kelas', '==', className).get();
    const sicanSiswa = [];
    sicanSnap.forEach(doc => sicanSiswa.push({ id: doc.id, ...doc.data(), source: 'sican' }));

    // 2. Ambil dari SIPENA (RTDB) yang sudah diinput manual
    const sipenaSiswa = allData.filter(d => d.type === 'student' && d.class_name === className && d.user_name === currentUser);

    // 3. Gabungkan & Hapus Duplikat (berdasarkan NIS atau Nama)
    const combined = [...sicanSiswa];
    sipenaSiswa.forEach(sp => {
      const exists = combined.some(sc => sc.nis === sp.nis || sc.nama.toLowerCase() === sp.student_name.toLowerCase());
      if (!exists) combined.push({ ...sp, source: 'sipena' });
    });

    if (!combined.length) {
      tbody.innerHTML = `<tr><td colspan="3"><div class="empty"><div class="ei">👥</div><p>Belum ada siswa. <br><button class="btn btn-success btn-sm" onclick="window.importDariSICAN('${className}')" style="margin-top:10px;">🔄 Import dari Master SICAN</button></p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = combined.map((s, i) => {
      const foto = s.student_photo || s.foto ? `<img src="${s.student_photo || s.foto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" onerror="this.outerHTML='👤'">` : '👤';
      const isSican = s.source === 'sican';
      const deleteBtn = isSican 
        ? `<button class="btn btn-success btn-sm" onclick="window.syncSicanToSipena('${s.id}', '${s.nama}', '${s.nis || ''}', '${s.foto || ''}')">+ Tambah ke SIPENA</button>`
        : `<button class="btn btn-danger btn-sm" data-key="${s.__key}" data-name="${s.student_name || s.nama}" data-action="hapussiswa">🗑 Hapus</button>`;
      
      return `<tr>
        <td>${foto}</td>
        <td style="font-weight:600;">${i + 1}. ${s.student_name || s.nama} ${isSican ? '<span class="badge badge-green" style="font-size:0.65rem;">SICAN</span>' : ''}</td>
        <td>${deleteBtn}</td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-action="hapussiswa"]').forEach(btn => {
      btn.onclick = () => window.hapusSiswa(btn.dataset.key, btn.dataset.name);
    });

  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="3" style="color:red;text-align:center;">Gagal memuat data SICAN. Pastikan koneksi internet baik.</td></tr>`;
  }
};

// Fungsi untuk menyalin siswa dari SICAN ke SIPENA agar fitur lain (nilai/absen) tetap jalan
window.syncSicanToSipena = async (sicanId, nama, nis, foto) => {
  try {
    await ROOT.push().set({ 
      type: 'student', class_name: currentManajeKelas, 
      student_name: nama, nis: nis, student_photo: foto || '', 
      user_name: currentUser, created_at: window.nowISO() 
    });
    window.toast(`Siswa "${nama}" berhasil ditambahkan!`);
    window.renderSiswaModal(currentManajeKelas);
  } catch (e) { window.toast('Gagal: ' + e.message, 'err'); }
};

window.importDariSICAN = async (className) => {
  const btn = event.target;
  btn.disabled = true; btn.textContent = '⏳ Mengimpor...';
  try {
    const sicanSnap = await firestore.collection('sican_siswa').where('kelas', '==', className).get();
    const batch = [];
    let count = 0;
    sicanSnap.forEach(doc => {
      const d = doc.data();
      batch.push(ROOT.push().set({
        type: 'student', class_name: className,
        student_name: d.nama, nis: d.nis || '', student_photo: d.foto || '',
        user_name: currentUser, created_at: window.nowISO()
      }));
      count++;
    });
    await Promise.all(batch);
    window.toast(`Berhasil mengimpor ${count} siswa dari SICAN!`);
    window.renderSiswaModal(className);
  } catch (e) {
    window.toast('Gagal import: ' + e.message, 'err');
  }
  btn.disabled = false; btn.textContent = '🔄 Import dari Master SICAN';
};

window.simpanSiswa = async () => {
  const nama = document.getElementById('inputNamaSiswa').value.trim();
  const foto = document.getElementById('inputFotoSiswa').value.trim();
  if (!nama) { window.toast('Nama siswa tidak boleh kosong!', 'err'); return; }
  if (!currentManajeKelas) { window.toast('Pilih kelas terlebih dahulu!', 'err'); return; }

  const btn = document.getElementById('btnSimpanSiswa');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    await ROOT.push().set({ type: 'student', class_name: currentManajeKelas, student_name: nama, student_photo: foto || '', user_name: currentUser, created_at: window.nowISO() });
    document.getElementById('inputNamaSiswa').value = '';
    document.getElementById('inputFotoSiswa').value = '';
    window.toast(`Siswa "${nama}" ditambahkan!`);
    setTimeout(() => document.getElementById('inputNamaSiswa').focus(), 100);
    window.renderSiswaModal(currentManajeKelas);
  } catch (e) { window.toast('Gagal: ' + e.message, 'err'); }
  btn.disabled = false; btn.textContent = '+ Tambah Siswa';
};

window.hapusSiswa = async (key, nama) => {
  if (!confirm(`Hapus siswa "${nama}"?`)) return;
  try {
    await ROOT.child(key).remove();
    window.toast(`Siswa "${nama}" dihapus.`);
    window.renderSiswaModal(currentManajeKelas);
  } catch (e) { window.toast('Gagal: ' + e.message, 'err'); }
};
