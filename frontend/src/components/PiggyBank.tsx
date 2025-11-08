import { useState } from 'react'
import './PiggyBank.css'

interface PiggyBankProps {
  balance: number
  availableMoney: number
  totalPocketMoney: number
  onAddMoney: (amount: number) => void
}

const PiggyBank = ({ balance, availableMoney, totalPocketMoney, onAddMoney }: PiggyBankProps) => {
  const [inputAmount, setInputAmount] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAddMoney = () => {
    const amount = parseFloat(inputAmount)
    
    if (isNaN(amount) || amount <= 0) {
      alert('Zadajte platnú sumu!')
      return
    }
    
    if (amount > availableMoney) {
      alert(`Nemáš dostatok vreckového! Máš iba €${availableMoney.toFixed(2)} voľných`)
      return
    }
    
    onAddMoney(amount)
    setInputAmount('')
    setIsAdding(false)
    
    // Success message
    const message = amount >= 10 
      ? '🎉 Skvelé! Šetríš ako profesionál!' 
      : '👍 Dobrá práca! Každá koruna sa počíta!'
    
    setTimeout(() => alert(message), 100)
  }

  // Quick amounts - only show those that are affordable
  const quickAmounts = [5, 10, 20, 50].filter(amt => amt <= availableMoney)

  const savingsPercentage = (balance / totalPocketMoney) * 100
  const spentMoney = totalPocketMoney - availableMoney - balance

  return (
    <div className="card piggy-bank">
      <h2>
        <span>🐷</span>
        Kasička
      </h2>

      <div className="piggy-bank-display">
        <div className="piggy-icon">💰</div>
        <div className="piggy-balance">
          <div className="balance-label">Naspárené:</div>
          <div className="balance-amount">€{balance.toFixed(2)}</div>
          <div className="balance-percentage">{savingsPercentage.toFixed(0)}% z vreckového</div>
        </div>
      </div>

      <div className="pocket-money-info">
        <div className="info-row">
          <span>Zostáva z vreckového:</span>
          <strong className="remaining-amount">€{availableMoney.toFixed(2)}</strong>
        </div>
        <div className="info-row">
          <span>Minuté na nákupy:</span>
          <strong className="spent-amount">€{spentMoney.toFixed(2)}</strong>
        </div>
        <div className="info-row">
          <span>V kasičke:</span>
          <strong className="saved-amount">€{balance.toFixed(2)}</strong>
        </div>
        <div className="info-row highlight">
          <span>Môžeš minúť/ušetriť:</span>
          <strong className="available-amount">€{availableMoney.toFixed(2)}</strong>
        </div>
      </div>

      {availableMoney <= 0 && (
        <div className="warning-message">
          ⚠️ Nemáš žiadne voľné vreckové!
        </div>
      )}

      {!isAdding ? (
        <button 
          className="button button-primary"
          onClick={() => setIsAdding(true)}
          disabled={availableMoney <= 0}
        >
          <span>➕</span>
          {availableMoney > 0 ? 'Pridať do kasičky' : 'Niet voľných peňazí'}
        </button>
      ) : (
        <div className="add-money-form">
          {quickAmounts.length > 0 && (
            <div className="quick-amounts">
              <p>Rýchle sumy:</p>
              <div className="quick-buttons">
                {quickAmounts.map(amount => (
                  <button
                    key={amount}
                    className="button button-small"
                    onClick={() => setInputAmount(amount.toString())}
                  >
                    €{amount}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="input-group">
            <input
              type="number"
              className="money-input"
              placeholder="Zadajte sumu"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              min="0"
              step="0.01"
              max={availableMoney}
            />
            <span className="currency">€</span>
          </div>

          <div className="button-group">
            <button 
              className="button button-primary"
              onClick={handleAddMoney}
              disabled={!inputAmount || parseFloat(inputAmount) <= 0}
            >
              ✓ Uložiť
            </button>
            <button 
              className="button button-secondary"
              onClick={() => {
                setIsAdding(false)
                setInputAmount('')
              }}
            >
              Zrušiť
            </button>
          </div>
        </div>
      )}

      <div className="savings-tips">
        <p className="tip-title">💡 Tip:</p>
        <p className="tip-text">
          {balance === 0 && "Začni šetriť! Aj malá suma je dobrý začiatok."}
          {balance > 0 && balance < 10 && "Skvelý začiatok! Pokračuj ďalej!"}
          {balance >= 10 && balance < 25 && "Výborne! Už máš slušnú sumu!"}
          {balance >= 25 && balance < 40 && "Wow! Viac ako polovica vreckového ušetrená!"}
          {balance >= 40 && "Fantastické! Si majster šetrenia! 🎉"}
        </p>
      </div>

      {savingsPercentage >= 80 && (
        <div className="achievement">
          🏆 Úspech: Super šetrič! Ušetril si viac ako 80%!
        </div>
      )}
    </div>
  )
}

export default PiggyBank