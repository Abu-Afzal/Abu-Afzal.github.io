import { uploadDokumenPKKM, ambilSemuaBerkasPKKM, hapusDokumenPKKM } from './pkkm-db.js';

document.addEventListener("DOMContentLoaded", () => {
    muatKartuMonitoring();
    
    const form = document.getElementById("formUploadPkkm");
    if(form) {
        form.addEventListener("submit", tanganiProsesSimpan);
    }
});

async function tanganiProsesSimpan(e) {
    e.preventDefault();
    const btn = document.getElementById("btnSimpanPkkm");
    
    const idIndikator = document.getElementById("selectIndikator").value;
    const komponen = document.getElementById("inputKomponen").value;
    const namaDokumen = document.getElementById("inputNamaDokumen").value;
    const fileFisik = document.getElementById("inputFilePkkm").files[0];

    if (!fileFisik) return;

    if (fileFisik.size > 1.0 * 1024 * 1024) {
        alert("Ukuran berkas melebihi batas 1 MB! Mohon kompres terlebih dahulu.");
        return;
    }

    try {
        btn.disabled = true;
        btn.innerText = "Memproses Penyimpanan...";

        await uploadDokumenPKKM(idIndikator, fileFisik, {
            komponen: komponen,
            namaDokumen: namaDokumen,
            user: "Guru Madrasah"
        });

        alert("Dokumen PKKM Berhasil Disimpan!");
        document.getElementById("formUploadPkkm").reset();
        muatKartuMonitoring();

    } catch (err) {
        alert("Gagal menyimpan dokumen: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Simpan Dokumen";
    }
}

async function muatKartuMonitoring() {
    const container = document.getElementById("containerKartuPkkm");
    if (!container) return;

    try {
        container.innerHTML = '<div class="status-empty-box">Memuat data dokumen...</div>';
        const masterBerkas = await ambilSemuaBerkasPKKM();
        container.innerHTML = "";

        if (!masterBerkas || Object.keys(masterBerkas).length === 0) {
            container.innerHTML = '<div class="status-empty-box">Belum ada dokumen yang disimpan untuk PKKM.</div>';
            return;
        }

        for (const key in masterBerkas) {
            const data = masterBerkas[key];
            const card = document.createElement("div");
            card.className = "pkkm-card-box";

            // Format tanggal lokal sederhana
            const tglSaja = data.uploadedAt ? data.uploadedAt.substring(0, 10) : "-";

            card.innerHTML = `
                <div>
                    <h3 style="font-size: 1.1rem; color: #1e293b; margin: 0;">${data.nama_dokumen}</h3>
                    <div class="pkkm-card-meta">
                        <span>📁 Indikator: <strong>${data.id_indikator}</strong></span>
                        <span>📝 Keterangan: ${data.komponen}</span>
                        <span>📅 Tanggal: ${tglSaja}</span>
                    </div>
                </div>
                <div class="pkkm-card-action">
                    <button class="btn-action-mini btn-mini-lihat">🖥️ Lihat</button>
                    <button class="btn-action-mini btn-mini-unduh">⬇️ Unduh</button>
                    <button class="btn-action-mini btn-mini-hapus">🗑️ Hapus</button>
                </div>
            `;

            // Hubungkan fungsi klik tombol aksi
            card.querySelector(".btn-mini-lihat").addEventListener("click", () => pratinjauBerkasPDF(data.file_base64, data.tipe_file));
            card.querySelector(".btn-mini-unduh").addEventListener("click", () => unduhBerkasDariBase64(data.file_base64, data.nama_file_asli));
            card.querySelector(".btn-mini-hapus").addEventListener("click", () => tanganiHapus(data.id_indikator));

            container.appendChild(card);
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="status-empty-box" style="color:red; border-color:red;">Gagal memuat koneksi database Firestore. Pastikan aturan Read/Write Firestore Anda sudah diaktifkan.</div>';
    }
}

function unduhBerkasDariBase64(stringBase64, namaFileAsli) {
    const link = document.createElement("a");
    link.href = stringBase64;
    link.download = namaFileAsli;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function pratinjauBerkasPDF(stringBase64, tipeFile) {
    if (!tipeFile.includes("pdf")) {
        alert("Pratinjau langsung hanya mendukung PDF. File Excel/Word otomatis terunduh saat Anda klik 'Unduh'.");
        return;
    }
    const win = window.open();
    if (win) {
        win.document.write(`<iframe src="${stringBase64}" frameborder="0" style="border:0; width:100%; height:100%;" allowfullscreen></iframe>`);
    } else {
        alert("Pop-up diblokir! Izinkan pop-up pada pengaturan browser Anda.");
    }
}

async function tanganiHapus(idIndikator) {
    if (!confirm(`Hapus berkas pada indikator ${idIndikator}?`)) return;
    try {
        await hapusDokumenPKKM(idIndikator);
        alert("Berkas berhasil dihapus!");
        muatKartuMonitoring();
    } catch (err) {
        alert("Gagal menghapus: " + err.message);
    }
}
