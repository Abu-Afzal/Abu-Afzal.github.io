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

// Track siswa yang sudah ditambahkan
let siswaSudahDitambahkan = new Set();

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

    // 4. Filter siswa yang BELUM ditambahkan
    const belumDitambahkan = combined.filter(s => !siswaSudahDitambahkan.has(s.id || s.__key));

    if (!belumDitambahkan.length) {
      tbody.innerHTML = `<tr><td colspan="3"><div class="empty"><div class="ei">✅</div><p>Semua siswa sudah ditambahkan!</p><button class="btn btn-secondary btn-sm" onclick="window.resetSiswaDitambahkan()" style="margin-top:10px;">🔄 Reset</button></div></td></tr>`;
      return;
    }

    // 5. Hitung jumlah yang sudah ditambahkan
    const sudahDitambahkanCount = combined.length - belumDitambahkan.length;

    // 6. Render dengan tombol "Tambahkan Semua"
    let html = `
      <tr style="background:#f0f9ff;">
        <td colspan="3" style="padding:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="font-weight:600;color:#0369a1;">
              📋 Total: ${combined.length} siswa | Ditambahkan: ${sudahDitambahkanCount} | Tersisa: ${belumDitambahkan.length}
            </div>
            ${belumDitambahkan.length > 0 ? `
              <button class="btn btn-success" onclick="window.tambahkanSemua()" style="padding:8px 16px;font-size:0.85rem;">
                ➕ Tambahkan Semua (${belumDitambahkan.length})
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;

    belumDitambahkan.forEach((s, i) => {
      const foto = s.student_photo || s.foto ? `<img src="${s.student_photo || s.foto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" onerror="this.outerHTML='👤'">` : '👤';
      const isSican = s.source === 'sican';
      const deleteBtn = isSican 
        ? `<button class="btn btn-success btn-sm" onclick="window.syncSicanToSipena('${s.id}', '${s.nama}', '${s.nis || ''}', '${s.foto || ''}')" style="font-size:0.75rem;padding:6px 10px;">+ Tambah ke SIPENA</button>`
        : `<button class="btn btn-danger btn-sm" data-key="${s.__key}" data-name="${s.student_name || s.nama}" data-action="hapussiswa">🗑 Hapus</button>`;
      
      html += `<tr id="row-${s.id || s.__key}">
        <td>${foto}</td>
        <td style="font-weight:600;">${i + 1}. ${s.student_name || s.nama} ${isSican ? '<span class="badge badge-green" style="font-size:0.65rem;">SICAN</span>' : ''}</td>
        <td>${deleteBtn}</td>
      </tr>`;
    });

    tbody.innerHTML = html;

    tbody.querySelectorAll('[data-action="hapussiswa"]').forEach(btn => {
      btn.onclick = () => window.hapusSiswa(btn.dataset.key, btn.dataset.name);
    });

  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="3" style="color:red;text-align:center;">Gagal memuat data SICAN. Pastikan koneksi internet baik.</td></tr>`;
  }
};

// Fungsi untuk menambahkan semua siswa sekaligus
window.tambahkanSemua = async () => {
  const className = currentManajeKelas;
  if (!className) {
    window.toast('Kelas belum dipilih!', 'err');
    return;
  }

  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menambahkan...';

  try {
    // 1. Ambil semua siswa SICAN untuk kelas ini
    const sicanSnap = await firestore.collection('sican_siswa').where('kelas', '==', className).get();
    
    // 2. Ambil siswa yang sudah ada di SIPENA
    const sipenaSiswa = allData.filter(d => d.type === 'student' && d.class_name === className && d.user_name === currentUser);
    
    // 3. Filter yang belum ditambahkan
    const belumDitambahkan = [];
    sicanSnap.forEach(doc => {
      const s = { id: doc.id, ...doc.data() };
      // Cek apakah sudah ada di SIPENA (berdasarkan NIS atau nama)
      const sudahAda = sipenaSiswa.some(sp => 
        sp.nis === s.nis || sp.student_name.toLowerCase() === s.nama.toLowerCase()
      );
      // Cek apakah sudah ditambahkan di sesi ini
      const sudahDitambahkan = siswaSudahDitambahkan.has(s.id);
      
      if (!sudahAda && !sudahDitambahkan) {
        belumDitambahkan.push(s);
      }
    });

    if (belumDitambahkan.length === 0) {
      window.toast('Tidak ada siswa baru untuk ditambahkan!', 'err');
      btn.disabled = false;
      btn.innerHTML = originalText;
      return;
    }

    // 4. Tambahkan semua ke SIPENA
    const batch = [];
    belumDitambahkan.forEach(s => {
      batch.push(ROOT.push().set({
        type: 'student',
        class_name: className,
        student_name: s.nama,
        nis: s.nis || '',
        student_photo: s.foto || '',
        user_name: currentUser,
        created_at: window.nowISO()
      }));
      // Tandai sebagai sudah ditambahkan
      siswaSudahDitambahkan.add(s.id);
    });

    await Promise.all(batch);
    
    window.toast(`✅ Berhasil menambahkan ${belumDitambahkan.length} siswa!`);
    
    // 5. Re-render untuk update daftar
    await window.renderSiswaModal(className);
    
  } catch (e) {
    window.toast('Gagal menambahkan semua: ' + e.message, 'err');
  }
  
  btn.disabled = false;
  btn.innerHTML = originalText;
};

// Fungsi untuk reset tracking siswa yang sudah ditambahkan
window.resetSiswaDitambahkan = () => {
  siswaSudahDitambahkan.clear();
  window.renderSiswaModal(currentManajeKelas);
  window.toast('Daftar siswa direset');
};

// Fungsi untuk menyalin siswa dari SICAN ke SIPENA (tetap sama, tapi update tracking)
window.syncSicanToSipena = async (sicanId, nama, nis, foto) => {
  try {
    await ROOT.push().set({ 
      type: 'student', 
      class_name: currentManajeKelas, 
      student_name: nama, 
      nis: nis, 
      student_photo: foto || '', 
      user_name: currentUser, 
      created_at: window.nowISO() 
    });
    
    // Tandai sebagai sudah ditambahkan
    siswaSudahDitambahkan.add(sicanId);
    
    window.toast(`Siswa "${nama}" berhasil ditambahkan!`);
    
    // Re-render untuk menghilangkan dari daftar
    await window.renderSiswaModal(currentManajeKelas);
    
  } catch (e) { 
    window.toast('Gagal: ' + e.message, 'err'); 
  }
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
