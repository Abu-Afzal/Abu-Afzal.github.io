// ══════════════════════════════════════════════
// GEMINI AI INTEGRATION
// ══════════════════════════════════════════════

// ⚠️ PENTING: Jangan commit API key ke GitHub!
// API key disimpan di localStorage browser (aman, lokal)

let GEMINI_API_KEY = localStorage.getItem('gemini_api_key');

// Jika belum ada, minta user input
if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    const userInput = prompt(
        '🔑 Masukkan Gemini API Key Anda:\n\n' +
        '1. Dapatkan gratis di: https://aistudio.google.com/app/apikey\n' +
        '2. Copy API key Anda\n' +
        '3. Paste di bawah ini\n\n' +
        'Key akan disimpan di browser Anda (lokal, aman)'
    );
    
    if (userInput && userInput.trim().length > 0) {
        GEMINI_API_KEY = userInput.trim();
        localStorage.setItem('gemini_api_key', GEMINI_API_KEY);
    } else {
        throw new Error('API Key diperlukan untuk menggunakan fitur AI');
    }
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ══════════════════════════════════════════════
// GENERATE SOAL DARI MATERI TEKS
// ══════════════════════════════════════════════
window.generateSoalDariMateri = async function(materiTeks, jumlahSoal = 10) {
    const prompt = `
Kamu adalah guru ahli yang akan membuat soal pilihan ganda dari materi berikut.

MATERI:
${materiTeks}

TUGAS:
Buatkan ${jumlahSoal} soal pilihan ganda dengan 5 opsi (A, B, C, D, E).
Setiap soal harus memiliki tepat 1 jawaban benar.

FORMAT OUTPUT (WAJIB JSON VALID):
[
  {
    "pertanyaan": "Teks pertanyaan di sini",
    "opsi": {
      "a": "Opsi A",
      "b": "Opsi B", 
      "c": "Opsi C",
      "d": "Opsi D",
      "e": "Opsi E"
    },
    "jawabanBenar": "a"
  }
]

ATURAN:
- Jawaban benar hanya 1 per soal (a/b/c/d/e)
- Variasikan posisi jawaban benar (jangan semua 'a')
- Soal harus jelas dan tidak ambigu
- Gunakan Bahasa Indonesia yang baik
- Soal harus berdasarkan materi yang diberikan
- JANGAN tambahkan teks lain di luar JSON
- HANYA output JSON array, tanpa markdown, tanpa \`\`\`
`;
    
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192
                }
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'API error');
        }
        
        const data = await response.json();
        let text = data.candidates[0].content.parts[0].text.trim();
        
        // Bersihkan markdown code block jika ada
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parse JSON
        const soalList = JSON.parse(text);
        
        if (!Array.isArray(soalList)) {
            throw new Error('Format output tidak valid');
        }
        
        // Validasi setiap soal
        return soalList.map(soal => {
            if (!soal.pertanyaan || !soal.opsi || !soal.jawabanBenar) {
                throw new Error('Format soal tidak lengkap');
            }
            return {
                pertanyaan: soal.pertanyaan,
                opsi: {
                    a: soal.opsi.a || '',
                    b: soal.opsi.b || '',
                    c: soal.opsi.c || '',
                    d: soal.opsi.d || '',
                    e: soal.opsi.e || ''
                },
                jawabanBenar: soal.jawabanBenar.toLowerCase()
            };
        });
        
    } catch (error) {
        console.error('AI Error:', error);
        if (error instanceof SyntaxError) {
            throw new Error('AI menghasilkan format yang tidak valid. Coba lagi.');
        }
        throw error;
    }
};

// ══════════════════════════════════════════════
// GENERATE SOAL DARI GAMBAR (OCR + AI)
// ══════════════════════════════════════════════
window.generateSoalDariGambar = async function(imageBase64, jumlahSoal = 10) {
    // Extract base64 data
    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.match(/data:(.*?);/)[1];
    
    const prompt = `
Analisis gambar buku/materi ini dan buatkan ${jumlahSoal} soal pilihan ganda (5 opsi A-E).

FORMAT OUTPUT (JSON array):
[
  {
    "pertanyaan": "...",
    "opsi": {"a": "...", "b": "...", "c": "...", "d": "...", "e": "..."},
    "jawabanBenar": "a"
  }
]

HANYA output JSON, tanpa teks lain.
`;
    
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192
                }
            })
        });
        
        if (!response.ok) throw new Error('API error');
        
        const data = await response.json();
        let text = data.candidates[0].content.parts[0].text.trim();
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        return JSON.parse(text);
        
    } catch (error) {
        console.error('AI Error:', error);
        throw new Error('Gagal generate soal dari gambar: ' + error.message);
    }
};

// ══════════════════════════════════════════════
// FITUR TAMBAHAN: RESET API KEY
// ══════════════════════════════════════════════
window.resetGeminiApiKey = function() {
    if (confirm('Yakin ingin mereset API Key Gemini?\nAnda akan diminta memasukkan key baru.')) {
        localStorage.removeItem('gemini_api_key');
        location.reload();
    }
};
