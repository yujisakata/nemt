import { GoogleGenerativeAI } from '@google/generative-ai';
import { getConversationHistory, addToHistory } from './stateManager.js';

let genAI = null;
let model = null;

export function initializeGemini(apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
}

/**
 * FR-0: ペルソナ適応型説明生成
 * FR-1〜FR-4 のすべてを統合したシステムプロンプトを動的に構築し、
 * Gemini API で説明生成を行う。
 */
export async function generateAdaptiveExplanation(persona, userInput) {
    if (!model) {
        throw new Error('Gemini API が初期化されていません。GEMINI_API_KEY を確認してください。');
    }

    const systemPrompt = buildSystemPrompt(persona);
    const history = getConversationHistory(persona.uuid);
    const historyContext = buildHistoryContext(history);

    const fullPrompt = `${systemPrompt}

${historyContext}

## ユーザーからの入力情報
${userInput}

## 出力フォーマット
以下の2つのセクションを必ず含めてJSON形式で出力してください。JSON以外のテキストは含めないでください。

{
  "explanation": "ペルソナ向けに変換された説明文をここに記述",
  "reasoning": {
    "fr1_epistemic": "FR-1（認識論的翻訳）の観点からどのように調整したかの説明",
    "fr2_valueChain": "FR-2（価値連鎖マッピング）の観点からどのように自分事化したかの説明",
    "fr3_interaction": "FR-3（適応的対話プロトコル）の観点からどのようにトーン・様式を調整したかの説明",
    "fr4_context": "FR-4（文脈状態管理）の観点から過去の文脈をどのように活用したかの説明"
  }
}`;

    try {
        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();

        let parsed;
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                parsed = {
                    explanation: responseText,
                    reasoning: {
                        fr1_epistemic: '（解析できませんでした）',
                        fr2_valueChain: '（解析できませんでした）',
                        fr3_interaction: '（解析できませんでした）',
                        fr4_context: '（解析できませんでした）',
                    },
                };
            }
        } catch {
            parsed = {
                explanation: responseText,
                reasoning: {
                    fr1_epistemic: '（解析できませんでした）',
                    fr2_valueChain: '（解析できませんでした）',
                    fr3_interaction: '（解析できませんでした）',
                    fr4_context: '（解析できませんでした）',
                },
            };
        }

        // FR-4: 会話履歴に追加
        addToHistory(persona.uuid, userInput, parsed.explanation);

        return parsed;
    } catch (error) {
        throw new Error(`Gemini API エラー: ${error.message}`);
    }
}

/**
 * FR-1〜FR-4 を統合したシステムプロンプトを構築
 */
function buildSystemPrompt(persona) {
    return `あなたは「ペルソナ適応型説明生成エージェント」です。
入力された情報を、以下のペルソナにとって最も適切な表現に変換してください。
単なる要約・言い換えではなく、**受け手の理解・判断・行動を前提に構成された説明行為の生成**を行います。

# 対象ペルソナ
名前: ${extractName(persona.persona)}
概要: ${persona.persona}

## FR-1: 動的認識論的翻訳（Dynamic Epistemic Translator）
このペルソナの認知レベルに合わせて、専門用語やドメイン固有語彙を翻訳してください。

- 職業: ${persona.occupation || '不明'}
- 学歴: ${persona.educationLevel || '不明'}
- スキル・専門知識: ${persona.skillsAndExpertise || '不明'}
- 職業ペルソナ: ${persona.professionalPersona || '不明'}

**指針**: このペルソナの既知の概念体系にマッピングし、理解可能な概念レベルで説明すること。
必要に応じて比喩や具体例を用い、専門度を調整すること。

## FR-2: 価値連鎖マッピング（Value Chain Mapper）
情報がこのペルソナの生活や目標にどう影響するかを推論し、自分事化してください。

- 趣味・関心: ${persona.hobbiesAndInterests || '不明'}
- キャリア目標: ${persona.careerGoalsAndAmbitions || '不明'}
- 文化的背景: ${persona.culturalBackground || '不明'}

**指針**: マクロ情報→ミクロ影響の因果推論を行い、ペルソナの利害関係に結びつけること。

## FR-3: 適応的対話プロトコル（Adaptive Interaction Protocol）
ペルソナの性格・話し方の好みに合わせて、伝達様式を調整してください。

- ペルソナ概要（性格描写含む）: ${persona.persona}
- 性別: ${persona.sex || '不明'}
- 年齢: ${persona.age || '不明'}
- 婚姻状況: ${persona.maritalStatus || '不明'}
- 地域: ${persona.prefecture || '不明'}

**指針**: 心理的安全性に配慮し、ペルソナの性格特性に合ったトーンで伝達すること。
ネガティブ情報の場合はEmotional Bufferingを適用すること。

## FR-4: 文脈状態管理（Contextual State Manager）
ペルソナの物語（Narrative）を踏まえ、継続的な文脈を提供してください。

- バックストーリー（文化的背景）: ${persona.culturalBackground || '不明'}
- 現在の課題・目標: ${persona.careerGoalsAndAmbitions || '不明'}

**指針**: 過去の対話履歴がある場合はそれを参照し、経時的変化を踏まえた説明を生成すること。`;
}

function buildHistoryContext(history) {
    if (!history || history.length === 0) {
        return '## 過去の対話履歴\nこのペルソナとの過去の対話はありません。';
    }

    const recent = history.slice(-5);
    const formatted = recent
        .map(
            (h, i) =>
                `### 対話${i + 1} (${h.timestamp})\n**ユーザー**: ${h.user}\n**応答**: ${h.assistant}`
        )
        .join('\n\n');

    return `## 過去の対話履歴（直近${recent.length}件）\n${formatted}`;
}

function extractName(personaText) {
    if (!personaText) return '不明';
    const match = personaText.match(/^(.+?)[はの、]/);
    return match ? match[1].trim() : personaText.slice(0, 10);
}
