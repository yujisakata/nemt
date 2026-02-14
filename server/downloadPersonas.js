import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const PERSONAS_FILE = path.join(DATA_DIR, 'personas.json');

const HF_API_URL = 'https://datasets-server.huggingface.co/rows';
const DATASET = 'nvidia/Nemotron-Personas-Japan';
const BATCH_SIZE = 100;
const TOTAL = 1000;

async function downloadPersonas() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    console.log(`Nemotron-Personas-Japan から ${TOTAL} 件のペルソナをダウンロード中...`);

    const allPersonas = [];

    for (let offset = 0; offset < TOTAL; offset += BATCH_SIZE) {
        const url = `${HF_API_URL}?dataset=${encodeURIComponent(DATASET)}&config=default&split=train&offset=${offset}&length=${BATCH_SIZE}`;
        console.log(`  取得中: ${offset + 1}〜${Math.min(offset + BATCH_SIZE, TOTAL)} 件目...`);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API エラー: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const personas = data.rows.map((item) => {
            const r = item.row;
            return {
                uuid: r.uuid,
                name: extractName(r.persona),
                persona: r.persona,
                professionalPersona: r.professional_persona,
                sportsPersona: r.sports_persona,
                artsPersona: r.arts_persona,
                travelPersona: r.travel_persona,
                culinaryPersona: r.culinary_persona,
                culturalBackground: r.cultural_background,
                skillsAndExpertise: r.skills_and_expertise,
                skillsAndExpertiseList: safeParseList(r.skills_and_expertise_list),
                hobbiesAndInterests: r.hobbies_and_interests,
                hobbiesAndInterestsList: safeParseList(r.hobbies_and_interests_list),
                careerGoalsAndAmbitions: r.career_goals_and_ambitions,
                sex: r.sex,
                age: r.age,
                maritalStatus: r.marital_status,
                educationLevel: r.education_level,
                occupation: r.occupation,
                region: r.region,
                area: r.area,
                prefecture: r.prefecture,
            };
        });

        allPersonas.push(...personas);
    }

    fs.writeFileSync(PERSONAS_FILE, JSON.stringify(allPersonas, null, 2), 'utf-8');
    console.log(`\n✅ ${allPersonas.length} 件のペルソナを ${PERSONAS_FILE} に保存しました。`);
}

function extractName(personaText) {
    if (!personaText) return '不明';
    const match = personaText.match(/^(.+?)[はの、]/);
    return match ? match[1].trim() : personaText.slice(0, 10);
}

function safeParseList(str) {
    if (!str) return [];
    try {
        const cleaned = str.replace(/'/g, '"');
        return JSON.parse(cleaned);
    } catch {
        return [];
    }
}

downloadPersonas().catch((err) => {
    console.error('ダウンロード失敗:', err.message);
    process.exit(1);
});
