import { auth } from './firebase-config.js'; // Memastikan mengambil instance auth resmi Anda
import { uploadDokumenPKKM, ambilSemuaBerkasPKKM, hapusDokumenPKKM } from './pkkm-db.js';

// Konfigurasi Master Komponen Utama & Indikator Pendukungnya
const MASTER_KOMPONEN = [
    { id: "1", nama: "Usaha Pengembangan Madrasah", warna: "#0d9488", indikator: ["1.1.1", "1.1.2", "1.2.1"] },
    { id: "2", nama: "Pelaksanaan Tugas Manajerial", warna: "#2563eb", indikator: ["2.1.1", "2.1.2", "2.2.1"] },
    { id: "3", nama: "Pengembangan Kewirausahaan", warna: "#ea580c", indikator: ["3.1.1", "3.1.2"] },
    { id: "4", nama: "Supervisi Kepada Guru & GTK", warna: "#dc2626", indikator: ["4.1.1", "4.1.2"] }
];

let dataBerkasGlobal = {};
let komponenTerpilihId = null;
let emailGuruLogin = "";

document.addEventListener("DOMContentLoaded", () => {
    // KEAMANAN & DETEKSI ROLE: Membaca siapa yang sedang login
    auth.onAuthStateChanged((user) => {
        const badge = document.getElementById("pkkmRoleBadge");
        if (user) {
            emailGuruLogin = user.email;
            if (badge) badge.innerHTML = `🟢 Akun Aktif: <strong>${emailGuruLogin}</strong> (Guru/Staf)`;
            inisialisasiAplikasiPKKM();
        } else {
            if (badge) badge.innerHTML = `🔴 Anda Belum Login. Menampilkan Data Publik.`;
            inisialisasiAplikasiPKKM(); // Tetap jalan secara fallback/read-only jika diinginkan
        }
    });

    // Event handler tutup halaman detail
    const btnTutup = document.getElementById("btnTutupDetail");
    if(btnTutup) {
        btnTutup.addEventListener("click", () => {
            document.getElementById("sectionDetailKomponen").style.display = "none";
            document.getElementById("sectionDashboardUtama").style.display = "block";
            komponenTerpilihId = null;
        });
    }

    const form = document.getElementById("formUploadPkkm");
    if(form) {
        form.addEventListener("submit", tanganiProsesSimpan);
    }
});

async function inisialisasiAplikasiPKKM() {
    try {
        dataBerkasGlobal = await ambilSemuaBerkasPKKM();
        renderDashboardGlassmorphism();
    } catch (err) {
        console.error("Gagal inisialisasi modul PKKM:", err);
    }
}

// ==========================================================================
// RENDER 4 KARTU UTAMA GAYA GLASSMORPHISM + PROGRESS BAR
// ==========================================================================
function renderDashboardGlassmorphism() {
    const gridKontainer = document.getElementById("gridKomponenUtama");
    if (!gridKontainer) return;
    gridKontainer.innerHTML = "";

    MASTER_KOMPONEN.forEach(komp => {
        // Hitung berkas yang sudah di-upload khusus komponen ini dan khusus milik guru yang sedang login
        const jumlahTerisi = Object.values(dataBerkasGlobal).filter(berkas => {
            const matchesKomponen = komp.indikator.includes(berkas.id_indikator);
            // FILTER PRIVASI: Berkas harus cocok dengan email guru yang mengupload (sinkron dengan aturan SIPENA Anda)
            const matchesUser = emailGuruLogin ? (berkas.uploader_email === emailGuruLogin) : true;
            return matchesKomponen && matchesUser;
        }).length;

        const targetIdeal = komp.indikator.length;
        const persentase = Math.min(Math.round((jumlahTerisi / targetIdeal) * 100), 100);

        const cardKomp = document.createElement("div");
        cardKomp.className = "galeri-card"; // Menggunakan style glassmorphism bawaan dashboard Anda
        cardKomp.style.cssText = `
            background: rgba(255, 255, 255, 0.75);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            border-radius: 14px;
            padding: 20px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.04);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: all 0.3s ease;
        `;

        // Efek Hover Interaktif ala .galeri-card
        cardKomp.onmouseover = () => {
            cardKomp.style.transform = "translateY(-5px)";
            cardKomp.style.boxShadow = "0 12px 30px rgba(4, 120, 87, 0.15)";
            cardKomp.style.borderColor = komp.warna;
        };
        cardKomp.onmouseout = () => {
            cardKomp.style.transform = "translateY(0)";
            cardKomp.style.boxShadow = "0 8px 24px rgba(0,0,0,0.04)";
            cardKomp.style.borderColor = "rgba(255, 255, 255, 0.4)";
        };

        cardKomp.innerHTML = `
            <div>
                <span style="background: ${komp.warna}; color: white; font-size: 0.75rem; font-weight: bold; padding: 4px 10px; border-radius: 20px; display: inline-block; margin-bottom: 12px;">Komponen ${komp.id}</span>
                <h4 style="margin: 0; font-size: 1rem; color: #1e293b; font-weight: 600; line-height: 1.4;">${komp.nama}</h4>
            </div>
            
            <div style="margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #64748b; margin-bottom: 6px;">
                    <span>Berkas Mandiri: <strong>${jumlahTerisi}/${targetIdeal}</strong></span>
                    <strong style="color: ${komp.warna};">${persentase}%</strong>
                </div>
                <div style="width: 100%; background: #e2e8f0; height: 7px; border-radius: 10px; overflow: hidden;">
                    <div style="width: ${persentase}%; background: ${komp.warna}; height: 100%; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                </div>
            </div>
        `;

        // KETIKA KARTU DIKLIK: Buka detail form dan filter isinya!
        cardKomp.addEventListener("click", () => bukaDetailKomponen(komp));

        gridKontainer.appendChild(cardKomp);
    });
}

