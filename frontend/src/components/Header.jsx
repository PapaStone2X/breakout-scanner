import { colors, fonts } from '../theme'

export default function Header({ params, scanTime, onRunScan }) {
  const scanDate = scanTime ? new Date(scanTime).toLocaleString() : 'No scans yet'
  return (
    <div style={{
      borderBottom: `1px solid ${colors.border}`, padding: '16px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'linear-gradient(180deg, #0f0f1a 0%, #0a0a0f 100%)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: colors.green,
          boxShadow: `0 0 8px ${colors.green}66`, animation: 'pulse 2s infinite',
        }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', color: colors.textBright }}>
            10Y CONSOLIDATION BREAKOUT SCANNER
          </div>
          <div style={{ fontSize: 10, color: colors.textDim, marginTop: 2, letterSpacing: '0.1em' }}>
            S&P 500 &bull; 10-YEAR HIGH/LOW STALE &ge;1YR &bull; BROKEN IN LAST 5 DAYS
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: colors.textFaint, letterSpacing: '0.05em' }}>
          {params ? `${params.tickers_scanned} TICKERS` : ''} &bull; {scanDate}
        </div>
        <button onClick={onRunScan} style={{
          padding: '6px 14px', borderRadius: 4, fontSize: 10,
          background: colors.blueDark, border: `1px solid ${colors.blueBorder}`, color: colors.blue,
          letterSpacing: '0.05em', cursor: 'pointer', fontFamily: fonts.mono, fontWeight: 600,
        }}>
          RUN SCAN
        </button>
      </div>
    </div>
  )
}
