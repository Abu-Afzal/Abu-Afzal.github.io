// ==========================================================================
// KODE UTUH REVISI: pkkm-core.js
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
 * 4. RENDER DASHBOARD PROGRESS BAR (Mendukung Multi Komponen 4 hingga 6 secara Dinamis)
 */
function hitungDanRenderDashboard(masterBerkas) {
    const gridKontainer = document.getElementById("gridKomponenUtama");
    if (!gridKontainer) return;
    gridKontainer.innerHTML = "";

    // REVISI SUPER DINAMIS: Membuat counter otomatis mengikuti jumlah komponen di Firestore
    const counterKoleksi = {};
    MASTER_KOMPONEN.forEach(komp => {
        counterKoleksi[komp.id] = 0;
    });

    // Hitung berkas yang ada di database berdasarkan kode depan indikator
    for (const key in masterBerkas) {
        const data = masterBerkas[key];
        const awalan = data.id_indikator ? data.id_indikator.split('.')[0] : "";
        if (counterKoleksi[awalan] !== undefined) {
            counterKoleksi[awalan]++;
        }
    }

    // Menggambar Kartu Glassmorphism mengikuti gaya .galeri-card Anda
    MASTER_KOMPONEN.forEach(komp => {
        const jumlahTerisi = counterKoleksi[komp.id] || 0;
        const persentase = Math.min(Math.round((jumlahTerisi / komp.target) * 100), 100);

        const cardKomp = document.createElement("div");
        cardKomp.className = "galeri-card"; // Menyelaraskan dengan CSS Glassmorphism milik Anda
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
 * 5. PROSES SIMPAN AMAN (REVISI: Integrasi Objek Base64 yang Benar untuk Firestore)
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

        // 1. Jalankan pembacaan file fisik menjadi String Base64
        const reader = new FileReader();
        reader.readAsDataURL(fileFisik);
        
        reader.onload = async function () {
            const base64String = reader.result;

            // 2. Susun payload JSON murni yang sesuai dengan kebutuhan fungsi muatKartuMonitoring()
            const payloadData = {
                id_indikator: idIndikator,
                komponen: komponen,
                nama_dokumen: namaDokumen,
                nama_file_asli: fileFisik.name,
                tipe_file: fileFisik.type,
                file_base64: base64String, // String Base64 disimpan di sini
                uploader_email: "Guru/Staf Madrasah",
                waktu_upload: new Date().toISOString()
            };

            try {
                // 3. Kirim ke fungsi db layer hanya membawa 2 parameter utama
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
 * 6. RENDER KARTU BUKTI FISIK BERWARNA
 */
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

        card.style.cssText = `
            background-color: ${tema.bg}; color: ${tema.teks}; border: 1px solid ${tema.border};
            border-radius: 12px; padding: 16px; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        `;

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

        card.querySelector(".btn-mini-lihat").addEventListener("click", () => window.pratinjauBerkasPDF(data.file_base64, data.tipe_file));
        card.querySelector(".btn-mini-unduh").addEventListener("click", () => window.unduhBerkasDariBase64(data.file_base64, data.nama_file_asli));
        card.querySelector(".btn-mini-hapus").addEventListener("click", () => window.tanganiHapus(data.id_indikator));

        container.appendChild(card);
    }
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
