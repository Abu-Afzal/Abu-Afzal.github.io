// ══════════════════════════════════════════════
// E-LEARNING AI MODULE (Qwen via OpenRouter - TERPUSAT)
// ══════════════════════════════════════════════

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Fungsi untuk mengambil API Key dari Firestore (Terpusat)
async function getCentralizedApiKey() {
    try {
        if (typeof db === 'undefined') {
            throw new Error('Database belum terinisialisasi');
        }
        
        const doc = await db.collection('settings').doc('ai_config').get();
        
        if (!doc.exists || !doc.data().openrouter_api_key) {
            throw new Error('API Key belum dikonfigurasi oleh Administrator.');
        }
        
        return doc.data().openrouter_api_key.trim();
        
    } catch (error) {
        console.error('Gagal mengambil API Key dari Firestore:', error);
        throw new Error('Fitur AI sedang tidak tersedia. Silakan hubungi Administrator.');
    }
}

// ══════════════════════════════════════════════
// GENERATE SOAL DARI MATERI TEKS
// ══════════════════════════════════════════════
window.generateSoalDariMateri = async function(materiTeks, jumlahSoal = 10) {
    const apiKey = await getCentralizedApiKey();
    
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
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'SIPELITA E-Learning'
            },
            body: JSON.stringify({
                model: 'qwen/qwen-2.5-7b-instruct:free', // ✅ Model GRATIS yang stabil
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
            throw new Error(err.error?.message || 'Gagal menghubungi layanan AI');
        }
        
        const data = await response.json();
        let text = data.choices[0].message.content.trim();
        
        // Bersihkan markdown code block jika AI tetap menghasilkannya
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parse JSON
        const soalList = JSON.parse(text);
        
        if (!Array.isArray(soalList)) {
            throw new Error('Format output dari AI tidak valid');
        }
        
        // Validasi dan rapikan setiap soal
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
// HYBRID GENERATE: Teks + YouTube + Gambar
// ══════════════════════════════════════════════
window.generateSoalHybrid = async function(materiData) {
    const apiKey = await getCentralizedApiKey();
    
    // 1. Ambil metadata YouTube jika ada
    let youtubeInfo = '';
    if (materiData.youtube) {
        try {
            const videoId = extractYoutubeId(materiData.youtube);
            if (videoId) {
                // Fetch metadata via oEmbed (gratis, no API key)
                const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
                const response = await fetch(oembedUrl);
                if (response.ok) {
                    const data = await response.json();
                    youtubeInfo = `\n\n🎬 VIDEO YOUTUBE:\nJudul: ${data.title}\nPenulis: ${data.author_name}\nDeskripsi: Lihat video untuk detail materi.`;
                }
            }
        } catch (e) {
            console.warn('Gagal ambil metadata YouTube:', e);
            youtubeInfo = '\n\n🎬 Video YouTube tersedia (metadata tidak bisa diambil)';
        }
    }
    
    // 2. Bangun prompt berdasarkan materi yang tersedia
    let prompt = `Kamu adalah guru ahli yang akan membuat soal pilihan ganda.`;
    
    if (materiData.teks) {
        prompt += `\n\n📚 MATERI TEKS:\n${materiData.teks}`;
    }
    
    if (youtubeInfo) {
        prompt += youtubeInfo;
    }
    
    if (materiData.images && materiData.images.length > 0) {
        prompt += `\n\n🖼️ Terdapat ${materiData.images.length} gambar buku/materi yang dilampirkan.`;
    }
    
    prompt += `\n\nTUGAS:\nBuatkan ${materiData.jumlahSoal} soal pilihan ganda dengan 5 opsi (A, B, C, D, E).`;
    
    if (youtubeInfo && !materiData.teks) {
        prompt += `\n\nPENTING: Karena hanya ada video YouTube, buat soal yang menguji pemahaman konsep dari topik video tersebut.`;
    }
    
    prompt += `

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
- Variasikan posisi jawaban benar
- Gunakan Bahasa Indonesia yang baik
- HANYA output JSON array, tanpa teks lain`;

    // 3. Jika ada gambar, gunakan model Vision
    if (materiData.images && materiData.images.length > 0) {
        return await generateSoalDenganGambarDanTeks(apiKey, prompt, materiData.images[0]);
    }
    
    // 4. Jika hanya teks + YouTube, gunakan model teks biasa
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'SIPELITA E-Learning'
            },
            body: JSON.stringify({
                model: 'qwen/qwen-2.5-7b-instruct:free', // ✅ Model GRATIS yang stabil
                messages: [
                    {
                        role: 'system',
                        content: 'Anda adalah generator soal ujian profesional. HANYA balas dengan JSON array valid.'
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
            throw new Error(err.error?.message || 'Gagal menghubungi AI');
        }
        
        const data = await response.json();
        let text = data.choices[0].message.content.trim();
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const soalList = JSON.parse(text);
        
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
        console.error('AI Error:', error);
        throw error;
    }
};

// Helper untuk extract YouTube ID
function extractYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Generate soal dengan gambar (untuk model Vision)
async function generateSoalDenganGambarDanTeks(apiKey, prompt, imageBase64) {
    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.match(/data:(.*?);/)[1];
    
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'SIPELITA E-Learning'
            },
            body: JSON.stringify({
                model: 'qwen/qwen-2-vl-72b-instruct:free', // ✅ Model Vision GRATIS
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
            throw new Error(err.error?.message || 'Gagal menghubungi AI Vision');
        }
        
        const data = await response.json();
        let text = data.choices[0].message.content.trim();
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const soalList = JSON.parse(text);
        
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
        throw new Error('Gagal generate soal dengan gambar: ' + error.message);
    }
}

// ══════════════════════════════════════════════
// GENERATE SOAL DARI GAMBAR (OCR + AI Vision)
// ══════════════════════════════════════════════
window.generateSoalDariGambar = async function(imageBase64, jumlahSoal = 10) {
    const apiKey = await getCentralizedApiKey();
    
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
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'SIPELITA E-Learning'
            },
            body: JSON.stringify({
                model: 'qwen/qwen-2-vl-72b-instruct:free', // ✅ Model Vision GRATIS
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
            throw new Error(err.error?.message || 'Gagal menghubungi layanan AI Vision');
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
