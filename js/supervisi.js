// ══════════════════════════════════════════════
// DOWNLOAD PDF — OPTIMIZED 1 HALAMAN A4
// Ganti fungsi window.downloadPDF yang lama
// dengan kode ini di supervisi.js
// ══════════════════════════════════════════════

window.downloadPDF = async function(docId) {
  try {
    const id = docId || currentSupervision?.id;
    const snap = await db.collection('supervisions').doc(id).get();
    if (!snap.exists) { alert('Data tidak ditemukan'); return; }

    const data = snap.data();
    let components = [];
    if (data.instrumentId) {
      const instSnap = await db.collection('supervision_instruments').doc(data.instrumentId).get();
      if (instSnap.exists) components = instSnap.data().components;
    }

    if (!window.jspdf) { alert('Library PDF sedang dimuat. Silakan coba lagi.'); return; }

    const { jsPDF } = window.jspdf;
    // A4 Portrait
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth  = pdf.internal.pageSize.getWidth();  // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 10;
    let y = 10;

    // ── HEADER ──
    pdf.setFontSize(11); pdf.setFont(undefined, 'bold');
    pdf.text('HASIL SUPERVISI PEMBELAJARAN', pageWidth / 2, y, { align: 'center' });
    y += 5;
    pdf.setFontSize(8); pdf.setFont(undefined, 'normal');
    pdf.text('KURIKULUM BERBASIS CINTA (KBC) — MAN BANTAENG', pageWidth / 2, y, { align: 'center' });
    y += 6;

    // ── INFO SESI (2 kolom) ──
    const date = new Date(data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt);
    const col1 = margin;
    const col2 = pageWidth / 2 + 3;
    const infoFontSize = 7.5;

    pdf.setFontSize(infoFontSize); pdf.setFont(undefined, 'normal');
    const infoLeft = [
      ['Nama Madrasah',        data.schoolName || 'MAN Bantaeng'],
      ['Guru yang Disupervisi', data.superviseeName || '-'],
      ['Mata Pelajaran',       data.subject || '-'],
      ['Kelas/Semester',       data.classSemester || '-'],
    ];
    const infoRight = [
      ['Tanggal',           date.toLocaleDateString('id-ID')],
      ['Supervisor',        data.supervisorName || '-'],
      ['Instrumen',         data.instrumentName || '-'],
      ['Jml Jam Tatap Muka', data.meetingHours || '-'],
    ];

    const infoStartY = y;
    infoLeft.forEach((row, i) => {
      pdf.setFont(undefined, 'bold');
      pdf.text(row[0], col1, y + i * 4);
      pdf.setFont(undefined, 'normal');
      pdf.text(': ' + row[1], col1 + 40, y + i * 4);
    });
    infoRight.forEach((row, i) => {
      pdf.setFont(undefined, 'bold');
      pdf.text(row[0], col2, infoStartY + i * 4);
      pdf.setFont(undefined, 'normal');
      pdf.text(': ' + row[1], col2 + 36, infoStartY + i * 4);
    });
    y += 4 * 4 + 4;

    // ── TABEL PENILAIAN ──
    if (components.length > 0) {
      const signatureHeight = 30;
      const footerHeight    = data.notes ? 16 : 10;
      const availableHeight = pageHeight - y - footerHeight - signatureHeight - margin;
      const numRows         = components.length;
      const headerHeight    = 8;
      const footerRowsH     = 18; // 3 baris footer
      const rowHeight = Math.min(
        6.5,
        Math.max(4.5, (availableHeight - headerHeight - footerRowsH) / numRows)
      );

      // Lebar kolom — portrait lebih sempit, komponen diberi ruang lebih
      const colNo    = 7;
      const colSkor  = 11;
      const colCheck = 9;
      const colKomp  = pageWidth - 2 * margin - colNo - 4 * colCheck - colSkor;
      const colWidths = [colNo, colKomp, colCheck, colCheck, colCheck, colCheck, colSkor];
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);

      const colX = [];
      let cx = margin;
      colWidths.forEach(w => { colX.push(cx); cx += w; });

      const fontSize = Math.min(7, rowHeight * 0.88);
      pdf.setFontSize(fontSize);

      // Header baris 1
      pdf.setFillColor(76, 175, 80); pdf.setTextColor(255, 255, 255);
      pdf.rect(margin, y, tableWidth, headerHeight / 2, 'FD');
      pdf.setFont(undefined, 'bold');
      pdf.text('No',        colX[0] + colWidths[0] / 2, y + 3, { align: 'center' });
      pdf.text('Komponen',  colX[1] + colWidths[1] / 2, y + 3, { align: 'center' });
      pdf.text('Skor Nilai',colX[2] + (colWidths[2]+colWidths[3]+colWidths[4]+colWidths[5])/2, y + 3, { align: 'center' });
      pdf.text('Skor',      colX[6] + colWidths[6] / 2, y + 3, { align: 'center' });
      y += headerHeight / 2;

      // Header baris 2 (angka 1-4)
      pdf.setFillColor(129, 199, 132); pdf.setTextColor(0, 0, 0);
      pdf.rect(margin, y, tableWidth, headerHeight / 2, 'FD');
      ['1','2','3','4'].forEach((lbl, i) => {
        pdf.text(lbl, colX[2+i] + colWidths[2+i] / 2, y + 3, { align: 'center' });
      });
      y += headerHeight / 2;

      // Baris data
      pdf.setFont(undefined, 'normal');
      components.forEach((comp, index) => {
        const score = data.scores[`comp_${index}`] || 0;

        if (index % 2 === 0) {
          pdf.setFillColor(232, 245, 233);
          pdf.rect(margin, y, tableWidth, rowHeight, 'F');
        }

        pdf.setDrawColor(180, 180, 180); pdf.setLineWidth(0.15);
        pdf.rect(margin, y, tableWidth, rowHeight, 'S');

        const textY = y + rowHeight / 2 + fontSize * 0.35;

        pdf.setTextColor(0, 0, 0);
        pdf.text(String(index + 1), colX[0] + colWidths[0] / 2, textY, { align: 'center' });

        // Komponen — truncate
        const compLines = pdf.splitTextToSize(comp.name, colWidths[1] - 2);
        const maxLines  = Math.max(1, Math.floor(rowHeight / (fontSize * 0.45)));
        pdf.text(compLines.slice(0, maxLines), colX[1] + 1, y + fontSize * 0.9);

        // Checkbox 1-4
        const boxSize = Math.min(3, rowHeight * 0.5);
        [0,1,2,3].forEach(i => {
          const bx = colX[2+i] + colWidths[2+i] / 2 - boxSize / 2;
          const by = y + rowHeight / 2 - boxSize / 2;
          if (score === i + 1) {
            pdf.setFillColor(76, 175, 80);
            pdf.rect(bx, by, boxSize, boxSize, 'FD');
            pdf.setDrawColor(255,255,255); pdf.setLineWidth(0.5);
            pdf.line(bx+0.4, by+boxSize*0.55, bx+boxSize*0.4, by+boxSize*0.85);
            pdf.line(bx+boxSize*0.4, by+boxSize*0.85, bx+boxSize-0.4, by+boxSize*0.2);
            pdf.setDrawColor(180,180,180); pdf.setLineWidth(0.15);
          } else {
            pdf.setFillColor(255,255,255);
            pdf.rect(bx, by, boxSize, boxSize, 'FD');
          }
        });

        pdf.setTextColor(0,0,0); pdf.setFont(undefined,'bold');
        pdf.text(`${score}/4`, colX[6]+colWidths[6]/2, textY, { align: 'center' });
        pdf.setFont(undefined,'normal');

        y += rowHeight;
      });

      // Footer rows
      const count1 = Object.values(data.scores).filter(s=>s===1).length;
      const count2 = Object.values(data.scores).filter(s=>s===2).length;
      const count3 = Object.values(data.scores).filter(s=>s===3).length;
      const count4 = Object.values(data.scores).filter(s=>s===4).length;
      const footRowH = 5.5;

      // Jumlah
      pdf.setFillColor(200,230,201); pdf.setFont(undefined,'bold');
      pdf.rect(margin, y, tableWidth, footRowH, 'FD');
      pdf.setTextColor(0,0,0);
      pdf.text('Jumlah', colX[1]+colWidths[1]-2, y+3.5, { align:'right' });
      [count1,count2,count3,count4].forEach((c,i)=>{
        pdf.text(String(c), colX[2+i]+colWidths[2+i]/2, y+3.5, { align:'center' });
      });
      pdf.text(`${data.totalScore}/${data.maxScore}`, colX[6]+colWidths[6]/2, y+3.5, { align:'center' });
      y += footRowH;

      // % Capaian
      pdf.setFillColor(165,214,167);
      pdf.rect(margin, y, tableWidth, footRowH, 'FD');
      pdf.text('Persentase Capaian', colX[1]+colWidths[1]-2, y+3.5, { align:'right' });
      pdf.text(`${data.percentage}%`, colX[2]+2, y+3.5);
      y += footRowH;

      // Predikat
      pdf.setFillColor(76,175,80); pdf.setTextColor(255,255,255);
      pdf.rect(margin, y, tableWidth, footRowH, 'FD');
      pdf.text('Predikat', colX[1]+colWidths[1]-2, y+3.5, { align:'right' });
      pdf.text(data.predicate||'-', colX[2]+2, y+3.5);
      y += footRowH + 3;

      // Keterangan 1 baris
      pdf.setTextColor(0,0,0); pdf.setFont(undefined,'normal'); pdf.setFontSize(6.5);
      pdf.text('Ket: • 91-100%=Sangat Baik  • 81-90%=Baik  • 71-80%=Cukup  • <70%=Kurang', margin, y);
      y += 4;
    }

    // Catatan khusus (singkat)
    if (data.notes) {
      pdf.setFontSize(7.5); pdf.setFont(undefined, 'bold');
      pdf.text('Catatan Khusus Hasil Supervisi:', margin, y); y += 3.5;
      pdf.setFont(undefined, 'normal');
      const noteLines = pdf.splitTextToSize(data.notes, pageWidth - 2 * margin);
      pdf.text(noteLines.slice(0, 2), margin, y); // max 2 baris
      y += noteLines.slice(0, 2).length * 3.5 + 2;
    }

    // ── TANDA TANGAN ──
    y += 4;
    const signFontSize = 8;
    pdf.setFontSize(signFontSize);
    const rightX = pageWidth - margin - 55;

    pdf.setFont(undefined, 'normal');
    pdf.text(`Bantaeng, ${date.toLocaleDateString('id-ID')}`, rightX, y);
    y += 5;

    pdf.text('Guru yang disupervisi,', margin + 10, y);
    pdf.text('Supervisor,', rightX + 10, y);
    y += 18;

    pdf.line(margin + 5, y, margin + 55, y);
    pdf.line(rightX + 5, y, rightX + 55, y);
    y += 4;

    pdf.setFont(undefined, 'bold');
    pdf.text(data.superviseeName || '-', margin + 10, y);
    pdf.text(data.supervisorName || '-', rightX + 10, y);

    // ── SAVE ──
    const fileName = `Supervisi_${(data.superviseeName || 'guru').replace(/\s+/g, '_')}_${date.toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

  } catch (error) {
    console.error('Error download PDF:', error);
    alert('❌ Gagal mendownload PDF: ' + error.message);
  }
};
