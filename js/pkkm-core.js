import { uploadDokumenPKKM, ambilSemuaBerkasPKKM, hapusDokumenPKKM } from './pkkm-db.js';

// Master data acuan komponen utama PKKM (Target total indikator ideal)
const MASTER_KOMPONEN = [
    { id: "1", nama: "Usaha Pengembangan Madrasah", target: 4, warna: "#2e7d32" },
    { id: "2", nama: "Pelaksanaan Tugas Manajerial", target: 4, warna: "#1565c0" },
    { id: "3", nama: "Pengembangan Kewirausahaan", target: 2, warna: "#ef6c00" },
    { id: "4", nama: "Supervisi GTK", target: 2, warna: "#c62828" }
];

document.addEventListener("DOMContentLoaded", () => {
    muatAplikasiPKKM();
    
    const form = document.getElementById("formUploadPkkm");
    if(form) {
        form.addEventListener("submit", tanganiProsesSimpan);
    }
});

// Fungsi pintu utama untuk memuat dashboard atas dan grid bawah sekaligus
async function muatAplikasiPKKM() {
    try {
        const masterBerkas = await ambilSemuaBerkasPKKM();
        hitungDanRenderDashboard(masterBerkas);
        muatKartuMonitoring(masterBerkas);
    } catch (err) {
        console.error("Gagal memuat aplikasi PKKM:", err);
    }
}

// ==========================================================================
// UTILITY GLOBAL: AKSI UNDUH & LIHAT BERKAS BASE64 (Didaftarkan ke Window)
// ==========================================================================
window.unduhBerkasDariBase64 = function(stringBase64, namaFileAsli) {
    if (!stringBase64) return alert("Konten berkas tidak ditemukan atau rusak!");
    const link = document.createElement("a");
    link.href = stringBase64;
    link.download = namaFileAsli || "dokumen_pkkm.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.pratinjauBerkasPDF = function(stringBase64, tipeFile) {
    if (!stringBase64) return alert("Konten file kosong!");
    
    if (!tipeFile || !tipeFile.includes("pdf")) {
        alert("Pratinjau langsung hanya mendukung format PDF. File Excel/Word/Lainnya otomatis terunduh saat Anda klik 'Download'.");
        return;
    }
    const win = window.open();
    if (win) {
        win.document.write(`<iframe src="${stringBase64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    } else {
        alert("Pop-up diblokir! Mohon izinkan akses pop-up pada pengaturan browser Anda untuk melihat pratinjau berkas.");
    }
}

window.tanganiHapus = async function(idIndikator) {
    if (!idIndikator) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus berkas bukti fisik pada indikator ${idIndikator} secara permanen?`)) return;
    
    try {
        await hapusDokumenPKKM(idIndikator);
        alert("Alhamdulillah, Berkas Berhasil Dihapus!");
        muatAplikasiPKKM(); // Refresh dashboard visual & list kartu secara real-time
    } catch (err) {
        alert("Gagal menghapus berkas: " + err.message);
    }
}

// ==========================================================================
// FUNGSI LOGIKA: MENGHITUNG & MERENDER PROGRESS BAR GLASSMORPHISM
// ==========================================================================
function hitungDanRenderDashboard(masterBerkas) {
    const gridKontainer = document.getElementById("gridKomponenUtama");
    if (!gridKontainer) return;
    gridKontainer.innerHTML = "";

    // Inisialisasi hitungan berkas yang terkumpul per komponen awal
    const counterKoleksi = { "1": 0, "2": 0, "3": 0, "4": 0 };

    // Hitung kemunculan berdasarkan nomor awalan indikator (misal 1.1.1 masuk ke komponen 1)
    for (const key in masterBerkas) {
        const data = masterBerkas[key];
        const awalan = data.id_indikator ? data.id_indikator.charAt(0) : "";
        if (counterKoleksi[awalan] !== undefined) {
            counterKoleksi[awalan]++;
        }
    }

    // Bangun visual kartu glassmorphism per komponen utama
    MASTER_KOMPONEN.forEach(komp => {
        const jumlahTerisi = counterKoleksi[komp.id] || 0;
        const persentase = Math.min(Math.round((jumlahTerisi / komp.target) * 100), 100);

        const cardKomp = document.createElement("div");
        cardKomp.style.cssText = `
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            border-radius: 10px;
            padding: 16px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.03);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        `;

        cardKomp.innerHTML = `
            <div>
                <strong style="color: ${komp.warna}; font-size: 0.95rem; display: block; margin-bottom: 4px;">Komponen ${komp.id}</strong>
                <p style="margin: 0; font-size: 0.85rem; color: #334155; font-weight: 500; line-height: 1.4;">${komp.nama}</p>
            </div>
            
            <div style="margin-top: 14px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748b; margin-bottom: 4px;">
                    <span>Progress: ${jumlahTerisi}/${komp.target} Berkas</span>
                    <strong>${persentase}%</strong>
                </div>
                <div style="width: 100%; background: #e2e8f0; height: 6px; border-radius: 10px; overflow: hidden;">
                    <div style="width: ${persentase}%; background: ${komp.warna}; height: 100%; transition: width 0.5s ease;"></div>
                </div>
            </div>
        `;
        gridKontainer.appendChild(cardKomp);
    });
}

