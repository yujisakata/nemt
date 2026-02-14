import { useState } from 'react'

const FR_LABELS = {
    fr1_epistemic: {
        label: 'FR-1: 認識論的翻訳',
        description: 'ドメイン固有語彙→既知概念への翻訳',
        className: 'fr1',
    },
    fr2_valueChain: {
        label: 'FR-2: 価値連鎖マッピング',
        description: 'マクロ情報→ミクロ影響の自分事化',
        className: 'fr2',
    },
    fr3_interaction: {
        label: 'FR-3: 適応的対話プロトコル',
        description: 'トーン・様式のペルソナ適応',
        className: 'fr3',
    },
    fr4_context: {
        label: 'FR-4: 文脈状態管理',
        description: '過去の対話文脈の活用',
        className: 'fr4',
    },
}

export default function ReasoningDisplay({ reasoning }) {
    const [open, setOpen] = useState(false)

    if (!reasoning) return null

    return (
        <div>
            <button className="reasoning-toggle" onClick={() => setOpen(!open)}>
                {open ? '▾' : '▸'} 変換理由を{open ? '閉じる' : '表示'}
            </button>

            {open && (
                <div className="reasoning-panel">
                    {Object.entries(FR_LABELS).map(([key, meta]) => (
                        <div key={key} className={`reasoning-item ${meta.className}`}>
                            <div className="fr-label">
                                {meta.label}
                            </div>
                            <div className="fr-text">
                                {reasoning[key] || '（情報なし）'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
