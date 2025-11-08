import { useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Receipt } from '../App.tsx'
import './ReceiptUpload.css'

interface Props {
  onReceiptUpload: (receipt: Receipt) => void
}

const API_BASE_URL = 'http://172.20.10.7:5002/api'

const ReceiptUpload = ({ onReceiptUpload }: Props) => {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [manualText, setManualText] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseReceipt = async (text: string) => {
    try {
      console.log('📤 Sending parse request with text:', text)
      const response = await fetch(`${API_BASE_URL}/parse-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      })

      console.log('📥 Parse response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Parse error response:', errorText)
        throw new Error(`Failed to parse receipt: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Parse result:', data)
      return data
    } catch (error) {
      console.error('❌ Error parsing receipt:', error)
      throw error
    }
  }

  const saveReceipt = async (items: any[], rawText: string) => {
    try {
      console.log('📤 Sending save request with items:', items)
      const response = await fetch(`${API_BASE_URL}/save-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          raw_text: rawText,
          date: new Date().toISOString()
        })
      })

      console.log('📥 Save response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Save error response:', errorText)
        throw new Error(`Failed to save receipt: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Save result:', result)
      return result
    } catch (error) {
      console.error('❌ Error saving receipt:', error)
      throw error
    }
  }

  const handleManualSubmit = async () => {
    if (!manualText.trim()) return

    setUploading(true)
    setPreview(null)
    setError(null)

    try {
      console.log('🚀 Starting manual receipt submission...')
      
      // Parse receipt with AI
      const parseResult = await parseReceipt(manualText)
      
      if (!parseResult || !parseResult.items || parseResult.items.length === 0) {
        throw new Error('No items found in receipt')
      }

      // Save to backend
      const saveResult = await saveReceipt(parseResult.items, manualText)

      // Create receipt object for frontend with stat changes
      const receipt: Receipt = {
        id: Date.now().toString(),
        name: 'Manual Receipt',
        date: new Date(),
        items: parseResult.items.map((item: any) => ({
          name: item.product,
          price: item.price,
          quantity: 1,
          category: item.category
        })),
        total: parseResult.items.reduce((sum: number, item: any) => sum + item.price, 0),
        category: parseResult.items[0]?.category || 'other',
        healthChange: saveResult.stat_changes?.health || 0,
        happinessChange: saveResult.stat_changes?.happiness || 0
      }

      onReceiptUpload(receipt)
      
      // Show success message with stat changes
      let message = '✅ Účtenka úspešne spracovaná!'
      if (saveResult.stat_changes) {
        const { health, happiness } = saveResult.stat_changes
        if (health !== 0 || happiness !== 0) {
          message += `\n\n📊 Zmeny:\n`
          if (health > 0) message += `❤️ Zdravie: +${health}\n`
          if (health < 0) message += `❤️ Zdravie: ${health}\n`
          if (happiness > 0) message += `😊 Šťastie: +${happiness}\n`
          if (happiness < 0) message += `😊 Šťastie: ${happiness}\n`
        }
      }
      
      setManualText('')
      setShowManualInput(false)
      alert(message)
    } catch (error: any) {
      console.error('❌ Failed to process receipt:', error)
      const errorMessage = error.message || 'Unknown error occurred'
      setError(errorMessage)
      alert(`Chyba pri spracovaní: ${errorMessage}`)
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setTimeout(async () => {
      try {
        // Simulated text extraction from image
        const mockText = "Chlieb 2.49\nMlieko 1.29\nJogurt 0.89\nParadajky 3.45"
        
        const parseResult = await parseReceipt(mockText)
        
        if (!parseResult || !parseResult.items || parseResult.items.length === 0) {
          throw new Error('No items found in receipt')
        }

        const saveResult = await saveReceipt(parseResult.items, mockText)

        const receipt: Receipt = {
          id: Date.now().toString(),
          name: file.name,
          date: new Date(),
          items: parseResult.items.map((item: any) => ({
            name: item.product,
            price: item.price,
            quantity: 1,
            category: item.category
          })),
          total: parseResult.items.reduce((sum: number, item: any) => sum + item.price, 0),
          category: parseResult.items[0]?.category || 'Potraviny',
          imageUrl: URL.createObjectURL(file),
          healthChange: saveResult.stat_changes?.health || 0,
          happinessChange: saveResult.stat_changes?.happiness || 0
        }
        
        onReceiptUpload(receipt)
        
        // Show success message
        let message = '✅ Účtenka úspešne spracovaná!'
        if (saveResult.stat_changes) {
          const { health, happiness } = saveResult.stat_changes
          if (health !== 0 || happiness !== 0) {
            message += `\n\n📊 Zmeny:\n`
            if (health > 0) message += `❤️ Zdravie: +${health}\n`
            if (health < 0) message += `❤️ Zdravie: ${health}\n`
            if (happiness > 0) message += `😊 Šťastie: +${happiness}\n`
            if (happiness < 0) message += `😊 Šťastie: ${happiness}\n`
          }
        }
        
        alert(message)
        setTimeout(() => setPreview(null), 2000)
      } catch (error: any) {
        console.error('❌ Failed to process file:', error)
        const errorMessage = error.message || 'Unknown error occurred'
        setError(errorMessage)
        alert(`Chyba pri spracovaní: ${errorMessage}`)
      } finally {
        setUploading(false)
      }
    }, 1500)
  }

  return (
    <div className="card receipt-upload">
      <h2>
        <span>📄</span>
        Nahrať účtenku
      </h2>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '10px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c00'
        }}>
          <strong>Chyba:</strong> {error}
        </div>
      )}
      
      {preview && (
        <div className="preview-container">
          <img src={preview} alt="Preview" className="receipt-preview" />
          {uploading && (
            <div className="upload-overlay">
              <div className="spinner"></div>
              <p>Spracovávam účtenku...</p>
            </div>
          )}
        </div>
      )}

      {!showManualInput ? (
        <>
          <input
            type="file"
            id="receipt-upload"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <label htmlFor="receipt-upload" className="file-upload-label">
            <span className="upload-icon">📤</span>
            {uploading ? 'Nahrávam...' : 'Kliknite alebo presuňte účtenku'}
          </label>

          <button 
            className="button button-secondary" 
            onClick={() => setShowManualInput(true)}
            disabled={uploading}
          >
            <span>✏️</span>
            Alebo zadajte manuálne
          </button>
        </>
      ) : (
        <>
          <textarea
            className="manual-input"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Napíšte položky účtenky, napr:&#10;chlieb 2.5&#10;mlieko 1.3&#10;jogurt 0.9"
            rows={6}
            disabled={uploading}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="button" 
              onClick={handleManualSubmit}
              disabled={uploading || !manualText.trim()}
              style={{ flex: 1 }}
            >
              <span>🤖</span>
              {uploading ? 'Spracovávam...' : 'Spracovať s AI'}
            </button>
            <button 
              className="button button-secondary" 
              onClick={() => {
                setShowManualInput(false)
                setManualText('')
                setError(null)
              }}
              disabled={uploading}
            >
              Zrušiť
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ReceiptUpload