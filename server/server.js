import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeGemini, generateAdaptiveExplanation } from './personaEngine.js';
import { getConversationHistory, clearHistory } from './stateManager.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Gemini API 初期化
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('❌ GEMINI_API_KEY が .env に設定されていません。');
    console.error('   .env.example を参考に .env ファイルを作成してください。');
    process.exit(1);
}
initializeGemini(apiKey);
console.log('✅ Gemini API 初期化完了 (model: gemini-flash-latest)');

// ペルソナデータ読み込み
const personasFile = path.join(__dirname, 'data', 'personas.json');
let personas = [];

function loadPersonas() {
    if (!fs.existsSync(personasFile)) {
        console.warn('⚠️  personas.json が見つかりません。npm run download-personas を実行してください。');
        return;
    }
    personas = JSON.parse(fs.readFileSync(personasFile, 'utf-8'));
    console.log(`✅ ${personas.length} 件のペルソナを読み込みました。`);
}
loadPersonas();

// ==================== API Routes ====================

/**
 * GET /api/personas
 * ペルソナ一覧（フィルタ・検索対応）
 */
app.get('/api/personas', (req, res) => {
    const { search, occupation, prefecture, ageMin, ageMax, limit = 50, offset = 0 } = req.query;

    let filtered = personas;

    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
            (p) =>
                (p.persona && p.persona.toLowerCase().includes(q)) ||
                (p.occupation && p.occupation.toLowerCase().includes(q)) ||
                (p.hobbiesAndInterests && p.hobbiesAndInterests.toLowerCase().includes(q)) ||
                (p.skillsAndExpertise && p.skillsAndExpertise.toLowerCase().includes(q))
        );
    }

    if (occupation) {
        filtered = filtered.filter((p) => p.occupation && p.occupation.includes(occupation));
    }

    if (prefecture) {
        filtered = filtered.filter((p) => p.prefecture === prefecture);
    }

    if (ageMin) {
        filtered = filtered.filter((p) => p.age >= parseInt(ageMin));
    }
    if (ageMax) {
        filtered = filtered.filter((p) => p.age <= parseInt(ageMax));
    }

    const total = filtered.length;
    const paged = filtered.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({ total, personas: paged });
});

/**
 * GET /api/personas/:uuid
 * ペルソナ詳細
 */
app.get('/api/personas/:uuid', (req, res) => {
    const persona = personas.find((p) => p.uuid === req.params.uuid);
    if (!persona) {
        return res.status(404).json({ error: 'ペルソナが見つかりません' });
    }
    res.json(persona);
});

/**
 * GET /api/personas/random/:count
 * ランダムペルソナ取得
 */
app.get('/api/personas/random/:count', (req, res) => {
    const count = Math.min(parseInt(req.params.count) || 5, 20);
    const shuffled = [...personas].sort(() => Math.random() - 0.5);
    res.json(shuffled.slice(0, count));
});

/**
 * POST /api/generate
 * FR-0: ペルソナ適応型説明生成
 */
app.post('/api/generate', async (req, res) => {
    const { personaUuid, input } = req.body;

    if (!personaUuid || !input) {
        return res.status(400).json({ error: 'personaUuid と input が必要です' });
    }

    const persona = personas.find((p) => p.uuid === personaUuid);
    if (!persona) {
        return res.status(404).json({ error: 'ペルソナが見つかりません' });
    }

    try {
        const result = await generateAdaptiveExplanation(persona, input);
        res.json(result);
    } catch (error) {
        console.error('生成エラー:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/history/:uuid
 * ペルソナとの会話履歴取得 (FR-4)
 */
app.get('/api/history/:uuid', (req, res) => {
    const history = getConversationHistory(req.params.uuid);
    res.json(history);
});

/**
 * DELETE /api/history/:uuid
 * 会話履歴クリア
 */
app.delete('/api/history/:uuid', (req, res) => {
    clearHistory(req.params.uuid);
    res.json({ success: true });
});

/**
 * GET /api/filters
 * フィルタ用の選択肢一覧
 */
app.get('/api/filters', (req, res) => {
    const prefectures = [...new Set(personas.map((p) => p.prefecture).filter(Boolean))].sort();
    const occupations = [...new Set(personas.map((p) => p.occupation).filter(Boolean))].sort();
    const ages = personas.map((p) => p.age).filter(Boolean);
    const ageMin = Math.min(...ages);
    const ageMax = Math.max(...ages);

    res.json({ prefectures, occupations, ageRange: { min: ageMin, max: ageMax } });
});

app.listen(PORT, () => {
    console.log(`🚀 サーバー起動: http://localhost:${PORT}`);
});
