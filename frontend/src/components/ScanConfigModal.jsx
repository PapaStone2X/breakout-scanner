import { useState } from 'react'
import { colors, fonts } from '../theme'

export default function ScanConfigModal({ onClose, onStart }) {
  const [universe, setUniverse] = useState('sp500')
  const [lookbackYears, setLookbackYears] = useState(10)
  const [staleDays, setStaleDays] = useState(252)
  const [recencyDays, setRecencyDays] = useState(5)
  const [customTickers, setCustomTickers] = useState('')

  const handleSubmit = () => {
    const params = {
      universe,
      lookback_years: lookbackYears,
      stale_days: staleDays,
      recency_days: recencyDays,
    }
    if (customTickers.trim()) {
      params.tickers = customTickers.split(/[,\s]+/).filter(Boolean).map(t => t.toUpperCase())
    }
    onStart(params)
  }

  const inputStyle = {
    padding: '8px 12px', background: colors.bgInput, border: `1px solid ${colors.borderLight}`,
    borderRadius: 4, color: colors.text, fontSize: 12, fontFamily: fonts.mono, width: '100%',
    outline: 'none',
  }

  const labelStyle = {
    fontSize: 10, color: colors.textDim, letterSpacing: '0.08em', marginBottom: 4, display: 'block',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 8,
        padding: 24, width: 420, maxWidth: '90vw',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 14, fontWeight: 700, color: colors.textBright, marginBottom: 20 }}>
          CONFIGURE SCAN
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={labelStyle}>UNIVERSE</label>
            <select value={universe} onChange={e => setUniverse(e.target.value)} style={inputStyle}>
              <option value="sp500">S&P 500</option>
              <option value="russell3000">Russell 3000</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>CUSTOM TICKERS (overrides universe)</label>
            <input type="text" value={customTickers} onChange={e => setCustomTickers(e.target.value)}
              placeholder="e.g. AAPL, MSFT, GE" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>LOOKBACK (years)</label>
              <input type="number" value={lookbackYears} onChange={e => setLookbackYears(+e.target.value)}
                min={1} max={20} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>STALE (trading days)</label>
              <input type="number" value={staleDays} onChange={e => setStaleDays(+e.target.value)}
                min={20} max={2520} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>RECENCY (trading days)</label>
              <input type="number" value={recencyDays} onChange={e => setRecencyDays(+e.target.value)}
                min={1} max={60} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', border: `1px solid ${colors.borderLight}`, borderRadius: 4,
            background: 'transparent', color: colors.textDim, fontSize: 11, fontFamily: fonts.mono,
            cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={handleSubmit} style={{
            padding: '8px 16px', border: 'none', borderRadius: 4,
            background: colors.green, color: '#000', fontSize: 11, fontFamily: fonts.mono,
            cursor: 'pointer', fontWeight: 700,
          }}>
            START SCAN
          </button>
        </div>
      </div>
    </div>
  )
}
