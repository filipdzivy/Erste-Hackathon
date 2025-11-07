import { useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Receipt } from '../App.tsx'
import './ReceiptUpload.css'

interface Props {
  onReceiptUpload: (receipt: Receipt) => void
}

const ReceiptUpload = ({ onReceiptUpload }: Props) => {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Simulate receipt parsing (in real app, this would call OCR/LLM API)
    setTimeout(() => {
      const mockReceipt: Receipt = {
        id: Date.now().toString(),
        name: file.name,
        date: new Date(),
        items: [
          { name: 'Chlieb celozrnný', price: 2.49, quantity: 1 },
          { name: 'Mlieko 1L', price: 1.29, quantity: 2 },
          { name: 'Jogurt biely', price: 0.89, quantity: 4 },
          { name: 'Paradajky', price: 3.45, quantity: 1 },
        ],
        total: Math.random() * 100 + 10,
        category: 'Potraviny',
        imageUrl: URL.createObjectURL(file)
      }
      
      onReceiptUpload(mockReceipt)
      setUploading(false)
      setTimeout(() => setPreview(null), 2000)
    }, 1500)
  }

  return (
    <div className="card receipt-upload">
      <h2>
        <span>📄</span>
        Nahrať účtenku
      </h2>
      
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

      <div className="upload-info">
        <p>Podporované formáty: JPG, PNG, PDF</p>
        <p>Maximálna veľkosť: 10MB</p>
      </div>
    </div>
  )
}

export default ReceiptUpload