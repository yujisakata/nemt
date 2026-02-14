import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONVERSATIONS_DIR = path.join(__dirname, 'data', 'conversations');

if (!fs.existsSync(CONVERSATIONS_DIR)) {
    fs.mkdirSync(CONVERSATIONS_DIR, { recursive: true });
}

/**
 * ペルソナごとの会話履歴を管理する (FR-4: 文脈状態管理)
 */

function getConversationPath(personaId) {
    return path.join(CONVERSATIONS_DIR, `${personaId}.json`);
}

export function getConversationHistory(personaId) {
    const filePath = getConversationPath(personaId);
    if (!fs.existsSync(filePath)) {
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
        return [];
    }
}

export function addToHistory(personaId, userMessage, assistantResponse) {
    const history = getConversationHistory(personaId);
    history.push({
        timestamp: new Date().toISOString(),
        user: userMessage,
        assistant: assistantResponse,
    });

    // 最新50件のみ保持
    const trimmed = history.slice(-50);
    fs.writeFileSync(getConversationPath(personaId), JSON.stringify(trimmed, null, 2), 'utf-8');
    return trimmed;
}

export function clearHistory(personaId) {
    const filePath = getConversationPath(personaId);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
