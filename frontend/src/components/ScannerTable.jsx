import { colors } from '../theme'
import StockRow from './StockRow'

const SortIcon = ({ active, dir }) => (
  <span style={{ marginLeft: 4, fontSize: 10, opacity: active ? 1 : 0.3 }}>
    {active ? (dir === 'asc' ? '\u25B2' : '\u25BC') : '\u21C5'}
  </span>
)

const COLUMNS = [
  { key: 'ticker', label: 'TICKER', w: 120 },
  { key: null, label: 'SIGNAL', w: 150 },
  { key: 'price', label: 'PRICE', w: 90 },
  { key: 'pctMove', label: '% MOVE', w: 80 },
  { key: null, label: 'LEVEL', w: 100 },
  { key: null, label: 'LEVEL SET', w: 100 },
  { key: 'days_stale', label: 'DAYS STALE', w: 95 },
  { key: 'breakout_date', label: 'BREAKOUT', w: 100 },
  { key: 'volume', label: 'VOLUME', w: 90 },
  { key: 'volRatio', label: 'VOL RATIO', w: 100 },
]

export default function ScannerTable({ results, sortCol, sortDir, onSort, selectedTicker, onSelect }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
            {COLUMNS.map(({ key, label, w }) => (
              <th key={label} onClick={key ? () => onSort(key) : undefined} style={{
                padding: '10px 12px', textAlign: 'left', fontSize: 9, color: colors.textDim,
                letterSpacing: '0.12em', fontWeight: 600, cursor: key ? 'pointer' : 'default',
                userSelect: 'none', width: w, whiteSpace: 'nowrap', background: '#06060b',
                position: 'sticky', top: 0, zIndex: 1,
              }}>
                {label}{key && <SortIcon active={sortCol === key} dir={sortDir} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((stock, idx) => (
            <StockRow
              key={stock.ticker}
              stock={stock}
              idx={idx}
              isSelected={selectedTicker === stock.ticker}
              onClick={() => onSelect(selectedTicker === stock.ticker ? null : stock.ticker)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
