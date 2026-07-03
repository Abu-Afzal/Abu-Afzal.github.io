// ══════════════════════════════════════════════
// GEMINI AI INTEGRATION
// ══════════════════════════════════════════════
// ⚠️ PENTING: Ganti dengan API key Anda sendiri
// Dapatkan di: https://aistudio.google.com/app/apikey
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ══════════════════════════════════════════════
// GENERATE SOAL DARI MATERI
// ══════════════════════════════════════════════
window.generateSoalDariMateri = async function(materiTeks, jumlahSoal = 10) {
    if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        throw new Error('API Key Gemini belum diset. Silakan edit file elearning-ai.js');
    }
    
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
// GENERATE SOAL DARI YOUTUBE (via transcript)
// ══════════════════════════════════════════════
window.generateSoalDariYoutube = async function(youtubeUrl, jumlahSoal = 10) {
    // Catatan: Implementasi ini memerlukan backend untuk extract transcript
    // Untuk sekarang, kita minta user copy-paste transcript manual
    
    throw new Error('Fitur generate dari YouTube akan segera hadir. Untuk sekarang, silakan copy transcript video dan paste di materi teks.');
};

// ══════════════════════════════════════════════
// GENERATE SOAL DARI GAMBAR (OCR)
// ══════════════════════════════════════════════
window.generateSoalDariGambar = async function(imageBase64, jumlahSoal = 10) {
    if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        throw new Error('API Key Gemini belum diset');
    }
    
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
