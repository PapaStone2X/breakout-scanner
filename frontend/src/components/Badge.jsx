import { colors, fonts } from '../theme'

const CONFIG = {
  breakout_high: { label: '\u25B2 BREAKOUT HIGH', bg: colors.greenDark, border: colors.greenBorder, color: colors.green },
  breakout_low: { label: '\u25BC BREAKOUT LOW', bg: colors.redDark, border: colors.redBorder, color: colors.red },
  near_high: { label: '\u25C6 NEAR HIGH', bg: colors.yellowDark, border: colors.yellowBorder, color: colors.yellow },
  near_low: { label: '\u25C7 NEAR LOW', bg: colors.orangeDark, border: colors.orangeBorder, color: colors.orange },
}

export default function Badge({ signal }) {
  const c = CONFIG[signal] || { label: '\u2014', bg: colors.bgInput, border: '#374151', color: colors.textDim }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 8px', fontSize: 10,
      fontWeight: 700, letterSpacing: '0.08em',
      fontFamily: fonts.mono,
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 4, color: c.color,
    }}>
      {c.label}
    </span>
  )
}
