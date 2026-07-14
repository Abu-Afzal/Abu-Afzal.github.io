// ══════════════════════════════════════════════
// E-LEARNING AI MODULE (100% GRATIS - Google Gemma)
// ══════════════════════════════════════════════

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

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

window.generateSoalDariMateri = async function(materiTeks, jumlahSoal = 10) {
    const apiKey = await getCentralizedApiKey();
    const prompt = `You are an expert teacher. Create ${jumlahSoal} multiple choice questions (A-E) in Indonesian from this material:

MATERIAL:
${materiTeks}

Output format (JSON ARRAY ONLY, no other text):
[
  {
    "pertanyaan": "Question text in Indonesian",
    "opsi": {"a": "Option A", "b": "Option B", "c": "Option C", "d": "Option D", "e": "Option E"},
    "jawabanBenar": "a"
  }
]
Rules: Only 1 correct answer per question (a/b/c/d/e). Vary the correct answer positions. Use proper Indonesian language.`;

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
                // ✅ MODEL INI MASIH 100% GRATIS
                model: 'google/gemma-2b-it:free',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 4000
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Gagal menghubungi AI');
        }
        
        const data = await response.json();
        let text = data.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const soalList = JSON.parse(text);
        
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
    const apiKey = await getCentralizedApiKey();
    
    let youtubeInfo = '';
    if (materiData.youtube) {
        try {
            const videoId = materiData.youtube.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/)?.[1];
            if (videoId) {
                const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
                if (res.ok) {
                    const data = await res.json();
                    youtubeInfo = `\n\n🎬 YOUTUBE VIDEO:\nTitle: ${data.title}\nAuthor: ${data.author_name}`;
                }
            }
        } catch (e) { console.warn('Gagal ambil metadata YouTube:', e); }
    }
    
    let prompt = `You are an expert teacher. Create ${materiData.jumlahSoal} multiple choice questions (A-E) in Indonesian.`;
    if (materiData.teks) prompt += `\n\n📚 MATERIAL:\n${materiData.teks}`;
    if (youtubeInfo) prompt += youtubeInfo;
    if (materiData.images?.length > 0) prompt += `\n\n🖼️ Images are attached.`;
    
    prompt += `\n\nOutput format (JSON ARRAY ONLY):
[
  {
    "pertanyaan": "Question text",
    "opsi": {"a": "Option A", "b": "Option B", "c": "Option C", "d": "Option D", "e": "Option E"},
    "jawabanBenar": "a"
  }
]
Rules: Only 1 correct answer. Use Indonesian language.`;

    if (materiData.images?.length > 0) {
        return await generateSoalDenganGambar(apiKey, prompt, materiData.images[0]);
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
                // ✅ MODEL INI MASIH 100% GRATIS
                model: 'google/gemma-2b-it:free',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 4000
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Gagal menghubungi AI');
        }
        
        const data = await response.json();
        let text = data.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const soalList = JSON.parse(text);
        
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

async function generateSoalDenganGambar(apiKey, prompt, imageBase64) {
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
                // ✅ MODEL VISION GRATIS (jika tersedia)
                model: 'google/gemma-2b-it:free',
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
        let text = data.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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
