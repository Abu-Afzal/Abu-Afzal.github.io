// ══════════════════════════════════════════════
// CONFIG & INITIALIZATION FIREBASE
// ══════════════════════════════════════════════
const firebaseConfig = {
    apiKey: "AIzaSyB24GCKSTPGlN9HG9E6uhCECVa4ibCpKEA",
    authDomain: "sipelita-digital.firebaseapp.com",
    databaseURL: "https://sipelita-digital-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sipelita-digital",
    storageBucket: "sipelita-digital.firebasestorage.app",
    messagingSenderId: "787840817745",
    appId: "1:787840817745:web:e6b5237cfbb5e51be93670"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let questionCounter = 0;
let base64GambarMateri = ""; // Menyimpan string gambar yang sudah dikompres

// ══════════════════════════════════════════════
// DYNAMIC QUIZ MANAGEMENT
// ══════════════════════════════════════════════
window.tambahKomponenSoal = function() {
    questionCounter++;
    const container = document.getElementById('quizContainer');
    const div = document.createElement('div');
    div.className = 'soal-card';
    div.id = `soal-${questionCounter}`;
    
    div.innerHTML = `
        <div class="soal-header">
            <strong>Soal #${questionCounter}</strong>
            <button type="button" class="btn btn-danger" onclick="hapusKomponenSoal(${questionCounter})">🗑️ Hapus</button>
        </div>
        <div class="form-group">
            <input type="text" class="input-pertanyaan" placeholder="Tulis butir pertanyaan kuis..." required>
        </div>
        <div class="pilihan-row">
            <input type="text" class="pilihan-a" placeholder="Pilihan A" required>
            <input type="text" class="pilihan-b" placeholder="Pilihan B" required>
            <input type="text" class="pilihan-c" placeholder="Pilihan C" required>
            <input type="text" class="pilihan-d" placeholder="Pilihan D" required>
        </div>
        <div class="form-group">
            <label>Kunci Jawaban Benar:</label>
            <select class="kunci-jawaban">
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
            </select>
        </div>
    `;
    container.appendChild(div);
};

window.hapusKomponenSoal = function(id) {
    const el = document.getElementById(`soal-${id}`);
    if (el) el.remove();
};

// ══════════════════════════════════════════════
// CORE: COMPRESSION IMAGE TO BASE64 (BYPASS STORAGE)
// ══════════════════════════════════════════════
window.previewDanKompresGbr = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert("❌ Ukuran file terlalu besar! Maksimal 5MB.");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Inisialisasi HTML5 Canvas untuk kompresi
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Atur resolusi maksimal lebar/tinggi 1000px (Sangat cukup untuk dibaca di HP)
            const MAX_WIDTH = 1000;
            const MAX_HEIGHT = 1000;

            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Ekspor ke JPEG dengan kualitas 65% (Ukuran drop menjadi ~100-200 KB)
            base64GambarMateri = canvas.toDataURL('image/jpeg', 0.65);
            
            // Tampilkan preview ke guru
            document.getElementById('imgPreview').src = base64GambarMateri;
            document.getElementById('imagePreviewContainer').style.display = 'block';
            document.getElementById('imgInfo').textContent = `✅ Gambar berhasil dioptimasi untuk Firestore!`;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

// ══════════════════════════════════════════════
// DATABASE OPERATIONS
// ══════════════════════════════════════════════
window.simpanSesiKeFirestore = async function() {
    const title = document.getElementById('sessionTitle').value.trim();
    const matText = document.getElementById('materialText').value.trim();
    const ytUrl = document.getElementById('materialYoutube').value.trim();
    const reqAssignment = document.getElementById('requireAssignment').checked;
    const btn = document.getElementById('btnSimpanSesi');

    if (!title) { alert("❌ Judul Pembelajaran wajib diisi!"); return; }

    btn.disabled = true;
    btn.textContent = "⏳ Memproses Sesi...";

    // 1. Ambil data kuis secara dinamis
    const questions = [];
    document.querySelectorAll('#quizContainer .soal-card').forEach((item, index) => {
        questions.push({
            id: `q_${index + 1}`,
            question: item.querySelector('.input-pertanyaan').value.trim(),
            options: {
                A: item.querySelector('.pilihan-a').value.trim(),
                B: item.querySelector('.pilihan-b').value.trim(),
                C: item.querySelector('.pilihan-c').value.trim(),
                D: item.querySelector('.pilihan-d').value.trim()
            },
            correct: item.querySelector('.kunci-jawaban').value
        });
    });

    // 2. Generate 6 Digit Acak Unik untuk PIN Sesi
    const PIN_SESI = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Susun Objek Data Sesi Belajar
    const dataSesi = {
        sessionId: PIN_SESI,
        title: title,
        status: "active",
        createdAt: new Date().toISOString(),
        material: {
            text: matText,
            imageUrl: base64GambarMateri, // String Base64 terkompresi (< 200KB)
            youtubeUrl: ytUrl
        },
        questions: questions,
        config: {
            requiresAssignment: reqAssignment
        }
    };

    try {
        // Simpan ke koleksi 'learning_sessions' dengan dokumen ID = PIN_SESI
        await db.collection('learning_sessions').doc(PIN_SESI).set(dataSesi);
        
        // Buat link otomatis untuk dibagikan ke siswa
        const baseLinkAplikasi = window.location.origin + window.location.pathname.replace('buat-sesi.html', 'siswa.html');
        const linkLengkapSiswa = `${baseLinkAplikasi}?pin=${PIN_SESI}`;

        // Tampilkan pesan sukses lengkap dengan Link
        alert(`🎉 SESI PEMBELAJARAN AKTIF!\n\nPIN Sesi: ${PIN_SESI}\n\nSalin Link Otomatis untuk Siswa:\n${linkLengkapSiswa}`);
        
        console.log("Link Siswa Terbentuk:", linkLengkapSiswa);

        // Reset Form setelah sukses
        document.getElementById('formSesi').reset();
        document.getElementById('quizContainer').innerHTML = '';
        document.getElementById('imagePreviewContainer').style.display = 'none';
        base64GambarMateri = "";
        questionCounter = 0;

    } catch (error) {
        alert("❌ Gagal menyimpan sesi: " + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "💾 Simpan & Ambil PIN Sesi";
    }
};
