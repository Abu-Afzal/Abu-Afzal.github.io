import { uploadDokumenPKKM, ambilSemuaBerkasPKKM, hapusDokumenPKKM } from './pkkm-db.js';

// Inisialisasi awal saat halaman dibuka
document.addEventListener("DOMContentLoaded", () => {
    muatTabelMonitoring();
    
    const form = document.getElementById("formUploadPkkm");
    if(form) {
        form.addEventListener("submit", tanganiProsesSimpan);
    }
});

// Proses Upload Berkas
async function tanganiProsesSimpan(e) {
    e.preventDefault();
    const btn = document.getElementById("btnSimpanPkkm");
    
    const idIndikator = document.getElementById("selectIndikator").value;
    const komponen = document.getElementById("inputKomponen").value;
    const namaDokumen = document.getElementById("inputNamaDokumen").value;
    const fileFisik = document.getElementById("inputFilePkkm").files[0];

    if (!fileFisik) return;

    // Batasi file agar tidak meledakkan kuota Firestore (Maksimal 1.5 MB)
    if (fileFisik.size > 1.5 * 1024 * 1024) {
        alert("Ukuran berkas terlalu besar! Kompres file Anda di bawah 1.5 MB.");
        return;
    }

    try {
        btn.disabled = true;
        btn.innerText = "⏳ Sedang Menyimpan Berkas...";

        await uploadDokumenPKKM(idIndikator, fileFisik, {
            komponen: komponen,
            namaDokumen: namaDokumen,
            user: "Guru Madrasah" 
        });

        alert("Alhamdulillah, berkas PKKM berhasil disimpan!");
        document.getElementById("formUploadPkkm").reset();
        muatTabelMonitoring(); // Refresh tabel otomatis

    } catch (err) {
        alert("Gagal menyimpan berkas: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "💾 Simpan Dokumen PKKM";
    }
}

// Membaca database dan membangun baris tabel secara dinamis
async function muatTabelMonitoring() {
    const tbody = document.getElementById("tabelBodyPkkm");
    if (!tbody) return;

    try {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Memuat berkas...</td></tr>';
        const masterBerkas = await ambilSemuaBerkasPKKM();
        tbody.innerHTML = "";

        if (Object.keys(masterBerkas).length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#7f8c8d;">Belum ada dokumen bukti fisik yang diupload.</td></tr>';
            return;
        }

        for (const key in masterBerkas) {
            const data = masterBerkas[key];
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td><strong>${data.id_indikator}</strong></td>
                <td><small>${data.komponen}</small></td>
                <td><span style="font-weight:600; color:#1a237e;">📄 ${data.nama_dokumen}</span></td>
                <td>
                    <div style="display:flex; gap:6px; justify-content:center;">
                        <button class="btn-sp btn-sp-success btn-view" style="padding:4px 8px; font-size:11px;">Lihat</button>
                        <button class="btn-sp btn-download" style="background:#1a237e; color:white; padding:4px 8px; font-size:11px;">Unduh</button>
                        <button class="btn-sp btn-hapus" style="background:#e74c3c; color:white; padding:4px 8px; font-size:11px;">Hapus</button>
                    </div>
                </td>
            `;

            // Pasang Event Listener Tombol Aksi secara Terisolasi
            tr.querySelector(".btn-view").addEventListener("click", () => pratinjauBerkasPDF(data.file_base64, data.tipe_file));
            tr.querySelector(".btn-download").addEventListener("click", () => unduhBerkasDariBase64(data.file_base64, data.nama_file_asli));
            tr.querySelector(".btn-hapus").addEventListener("click", () => tanganiHapus(data.id_indikator));

            tbody.appendChild(tr);
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Gagal memuat data monitoring.</td></tr>';
    }
}

// Fungsi Unduh/Download File fisik
function unduhBerkasDariBase64(stringBase64, namaFileAsli) {
    const link = document.createElement("a");
    link.href = stringBase64;
    link.download = namaFileAsli;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Fungsi Buka Pratinjau PDF di Tab Baru
function pratinjauBerkasPDF(stringBase64, tipeFile) {
    if (!tipeFile.includes("pdf")) {
        alert("Fitur 'Lihat' langsung hanya mendukung format PDF. Untuk Excel/Word silakan klik tombol 'Unduh'.");
        return;
    }
    const win = window.open();
    if (win) {
        win.document.write(`<iframe src="${stringBase64}" frameborder="0" style="border:0; width:100%; height:100%;" allowfullscreen></iframe>`);
    } else {
        alert("Pop-up diblokir oleh browser! Mohon izinkan pop-up.");
    }
}

// Fungsi Hapus Berkas
async function tanganiHapus(idIndikator) {
    if (!confirm(`Apakah Anda yakin ingin menghapus dokumen indikator ${idIndikator}?`)) return;
    try {
        await hapusDokumenPKKM(idIndikator);
        alert("Berkas berhasil dihapus dari sistem!");
        muatTabelMonitoring();
    } catch (err) {
        alert("Gagal menghapus berkas: " + err.message);
    }
}