// ==========================================================================
// FUNGSI LOGIKA: PROSES SIMPAN AMAN (PENANGANAN ERROR & RESET)
// ==========================================================================
async function tanganiProsesSimpan(e) {
    e.preventDefault(); // Mencegah reload halaman
    
    const btn = document.getElementById("btnSimpanPkkm");
    
    const elIndikator = document.getElementById("selectIndikator");
    const elKomponen = document.getElementById("inputKomponen");
    const elNamaDokumen = document.getElementById("inputNamaDokumen");
    const elFile = document.getElementById("inputFilePkkm");

    if (!elIndikator || !elKomponen || !elNamaDokumen || !elFile) {
        alert("Error: Ada elemen form yang tidak ditemukan di HTML. Mohon periksa kembali id input Anda.");
        return;
    }

    const idIndikator = elIndikator.value;
    const komponen = elKomponen.value;
    const namaDokumen = elNamaDokumen.value;
    const fileFisik = elFile.files[0];

    if (!fileFisik) {
        alert("Mohon pilih file berkas terlebih dahulu!");
        return;
    }

    // Mengunci proteksi 1 MB Base64 demi kelancaran server Firestore
    if (fileFisik.size > 1.0 * 1024 * 1024) {
        alert("Ukuran berkas melebihi batas maksimal 1 MB! Mohon kompres file PDF Anda terlebih dahulu.");
        return;
    }

    try {
        btn.disabled = true;
        btn.innerText = "⏳ Memproses Penyimpanan...";

        await uploadDokumenPKKM(idIndikator, fileFisik, {
            komponen: komponen,
            namaDokumen: namaDokumen,
            user: "Guru/Staf Madrasah"
        });

        alert("Alhamdulillah, Dokumen PKKM Berhasil Disimpan!");
        document.getElementById("formUploadPkkm").reset();
        
        // Memuat ulang data aplikasi secara sinkron untuk memperbarui view bawah & progress bar
        muatAplikasiPKKM();

    } catch (err) {
        console.error("Error detail saat simpan:", err);
        alert("Gagal menyimpan dokumen. Pesan Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Simpan Dokumen PKKM";
    }
}

// ==========================================================================
// FUNGSI LOGIKA: MERENDER KARTU BUKTI FISIK BERWARNA (SINKRON DENGAN EVENT LISTENER)
// ==========================================================================
function muatKartuMonitoring(masterBerkas) {
    const container = document.getElementById("containerKartuPkkm");
    if (!container) return;

    container.innerHTML = "";

    if (!masterBerkas || Object.keys(masterBerkas).length === 0) {
        container.innerHTML = '<div class="status-empty-box" style="color: white; text-align: center; padding: 20px; font-style: italic;">Belum ada dokumen bukti fisik yang disimpan untuk instrumen PKKM ini.</div>';
        return;
    }

    const paletTema = [
        { bg: '#1b5e20', teks: '#ffffff', border: '#1b5e20', btnLihat: '#ffffff', btnLihatTeks: '#1b5e20' },
        { bg: '#2e7d32', teks: '#ffffff', border: '#2e7d32', btnLihat: '#ffffff', btnLihatTeks: '#2e7d32' },
        { bg: '#e3f2fd', teks: '#1e293b', border: '#bbdefb', btnLihat: '#f1f5f9', btnLihatTeks: '#334155' },
        { bg: '#f0fdf4', teks: '#1e293b', border: '#bbf7d0', btnLihat: '#f1f5f9', btnLihatTeks: '#334155' }
    ];

    let index = 0;
    for (const key in masterBerkas) {
        const data = masterBerkas[key];
        const card = document.createElement("div");
        card.className = "pkkm-card-box";
        
        const tema = paletTema[index % paletTema.length];
        index++;

        card.style.backgroundColor = tema.bg;
        card.style.color = tema.teks;
        card.style.borderColor = tema.border;
        card.style.borderRadius = '12px';
        card.style.padding = '16px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';

        card.innerHTML = `
            <div style="line-height: 1.6;">
                <div style="font-size: 0.95rem; margin-bottom: 4px;">Kode: <strong>${data.id_indikator}</strong></div>
                <div style="font-size: 0.85rem; margin-bottom: 8px; opacity: 0.9;">Kategori: ${data.komponen}</div>
                <div style="font-size: 0.95rem; font-weight: bold; margin-bottom: 4px;">📌 ${data.nama_dokumen}</div>
                <div style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; margin-bottom: 12px; opacity: 0.8; word-break: break-all;">
                    📄 ${data.nama_file_asli || 'Berkas Dokumen'}
                </div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: auto; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.2);">
                <button type="button" class="btn-action-mini btn-mini-lihat" style="background: ${tema.btnLihat}; color: ${tema.btnLihatTeks}; border: none; border-radius: 6px; padding: 8px 6px; font-weight: bold; flex: 1; cursor: pointer;">💻 Lihat</button>
                <button type="button" class="btn-action-mini btn-mini-unduh" style="background: #e0f2fe; color: #0369a1; border: none; border-radius: 6px; padding: 8px 6px; font-weight: bold; flex: 1; cursor: pointer;">📥 Download</button>
                <button type="button" class="btn-action-mini btn-mini-hapus" style="background: #ffe4e6; color: #9f1239; border: none; border-radius: 6px; padding: 8px 6px; font-weight: bold; flex: 1; cursor: pointer;">🗑️ Hapus</button>
            </div>
        `;

        // Menggunakan pemicu event listener lokal yang merujuk langsung ke fungsi objek Window Global
        card.querySelector(".btn-mini-lihat").addEventListener("click", () => window.pratinjauBerkasPDF(data.file_base64, data.tipe_file));
        card.querySelector(".btn-mini-unduh").addEventListener("click", () => window.unduhBerkasDariBase64(data.file_base64, data.nama_file_asli));
        card.querySelector(".btn-mini-hapus").addEventListener("click", () => window.tanganiHapus(data.id_indikator));

        container.appendChild(card);
    }
}