// ==========================================================================
// MASUK KE SELEKSI DETAIL INDIKATOR (PILIHAN DARI DASHBOARD)
// ==========================================================================
function bukaDetailKomponen(komp) {
    komponenTerpilihId = komp.id;
    
    // Tampilkan & sembunyikan section
    document.getElementById("sectionDashboardUtama").style.display = "none";
    document.getElementById("sectionDetailKomponen").style.display = "block";
    
    // Update judul halaman detail
    document.getElementById("txtJudulDetailKomponen").innerHTML = `📂 Mengelola: <strong>Komponen ${komp.id} — ${komp.nama}</strong>`;

    // Ambil dropdown indikator, bersihkan, lalu isi HANYA yang termasuk dalam komponen ini
    const selectIndikator = document.getElementById("selectIndikator");
    selectIndikator.innerHTML = '<option value="">-- Pilih Kode Indikator --</option>';
    
    komp.indikator.forEach(ind => {
        const opt = document.createElement("option");
        opt.value = ind;
        opt.innerText = `${ind} — Instrumen Pendukung Komponen ${komp.id}`;
        selectIndikator.appendChild(opt);
    });

    // Render daftar kartu monitoring berkas khusus milik komponen ini saja di bagian bawah
    muatGridKartuBawah();
}

// Contoh fungsi untuk menggambar/merender daftar indikator dan berkasnya di halaman aplikasi
function muatGridKartuBawah() {
    // Pastikan container visual di HTML Anda sudah disesuaikan namanya (misal: 'containerIndikator')
    const container = document.getElementById("containerIndikator") || document.getElementById("monitoring-container"); 
    if (!container) return;

    container.innerHTML = ""; // Bersihkan tampilan lama

    // Ambil komponen aktif saat ini berdasarkan pilihan user
    const komponenAktif = MASTER_KOMPONEN.find(k => k.id === komponenTerpilihId);
    if (!komponenAktif || !komponenAktif.indikator) {
        container.innerHTML = "<p style='color: white; text-align: center;'>Pilih komponen terlebih dahulu untuk melihat indikator.</p>";
        return;
    }

    // Looping semua daftar indikator (misal: ["1.1.1", "1.1.2"])
    komponenAktif.indikator.forEach(idIndikator => {
        // COCOKKAN DATA: Cek apakah ID Indikator ini memiliki berkas di dalam database global kita
        // dataBerkasGlobal didapat dari hasil: dataBerkasGlobal = await ambilSemuaBerkasPKKM();
        const berkasTerunggah = dataBerkasGlobal && dataBerkasGlobal[idIndikator];

        const kartuIndikator = document.createElement("div");
        kartuIndikator.className = "card-indikator"; // Gunakan kelas CSS Anda
        kartuIndikator.style.cssText = "background: rgba(255,255,255,0.9); padding: 20px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);";

        if (berkasTerunggah) {
            // JIKA ADA FILE: Tampilkan detail nama dokumen dan tombol download/lihat
            kartuIndikator.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <span style="background: ${komponenAktif.warna || '#115e59'}; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">${idIndikator}</span>
                        <strong style="margin-left: 10px; color: #1e293b;">${berkasTerunggah.nama_dokumen || 'Dokumen Bukti Fisik'}</strong>
                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 5px;">📄 File: ${berkasTerunggah.nama_file_asli} (${berkasTerunggah.tipe_file.split('/')[1].toUpperCase()})</div>
                    </div>
                    <div>
                        <button onclick="bukaPreviewBerkas('${idIndikator}')" style="background: #0f766e; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">👁️ Lihat Berkas</button>
                        <button onclick="prosesHapusBerkas('${idIndikator}')" style="background: #dc2626; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; margin-left: 5px;">🗑️</button>
                    </div>
                </div>
            `;
        } else {
            // JIKA BELUM ADA FILE: Tampilkan status kosong agar guru bisa tahu indikator mana yang belum diisi
            kartuIndikator.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="background: #64748b; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">${idIndikator}</span>
                        <span style="margin-left: 10px; color: #64748b; font-style: italic;">Belum ada bukti fisik yang diunggah untuk indikator ini.</span>
                    </div>
                    <span style="font-size: 0.85rem; color: #94a3b8; font-weight: 600;">⚠️ Kosong</span>
                </div>
            `;
        }

        container.appendChild(kartuIndikator);
    });
}

