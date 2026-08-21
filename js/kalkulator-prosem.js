// ============================================
// KALKULATOR RPE & PROSEM - SIPELITA GURU
// ============================================

// Data ATP yang diinput user
let daftarATP = [];

// Data bulan semester ganjil
const BULAN_GANJIL = [
    { nama: 'Juli', minggu: 5, tidakEfektif: 3 },
    { nama: 'Agustus', minggu: 4, tidakEfektif: 0 },
    { nama: 'September', minggu: 5, tidakEfektif: 0 },
    { nama: 'Oktober', minggu: 4, tidakEfektif: 0 },
    { nama: 'Nopember', minggu: 4, tidakEfektif: 1 },
    { nama: 'Desember', minggu: 5, tidakEfektif: 5 }
];

// ============================================
// FUNGSI UTAMA
// ============================================

function generateSemua() {
    // Ambil data dari form
    const data = {
        satuanPendidikan: document.getElementById('satuanPendidikan').value,
        mapel: document.getElementById('mapel').value,
        faseKelas: document.getElementById('faseKelas').value,
        semester: document.getElementById('semester').value,
        tahunAjaran: document.getElementById('tahunAjaran').value,
        jpMingguan: parseInt(document.getElementById('jpMingguan').value),
        tglMulai: new Date(document.getElementById('tglMulai').value),
        tglSelesai: new Date(document.getElementById('tglSelesai').value),
        uraianTidakEfektif: parseUraianTidakEfektif(),
        daftarLibur: parseDaftarLibur()
    };

    if (data.tglMulai > data.tglSelesai) {
        alert('Tanggal mulai tidak boleh lebih besar dari tanggal selesai!');
        return;
    }

    // Update header dokumen
    updateDocHeaders(data);

    // Generate RPE Pekan
    generateRPEPekan(data);

    // Generate RHE Hari
    generateRHEHari(data);

    // Generate JHE Jam
    generateJHEJam(data);

    // Generate Prosem
    generateProsem(data);

    // Tampilkan hasil
    document.getElementById('hasilGenerate').style.display = 'block';
    
    // Scroll ke hasil
    document.getElementById('hasilGenerate').scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// PARSE INPUT
// ============================================

function parseUraianTidakEfektif() {
    const text = document.getElementById('uraianTidakEfektif').value;
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map(line => {
        const parts = line.split('|').map(p => p.trim());
        return {
            uraian: parts[0] || '',
            bulan: parts[1] || '',
            pekan: parseInt(parts[2]) || 0
        };
    });
}

function parseDaftarLibur() {
    const text = document.getElementById('daftarLibur').value;
    return text.split(',').map(d => d.trim()).filter(d => d.length === 10);
}

// ============================================
// UPDATE HEADER DOKUMEN
// ============================================

function updateDocHeaders(data) {
    const semesterLabel = data.semester.includes('GANJIL') ? 'GANJIL' : 'GENAP';
    const tglTtd = formatTanggalIndonesia(new Date());
    
    document.getElementById('docSubtitle1').textContent = `SEMESTER ${semesterLabel} TAHUN AJARAN ${data.tahunAjaran}`;
    document.getElementById('docSubtitle2').textContent = data.satuanPendidikan;
    document.getElementById('docSubtitle3').textContent = 'KABUPATEN BANTAENG';
    
    document.getElementById('rheSatuan').textContent = data.satuanPendidikan;
    document.getElementById('rheMapel').textContent = data.mapel;
    document.getElementById('rheTahun').textContent = data.tahunAjaran;
    document.getElementById('rheSemester').textContent = semesterLabel;
    
    document.getElementById('jheSatuan').textContent = data.satuanPendidikan;
    document.getElementById('jheMapel').textContent = data.mapel;
    document.getElementById('jheTahun').textContent = data.tahunAjaran;
    document.getElementById('jheKelas').textContent = data.faseKelas;
    
    document.getElementById('prosemSatuan').textContent = data.satuanPendidikan;
    document.getElementById('prosemMapel').textContent = data.mapel;
    document.getElementById('prosemKelas').textContent = data.faseKelas;
    document.getElementById('prosemSemester').textContent = data.semester;
    document.getElementById('prosemTahun').textContent = `TAHUN PELAJARAN ${data.tahunAjaran}`;
    
    document.getElementById('tglTtd').textContent = `Bantaeng, ${tglTtd}`;
    document.getElementById('tglTtd2').textContent = `Bantaeng, ${tglTtd}`;
    document.getElementById('tglTtd3').textContent = `Bantaeng, ${tglTtd}`;
    document.getElementById('tglTtd4').textContent = `Bantaeng, ${getBulanIndonesia(new Date())} ${new Date().getFullYear()}`;
}

// ============================================
// GENERATE RPE PEKAN
// ============================================

function generateRPEPekan(data) {
    const tbody = document.getElementById('rpePekanBody');
    const tfoot = document.getElementById('rpePekanFoot');
    tbody.innerHTML = '';
    tfoot.innerHTML = '';
    
    let totalMinggu = 0;
    let totalTidakEfektif = 0;
    let totalEfektifSekolah = 0;
    let totalEfektifBelajar = 0;
    
    BULAN_GANJIL.forEach((bulan, index) => {
        const efektifSekolah = bulan.minggu - bulan.tidakEfektif;
        const efektifBelajar = efektifSekolah; // Asumsi sama untuk simplicity
        
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${bulan.nama}</td>
                <td>${bulan.minggu}</td>
                <td>${bulan.tidakEfektif}</td>
                <td>${efektifSekolah}</td>
                <td>${efektifBelajar}</td>
            </tr>
        `;
        
        totalMinggu += bulan.minggu;
        totalTidakEfektif += bulan.tidakEfektif;
        totalEfektifSekolah += efektifSekolah;
        totalEfektifBelajar += efektifBelajar;
    });
    
    tfoot.innerHTML = `
        <tr>
            <td colspan="2">Jumlah</td>
            <td>${totalMinggu}</td>
            <td>${totalTidakEfektif}</td>
            <td>${totalEfektifSekolah}</td>
            <td>${totalEfektifBelajar}</td>
        </tr>
    `;
    
    // Uraian tidak efektif
    const uraianBody = document.getElementById('rpeUraianBody');
    const uraianFoot = document.getElementById('rpeUraianFoot');
    uraianBody.innerHTML = '';
    uraianFoot.innerHTML = '';
    
    let totalUraianPekan = 0;
    data.uraianTidakEfektif.forEach((item, index) => {
        uraianBody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.uraian}</td>
                <td>${item.bulan}</td>
                <td>${item.pekan}</td>
            </tr>
        `;
        totalUraianPekan += item.pekan;
    });
    
    uraianFoot.innerHTML = `
        <tr>
            <td colspan="3">Jumlah</td>
            <td>${totalUraianPekan}</td>
        </tr>
    `;
    
    // Summary
    document.getElementById('sumTotalPekan').textContent = totalMinggu;
    document.getElementById('sumPekanTidakEfektif').textContent = totalTidakEfektif;
    document.getElementById('sumPekanEfektif').textContent = totalEfektifBelajar;
    
    // Hitung hari efektif (asumsi 5 hari kerja per minggu efektif)
    const hariEfektif = totalEfektifBelajar * 5;
    const jamEfektif = hariEfektif * data.jpMingguan / 5; // JP per minggu * pekan efektif
    
    document.getElementById('sumHariEfektif').textContent = hariEfektif;
    document.getElementById('sumJamEfektif').textContent = Math.round(jamEfektif);
}

// ============================================
// GENERATE RHE HARI
// ============================================

function generateRHEHari(data) {
    const tbody = document.getElementById('rheBody');
    const tfoot = document.getElementById('rheFoot');
    tbody.innerHTML = '';
    tfoot.innerHTML = '';
    
    let totals = {
        minggu: 0, tidakEfektif: 0, efektif: 0,
        senin: { efektif: 0, non: 0, jml: 0 },
        selasa: { efektif: 0, non: 0, jml: 0 },
        rabu: { efektif: 0, non: 0, jml: 0 },
        kamis: { efektif: 0, non: 0, jml: 0 },
        jumat: { efektif: 0, non: 0, jml: 0 }
    };
    
    BULAN_GANJIL.forEach((bulan, index) => {
        const efektif = bulan.minggu - bulan.tidakEfektif;
        
        // Distribusi hari (asumsi Senin=0, Selasa=efektif, lainnya=0 untuk contoh)
        // Ini bisa disesuaikan dengan jadwal nyata
        const seninEfektif = 0;
        const selasaEfektif = efektif;
        const rabuEfektif = 0;
        const kamisEfektif = 0;
        const jumatEfektif = 0;
        
        const seninNon = bulan.minggu - seninEfektif;
        const selasaNon = bulan.minggu - selasaEfektif;
        const rabuNon = bulan.minggu - rabuEfektif;
        const kamisNon = bulan.minggu - kamisEfektif;
        const jumatNon = bulan.minggu - jumatEfektif;
        
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${bulan.nama}</td>
                <td>${bulan.minggu}</td>
                <td>${bulan.tidakEfektif}</td>
                <td>${efektif}</td>
                <td>${seninEfektif}</td><td>${seninNon}</td><td>${bulan.minggu}</td>
                <td>${selasaEfektif}</td><td>${selasaNon}</td><td>${bulan.minggu}</td>
                <td>${rabuEfektif}</td><td>${rabuNon}</td><td>${bulan.minggu}</td>
                <td>${kamisEfektif}</td><td>${kamisNon}</td><td>${bulan.minggu}</td>
                <td>${jumatEfektif}</td><td>${jumatNon}</td><td>${bulan.minggu}</td>
                <td>${efektif}</td><td>${bulan.tidakEfektif}</td><td>${bulan.minggu}</td>
                <td></td>
            </tr>
        `;
        
        totals.minggu += bulan.minggu;
        totals.tidakEfektif += bulan.tidakEfektif;
        totals.efektif += efektif;
        totals.senin.efektif += seninEfektif;
        totals.senin.non += seninNon;
        totals.senin.jml += bulan.minggu;
        totals.selasa.efektif += selasaEfektif;
        totals.selasa.non += selasaNon;
        totals.selasa.jml += bulan.minggu;
        totals.rabu.efektif += rabuEfektif;
        totals.rabu.non += rabuNon;
        totals.rabu.jml += bulan.minggu;
        totals.kamis.efektif += kamisEfektif;
        totals.kamis.non += kamisNon;
        totals.kamis.jml += bulan.minggu;
        totals.jumat.efektif += jumatEfektif;
        totals.jumat.non += jumatNon;
        totals.jumat.jml += bulan.minggu;
    });
    
    tfoot.innerHTML = `
        <tr>
            <td colspan="2">JUMLAH</td>
            <td>${totals.minggu}</td>
            <td>${totals.tidakEfektif}</td>
            <td>${totals.efektif}</td>
            <td>${totals.senin.efektif}</td><td>${totals.senin.non}</td><td>${totals.senin.jml}</td>
            <td>${totals.selasa.efektif}</td><td>${totals.selasa.non}</td><td>${totals.selasa.jml}</td>
            <td>${totals.rabu.efektif}</td><td>${totals.rabu.non}</td><td>${totals.rabu.jml}</td>
            <td>${totals.kamis.efektif}</td><td>${totals.kamis.non}</td><td>${totals.kamis.jml}</td>
            <td>${totals.jumat.efektif}</td><td>${totals.jumat.non}</td><td>${totals.jumat.jml}</td>
            <td>${totals.efektif}</td><td>${totals.tidakEfektif}</td><td>${totals.minggu}</td>
            <td></td>
        </tr>
    `;
}

// ============================================
// GENERATE JHE JAM
// ============================================

function generateJHEJam(data) {
    const tbody = document.getElementById('jheBody');
    const tfoot = document.getElementById('jheFoot');
    tbody.innerHTML = '';
    tfoot.innerHTML = '';
    
    let totals = { senin: 0, selasa: 0, rabu: 0, kamis: 0, jumat: 0, jumlah: 0 };
    
    BULAN_GANJIL.forEach(bulan => {
        const efektif = bulan.minggu - bulan.tidakEfektif;
        
        // Distribusi JP per hari (sesuaikan dengan jadwal nyata)
        const seninJP = 0;
        const selasaJP = efektif * data.jpMingguan;
        const rabuJP = 0;
        const kamisJP = 0;
        const jumatJP = 0;
        const jumlahJP = seninJP + selasaJP + rabuJP + kamisJP + jumatJP;
        
        tbody.innerHTML += `
            <tr>
                <td>GANJIL</td>
                <td>${bulan.nama}</td>
                <td>${seninJP}</td>
                <td>${selasaJP}</td>
                <td>${rabuJP}</td>
                <td>${kamisJP}</td>
                <td>${jumatJP}</td>
                <td>${jumlahJP}</td>
            </tr>
        `;
        
        totals.senin += seninJP;
        totals.selasa += selasaJP;
        totals.rabu += rabuJP;
        totals.kamis += kamisJP;
        totals.jumat += jumatJP;
        totals.jumlah += jumlahJP;
    });
    
    tfoot.innerHTML = `
        <tr>
            <td>JUMLAH</td>
            <td>JUMLAH</td>
            <td>${totals.senin}</td>
            <td>${totals.selasa}</td>
            <td>${totals.rabu}</td>
            <td>${totals.kamis}</td>
            <td>${totals.jumat}</td>
            <td>${totals.jumlah}</td>
        </tr>
    `;
    
    // Rincian jam
    const tatapMuka = totals.jumlah;
    const asesmenCount = 2;
    const asesmenJP = data.jpMingguan;
    const asesmenTotal = asesmenCount * asesmenJP;
    const totalJP = tatapMuka - asesmenTotal;
    
    document.getElementById('rincianTatapMuka').textContent = tatapMuka;
    document.getElementById('rincianAsesmenCount').textContent = asesmenCount;
    document.getElementById('rincianAsesmenJp').textContent = asesmenJP;
    document.getElementById('rincianAsesmenTotal').textContent = asesmenTotal;
    document.getElementById('rincianTotal').textContent = totalJP;
}

// ============================================
// GENERATE PROSEM
// ============================================

function generateProsem(data) {
    const tbody = document.getElementById('prosemBody');
    const tfoot = document.getElementById('prosemFoot');
    tbody.innerHTML = '';
    tfoot.innerHTML = '';
    
    if (daftarATP.length === 0) {
        tbody.innerHTML = '<tr><td colspan="30" style="text-align: center; padding: 20px;">Belum ada ATP/TP. Silakan tambah di form di atas.</td></tr>';
        return;
    }
    
    // Hitung total JP
    const totalJP = daftarATP.reduce((sum, atp) => sum + atp.jp, 0);
    
    // Distribusi JP ke minggu (Juli: 2 minggu efektif, Agustus: 4, September: 5, Oktober: 4, November: 3, Desember: 0)
    const mingguEfektif = [2, 4, 5, 4, 3, 0];
    const totalMingguEfektif = mingguEfektif.reduce((a, b) => a + b, 0);
    
    let sisaJP = totalJP;
    let rowNumber = 1;
    
    daftarATP.forEach((atp, index) => {
        const jpDistribusi = distributeJP(atp.jp, mingguEfektif);
        const persenTarget = ((atp.jp / totalJP) * 100).toFixed(0);
        
        tbody.innerHTML += `
            <tr>
                <td>${rowNumber++}</td>
                <td>${atp.no}</td>
                <td contenteditable="true">${atp.tp}</td>
                <td>${atp.jp}</td>
                ${jpDistribusi.juli.map(j => `<td>${j || ''}</td>`).join('')}
                ${jpDistribusi.agustus.map(j => `<td>${j || ''}</td>`).join('')}
                ${jpDistribusi.september.map(j => `<td>${j || ''}</td>`).join('')}
                ${jpDistribusi.oktober.map(j => `<td>${j || ''}</td>`).join('')}
                ${jpDistribusi.nopember.map(j => `<td>${j || ''}</td>`).join('')}
                ${jpDistribusi.desember.map(j => `<td>${j || ''}</td>`).join('')}
                <td>${persenTarget}%</td>
                <td contenteditable="true"></td>
            </tr>
        `;
    });
    
    // Row total
    tfoot.innerHTML = `
        <tr>
            <td colspan="3">TOTAL</td>
            <td>${totalJP}</td>
            <td colspan="25"></td>
            <td>100%</td>
            <td></td>
        </tr>
    `;
}

function distributeJP(totalJP, mingguEfektif) {
    const result = {
        juli: [null, null, null, null, null],
        agustus: [null, null, null, null],
        september: [null, null, null, null, null],
        oktober: [null, null, null, null],
        nopember: [null, null, null, null],
        desember: [null, null, null, null, null]
    };
    
    let sisa = totalJP;
    const bulanKeys = ['juli', 'agustus', 'september', 'oktober', 'nopember', 'desember'];
    
    bulanKeys.forEach((bulan, idx) => {
        const minggu = mingguEfektif[idx];
        if (minggu === 0) return;
        
        const jpPerBulan = Math.round((totalJP * minggu) / 18); // 18 = total pekan efektif
        const jpPerMinggu = Math.floor(jpPerBulan / minggu);
        let sisaBulan = jpPerBulan % minggu;
        
        for (let i = 0; i < minggu; i++) {
            result[bulan][i] = jpPerMinggu + (sisaBulan > 0 ? 1 : 0);
            if (sisaBulan > 0) sisaBulan--;
        }
    });
    
    return result;
}

// ============================================
// MANAJEMEN ATP
// ============================================

function tambahATP() {
    const no = document.getElementById('atpNo').value.trim();
    const tp = document.getElementById('atpTp').value.trim();
    const jp = parseInt(document.getElementById('atpJp').value);
    
    if (!no || !tp || !jp) {
        alert('Mohon lengkapi semua field ATP!');
        return;
    }
    
    daftarATP.push({ no, tp, jp });
    updateATPList();
    
    // Clear form
    document.getElementById('atpNo').value = '';
    document.getElementById('atpTp').value = '';
    document.getElementById('atpJp').value = '';
}

function hapusATP(index) {
    daftarATP.splice(index, 1);
    updateATPList();
}

function updateATPList() {
    const list = document.getElementById('atpList');
    list.innerHTML = '';
    
    daftarATP.forEach((atp, index) => {
        list.innerHTML += `
            <div class="atp-item">
                <span><strong>${atp.no}</strong> - ${atp.tp} (${atp.jp} JP)</span>
                <button onclick="hapusATP(${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
    });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTanggalIndonesia(date) {
    const bulan = getBulanIndonesia(date);
    return `${date.getDate()} ${bulan} ${date.getFullYear()}`;
}

function getBulanIndonesia(date) {
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                   'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return bulan[date.getMonth()];
}

// Expose functions to window
window.generateSemua = generateSemua;
window.tambahATP = tambahATP;
window.hapusATP = hapusATP;
