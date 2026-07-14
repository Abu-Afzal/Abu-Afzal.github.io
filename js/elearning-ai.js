// ══════════════════════════════════════════════
// E-LEARNING AI MODULE (Qwen via OpenRouter)
// ══════════════════════════════════════════════

let OPENROUTER_API_KEY = localStorage.getItem('openrouter_api_key');

// Jika belum ada, minta user input
if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'YOUR_OPENROUTER_API_KEY_HERE') {
    const userInput = prompt(
        '🔑 Masukkan OpenRouter API Key Anda untuk menggunakan AI Qwen:\n\n' +
        '1. Dapatkan gratis di: https://openrouter.ai/keys\n' +
        '2. Buat key baru (pilih model gratis)\n' +
        '3. Copy dan paste key (dimulai dengan sk-or-v1-) di bawah ini\n\n' +
        'Key akan disimpan aman di browser Anda (lokal).'
    );
    
    if (userInput && userInput.trim().length > 0) {
        OPENROUTER_API_KEY = userInput.trim();
        localStorage.setItem('openrouter_api_key', OPENROUTER_API_KEY);
    } else {
        throw new Error('API Key diperlukan untuk menggunakan fitur AI');
    }
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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

FORMAT OUTPUT (WAJIB JSON VALID, TANPA MARKDOWN):
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
- Gunakan Bahasa Indonesia yang baik dan sesuai kurikulum
- HANYA output JSON array, tanpa teks pembuka/penutup, tanpa \`\`\`
`;
    
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'SIPELITA E-Learning'
            },
            body: JSON.stringify({
                model: 'qwen/qwen-2.5-72b-instruct:free', // Model Qwen Gratis & Powerful
                messages: [
                    {
                        role: 'system',
                        content: 'Anda adalah generator soal ujian profesional. Anda HANYA boleh membalas dengan format JSON array yang valid, tanpa markdown atau teks tambahan.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            if (response.status === 401) {
                localStorage.removeItem('openrouter_api_key');
                throw new Error('API Key tidak valid. Silakan periksa kembali key OpenRouter Anda.');
            }
            throw new Error(err.error?.message || 'API error');
        }
        
        const data = await response.json();
        let text = data.choices[0].message.content.trim();
        
        // Bersihkan markdown code block jika AI tetap menghasilkannya
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
            throw new Error('AI menghasilkan format yang tidak valid. Coba lagi dengan materi yang lebih jelas.');
        }
        throw error;
    }
};

// ══════════════════════════════════════════════
// GENERATE SOAL DARI GAMBAR (OCR + AI Vision)
// ══════════════════════════════════════════════
window.generateSoalDariGambar = async function(imageBase64, jumlahSoal = 10) {
    // Extract base64 data
    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.match(/data:(.*?);/)[1];
    
    const prompt = `
Analisis gambar buku/materi pembelajaran ini dan buatkan ${jumlahSoal} soal pilihan ganda (5 opsi A-E) berdasarkan konten gambar tersebut.

FORMAT OUTPUT (WAJIB JSON VALID, TANPA MARKDOWN):
[
  {
    "pertanyaan": "...",
    "opsi": {"a": "...", "b": "...", "c": "...", "d": "...", "e": "..."},
    "jawabanBenar": "a"
  }
]

HANYA output JSON array, tanpa teks lain.
`;
    
    try {
        // Menggunakan model Vision Qwen yang tersedia gratis di OpenRouter
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'SIPELITA E-Learning'
            },
            body: JSON.stringify({
                model: 'qwen/qwen-2-vl-72b-instruct:free', // Model Qwen Vision Gratis
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { 
                                type: 'image_url', 
                                image_url: { url: `data:${mimeType};base64,${base64Data}` } 
                            }
                        ]
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'API error');
        }
        
        const data = await response.json();
        let text = data.choices[0].message.content.trim();
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const soalList = JSON.parse(text);
        
        if (!Array.isArray(soalList)) {
            throw new Error('Format output tidak valid');
        }
        
        return soalList.map(soal => ({
            pertanyaan: soal.pertanyaan || 'Pertanyaan tidak tersedia',
            opsi: {
                a: soal.opsi?.a || 'Opsi A',
                b: soal.opsi?.b || 'Opsi B',
                c: soal.opsi?.c || 'Opsi C',
                d: soal.opsi?.d || 'Opsi D',
                e: soal.opsi?.e || 'Opsi E'
            },
            jawabanBenar: (soal.jawabanBenar || 'a').toLowerCase()
        }));
        
    } catch (error) {
        console.error('AI Vision Error:', error);
        throw new Error('Gagal generate soal dari gambar: ' + error.message);
    }
};

// ══════════════════════════════════════════════
// FITUR TAMBAHAN: RESET API KEY
// ══════════════════════════════════════════════
window.resetAiApiKey = function() {
    if (confirm('Yakin ingin mereset API Key AI?\nAnda akan diminta memasukkan key OpenRouter baru.')) {
        localStorage.removeItem('openrouter_api_key');
        location.reload();
    }
};
