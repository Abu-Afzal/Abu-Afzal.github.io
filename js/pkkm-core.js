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

function muatGridKartuBawah() {
    const container = document.getElementById("containerKartuPkkm");
    if (!container) return;
    container.innerHTML = "";

    const kompAktif = MASTER_KOMPONEN.find(k => k.id === komponenTerpilihId);
    if (!kompAktif) return;

    // Filter berkas global agar hanya menampilkan data yang sesuai dengan komponen terpilih dan guru yang login
    const dataTerfilter = Object.values(dataBerkasGlobal).filter(berkas => {
        const matchesIndikator = kompAktif.indikator.includes(berkas.id_indikator);
        const matchesUser = emailGuruLogin ? (berkas.uploader_email === emailGuruLogin) : true;
        return matchesIndikator && matchesUser;
    });

    if (dataTerfilter.length === 0) {
        container.innerHTML = `<div class="status-empty-box">Belum ada bukti fisik yang diunggah untuk Komponen ${komponenTerpilihId}.</div>`;
        return;
    }

    // Palet warna estetik untuk kartu hasil upload
    const paletTema = [
        { bg: '#0f766e', teks: '#ffffff', border: '#0f766e', btnLihat: '#ffffff', btnLihatTeks: '#0f766e' },
        { bg: '#1e40af', teks: '#ffffff', border: '#1e40af', btnLihat: '#ffffff', btnLihatTeks: '#1e40af' },
        { bg: '#f8fafc', teks: '#1e293b', border: '#cbd5e1', btnLihat: '#e2e8f0', btnLihatTeks: '#334155' }
    ];

    dataTerfilter.forEach((data, index) => {
        const card = document.createElement("div");
        card.className = "pkkm-card-box";
        const tema = paletTema[index % paletTema.length];

        card.style.cssText = `
            background-color: ${tema.bg}; color: ${tema.teks}; border: 1px solid ${tema.border};
            border-radius: 12px; padding: 16px; display: flex; flex-direction: column;
        `;

        card.innerHTML = `
            <div style="line-height: 1.6;">
                <div style="font-size: 0.9rem; font-weight: bold; margin-bottom: 2px;">Kode Indikator: ${data.id_indikator}</div>
                <div style="font-size: 0.95rem; font-weight: bold; margin-bottom: 6px;">📌 ${data.nama_dokumen}</div>
                <div style="font-size: 0.8rem; opacity: 0.85; margin-bottom: 12px;">📁 Berkas: ${data.nama_file_asli || 'Dokumen'}</div>
            </div>
            <div style="display: flex; gap: 6px; margin-top: auto; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.2);">
                <button class="btn-action-mini btn-mini-lihat" style="background: ${tema.btnLihat}; color: ${tema.btnLihatTeks}; border-radius: 6px; padding: 6px; font-weight: bold; flex: 1;">💻 Lihat</button>
                <button class="btn-action-mini btn-mini-unduh" style="background: #e0f2fe; color: #0369a1; border-radius: 6px; padding: 6px; font-weight: bold; flex: 1;">ℹ️ Download</button>
                <button class="btn-action-mini btn-mini-hapus" style="background: #ffe4e6; color: #9f1239; border-radius: 6px; padding: 6px; font-weight: bold; flex: 1;">🗑️ Hapus</button>
            </div>
        `;

        card.querySelector(".btn-mini-lihat").addEventListener("click", () => pratinjauBerkasPDF(data.file_base64, data.tipe_file));
        card.querySelector(".btn-mini-unduh").addEventListener("click", () => unduhBerkasDariBase64(data.file_base64, data.nama_file_asli));
        card.querySelector(".btn-mini-hapus").addEventListener("click", () => tanganiHapus(data.id_indikator));

        container.appendChild(card);
    });
}

// ==========================================================================
// LOGIKA AKSI SIMPAN DATA KE FIRESTORE (AMAN DENGAN EMAIL USER LOGGED IN)
// ==========================================================================
async function tanganiProsesSimpan(e) {
    e.preventDefault();
    const btn = document.getElementById("btnSimpanPkkm");
    
    const idIndikator = document.getElementById("selectIndikator").value;
    const namaDokumen = document.getElementById("inputNamaDokumen").value;
    const fileFisik = document.getElementById("inputFilePkkm").files[0];

    if (!idIndikator || !namaDokumen || !fileFisik) {
        alert("Mohon lengkapi semua data form sebelum menyimpan!");
        return;
    }

    try {
        btn.disabled = true;
        btn.innerText = "⏳ Memproses Upload...";

        const kompAktif = MASTER_KOMPONEN.find(k => k.id === komponenTerpilihId);

        // 1. Jalankan upload ke database
        await uploadDokumenPKKM(idIndikator, fileFisik, {
            komponen: kompAktif ? kompAktif.nama : "Umum",
            namaDokumen: namaDokumen,
            uploader_email: emailGuruLogin || "publik@madrasah.id"
        });

        // 2. Alert dipindahkan setelah data lokal dipastikan sukses diperbarui
        try {
            dataBerkasGlobal = await ambilSemuaBerkasPKKM();
        } catch (errDb) {
            console.warn("Data tersimpan, namun gagal merefresh visual secara real-time:", errDb);
        }

        alert("Alhamdulillah, Dokumen Bukti Fisik Berhasil Disimpan!");
        document.getElementById("formUploadPkkm").reset();
        
        // 3. Render ulang tampilan bawah secara aman
        muatGridKartuBawah();

    } catch (err) {
        console.error(err);
        alert("Gagal menyimpan dokumen: " + err.message);
    } finally {
        // Mengembalikan status tombol agar tidak tertahan di "Memproses Upload..."
        btn.disabled = false;
        btn.innerText = "Simpan Dokumen PKKM";
    }
}
