import { useState, useEffect } from 'react'
import PersonaPanel from './components/PersonaPanel'
import ChatArea from './components/ChatArea'

export default function App() {
    const [selectedPersona, setSelectedPersona] = useState(null)

    return (
        <div className="app">
            <PersonaPanel
                selectedPersona={selectedPersona}
                onSelectPersona={setSelectedPersona}
            />
            <ChatArea persona={selectedPersona} />
        </div>
    )
}
