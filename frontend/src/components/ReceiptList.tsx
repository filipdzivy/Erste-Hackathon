import type { Receipt } from '../App.tsx'
import './ReceiptList.css'

interface Props {
  receipts: Receipt[]
}

const ReceiptList = ({ receipts }: Props) => {
  if (receipts.length === 0) {
    return (
      <div className="card receipt-list">
        <h3>
          <span>📋</span>
          Vaše účtenky
        </h3>
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p>Zatiaľ nemáte žiadne účtenky</p>
          <p className="empty-hint">Nahrajte svoju prvú účtenku hore</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card receipt-list">
      <h3>
        <span>📋</span>
        Vaše účtenky ({receipts.length})
      </h3>
      
      <div className="receipts-scroll">
        {receipts.map((receipt) => (
          <div key={receipt.id} className="receipt-item">
            <div className="receipt-icon">🧾</div>
            <div className="receipt-info">
              <div className="receipt-name">{receipt.category}</div>
              <div className="receipt-date">
                {receipt.date.toLocaleDateString('sk-SK', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </div>
              <div className="receipt-items">
                {receipt.items.length} položiek
              </div>
            </div>
            <div className="receipt-amount">
              €{receipt.total.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="receipt-summary">
        <div className="summary-item">
          <span>Celkom:</span>
          <span className="summary-value">
            €{receipts.reduce((sum, r) => sum + r.total, 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ReceiptList