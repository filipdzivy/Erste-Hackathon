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
        Pokladnička
      </h2>

      <div className="piggy-bank-content">
        {/* Icon and Display */}
        <div className="piggy-display-section">
          <div className="piggy-icon">💰</div>
          <div className="piggy-balance">
            <div className="balance-label">Našporené:</div>
            <div className="balance-amount">€{balance.toFixed(2)}</div>
            <div className="balance-percentage">{savingsPercentage.toFixed(0)}% z vreckového</div>
          </div>
        </div>

        {/* Info Items */}
        <div className="piggy-info-section">
          <div className="info-item">
            <span className="info-label">Zostáva z vreckového:</span>
            <strong className="info-value remaining-amount">€{availableMoney.toFixed(2)}</strong>
          </div>
          <div className="info-item">
            <span className="info-label">Minuté na nákupy:</span>
            <strong className="info-value spent-amount">€{spentMoney.toFixed(2)}</strong>
          </div>
          <div className="info-item">
            <span className="info-label">V pokladničke:</span>
            <strong className="info-value saved-amount">€{balance.toFixed(2)}</strong>
          </div>
          <div className="info-item">
            <span className="info-label">Môžeš minúť/ušetriť:</span>
            <strong className="info-value available-amount">€{availableMoney.toFixed(2)}</strong>
          </div>
        </div>

        {/* Action Button */}
        <div className="piggy-action-section">
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
              Pridať do pokladničky
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
        </div>
      </div>
    </div>
  )
}

export default PiggyBank