import { colors } from '../theme'

export default function VolBar({ current, average }) {
  if (!current || !average) return <span style={{ color: colors.textFaint, fontSize: 11 }}>{'\u2014'}</span>
  const ratio = current / average
  const width = Math.min(ratio / 3 * 100, 100)
  const color = ratio > 2 ? colors.cyan : ratio > 1.3 ? colors.purple : colors.textFaint
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 6, background: '#1e1e2e', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 11, color: ratio > 1.5 ? colors.cyan : colors.textDim, fontVariantNumeric: 'tabular-nums' }}>
        {ratio.toFixed(1)}x
      </span>
    </div>
  )
}
