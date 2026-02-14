import { useState, useRef, useEffect } from 'react'
import ReasoningDisplay from './ReasoningDisplay'

export default function ChatArea({ persona }) {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef(null)
    const textareaRef = useRef(null)

    // ペルソナ変更時にメッセージをクリア
    useEffect(() => {
        if (persona) {
            loadHistory(persona.uuid)
        } else {
            setMessages([])
        }
    }, [persona?.uuid])

    // スクロール
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function loadHistory(uuid) {
        try {
            const res = await fetch(`/api/history/${uuid}`)
            const history = await res.json()
            const historyMessages = history.flatMap((h) => [
                { role: 'user', content: h.user },
                { role: 'assistant', content: h.assistant, reasoning: null },
            ])
            setMessages(historyMessages)
        } catch {
            setMessages([])
        }
    }

    async function clearHistory() {
        if (!persona) return
        try {
            await fetch(`/api/history/${persona.uuid}`, { method: 'DELETE' })
            setMessages([])
        } catch (err) {
            console.error('履歴クリアエラー:', err)
        }
    }

    async function handleSend() {
        if (!input.trim() || !persona || loading) return

        const userMessage = input.trim()
        setInput('')
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
        setLoading(true)

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    personaUuid: persona.uuid,
                    input: userMessage,
                }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || '生成に失敗しました')
            }

            const data = await res.json()
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: data.explanation,
                    reasoning: data.reasoning,
                },
            ])
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: `エラー: ${error.message}`,
                    reasoning: null,
                },
            ])
        } finally {
            setLoading(false)
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // textarea auto-resize
    function handleInputChange(e) {
        setInput(e.target.value)
        const ta = textareaRef.current
        if (ta) {
            ta.style.height = 'auto'
            ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
        }
    }

    if (!persona) {
        return (
            <div className="chat-area">
                <div className="empty-state">
                    <div className="empty-icon">💬</div>
                    <h3>ペルソナを選択してください</h3>
                    <p>
                        左のパネルからペルソナを選択すると、<br />
                        そのペルソナに合わせた説明文を生成できます。<br /><br />
                        事実や情報を入力すると、選択したペルソナの<br />
                        知識レベル・興味・性格に最適化された説明に変換します。
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="chat-area">
            <div className="chat-header">
                <div className="chat-header-info">
                    <h2>💬 {persona.name} との対話</h2>
                    <p>{persona.occupation} / {persona.prefecture} / {persona.age}歳</p>
                </div>
                <button className="clear-history-btn" onClick={clearHistory}>
                    🗑️ 履歴クリア
                </button>
            </div>

            <div className="chat-messages">
                {messages.length === 0 && !loading && (
                    <div className="empty-state">
                        <div className="empty-icon">✨</div>
                        <h3>{persona.name} に説明してもらいましょう</h3>
                        <p>
                            事実やニュース、説明文を入力すると、<br />
                            このペルソナに合わせた表現に変換します。
                        </p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`message ${msg.role}`}>
                        <div className="message-label">
                            {msg.role === 'user' ? 'あなた' : persona.name}
                        </div>
                        <div className="message-bubble">
                            {msg.content}
                            {msg.role === 'assistant' && msg.reasoning && (
                                <ReasoningDisplay reasoning={msg.reasoning} />
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="message assistant">
                        <div className="message-label">{persona.name}</div>
                        <div className="message-bubble">
                            <div className="loading-dots">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <div className="chat-input-wrapper">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="事実や情報を入力してください... (Shift+Enterで改行)"
                        rows={1}
                        disabled={loading}
                    />
                    <button
                        className="send-btn"
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                    >
                        送信 ✦
                    </button>
                </div>
            </div>
        </div>
    )
}
