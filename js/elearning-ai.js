// ══════════════════════════════════════════════
// E-LEARNING AI MODULE (Model Terverifikasi & Gratis)
// ══════════════════════════════════════════════

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ✅ DAFTAR MODEL GRATIS YANG VALID DI OPENROUTER (Per 2024)
const MODELS = [
    'meta-llama/llama-3.1-8b-instruct:free',
    'qwen/qwen-2.5-7b-instruct:free',
    'google/gemma-2-9b-it:free'
];

async function getCentralizedApiKey() {
    try {
        if (typeof db === 'undefined') throw new Error('Database belum terinisialisasi');
        const doc = await db.collection('settings').doc('ai_config').get();
        if (!doc.exists || !doc.data().openrouter_api_key) {
            throw new Error('API Key belum dikonfigurasi oleh Administrator.');
        }
        return doc.data().openrouter_api_key.trim();
    } catch (error) {
        console.error('Gagal mengambil API Key:', error);
        throw new Error('Fitur AI sedang tidak tersedia. Silakan hubungi Administrator.');
    }
}

async function callAIWithRetry(prompt, maxRetries = 2) {
    const apiKey = await getCentralizedApiKey();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        for (const model of MODELS) {
            try {
                console.log(`Mencoba model: ${model} (attempt ${attempt})`);
                
                const response = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'SIPELITA E-Learning'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.7,
                        max_tokens: 4000
                    })
                });
                
                if (response.status === 429) {
                    console.warn('Rate limit, tunggu 5 detik...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }
                
                if (!response.ok) {
                    const err = await response.json();
                    console.warn(`Model ${model} error:`, err.error?.message || response.statusText);
                    continue;
                }
                
                const data = await response.json();
                let text = data.choices[0].message.content.trim()
                    .replace(/```json\n?/g, '')
                    .replace(/```\n?/g, '')
                    .trim();
                
                const soalList = JSON.parse(text);
                
                if (Array.isArray(soalList) && soalList.length > 0) {
                    console.log(`✅ Berhasil dengan model: ${model}`);
                    return soalList;
                }
                
            } catch (error) {
                console.warn(`Model ${model} gagal:`, error.message);
                continue;
            }
        }
        
        if (attempt < maxRetries) {
            console.log(`Retry ${attempt}/${maxRetries}, tunggu 5 detik...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    throw new Error('Semua model gagal. Silakan coba lagi dalam beberapa menit atau hubungi Administrator.');
}

window.generateSoalDariMateri = async function(materiTeks, jumlahSoal = 10) {
    const prompt = `Anda adalah guru ahli. Buat ${jumlahSoal} soal pilihan ganda (A-E) dari materi berikut dalam Bahasa Indonesia.

MATERI:
${materiTeks}

FORMAT OUTPUT (HANYA JSON ARRAY, tanpa teks lain):
[
  {
    "pertanyaan": "Teks pertanyaan",
    "opsi": {"a": "Opsi A", "b": "Opsi B", "c": "Opsi C", "d": "Opsi D", "e": "Opsi E"},
    "jawabanBenar": "a"
  }
]

Aturan:
- Hanya 1 jawaban benar per soal (a/b/c/d/e)
- Variasikan posisi jawaban benar
- Gunakan Bahasa Indonesia yang baik
- HANYA output JSON array`;

    try {
        const soalList = await callAIWithRetry(prompt);
        return soalList.map(soal => ({
            pertanyaan: soal.pertanyaan || '',
            opsi: { a: soal.opsi?.a || '', b: soal.opsi?.b || '', c: soal.opsi?.c || '', d: soal.opsi?.d || '', e: soal.opsi?.e || '' },
            jawabanBenar: (soal.jawabanBenar || 'a').toLowerCase()
        }));
    } catch (error) {
        console.error('AI Error:', error);
        throw new Error('Gagal generate soal: ' + error.message);
    }
};

window.generateSoalHybrid = async function(materiData) {
    let youtubeInfo = '';
    if (materiData.youtube) {
        try {
            const videoId = materiData.youtube.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/)?.[1];
            if (videoId) {
                const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
                if (res.ok) {
                    const data = await res.json();
                    youtubeInfo = `\n\n🎬 VIDEO YOUTUBE:\nJudul: ${data.title}\nPenulis: ${data.author_name}`;
                }
            }
        } catch (e) { console.warn('Gagal ambil metadata YouTube:', e); }
    }
    
    let prompt = `Anda adalah guru ahli. Buat ${materiData.jumlahSoal} soal pilihan ganda (A-E) dalam Bahasa Indonesia.`;
    if (materiData.teks) prompt += `\n\n📚 MATERI:\n${materiData.teks}`;
    if (youtubeInfo) prompt += youtubeInfo;
    if (materiData.images?.length > 0) prompt += `\n\n🖼️ Ada gambar yang dilampirkan.`;
    
    prompt += `\n\nFORMAT OUTPUT (HANYA JSON ARRAY):
[
  {
    "pertanyaan": "Teks pertanyaan",
    "opsi": {"a": "Opsi A", "b": "Opsi B", "c": "Opsi C", "d": "Opsi D", "e": "Opsi E"},
    "jawabanBenar": "a"
  }
]

Aturan:
- Hanya 1 jawaban benar
- Gunakan Bahasa Indonesia yang baik
- HANYA output JSON array`;

    if (materiData.images?.length > 0) {
        return await generateSoalDenganGambar(materiData.images[0], prompt);
    }

    try {
        const soalList = await callAIWithRetry(prompt);
        return soalList.map(soal => ({
            pertanyaan: soal.pertanyaan || 'Pertanyaan tidak tersedia',
            opsi: { a: soal.opsi?.a || 'Opsi A', b: soal.opsi?.b || 'Opsi B', c: soal.opsi?.c || 'Opsi C', d: soal.opsi?.d || 'Opsi D', e: soal.opsi?.e || 'Opsi E' },
            jawabanBenar: (soal.jawabanBenar || 'a').toLowerCase()
        }));
    } catch (error) {
        console.error('AI Error:', error);
        throw new Error('Gagal generate soal: ' + error.message);
    }
};

async function generateSoalDenganGambar(imageBase64, prompt) {
    const apiKey = await getCentralizedApiKey();
    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.match(/data:(.*?);/)[1];
    
    try {
        // Gunakan model yang support vision (Llama 3.2 11B Vision masih gratis)
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'SIPELITA E-Learning'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.2-11b-vision-instruct:free',
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
                    ]
                }],
                temperature: 0.7,
                max_tokens: 4000
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Gagal menghubungi AI Vision');
        }
        
        const data = await response.json();
        let text = data.choices[0].message.content.trim()
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        
        const soalList = JSON.parse(text);
        return soalList.map(soal => ({
            pertanyaan: soal.pertanyaan || 'Pertanyaan tidak tersedia',
            opsi: { a: soal.opsi?.a || 'Opsi A', b: soal.opsi?.b || 'Opsi B', c: soal.opsi?.c || 'Opsi C', d: soal.opsi?.d || 'Opsi D', e: soal.opsi?.e || 'Opsi E' },
            jawabanBenar: (soal.jawabanBenar || 'a').toLowerCase()
        }));
    } catch (error) {
        console.error('AI Vision Error:', error);
        throw new Error('Gagal generate soal dari gambar: ' + error.message);
    }
}
