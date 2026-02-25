import { colors } from '../theme'
import Badge from './Badge'
import VolBar from './VolBar'

const formatNumber = (n) => {
  if (!n) return '\u2014'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toString()
}

const daysBetween = (dateStr) => {
  if (!dateStr) return null
  return Math.floor((new Date() - new Date(dateStr)) / 86400000)
}

export default function StockRow({ stock, idx, isSelected, onClick }) {
  const isHigh = stock.signal === 'breakout_high' || stock.signal === 'near_high'
  const rowBg = isSelected ? colors.bgInput : idx % 2 === 0 ? colors.bg : colors.bgAlt
  const pctVal = stock.pct_above ?? stock.pct_below ?? stock.pct_from_level ?? 0

  return (
    <tr
      onClick={onClick}
      style={{ borderBottom: `1px solid ${colors.bgInput}`, background: rowBg, cursor: 'pointer', transition: 'background 0.1s ease' }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = colors.bgInput }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = rowBg }}
    >
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: 700, color: colors.textBright, fontSize: 13 }}>{stock.ticker}</div>
        <div style={{ fontSize: 9, color: colors.textDim, marginTop: 1, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stock.name}
        </div>
      </td>
      <td style={{ padding: '10px 12px' }}><Badge signal={stock.signal} /></td>
      <td style={{
        padding: '10px 12px', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
        color: stock.signal === 'breakout_high' ? colors.green : stock.signal === 'breakout_low' ? colors.red : colors.text,
      }}>
        ${stock.price.toFixed(2)}
      </td>
      <td style={{
        padding: '10px 12px', fontVariantNumeric: 'tabular-nums', fontSize: 11,
        color: isHigh ? colors.green : colors.red,
      }}>
        {isHigh ? `+${pctVal}%` : `-${pctVal}%`}
      </td>
      <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums', fontSize: 11, color: colors.textMuted }}>
        ${stock.level.toFixed(2)}
      </td>
      <td style={{ padding: '10px 12px', fontSize: 11, color: colors.textDim }}>
        {stock.level_date}
      </td>
      <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>
        <span style={{
          color: stock.days_stale > 500 ? colors.purpleVivid : stock.days_stale > 365 ? colors.purpleLight : colors.purple,
          fontWeight: 600,
        }}>
          {stock.days_stale}d
        </span>
        {stock.days_stale > 500 && (
          <span style={{ fontSize: 9, color: colors.purpleBright, marginLeft: 4 }}>
            ({(stock.days_stale / 252).toFixed(1)}yr)
          </span>
        )}
      </td>
      <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>
        {stock.breakout_date ? (
          <span style={{
            color: daysBetween(stock.breakout_date) <= 1 ? colors.yellow : colors.textMuted,
            fontWeight: daysBetween(stock.breakout_date) <= 1 ? 700 : 400,
          }}>
            {stock.breakout_date}
          </span>
        ) : (
          <span style={{ color: colors.textFaint }}>{'\u2014'}</span>
        )}
      </td>
      <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums', fontSize: 11, color: colors.textMuted }}>
        {formatNumber(stock.volume)}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <VolBar current={stock.volume} average={stock.avg_volume_20d} />
      </td>
    </tr>
  )
}
