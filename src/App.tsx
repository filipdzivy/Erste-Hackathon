import { useState } from 'react'
import './App.css'
import ReceiptUpload from './components/ReceiptUpload.tsx'
import ChatBot from './components/ChatBot.tsx'
import Tamagotchi from './components/Tamagotchi.tsx'
import ReceiptList from './components/ReceiptList.tsx'

export interface Receipt {
  id: string
  name: string
  date: Date
  items: ReceiptItem[]
  total: number
  category: string
  imageUrl?: string
}

export interface ReceiptItem {
  name: string
  price: number
  quantity: number
}

function App() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [tamagotchiHealth, setTamagotchiHealth] = useState(80)

  const handleReceiptUpload = (receipt: Receipt) => {
    setReceipts(prev => [...prev, receipt])
    
    // Update tamagotchi health based on spending
    // Decrease health for expensive purchases
    if (receipt.total > 50) {
      setTamagotchiHealth(prev => Math.max(0, prev - 5))
    } else if (receipt.total < 20) {
      setTamagotchiHealth(prev => Math.min(100, prev + 2))
    }
  }

  const totalSpending = receipts.reduce((sum, r) => sum + r.total, 0)

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-circle">SS</div>
          <h1>Slovenská sporiteľňa</h1>
        </div>
        <p className="subtitle">Inteligentný pomocník pre vaše výdavky</p>
      </header>

      <div className="main-container">
        <div className="left-section">
          <ReceiptUpload onReceiptUpload={handleReceiptUpload} />
          <ReceiptList receipts={receipts} />
        </div>

        <div className="middle-section">
          <ChatBot receipts={receipts} />
        </div>

        <div className="right-section">
          <Tamagotchi health={tamagotchiHealth} totalSpending={totalSpending} />
          <div className="stats-card">
            <h3>Prehľad</h3>
            <div className="stat-item">
              <span>Celkové výdavky:</span>
              <span className="stat-value">€{totalSpending.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span>Počet účteniek:</span>
              <span className="stat-value">{receipts.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App