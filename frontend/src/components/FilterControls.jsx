import { colors, fonts } from '../theme'

const SECTORS = [
  'All', 'Technology', 'Health Care', 'Financials', 'Energy',
  'Consumer Discretionary', 'Industrials', 'Materials', 'Utilities',
  'Real Estate', 'Communication Services', 'Consumer Staples',
]

const FILTERS = [
  { key: 'breakouts', label: 'Breakouts' },
  { key: 'high', label: '\u25B2 Highs' },
  { key: 'low', label: '\u25BC Lows' },
  { key: 'near', label: '\u25C6 Near' },
  { key: 'all', label: 'All Signals' },
]

export default function FilterControls({ filter, setFilter, sector, setSector, search, setSearch, count, onExport }) {
  return (
    <div style={{
      padding: '12px 24px', display: 'flex', gap: 12, alignItems: 'center',
      borderBottom: `1px solid ${colors.border}`, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', gap: 2, background: colors.bgInput, borderRadius: 6, padding: 2 }}>
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: '6px 14px', border: 'none', borderRadius: 4,
            background: filter === key ? colors.borderLight : 'transparent',
            color: filter === key ? colors.textBright : colors.textDim,
            fontSize: 11, fontFamily: fonts.mono, cursor: 'pointer',
            fontWeight: filter === key ? 600 : 400, transition: 'all 0.15s ease',
            letterSpacing: '0.02em',
          }}>
            {label}
          </button>
        ))}
      </div>
      <select value={sector} onChange={e => setSector(e.target.value)} style={{
        padding: '6px 12px', background: colors.bgInput, border: `1px solid ${colors.borderLight}`,
        borderRadius: 4, color: colors.text, fontSize: 11, fontFamily: fonts.mono, cursor: 'pointer',
      }}>
        {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <input type="text" placeholder="Search ticker or name..." value={search}
        onChange={e => setSearch(e.target.value)} style={{
          padding: '6px 12px', background: colors.bgInput, border: `1px solid ${colors.borderLight}`,
          borderRadius: 4, color: colors.text, fontSize: 11, fontFamily: fonts.mono, width: 200, outline: 'none',
        }}
      />
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 10, color: colors.textFaint }}>
          {count} result{count !== 1 ? 's' : ''}
        </span>
        {count > 0 && (
          <button onClick={onExport} style={{
            padding: '5px 12px', border: `1px solid ${colors.borderLight}`, borderRadius: 4,
            background: 'transparent', color: colors.textDim, fontSize: 10,
            fontFamily: fonts.mono, cursor: 'pointer', fontWeight: 500,
          }}>
            EXPORT CSV
          </button>
        )}
      </div>
    </div>
  )
}
