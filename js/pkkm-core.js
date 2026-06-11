// ==========================================================================
// KODE UTUH REVISI: pkkm-core.js (Sistem Folder Accordion Hemat Ruang)
// ==========================================================================
import { uploadDokumenPKKM, ambilSemuaBerkasPKKM, hapusDokumenPKKM, ambilMasterKomponen } from './pkkm-db.js';

// Sekarang MASTER_KOMPONEN diubah menjadi let (Array Kosong) yang akan diisi otomatis dari Firestore
let MASTER_KOMPONEN = [];

document.addEventListener("DOMContentLoaded", () => {
    deteksiRoleDanMuatAplikasi();
    
    const form = document.getElementById("formUploadPkkm");
    if(form) {
        form.addEventListener("submit", tanganiProsesSimpan);
    }
});

/**
 * 1. DETEKSI ROLE & AKUN GURU (Sesuai Konsep Otomatisasi)
 */
async function deteksiRoleDanMuatAplikasi() {
    try {
        console.log("Mendeteksi hak akses pengguna...");
        
        // Ambil data Master Komponen dari Firestore terlebih dahulu
        MASTER_KOMPONEN = await ambilMasterKomponen();
        
        // JIKA FIRESTORE MASIH KOSONG: Beri data cadangan (Seeding) agar aplikasi tidak blank saat pertama kali jalan
        if (MASTER_KOMPONEN.length === 0) {
            MASTER_KOMPONEN = [
                { id: "1", nama: "Usaha Pengembangan Madrasah", target: 4, warna: "#2e7d32", indikator: ["1.1.1", "1.1.2", "1.1.3", "1.1.4"] },
                { id: "2", nama: "Pelaksanaan Tugas Manajerial", target: 4, warna: "#1565c0", indikator: ["2.1.1", "2.1.2", "2.1.3", "2.1.4"] },
                { id: "3", nama: "Pengembangan Kewirausahaan", target: 2, warna: "#ef6c00", indikator: ["3.1.1", "3.1.2"] },
                { id: "4", nama: "Supervisi GTK", target: 2, warna: "#c62828", indikator: ["4.1.1", "4.1.2"] }
            ];
        }

        // Jalankan pengisian dropdown secara otomatis berdasarkan master data terupdate
        isiDropdownIndikatorOtomatis();

        // Muat data berkas dan render halaman utama
        await muatAplikasiPKKM();

    } catch (error) {
        console.error("Gagal mendeteksi role/master data PKKM:", error);
    }
}

/**
 * 2. PINTU UTAMA: Memuat Dashboard Atas & Grid Kartu Bawah
 */
async function muatAplikasiPKKM() {
    try {
        const masterBerkas = await ambilSemuaBerkasPKKM();
        hitungDanRenderDashboard(masterBerkas);
        muatKartuMonitoring(masterBerkas); 
    } catch (err) {
        console.error("Gagal memuat aplikasi PKKM:", err);
    }
}

/**
 * 3. OTOMATISASI DROPDOWN FORM: Guru tidak perlu mengetik nama komponen lagi
 */
function isiDropdownIndikatorOtomatis() {
    const elIndikator = document.getElementById("selectIndikator");
    const elKomponen = document.getElementById("inputKomponen");
    if (!elIndikator) return;

    elIndikator.innerHTML = '<option value="">-- Pilih Kode Indikator --</option>';
    
    // Looping memasukkan semua indikator dari seluruh komponen ke dalam dropdown select
    MASTER_KOMPONEN.forEach(komp => {
        if (komp.indikator && Array.isArray(komp.indikator)) {
            komp.indikator.forEach(ind => {
                const opt = document.createElement("option");
                opt.value = ind;
                opt.innerText = `${ind} - (Komponen ${komp.id})`;
                elIndikator.appendChild(opt);
            });
        }
    });

    // Otomatisasi Efek: Ketika guru memilih indikator (misal 1.1.1), input nama komponen otomatis terisi sendiri
    elIndikator.addEventListener("change", (e) => {
        const nilaiTerpilih = e.target.value;
        if (!nilaiTerpilih) {
            if (elKomponen) elKomponen.value = "";
            return;
        }
        const awalanId = nilaiTerpilih.split('.')[0];
        const cocokKomp = MASTER_KOMPONEN.find(k => k.id === awalanId);
        if (cocokKomp && elKomponen) {
            elKomponen.value = cocokKomp.nama; // Mengisi otomatis teks komponen
        }
    });
}

