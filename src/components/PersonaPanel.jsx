import { useState, useEffect } from 'react'

export default function PersonaPanel({ selectedPersona, onSelectPersona }) {
    const [personas, setPersonas] = useState([])
    const [total, setTotal] = useState(0)
    const [search, setSearch] = useState('')
    const [filters, setFilters] = useState({ prefectures: [], occupations: [] })
    const [selectedPrefecture, setSelectedPrefecture] = useState('')
    const [selectedOccupation, setSelectedOccupation] = useState('')
    const [loading, setLoading] = useState(false)

    // フィルタ選択肢を取得
    useEffect(() => {
        fetch('/api/filters')
            .then((r) => r.json())
            .then(setFilters)
            .catch(console.error)
    }, [])

    // ペルソナ検索
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPersonas()
        }, 300)
        return () => clearTimeout(timer)
    }, [search, selectedPrefecture, selectedOccupation])

    async function fetchPersonas() {
        setLoading(true)
        try {
            const params = new URLSearchParams({ limit: '50', offset: '0' })
            if (search) params.set('search', search)
            if (selectedPrefecture) params.set('prefecture', selectedPrefecture)
            if (selectedOccupation) params.set('occupation', selectedOccupation)

            const res = await fetch(`/api/personas?${params}`)
            const data = await res.json()
            setPersonas(data.personas)
            setTotal(data.total)
        } catch (err) {
            console.error('ペルソナ取得エラー:', err)
        } finally {
            setLoading(false)
        }
    }

    async function loadRandom() {
        try {
            const res = await fetch('/api/personas/random/10')
            const data = await res.json()
            setPersonas(data)
            setTotal(data.length)
        } catch (err) {
            console.error('ランダム取得エラー:', err)
        }
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h1>
                    <span className="icon">👤</span>
                    ペルソナ選択
                </h1>
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="職業、趣味、スキルで検索..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="filters">
                <select
                    className="filter-select"
                    value={selectedPrefecture}
                    onChange={(e) => setSelectedPrefecture(e.target.value)}
                >
                    <option value="">都道府県</option>
                    {filters.prefectures?.map((p) => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>

                <select
                    className="filter-select"
                    value={selectedOccupation}
                    onChange={(e) => setSelectedOccupation(e.target.value)}
                >
                    <option value="">職業</option>
                    {filters.occupations?.map((o) => (
                        <option key={o} value={o}>{o}</option>
                    ))}
                </select>

                <button className="random-btn" onClick={loadRandom}>
                    🎲 ランダム
                </button>
            </div>

            <div className="persona-list">
                {loading ? (
                    <div className="empty-state" style={{ padding: '20px' }}>
                        <p>読み込み中...</p>
                    </div>
                ) : personas.length === 0 ? (
                    <div className="empty-state" style={{ padding: '20px' }}>
                        <p>ペルソナが見つかりません</p>
                    </div>
                ) : (
                    personas.map((p) => (
                        <div
                            key={p.uuid}
                            className={`persona-card ${selectedPersona?.uuid === p.uuid ? 'active' : ''}`}
                            onClick={() => onSelectPersona(p)}
                        >
                            <div className="persona-name">{p.name}</div>
                            <div className="persona-meta">
                                <span>📍 {p.prefecture}</span>
                                <span>🎂 {p.age}歳</span>
                                <span>💼 {p.occupation}</span>
                            </div>
                            <div className="persona-desc">{p.persona}</div>
                        </div>
                    ))
                )}
            </div>

            <div className="persona-count">
                {total} 件のペルソナ
            </div>

            {selectedPersona && (
                <div className="persona-detail">
                    <h3>選択中: {selectedPersona.name}</h3>

                    <div className="detail-field">
                        <div className="label">学歴</div>
                        <div className="value">{selectedPersona.educationLevel || '不明'}</div>
                    </div>

                    <div className="detail-field">
                        <div className="label">文化的背景</div>
                        <div className="value">{selectedPersona.culturalBackground || '不明'}</div>
                    </div>

                    {selectedPersona.skillsAndExpertiseList?.length > 0 && (
                        <div className="detail-field">
                            <div className="label">スキル</div>
                            <div className="tag-list">
                                {selectedPersona.skillsAndExpertiseList.map((s, i) => (
                                    <span key={i} className="tag">{s}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedPersona.hobbiesAndInterestsList?.length > 0 && (
                        <div className="detail-field">
                            <div className="label">趣味・関心</div>
                            <div className="tag-list">
                                {selectedPersona.hobbiesAndInterestsList.map((h, i) => (
                                    <span key={i} className="tag">{h}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </aside>
    )
}
