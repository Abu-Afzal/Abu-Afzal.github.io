async function tanganiProsesSimpan(e) {
    e.preventDefault(); // Mencegah reload halaman
    
    const btn = document.getElementById("btnSimpanPkkm");
    
    // 1. Ambil elemen secara presisi
    const elIndikator = document.getElementById("selectIndikator");
    const elKomponen = document.getElementById("inputKomponen");
    const elNamaDokumen = document.getElementById("inputNamaDokumen");
    const elFile = document.getElementById("inputFilePkkm");

    // Validasi double-check memastikan elemen ada di HTML
    if (!elIndikator || !elKomponen || !elNamaDokumen || !elFile) {
        alert("Error: Ada elemen form yang tidak ditemukan di HTML. Mohon periksa kembali id input Anda.");
        return;
    }

    const idIndikator = elIndikator.value;
    const komponen = elKomponen.value;
    const namaDokumen = elNamaDokumen.value;
    const fileFisik = elFile.files[0];

    // Jika file belum dipilih, hentikan proses
    if (!fileFisik) {
        alert("Mohon pilih file berkas terlebih dahulu!");
        return;
    }

    // Batasi ukuran file (Maksimal 1 MB)
    if (fileFisik.size > 1.0 * 1024 * 1024) {
        alert("Ukuran berkas melebihi batas 1 MB! Mohon kompres file Anda terlebih dahulu.");
        return;
    }

    try {
        // Kunci tombol agar tidak diklik dua kali saat proses upload
        btn.disabled = true;
        btn.innerText = "⏳ Memproses Penyimpanan...";

        // Kirim data ke fungsi database di pkkm-db.js
        await uploadDokumenPKKM(idIndikator, fileFisik, {
            komponen: komponen,
            namaDokumen: namaDokumen,
            user: "Guru/Staf Madrasah"
        });

        // JIKA SUKSES BERHASIL: Baru jalankan alert dan reset form
        alert("Alhamdulillah, Dokumen PKKM Berhasil Disimpan!");
        document.getElementById("formUploadPkkm").reset();
        
        // Refresh dashboard dan kartu di bawahnya
        if (typeof muatAplikasiPKKM === "function") {
            muatAplikasiPKKM();
        } else {
            location.reload(); // Opsi aman jika fungsi muat belum siap
        }

    } catch (err) {
        // JIKA GAGAL: Tampilkan error spesifik dan JANGAN reset form agar isian guru tidak hilang
        console.error("Error detail saat simpan:", err);
        alert("Gagal menyimpan dokumen. Pesan Error: " + err.message);
    } finally {
        // Kembalikan status tombol
        btn.disabled = false;
        btn.innerText = "Simpan Dokumen PKKM";
    }
}