/**
 * 4. RENDER DASHBOARD PROGRESS BAR ATAS
 */
function hitungDanRenderDashboard(masterBerkas) {
    const gridKontainer = document.getElementById("gridKomponenUtama");
    if (!gridKontainer) return;
    gridKontainer.innerHTML = "";

    const counterKoleksi = {};
    MASTER_KOMPONEN.forEach(komp => {
        counterKoleksi[komp.id] = 0;
    });

    for (const key in masterBerkas) {
        const data = masterBerkas[key];
        const awalan = data.id_indikator ? data.id_indikator.split('.')[0] : "";
        if (counterKoleksi[awalan] !== undefined) {
            counterKoleksi[awalan]++;
        }
    }

    MASTER_KOMPONEN.forEach(komp => {
        const jumlahTerisi = counterKoleksi[komp.id] || 0;
        const persentase = Math.min(Math.round((jumlahTerisi / komp.target) * 100), 100);

        const cardKomp = document.createElement("div");
        cardKomp.className = "galeri-card"; 
        cardKomp.style.cssText = `
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            border-radius: 12px;
            padding: 18px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.03);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: transform 0.3s ease;
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

/**
 * 5. PROSES SIMPAN AMAN
 */
async function tanganiProsesSimpan(e) {
    e.preventDefault();
    const btn = document.getElementById("btnSimpanPkkm");
    
    const idIndikator = document.getElementById("selectIndikator").value;
    const komponen = document.getElementById("inputKomponen").value;
    const namaDokumen = document.getElementById("inputNamaDokumen").value;
    const fileFisik = document.getElementById("inputFilePkkm").files[0];

    if (!idIndikator || !namaDokumen || !fileFisik) {
        alert("Mohon lengkapi semua form terlebih dahulu!");
        return;
    }

    if (fileFisik.size > 1.0 * 1024 * 1024) {
        alert("Ukuran berkas melebihi batas maksimal 1 MB! Mohon kompres file Anda terlebih dahulu.");
        return;
    }

    try {
        btn.disabled = true;
        btn.innerText = "⏳ Memproses Penyimpanan...";

        const reader = new FileReader();
        reader.readAsDataURL(fileFisik);
        
        reader.onload = async function () {
            const base64String = reader.result;

            const payloadData = {
                id_indikator: idIndikator,
                komponen: komponen,
                nama_dokumen: namaDokumen,
                nama_file_asli: fileFisik.name,
                tipe_file: fileFisik.type,
                file_base64: base64String,
                uploader_email: "Guru/Staf Madrasah",
                waktu_upload: new Date().toISOString()
            };

            try {
                await uploadDokumenPKKM(idIndikator, payloadData);

                alert("Alhamdulillah, Dokumen PKKM Berhasil Disimpan!");
                document.getElementById("formUploadPkkm").reset();
                await muatAplikasiPKKM();

            } catch (err) {
                alert("Gagal menyimpan ke database: " + err.message);
            } finally {
                btn.disabled = false;
                btn.innerText = "Simpan Dokumen PKKM";
            }
        };

        reader.onerror = function() {
            alert("Gagal membaca enkripsi file fisik komputer.");
            btn.disabled = false;
            btn.innerText = "Simpan Dokumen PKKM";
        };

    } catch (err) {
        alert("Gagal memproses dokumen: " + err.message);
        btn.disabled = false;
        btn.innerText = "Simpan Dokumen PKKM";
    }
}

/**
 * 6. REVISI UTAMA: MODUL MONITORING BENTUK FOLDER DIGITAL (KLIK UNTUK BUKA)
 */
function muatKartuMonitoring(masterBerkas) {
    const container = document.getElementById("containerKartuPkkm");
    if (!container) return;
    container.innerHTML = "";

    if (!masterBerkas || Object.keys(masterBerkas).length === 0) {
        container.innerHTML = '<div class="status-empty-box" style="color: #64748b; text-align: center; padding: 30px; font-style: italic; background: rgba(255,255,255,0.8); border-radius:12px;">Belum ada dokumen bukti fisik yang disimpan untuk instrumen PKKM ini.</div>';
        return;
    }

    const arrayBerkas = [];
    for (const key in masterBerkas) {
        arrayBerkas.push({ id_firebase: key, ...masterBerkas[key] });
    }

    // Menggambar baris folder per komponen utama
    MASTER_KOMPONEN.forEach(komp => {
        const berkasMilikKomponen = arrayBerkas.filter(berkas => {
            const awalan = berkas.id_indikator ? berkas.id_indikator.split('.')[0] : "";
            return awalan === komp.id;
        });

        const jumlahTerisi = berkasMilikKomponen.length;
        const persentase = Math.min(Math.round((jumlahTerisi / komp.target) * 100), 100);

        // Wrapper Card berbentuk tab Folder minimalis
        const folderWrapper = document.createElement("div");
        folderWrapper.style.cssText = `
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            margin-bottom: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.02);
            overflow: hidden;
        `;

        // Barisan Header Folder (Clickable / Bisa diklik)
        folderWrapper.innerHTML = `
            <div class="folder-header" style="
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                padding: 14px 20px; 
                cursor: pointer; 
                border-left: 6px solid ${komp.warna};
                background: #ffffff;
                user-select: none;
                transition: background 0.2s ease;
            " onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#ffffff'">
                
                <div style="display: flex; align-items: center; gap: 14px;">
                    <span class="icon-folder-status" style="font-size: 1.5rem;">📁</span>
                    <div>
                        <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #1e293b;">
                            Komponen ${komp.id} — ${komp.nama}
                        </h4>
                        <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: #64748b;">
                            Terisi <span style="font-weight: bold; color: ${komp.warna};">${jumlahTerisi}</span> berkas dari target ${komp.target} indikator
                        </p>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="background: ${komp.warna}12; color: ${komp.warna}; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">
                        ${persentase}% Selesai
                    </span>
                    <span class="icon-panah-toggle" style="font-size: 0.8rem; color: #94a3b8; transition: transform 0.2s;">▶ Open</span>
                </div>
            </div>

            <div class="folder-body-content" style="display: none; padding: 16px 20px; background: #f8fafc; border-top: 1px solid #edf2f7;">
                <div style="width: 100%; background: #e2e8f0; height: 4px; border-radius: 4px; overflow: hidden; margin-bottom: 16px;">
                    <div style="width: ${persentase}%; background: ${komp.warna}; height: 100%;"></div>
                </div>
                <div class="sub-files-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;"></div>
            </div>
        `;

        const headerArea = folderWrapper.querySelector(".folder-header");
        const bodyArea = folderWrapper.querySelector(".folder-body-content");
        const folderIcon = folderWrapper.querySelector(".icon-folder-status");
        const toggleText = folderWrapper.querySelector(".icon-panah-toggle");
        const gridBerkas = folderWrapper.querySelector(".sub-files-grid");

        // Fungsi klik buka-tutup folder
        headerArea.addEventListener("click", () => {
            const dalamKondisiTerbuka = bodyArea.style.display === "block";
            if (dalamKondisiTerbuka) {
                bodyArea.style.display = "none";
                folderIcon.innerText = "📁";
                toggleText.innerText = "▶ Open";
                toggleText.style.color = "#94a3b8";
            } else {
                bodyArea.style.display = "block";
                folderIcon.innerText = "📂";
                toggleText.innerText = "▼ Close";
                toggleText.style.color = komp.warna;
            }
        });

        // Pengisian kartu berkas mini di dalam folder
        if (berkasMilikKomponen.length === 0) {
            gridBerkas.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 16px; border: 1px dashed #cbd5e1; border-radius: 6px; color: #94a3b8; font-size: 0.8rem; font-style: italic;">
                    Folder kosong. Belum ada berkas fisik yang diunggah ke komponen ini.
                </div>
            `;
        } else {
            berkasMilikKomponen.sort((a, b) => a.id_indikator.localeCompare(b.id_indikator, undefined, { numeric: true }));

            berkasMilikKomponen.forEach(data => {
                const itemFile = document.createElement("div");
                itemFile.style.cssText = `
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                `;

                itemFile.innerHTML = `
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="background: #2e7d32; color: white; font-size: 0.7rem; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-family: monospace;">
                                Kode ${data.id_indikator}
                            </span>
                            <span style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 140px;" title="${data.nama_dokumen}">
                                📌 ${data.nama_dokumen}
                            </span>
                        </div>
                        <div style="font-size: 0.75rem; color: #475569; background: #f1f5f9; padding: 6px 8px; border-radius: 4px; display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                            <span style="font-size: 0.9rem;">📄</span>
                            <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 210px;" title="${data.nama_file_asli}">
                                ${data.nama_file_asli || 'dokumen.pdf'}
                            </span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 4px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
                        <button type="button" class="btn-mini-lihat" style="background: #f1f5f9; color: #334155; border: none; border-radius: 4px; padding: 6px 4px; font-size: 0.7rem; font-weight: bold; flex: 1; cursor: pointer;">💻 Lihat</button>
                        <button type="button" class="btn-mini-unduh" style="background: #e0f2fe; color: #0369a1; border: none; border-radius: 4px; padding: 6px 4px; font-size: 0.7rem; font-weight: bold; flex: 1; cursor: pointer;">📥 Unduh</button>
                        <button type="button" class="btn-mini-hapus" style="background: #ffe4e6; color: #9f1239; border: none; border-radius: 4px; padding: 6px 4px; font-size: 0.7rem; font-weight: bold; flex: 1; cursor: pointer;">🗑️ Hapus</button>
                    </div>
                `;

                // Event Listener khusus tombol agar tidak memicu click event milik folder induk (.stopPropagation())
                itemFile.querySelector(".btn-mini-lihat").addEventListener("click", (e) => { e.stopPropagation(); window.pratinjauBerkasPDF(data.file_base64, data.tipe_file); });
                itemFile.querySelector(".btn-mini-unduh").addEventListener("click", (e) => { e.stopPropagation(); window.unduhBerkasDariBase64(data.file_base64, data.nama_file_asli); });
                itemFile.querySelector(".btn-mini-hapus").addEventListener("click", (e) => { e.stopPropagation(); window.tanganiHapus(data.id_indikator); });

                gridBerkas.appendChild(itemFile);
            });
        }

        container.appendChild(folderWrapper);
    });
}

// ==========================================================================
// WINDOW INTERACTION ACTIONS
// ==========================================================================
window.unduhBerkasDariBase64 = function(stringBase64, namaFileAsli) {
    const link = document.createElement("a");
    link.href = stringBase64;
    link.download = namaFileAsli;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.pratinjauBerkasPDF = function(stringBase64, tipeFile) {
    if (!tipeFile || !tipeFile.includes("pdf")) {
        alert("Pratinjau langsung hanya mendukung PDF. File Excel/Word otomatis terunduh saat Anda klik 'Download'.");
        return;
    }
    const win = window.open();
    if (win) {
        win.document.write(`<iframe src="${stringBase64}" frameborder="0" style="border:0; width:100%; height:100%;" allowfullscreen></iframe>`);
    } else {
        alert("Pop-up diblokir browser!");
    }
}

window.tanganiHapus = async function(idIndikator) {
    if (!confirm(`Hapus berkas pada indikator ${idIndikator}?`)) return;
    try {
        await hapusDokumenPKKM(idIndikator);
        alert("Berkas berhasil dihapus!");
        await muatAplikasiPKKM();
    } catch (err) {
        alert("Gagal menghapus: " + err.message);
    }
}