// Tambahkan fungsi preview global agar file Base64 bisa dibuka langsung di tab baru browser
window.bukaPreviewBerkas = function(idIndikator) {
    const berkas = dataBerkasGlobal[idIndikator];
    if (!berkas || !berkas.file_base64) {
        alert("Berkas gagal dimuat!");
        return;
    }
    const win = window.open();
    win.document.write(`<iframe src="${berkas.file_base64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
};
// ==========================================================================
// LOGIKA AKSI SIMPAN DATA KE FIRESTORE (AMAN DENGAN EMAIL USER LOGGED IN)
// ==========================================================================
async function tanganiProsesSimpan(e) {
    e.preventDefault();
    const btn = document.getElementById("btnSimpanPkkm");
    
    const idIndikator = document.getElementById("selectIndikator").value;
    const namaDokumen = document.getElementById("inputNamaDokumen").value;
    const fileFisik = document.getElementById("inputFilePkkm").files[0];

    if (!idIndikator || !namaDokumen || !fileFisik) return;

    try {
        btn.disabled = true;
        btn.innerText = "⏳ Memproses Upload...";

        const kompAktif = MASTER_KOMPONEN.find(k => k.id === komponenTerpilihId);

        // Upload berkas dengan menyertakan metadata email guru agar bisa diisolasi privat
        await uploadDokumenPKKM(idIndikator, fileFisik, {
            komponen: kompAktif ? kompAktif.nama : "Umum",
            namaDokumen: namaDokumen,
            uploader_email: emailGuruLogin || "publik@madrasah.id"
        });

        alert("Alhamdulillah, Dokumen Bukti Fisik Berhasil Disimpan!");
        document.getElementById("formUploadPkkm").reset();
        
        // Perbarui data lokal dan render ulang komponen agar progress bar langsung naik otomatis
        dataBerkasGlobal = await ambilSemuaBerkasPKKM();
        muatGridKartuBawah();

    } catch (err) {
        alert("Gagal menyimpan dokumen: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Simpan Dokumen PKKM";
    }
}

// ==========================================================================
// UTILITY: HANDLER AKSI FILE
// ==========================================================================
function unduhBerkasDariBase64(stringBase64, namaFileAsli) {
    const link = document.createElement("a");
    link.href = stringBase64;
    link.download = namaFileAsli;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function pratinjauBerkasPDF(stringBase64, tipeFile) {
    if (!tipeFile || !tipeFile.includes("pdf")) {
        alert("Pratinjau langsung hanya mendukung PDF. Ekstensi lain otomatis terunduh.");
        return;
    }
    const win = window.open();
    if (win) {
        win.document.write(`<iframe src="${stringBase64}" frameborder="0" style="border:0; width:100%; height:100%;" allowfullscreen></iframe>`);
    }
}

async function tanganiHapus(idIndikator) {
    if (!confirm(`Hapus berkas pada indikator ${idIndikator}?`)) return;
    try {
        await hapusDokumenPKKM(idIndikator);
        alert("Berkas berhasil dihapus!");
        dataBerkasGlobal = await ambilSemuaBerkasPKKM();
        muatGridKartuBawah();
    } catch (err) {
        alert("Gagal menghapus: " + err.message);
    }
}
