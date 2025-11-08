import { useState, useEffect } from 'react'
import './App.css'
import ReceiptUpload from './components/ReceiptUpload.tsx'
import ChatBot from './components/ChatBot.tsx'
import Tamagotchi from './components/Tamagotchi.tsx'
import ReceiptList from './components/ReceiptList.tsx'
import PiggyBank from './components/PiggyBank.tsx'

export interface Receipt {
  id: string
  name: string
  date: Date
  items: ReceiptItem[]
  total: number
  category: string
  imageUrl?: string
  healthChange?: number
  happinessChange?: number
}

export interface ReceiptItem {
  name: string
  price: number
  quantity: number
  category?: string
}

const POCKET_MONEY = 50 // Static pocket money amount in EUR
const API_BASE_URL = 'http://172.20.10.7:5002/api'

function App() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [health, setHealth] = useState(100)
  const [happiness, setHappiness] = useState(100)
  const [pocketMoneySpent, setPocketMoneySpent] = useState(0)
  const [piggyBank, setPiggyBank] = useState(0)
  const [loading, setLoading] = useState(true)

  // Load all data from backend and localStorage on mount
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      // Load stats from backend
      await loadStatsFromBackend()
      
      // Load receipts from backend
      await loadReceiptsFromBackend()
      
      // Load piggy bank and spent money from localStorage
      loadLocalData()
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStatsFromBackend = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`)
      if (response.ok) {
        const data = await response.json()
        setHealth(data.zdravie || 100)
        setHappiness(data.stastie || 100)
        console.log('✅ Stats loaded:', data)
      }
    } catch (error) {
      console.error('Failed to load stats from backend:', error)
    }
  }

  const loadReceiptsFromBackend = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/receipts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 Raw receipts from backend:', data)
        
        if (data.receipts && Array.isArray(data.receipts)) {
          // Transform backend receipts to frontend format
          const transformedReceipts: Receipt[] = data.receipts.map((r: any) => ({
            id: r.id || Date.now().toString(),
            name: r.items?.[0]?.name || 'Receipt',
            date: r.date ? new Date(r.date) : new Date(),
            items: (r.items || []).map((item: any) => ({
              name: item.name || item.product || 'Unknown',
              price: item.price || 0,
              quantity: item.quantity || 1,
              category: item.category || 'other'
            })),
            total: r.total || 0,
            category: r.category || 'other'
          }))
          
          setReceipts(transformedReceipts)
          
          // Calculate total spent from receipts
          const totalSpent = transformedReceipts.reduce((sum, r) => sum + r.total, 0)
          setPocketMoneySpent(totalSpent)
          
          console.log('✅ Receipts loaded:', transformedReceipts.length, 'Total spent:', totalSpent)
        }
      }
    } catch (error) {
      console.error('Failed to load receipts from backend:', error)
    }
  }

  const loadLocalData = () => {
    try {
      // Load piggy bank from localStorage
      const savedPiggyBank = localStorage.getItem('piggyBank')
      if (savedPiggyBank) {
        setPiggyBank(parseFloat(savedPiggyBank))
        console.log('✅ Piggy bank loaded from localStorage:', savedPiggyBank)
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
    }
  }

  // Save piggy bank to localStorage whenever it changes
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('piggyBank', piggyBank.toString())
      console.log('💾 Piggy bank saved to localStorage:', piggyBank)
    }
  }, [piggyBank, loading])

  const handleReceiptUpload = (receipt: Receipt) => {
    // Check if there's enough pocket money
    const pocketMoneyRemaining = POCKET_MONEY - pocketMoneySpent - piggyBank
    if (receipt.total > pocketMoneyRemaining) {
      alert(`Nemáš dostatok vreckového! Zostáva: €${pocketMoneyRemaining.toFixed(2)}`)
      return
    }

    setReceipts(prev => [...prev, receipt])
    
    // Get health and happiness changes from backend
    const healthChange = receipt.healthChange || 0
    const happinessChange = receipt.happinessChange || 0
    
    // Calculate percentage of pocket money spent
    const percentageOfPocketMoney = (receipt.total / POCKET_MONEY) * 100
    
    // For every 1% of pocket money spent, lose 1 health and 1 happiness
    const pocketMoneyPenalty = Math.floor(percentageOfPocketMoney)
    
    // Update pocket money spent
    setPocketMoneySpent(prev => prev + receipt.total)
    
    // Apply changes from backend categories AND pocket money penalty
    setHealth(prev => Math.max(0, Math.min(100, prev + healthChange - pocketMoneyPenalty)))
    setHappiness(prev => Math.max(0, Math.min(100, prev + happinessChange - pocketMoneyPenalty)))
  }

  const handleAddToPiggyBank = (amount: number) => {
    const pocketMoneyRemaining = POCKET_MONEY - pocketMoneySpent - piggyBank
    
    if (amount <= pocketMoneyRemaining) {
      setPiggyBank(prev => prev + amount)
      
      // Add some happiness for saving money!
      setHappiness(prev => Math.min(100, prev + 5))
    } else {
      alert(`Nemáš dostatok vreckového! Zostáva: €${pocketMoneyRemaining.toFixed(2)}`)
    }
  }

  const totalSpending = receipts.reduce((sum, r) => sum + r.total, 0)
  const pocketMoneyRemaining = POCKET_MONEY - pocketMoneySpent - piggyBank
  const pocketMoneyPercentage = (pocketMoneyRemaining / POCKET_MONEY) * 100

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <p className="subtitle">Načítavam...</p>
        </header>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '60vh',
          fontSize: '1.5rem'
        }}>
          <div>⏳ Načítavam dáta...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Mica Minca</h1>
        <p className="subtitle">Inteligentný pomocník pre vaše výdavky</p>
      </header>

      <div className="main-container">
        <div className="top-grid">
          <div className="left-section">
            <ReceiptUpload onReceiptUpload={handleReceiptUpload} />
            <ReceiptList receipts={receipts} />
          </div>

          <div className="middle-section">
            <ChatBot receipts={receipts} />
          </div>

          <div className="right-section">
            <Tamagotchi 
              health={health} 
              happiness={happiness}
              pocketMoney={pocketMoneyRemaining}
              pocketMoneyPercentage={pocketMoneyPercentage}
              totalPocketMoney={POCKET_MONEY}
            />
          </div>
        </div>

        <div className="piggy-bank-section">
          <PiggyBank 
            balance={piggyBank}
            availableMoney={pocketMoneyRemaining}
            totalPocketMoney={POCKET_MONEY}
            onAddMoney={handleAddToPiggyBank}
          />
        </div>
      </div>
    </div>
  )
}

export default App