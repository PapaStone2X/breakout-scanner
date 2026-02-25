import { useState } from 'react'
import { colors, fonts } from '../theme'

export default function WatchlistPanel({
  watchlists,
  activeWatchlist,
  watchlistDetail,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onRemoveTicker,
}) {
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState(null)
  const [editName, setEditName] = useState('')

  const handleCreate = () => {
    if (newName.trim()) {
      onCreate(newName.trim())
      setNewName('')
    }
  }

  const handleRename = (id) => {
    if (editName.trim()) {
      onRename(id, editName.trim())
      setEditing(null)
    }
  }

  return (
    <div style={{
      padding: '16px 24px', borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: colors.textBright, letterSpacing: '0.05em' }}>
          WATCHLISTS
        </div>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="New watchlist..." onKeyDown={e => e.key === 'Enter' && handleCreate()}
            style={{
              padding: '4px 8px', background: colors.bgInput, border: `1px solid ${colors.borderLight}`,
              borderRadius: 4, color: colors.text, fontSize: 10, fontFamily: fonts.mono, width: 140, outline: 'none',
            }}
          />
          <button onClick={handleCreate} style={{
            padding: '4px 10px', border: 'none', borderRadius: 4,
            background: colors.green, color: '#000', fontSize: 10, fontFamily: fonts.mono,
            cursor: 'pointer', fontWeight: 600,
          }}>
            +
          </button>
        </div>
      </div>

      {watchlists.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: watchlistDetail ? 12 : 0 }}>
          <button
            onClick={() => onSelect(null)}
            style={{
              padding: '4px 10px', borderRadius: 4, fontSize: 10, fontFamily: fonts.mono,
              border: activeWatchlist === null ? `1px solid ${colors.purple}` : `1px solid ${colors.borderLight}`,
              background: activeWatchlist === null ? colors.purple + '20' : 'transparent',
              color: activeWatchlist === null ? colors.purple : colors.textDim,
              cursor: 'pointer',
            }}
          >
            All
          </button>
          {watchlists.map(wl => (
            <div key={wl.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {editing === wl.id ? (
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  onBlur={() => handleRename(wl.id)} onKeyDown={e => e.key === 'Enter' && handleRename(wl.id)}
                  autoFocus style={{
                    padding: '4px 8px', background: colors.bgInput, border: `1px solid ${colors.purple}`,
                    borderRadius: 4, color: colors.text, fontSize: 10, fontFamily: fonts.mono, width: 100, outline: 'none',
                  }}
                />
              ) : (
                <button
                  onClick={() => onSelect(wl.id)}
                  onDoubleClick={() => { setEditing(wl.id); setEditName(wl.name) }}
                  style={{
                    padding: '4px 10px', borderRadius: 4, fontSize: 10, fontFamily: fonts.mono,
                    border: activeWatchlist === wl.id ? `1px solid ${colors.purple}` : `1px solid ${colors.borderLight}`,
                    background: activeWatchlist === wl.id ? colors.purple + '20' : 'transparent',
                    color: activeWatchlist === wl.id ? colors.purple : colors.textDim,
                    cursor: 'pointer',
                  }}
                >
                  {wl.name} ({wl.ticker_count})
                </button>
              )}
              <button onClick={() => onDelete(wl.id)} style={{
                padding: '2px 6px', border: 'none', background: 'transparent',
                color: colors.textFaint, fontSize: 10, cursor: 'pointer', fontFamily: fonts.mono,
              }}>
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {watchlistDetail && watchlistDetail.tickers.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {watchlistDetail.tickers.map(t => (
            <span key={t.ticker} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', background: colors.bgInput, border: `1px solid ${colors.borderLight}`,
              borderRadius: 4, fontSize: 10, color: colors.text, fontFamily: fonts.mono,
            }}>
              {t.ticker}
              <span onClick={() => onRemoveTicker(watchlistDetail.id, t.ticker)} style={{
                cursor: 'pointer', color: colors.textFaint, marginLeft: 2,
              }}>x</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
