import { colors } from '../theme'
import Badge from './Badge'
import Chart from './Chart'
import WatchlistSelector from './WatchlistSelector'

export default function DetailPanel({ stock, watchlists, onAddToWatchlist }) {
  if (!stock) return null

  const stats = [
    { label: 'CURRENT', value: `$${stock.price.toFixed(2)}`, color: stock.signal.includes('high') ? colors.green : colors.red },
    { label: '10Y HIGH', value: `$${stock.ten_year_high.toFixed(2)}`, color: colors.textMuted },
    { label: '10Y LOW', value: `$${stock.ten_year_low.toFixed(2)}`, color: colors.textMuted },
    { label: 'LEVEL', value: `$${stock.level.toFixed(2)}`, color: colors.purpleLight },
    { label: 'DAYS STALE', value: `${stock.days_stale}`, color: colors.purpleLight },
    { label: 'VOL vs AVG', value: stock.avg_volume_20d ? `${(stock.volume / stock.avg_volume_20d).toFixed(1)}x` : '\u2014', color: (stock.volume / (stock.avg_volume_20d || 1)) > 1.5 ? colors.cyan : colors.textMuted },
  ]

  return (
    <div style={{
      margin: '0 24px 24px', padding: 20,
      background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.textBright }}>
            {stock.ticker} <span style={{ fontWeight: 400, color: colors.textDim, fontSize: 13 }}>&mdash; {stock.name}</span>
          </div>
          <div style={{ fontSize: 10, color: colors.textDim, marginTop: 4, letterSpacing: '0.05em' }}>{stock.sector}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <WatchlistSelector ticker={stock.ticker} watchlists={watchlists} onAdd={onAddToWatchlist} />
          <Badge signal={stock.signal} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 16 }}>
        {stats.map(({ label, value, color }) => (
          <div key={label}>
            <div style={{ fontSize: 9, color: colors.textDim, letterSpacing: '0.12em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <Chart ticker={stock.ticker} level={stock.level} signal={stock.signal} />

      {/* Signal narrative */}
      {(stock.signal === 'breakout_high' || stock.signal === 'breakout_low') && (
        <div style={{
          padding: 12, background: colors.bgInput, borderRadius: 6, marginTop: 16,
          fontSize: 11, color: colors.textMuted, lineHeight: 1.6,
          borderLeft: `3px solid ${stock.signal === 'breakout_high' ? colors.greenBorder : colors.redBorder}`,
        }}>
          <strong style={{ color: colors.textBright }}>Signal:</strong> {stock.ticker}'s 10-year closing {stock.signal === 'breakout_high' ? 'high' : 'low'} of ${stock.level.toFixed(2)} was set on {stock.level_date} &mdash; <strong style={{ color: colors.purpleLight }}>{stock.days_stale} trading days ago</strong> ({(stock.days_stale / 252).toFixed(1)} years).
          The stock never {stock.signal === 'breakout_high' ? 'exceeded' : 'breached'} that level until {stock.breakout_date}, when it closed at ${stock.breakout_close?.toFixed(2)} on {((stock.volume || 0) / (stock.avg_volume_20d || 1)).toFixed(1)}x average volume.
          Currently {stock.pct_above ? `+${stock.pct_above}%` : `-${stock.pct_below}%`} beyond the level.
        </div>
      )}

      {(stock.signal === 'near_high' || stock.signal === 'near_low') && (
        <div style={{
          padding: 12, background: colors.bgInput, borderRadius: 6, marginTop: 16,
          fontSize: 11, color: colors.textMuted, lineHeight: 1.6,
          borderLeft: `3px solid ${stock.signal === 'near_high' ? colors.yellowBorder : colors.orangeBorder}`,
        }}>
          <strong style={{ color: colors.textBright }}>Watchlist:</strong> {stock.ticker}'s 10-year closing {stock.signal === 'near_high' ? 'high' : 'low'} of ${stock.level.toFixed(2)} has been untouched since {stock.level_date} ({stock.days_stale} trading days).
          Currently {stock.pct_from_level}% away. A {stock.signal === 'near_high' ? 'close above' : 'close below'} ${stock.level.toFixed(2)} triggers the signal.
        </div>
      )}
    </div>
  )
}
