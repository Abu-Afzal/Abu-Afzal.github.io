// ══════════════════════════════════════════════
// E-LEARNING AI MODULE (Llama 3.1 via OpenRouter - TERPUSAT)
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

// ═════════════════════════════════════════════
// GENERATE SOAL DARI MATERI TEKS
// ══════════════════════════════════════════════
window.generateSoalDariMateri = async function(materiTeks, jumlahSoal = 10) {
    const apiKey = await getCentralizedApiKey();
    
    const prompt = `Anda adalah guru ahli yang akan membuat soal pilihan ganda dari materi berikut.

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
- Gunakan Bahasa Indonesia yang baik
- HANYA output JSON array, tanpa teks lain`;
    
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
                model: 'meta-llama/llama-3.1-8b-instruct:free', // ✅ Model GRATIS
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
            throw new Error(err.error?.message || 'Gagal menghubungi layanan AI');
        }
        
        const data = await response.json();
        let text = data.choices[0].message.content.trim();
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const soalList = JSON.parse(text);
        
        if (!Array.isArray(soalList)) {
            throw new Error('Format output tidak valid');
        }
        
        return soalList.map(soal => ({
            pertanyaan: soal.pertanyaan || '',
            opsi: {
                a: soal.opsi?.a || '',
                b: soal.opsi?.b || '',
                c: soal.opsi?.c || '',
                d: soal.opsi?.d || '',
                e: soal.opsi?.e || ''
            },
            jawabanBenar: (soal.jawabanBenar || 'a').toLowerCase()
        }));
        
    } catch (error) {
        console.error('AI Error:', error);
        if (error instanceof SyntaxError) {
            throw new Error('AI menghasilkan format yang tidak valid.');
        }
        throw error;
    }
};

// ═════════════════════════════════════════════
// HYBRID GENERATE: Teks + YouTube + Gambar
// ══════════════════════════════════════════════
window.generateSoalHybrid = async function(materiData) {
    const apiKey = await getCentralizedApiKey();
    
    let youtubeInfo = '';
    if (materiData.youtube) {
        try {
            const videoId = extractYoutubeId(materiData.youtube);
            if (videoId) {
                const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
                const response = await fetch(oembedUrl);
                if (response.ok) {
                    const data = await response.json();
                    youtubeInfo = `\n\n🎬 VIDEO YOUTUBE:\nJudul: ${data.title}\nPenulis: ${data.author_name}`;
                }
            }
        } catch (e) {
            console.warn('Gagal ambil metadata YouTube:', e);
        }
    }
    
    let prompt = `Anda adalah guru ahli yang akan membuat soal pilihan ganda.`;
    
    if (materiData.teks) {
        prompt += `\n\n📚 MATERI TEKS:\n${materiData.teks}`;
    }
    
    if (youtubeInfo) {
        prompt += youtubeInfo;
    }
    
    if (materiData.images && materiData.images.length > 0) {
        prompt += `\n\n️ Terdapat ${materiData.images.length} gambar yang dilampirkan.`;
    }
    
    prompt += `\n\nTUGAS:\nBuatkan ${materiData.jumlahSoal} soal pilihan ganda dengan 5 opsi (A, B, C, D, E).`;
    
    if (youtubeInfo && !materiData.teks) {
        prompt += `\n\nPENTING: Buat soal berdasarkan topik video YouTube tersebut.`;
    }
    
    prompt += `

FORMAT OUTPUT (WAJIB JSON VALID):
[
  {
    "pertanyaan": "Teks pertanyaan",
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
- Jawaban benar hanya 1 per soal
- Gunakan Bahasa Indonesia yang baik
- HANYA output JSON array`;

    if (materiData.images && materiData.images.length > 0) {
        return await generateSoalDenganGambarDanTeks(apiKey, prompt, materiData.images[0]);
    }
    
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
                model: 'meta-llama/llama-3.1-8b-instruct:free', // ✅ Model GRATIS
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

function extractYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

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
                model: 'meta-llama/llama-3.2-11b-vision-instruct:free', // ✅ Model Vision GRATIS
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
// GENERATE SOAL DARI GAMBAR
// ══════════════════════════════════════════════
window.generateSoalDariGambar = async function(imageBase64, jumlahSoal = 10) {
    const apiKey = await getCentralizedApiKey();
    
    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.match(/data:(.*?);/)[1];
    
    const prompt = `Analisis gambar ini dan buatkan ${jumlahSoal} soal pilihan ganda (5 opsi A-E).

FORMAT OUTPUT (JSON array):
[
  {
    "pertanyaan": "...",
    "opsi": {"a": "...", "b": "...", "c": "...", "d": "...", "e": "..."},
    "jawabanBenar": "a"
  }
]

HANYA output JSON array.`;
    
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
                model: 'meta-llama/llama-3.2-11b-vision-instruct:free', // ✅ Model Vision GRATIS
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
