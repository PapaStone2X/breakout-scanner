import { useState } from 'react'
import { colors, fonts } from '../theme'

export default function WatchlistSelector({ ticker, watchlists, onAdd }) {
  const [open, setOpen] = useState(false)

  if (!watchlists || watchlists.length === 0) return null

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        padding: '4px 10px', border: `1px solid ${colors.borderLight}`, borderRadius: 4,
        background: 'transparent', color: colors.textDim, fontSize: 10, fontFamily: fonts.mono,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        + Watchlist
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 6,
          padding: 4, minWidth: 150, zIndex: 10,
        }}>
          {watchlists.map(wl => (
            <div key={wl.id}
              onClick={() => { onAdd(wl.id, ticker); setOpen(false) }}
              style={{
                padding: '6px 10px', fontSize: 11, color: colors.text, cursor: 'pointer',
                borderRadius: 4, fontFamily: fonts.mono,
              }}
              onMouseEnter={e => e.currentTarget.style.background = colors.bgInput}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {wl.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
