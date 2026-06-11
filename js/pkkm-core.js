// ==========================================================================
// KODE UTUH REVISI: pkkm-core.js (Satu Komponen = Satu Kartu Induk)
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
        muatKartuMonitoring(masterBerkas); // Ini fungsi yang kita rombak strukturnya
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
        if (komp.indigo && Array.isArray(komp.indikator)) {
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
 * 4. RENDER DASHBOARD PROGRESS BAR ATAS (Mengikuti gaya komponen Anda)
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
 * 6. REVISI TOTAL: RENDER MONITORING BERSARANG (Satu Komponen = Satu Kartu Induk)
 */
function muatKartuMonitoring(masterBerkas) {
    const container = document.getElementById("containerKartuPkkm");
    if (!container) return;
    container.innerHTML = "";

    if (!masterBerkas || Object.keys(masterBerkas).length === 0) {
        container.innerHTML = '<div class="status-empty-box" style="color: #64748b; text-align: center; padding: 30px; font-style: italic; background: rgba(255,255,255,0.5); border-radius:12px;">Belum ada dokumen bukti fisik yang disimpan untuk instrumen PKKM ini.</div>';
        return;
    }

    // Ubah data object masterBerkas dari Firestore menjadi format Array agar mudah difilter
    const arrayBerkas = [];
    for (const key in masterBerkas) {
        arrayBerkas.push({ id_firebase: key, ...masterBerkas[key] });
    }

    // Looping Master Komponen untuk membuat Kartu Induk Pembungkusnya
    MASTER_KOMPONEN.forEach(komp => {
        // Filter semua file unggahan yang merupakan bagian dari Komponen ini (berdasarkan awalan kode indikator)
        const berkasMilikKomponen = arrayBerkas.filter(berkas => {
            const awalan = berkas.id_indikator ? berkas.id_indikator.split('.')[0] : "";
            return awalan === komp.id;
        });

        // Hitung statistik progress internal komponen
        const jumlahTerisi = berkasMilikKomponen.length;
        const persentase = Math.min(Math.round((jumlahTerisi / komp.target) * 100), 100);

        // Buat elemen Kartu Induk Komponen (Gaya Glassmorphism Terang & Bersih)
        const kartuInduk = document.createElement("div");
        kartuInduk.style.cssText = `
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(226, 232, 240, 0.8);
            border-left: 6px solid ${komp.warna};
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.02);
        `;

        // Atur isi struktur header kartu komponen beserta progress bar-nya
        kartuInduk.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div>
                    <h3 style="margin: 0; font-size: 1.05rem; font-weight: bold; color: #1e293b;">Komponen ${komp.id}: ${komp.nama}</h3>
                    <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #64748b;">
                        Terpenuhi: <span style="color: ${komp.warna}; font-weight: bold;">${jumlahTerisi}</span> dari ${komp.target} Target Berkas
                    </p>
                </div>
                <span style="background: ${komp.warna}15; color: ${komp.warna}; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold;">
                    ${persentase}% Selesai
                </span>
            </div>

            <div style="width: 100%; background: #e2e8f0; height: 6px; border-radius: 10px; overflow: hidden; margin-bottom: 18px;">
                <div style="width: ${persentase}%; background: ${komp.warna}; height: 100%; transition: width 0.5s ease;"></div>
            </div>

            <div class="grid-sub-files" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
            </div>
        `;

        const gridSubFiles = kartuInduk.querySelector(".grid-sub-files");

        // Jika komponen ini belum diisi berkas sama sekali
        if (berkasMilikKomponen.length === 0) {
            gridSubFiles.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 14px; border: 1px dashed #cbd5e1; border-radius: 8px; color: #94a3b8; font-size: 0.8rem; font-style: italic;">
                    Belum ada berkas indikator yang diunggah untuk komponen ini.
                </div>
            `;
        } else {
            // Urutkan berkas di dalam komponen berdasarkan urutan kode indikatornya (misal: 1.1.1, 1.1.2)
            berkasMilikKomponen.sort((a, b) => a.id_indikator.localeCompare(b.id_indikator, undefined, { numeric: true }));

            // Gambar kartu berkas berlatar hijau solid (Konsisten dengan palet lama Anda)
            berkasMilikKomponen.forEach(data => {
                const subCard = document.createElement("div");
                subCard.style.cssText = `
                    background-color: #1b5e20; color: #ffffff; border: 1px solid #1b5e20;
                    border-radius: 8px; padding: 14px; display: flex; flex-direction: column; box-shadow: 0 3px 10px rgba(0,0,0,0.04);
                `;

                subCard.innerHTML = `
                    <div style="line-height: 1.5;">
                        <div style="font-size: 0.85rem; margin-bottom: 4px;">Kode: <strong style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace;">${data.id_indikator}</strong></div>
                        <div style="font-size: 0.95rem; font-weight: bold; margin-top: 6px; margin-bottom: 4px;">📌 ${data.nama_dokumen}</div>
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; opacity: 0.9; word-break: break-all; background: rgba(0,0,0,0.15); padding: 6px; border-radius: 4px; margin-bottom: 10px;">
                            📄 ${data.nama_file_asli || 'Berkas Dokumen'}
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px; margin-top: auto; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.2);">
                        <button type="button" class="btn-mini-lihat" style="background: #ffffff; color: #1b5e20; border: none; border-radius: 4px; padding: 6px; font-size: 0.75rem; font-weight: bold; flex: 1; cursor: pointer;">💻 Lihat</button>
                        <button type="button" class="btn-mini-unduh" style="background: #e0f2fe; color: #0369a1; border: none; border-radius: 4px; padding: 6px; font-size: 0.75rem; font-weight: bold; flex: 1; cursor: pointer;">📥 Download</button>
                        <button type="button" class="btn-mini-hapus" style="background: #ffe4e6; color: #9f1239; border: none; border-radius: 4px; padding: 6px; font-size: 0.75rem; font-weight: bold; flex: 1; cursor: pointer;">🗑️ Hapus</button>
                    </div>
                `;

                // Hubungkan ulang fungsi tombol aksi Base64 bawaan Anda
                subCard.querySelector(".btn-mini-lihat").addEventListener("click", () => window.pratinjauBerkasPDF(data.file_base64, data.tipe_file));
                subCard.querySelector(".btn-mini-unduh").addEventListener("click", () => window.unduhBerkasDariBase64(data.file_base64, data.nama_file_asli));
                subCard.querySelector(".btn-mini-hapus").addEventListener("click", () => window.tanganiHapus(data.id_indikator));

                gridSubFiles.appendChild(subCard);
            });
        }

        container.appendChild(kartuInduk);
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
