import { useState, useRef, useEffect } from 'react'
import type { Receipt } from '../App.tsx'
import './ChatBot.css'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
}

interface Props {
  receipts: Receipt[]
}

const API_BASE_URL = 'http://172.20.10.7:5002/api'

const ChatBot = ({ receipts }: Props) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Ahoj! Som váš osobný finančný asistent poháňaný AI. Opýtajte sa ma na vaše výdavky, účtenky alebo rozpočet. 😊',
      sender: 'bot',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const askAI = async (question: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      return data.answer
    } catch (error) {
      console.error('Error asking AI:', error)
      return 'Prepáčte, momentálne nemôžem odpovedať. Uistite sa, že backend server beží.'
    }
  }

  const generateBotResponse = async (userMessage: string): Promise<string> => {
    const lowerMessage = userMessage.toLowerCase()
    
    // For simple queries, use local data
    const totalSpending = receipts.reduce((sum, r) => sum + r.total, 0)
    const avgSpending = receipts.length > 0 ? totalSpending / receipts.length : 0

    // Simple responses that don't need AI
    if (lowerMessage.includes('pozdrav') || lowerMessage.includes('ahoj') || lowerMessage === 'hi' || lowerMessage === 'hello') {
      return 'Ahoj! Ako vám môžem pomôcť s vašimi financiami?'
    }

    if (lowerMessage.includes('ďakujem') || lowerMessage.includes('dakujem')) {
      return 'Rád som pomohol! 😊'
    }
    
    // For complex queries, use AI
    if (lowerMessage.includes('analýza') || lowerMessage.includes('trend') || 
        lowerMessage.includes('porovnaj') || lowerMessage.includes('odporúč') ||
        lowerMessage.includes('čo') || lowerMessage.includes('ako') || 
        lowerMessage.includes('prečo') || lowerMessage.includes('kde')) {
      return await askAI(userMessage)
    }

    // Local responses for basic stats
    if (lowerMessage.includes('celkom') || lowerMessage.includes('spolu') || lowerMessage.includes('výdavky')) {
      return `Vaše celkové výdavky sú €${totalSpending.toFixed(2)} z ${receipts.length} účteniek. Priemerná účtenka je €${avgSpending.toFixed(2)}.`
    }
    
    if (lowerMessage.includes('posledn') || lowerMessage.includes('najnovš')) {
      if (receipts.length === 0) return 'Zatiaľ nemáte žiadne účtenky.'
      const latest = receipts[receipts.length - 1]
      return `Vaša posledná účtenka bola ${latest.name} za €${latest.total.toFixed(2)} v kategórii ${latest.category}.`
    }

    if (lowerMessage.includes('kategóri') || lowerMessage.includes('typ')) {
      const categories = receipts.reduce((acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + r.total
        return acc
      }, {} as Record<string, number>)
      
      const categoryText = Object.entries(categories)
        .map(([cat, total]) => `${cat}: €${total.toFixed(2)}`)
        .join(', ')
      
      return `Vaše výdavky podle kategórií: ${categoryText || 'Žiadne údaje'}`
    }

    if (lowerMessage.includes('počet') || lowerMessage.includes('koľko')) {
      return `Máte ${receipts.length} účteniek v systéme.`
    }

    // Default: use AI for anything else
    return await askAI(userMessage)
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Get AI response
    const responseText = await generateBotResponse(input)

    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botResponse])
      setIsTyping(false)
    }, 500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="card chatbot">
      <h2>
        <span>💬</span>
        Finančný AI asistent
      </h2>
      
      <div className="messages-container">
        {messages.map(message => (
          <div
            key={message.id}
            className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-avatar">
              {message.sender === 'bot' ? '🤖' : '👤'}
            </div>
            <div className="message-content">
              <p>{message.text}</p>
              <span className="message-time">
                {message.timestamp.toLocaleTimeString('sk-SK', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message bot-message">
            <div className="message-avatar">🤖</div>
            <div className="message-content typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          type="text"
          className="chat-input"
          placeholder="Opýtajte sa na vaše výdavky..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button className="button send-button" onClick={handleSend}>
          <span>📤</span>
        </button>
      </div>
    </div>
  )
}

export default ChatBot