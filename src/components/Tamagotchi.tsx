import { useEffect, useState } from 'react'
import './Tamagotchi.css'

interface Props {
  health: number
  totalSpending: number
}

const Tamagotchi = ({ health, totalSpending }: Props) => {
  const [mood, setMood] = useState<'happy' | 'neutral' | 'sad' | 'sick'>('happy')
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (health >= 70) {
      setMood('happy')
    } else if (health >= 40) {
      setMood('neutral')
    } else if (health >= 20) {
      setMood('sad')
    } else {
      setMood('sick')
    }

    // Trigger animation on health change
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 500)
  }, [health])

  const getMoodEmoji = () => {
    switch (mood) {
      case 'happy': return '😊'
      case 'neutral': return '😐'
      case 'sad': return '😟'
      case 'sick': return '😷'
    }
  }

  const getMoodMessage = () => {
    switch (mood) {
      case 'happy': return 'Som šťastný! Dobre spravuješ svoj rozpočet! 🎉'
      case 'neutral': return 'Cítim sa OK. Dávaj pozor na výdavky.'
      case 'sad': return 'Je mi smutno... Veľa míňaš. 😢'
      case 'sick': return 'Potrebujem pomoc! Príliš veľa výdavkov! 🆘'
    }
  }

  const getHealthColor = () => {
    if (health >= 70) return '#4CAF50'
    if (health >= 40) return '#FFC107'
    if (health >= 20) return '#FF9800'
    return '#F44336'
  }

  return (
    <div className="card tamagotchi-card">
      <h3>
        <span>🎮</span>
        Váš finančný kamarát
      </h3>
      
      <div className="tamagotchi-container">
        <div className={`tamagotchi ${mood} ${isAnimating ? 'bounce' : ''}`}>
          <div className="tamagotchi-body">
            <div className="tamagotchi-face">{getMoodEmoji()}</div>
            <div className="tamagotchi-arms">
              <span className="arm-left">🤚</span>
              <span className="arm-right">🤚</span>
            </div>
          </div>
        </div>

        <div className="health-bar-container">
          <div className="health-label">
            <span>Zdravie</span>
            <span className="health-value">{health}%</span>
          </div>
          <div className="health-bar">
            <div 
              className="health-fill" 
              style={{ 
                width: `${health}%`,
                backgroundColor: getHealthColor()
              }}
            />
          </div>
        </div>

        <div className="mood-message">
          <p>{getMoodMessage()}</p>
        </div>

        <div className="tamagotchi-stats">
          <div className="stat">
            <span className="stat-icon">💰</span>
            <div>
              <div className="stat-label">Celkové výdavky</div>
              <div className="stat-number">€{totalSpending.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="tips-section">
          <h4>💡 Tipy na zlepšenie</h4>
          <ul className="tips-list">
            {health < 50 && <li>Obmedz nákupy nad €50</li>}
            {health < 70 && <li>Skús nakupovať na akciách</li>}
            {health < 30 && <li>Nastav si denný limit!</li>}
            {health >= 70 && <li>Výborne! Pokračuj tak ďalej! 🌟</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Tamagotchi