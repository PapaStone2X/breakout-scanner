import { colors } from '../theme'

export default function StatsBar({ counts, total, scanned }) {
  const items = [
    { label: 'BREAKOUT HIGHS', value: counts.breakout_high, color: colors.green, sub: '10Y high broken after 1yr+ stale' },
    { label: 'BREAKOUT LOWS', value: counts.breakout_low, color: colors.red, sub: '10Y low broken after 1yr+ stale' },
    { label: 'NEAR HIGHS', value: counts.near_high, color: colors.yellow, sub: 'Within 2% of stale 10Y high' },
    { label: 'NEAR LOWS', value: counts.near_low, color: colors.orange, sub: 'Within 2% of stale 10Y low' },
    { label: 'TOTAL SIGNALS', value: total, color: colors.purple, sub: `of ${scanned} scanned` },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, background: colors.border }}>
      {items.map(({ label, value, color, sub }) => (
        <div key={label} style={{ padding: '16px 24px', background: colors.bg }}>
          <div style={{ fontSize: 9, color: colors.textDim, letterSpacing: '0.12em', marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          <div style={{ fontSize: 9, color: colors.textFaint, marginTop: 6, letterSpacing: '0.02em' }}>{sub}</div>
        </div>
      ))}
    </div>
  )
}
