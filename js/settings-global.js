// ══════════════════════════════════════════════
// SIG — SETTINGS IDENTITAS GLOBAL (SIPELITA)
// Satu form untuk SEMUA fitur: LCKH, Jurnal, Ekskul, dll.
// Tersimpan per-akun (localStorage + sinkron Firestore)
// ══════════════════════════════════════════════
(function () {
  if (window.__SIG_LOADED) return;
  window.__SIG_LOADED = true;

  var DEFAULTS = { tempat: '', kamadNama: '', kamadNip: '' };

  function userEmail() {
    try {
      var u = JSON.parse(localStorage.getItem('sipelita_user') || 'null');
      return (u && u.email) || '';
    } catch (e) { return ''; }
  }
  function storeKey() {
    return 'sig_settings_' + (userEmail() || 'umum').replace(/[.#$\[\]]/g, '_');
  }
  function docId() { return (userEmail() || 'umum').replace(/[.#$\[\]]/g, '_'); }

  window.SIG = {
    // ✅ Baca setelan (sinkron, selalu aman)
    get: function () {
      var s = {};
      try { s = JSON.parse(localStorage.getItem(storeKey()) || 'null') || {}; } catch (e) {}
      var out = {};
      for (var k in DEFAULTS) out[k] = s[k] || '';
      // Format siap pakai di dokumen (fallback titik-titik netral)
      out.ttdTempat = out.tempat || '....................';
      out.ttdKamad  = out.kamadNama || '( .................................................... )';
      out.ttdNip    = 'NIP. ' + (out.kamadNip || '....................');
      return out;
    },

    // ✅ Simpan (localStorage + Firestore agar lintas perangkat)
    save: function (data) {
      localStorage.setItem(storeKey(), JSON.stringify(data));
      try {
        if (typeof firebase !== 'undefined' && firebase.apps.length && userEmail()) {
          firebase.firestore().collection('pengaturan_user').doc(docId())
            .set(Object.assign({}, data, { email: userEmail(), updatedAt: new Date().toISOString() }))
            .catch(function () {});
        }
      } catch (e) {}
    },

    // ✅ Tarik dari cloud bila perangkat ini belum punya (panggil sebelum cetak dokumen)
    pull: function () {
      return new Promise(function (resolve) {
        try {
          if (localStorage.getItem(storeKey()) || typeof firebase === 'undefined' ||
              !firebase.apps.length || !userEmail()) { resolve(SIG.get()); return; }
          firebase.firestore().collection('pengaturan_user').doc(docId()).get()
            .then(function (docSnap) {
              if (docSnap.exists) {
                var d = docSnap.data(), clean = {};
                for (var k in DEFAULTS) clean[k] = d[k] || '';
                localStorage.setItem(storeKey(), JSON.stringify(clean));
              }
              resolve(SIG.get());
            })
            .catch(function () { resolve(SIG.get()); });
        } catch (e) { resolve(SIG.get()); }
      });
    },

    open: function () { openUI(); }
  };

  // ── UI: tombol melayang + modal (disuntik otomatis) ──
  function injectUI() {
    if (document.getElementById('sigModal')) return;

    var style = document.createElement('style');
    style.textContent =
      '#sigFab{position:fixed;right:18px;bottom:18px;z-index:9998;width:52px;height:52px;border-radius:50%;border:none;background:#059669;color:#fff;font-size:1.35rem;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.25);}' +
      '#sigFab:hover{background:#047857;}' +
      '#sigModal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;}' +
      '#sigModal.active{display:flex;}' +
      '#sigModal .sig-box{background:#fff;border-radius:14px;padding:24px;width:100%;max-width:460px;box-shadow:0 20px 60px rgba(0,0,0,.25);}' +
      '#sigModal h3{color:#047857;margin:0 0 6px;}' +
      '#sigModal .hint{font-size:.8rem;color:#64748b;margin-bottom:14px;}' +
      '#sigModal label{display:block;font-size:.85rem;font-weight:600;color:#374151;margin:10px 0 5px;}' +
      '#sigModal input{width:100%;padding:10px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:.92rem;box-sizing:border-box;}' +
      '#sigModal .sig-foot{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;}' +
      '#sigModal button{padding:10px 16px;border:none;border-radius:8px;font-weight:700;cursor:pointer;}' +
      '#sigModal .sig-save{background:#059669;color:#fff;}' +
      '#sigModal .sig-cancel{background:#e2e8f0;color:#475569;}';
    document.head.appendChild(style);

    var fab = document.createElement('button');
    fab.id = 'sigFab'; fab.innerHTML = '⚙️';
    fab.title = 'Pengaturan Identitas (Nama Kamad, NIP, Kota)';
    fab.onclick = openUI;
    document.body.appendChild(fab);

    var modal = document.createElement('div');
    modal.id = 'sigModal';
    modal.innerHTML =
      '<div class="sig-box">' +
      '<h3>⚙️ Pengaturan Identitas Madrasah</h3>' +
      '<div class="hint">Diisi <b>sekali</b> oleh masing-masing guru. Nama Kamad & NIP otomatis dipakai di <b>LCKH, Jurnal, Rekap, Laporan Ekskul</b>, dll.</div>' +
      '<label>🏙️ Kota / Tempat (tanggal tanda tangan)</label>' +
      '<input id="sigTempat" placeholder="Contoh: Bantaeng">' +
      '<label>👑 Nama Kepala Madrasah</label>' +
      '<input id="sigKamadNama" placeholder="Nama lengkap + gelar">' +
      '<label>🔢 NIP Kepala Madrasah</label>' +
      '<input id="sigKamadNip" placeholder="Kosongkan bila tidak ada">' +
      '<div class="sig-foot">' +
      '<button class="sig-cancel" id="sigBatal">Batal</button>' +
      '<button class="sig-save" id="sigSimpan">💾 Simpan</button>' +
      '</div></div>';
    document.body.appendChild(modal);

    modal.querySelector('#sigBatal').onclick = function () { modal.classList.remove('active'); };
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('active'); });
    modal.querySelector('#sigSimpan').onclick = function () {
      SIG.save({
        tempat: modal.querySelector('#sigTempat').value.trim(),
        kamadNama: modal.querySelector('#sigKamadNama').value.trim(),
        kamadNip: modal.querySelector('#sigKamadNip').value.trim()
      });
      modal.classList.remove('active');
      if (window.toast) window.toast('✅ Pengaturan identitas tersimpan!');
      else alert('✅ Pengaturan identitas tersimpan!');
    };
  }

  function openUI() {
    injectUI();
    var s = SIG.get();
    document.getElementById('sigTempat').value = s.tempat || '';
    document.getElementById('sigKamadNama').value = s.kamadNama || '';
    document.getElementById('sigKamadNip').value = s.kamadNip || '';
    document.getElementById('sigModal').classList.add('active');
  }

})();
