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

        // Definisi Palet Warna Premium Sesuai Tema E-Dokumen di Gambar
        const paletTema = [
            { bg: '#1b5e20', teks: '#ffffff', border: '#1b5e20', btnLihat: '#ffffff', btnLihatTeks: '#1b5e20' }, // Hijau Tua
            { bg: '#2e7d32', teks: '#ffffff', border: '#2e7d32', btnLihat: '#ffffff', btnLihatTeks: '#2e7d32' }, // Hijau Daun
            { bg: '#e3f2fd', teks: '#1e293b', border: '#bbdefb', btnLihat: '#f1f5f9', btnLihatTeks: '#334155' }, // Biru Elegan
            { bg: '#f0fdf4', teks: '#1e293b', border: '#bbf7d0', btnLihat: '#f1f5f9', btnLihatTeks: '#334155' }  // Hijau Soft
        ];

        let index = 0;
        for (const key in masterBerkas) {
            const data = masterBerkas[key];
            const card = document.createElement("div");
            card.className = "pkkm-card-box";
            
            // Pilih tema warna secara bergantian otomatis
            const tema = paletTema[index % paletTema.length];
            index++;

            // Menerapkan gaya visual persis seperti screenshot (50).jpg
            card.style.backgroundColor = tema.bg;
            card.style.color = tema.teks;
            card.style.borderColor = tema.border;
            card.style.borderRadius = '12px';
            card.style.padding = '16px';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justify = 'space-between';

            card.innerHTML = `
                <div style="line-height: 1.6;">
                    <div style="font-size: 0.95rem; margin-bottom: 4px;">Kode: ${data.id_indikator}</div>
                    <div style="font-size: 0.95rem; margin-bottom: 8px;">Komponen: ${data.komponen}</div>
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 0.95rem; margin-bottom: 12px;">
                        📂 Nama Dokumen Terupload <span style="color: #e11d48; font-size: 1.1rem;">📄</span>
                    </div>
                </div>
                
                <div style="display: flex; gap: 8px; margin-top: auto; padding-top: 10px;">
                    <button class="btn-action-mini btn-mini-lihat" style="background: ${tema.btnLihat}; color: ${tema.btnLihatTeks}; border-radius: 6px; padding: 8px; font-weight: bold; flex: 1;">💻 Lihat</button>
                    <button class="btn-action-mini btn-mini-unduh" style="background: #e0f2fe; color: #0369a1; border-radius: 6px; padding: 8px; font-weight: bold; flex: 1;">ℹ️ Download</button>
                    <button class="btn-action-mini btn-mini-hapus" style="background: #ffe4e6; color: #9f1239; border-radius: 6px; padding: 8px; font-weight: bold; flex: 1;">🗑️ Hapus</button>
                </div>
            `;

            // Pasang logika penangan event klik
            card.querySelector(".btn-mini-lihat").addEventListener("click", () => pratinjauBerkasPDF(data.file_base64, data.tipe_file));
            card.querySelector(".btn-mini-unduh").addEventListener("click", () => unduhBerkasDariBase64(data.file_base64, data.nama_file_asli));
            card.querySelector(".btn-mini-hapus").addEventListener("click", () => tanganiHapus(data.id_indikator));

            container.appendChild(card);
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="status-empty-box" style="color:red;">Gagal memuat pangkalan data dokumen PKKM.</div>';
    }
}
