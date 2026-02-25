import { useState, useEffect } from 'react'
import { colors, fonts } from '../theme'
import { fetchScans, deleteScan, fetchScan } from '../api'

const STATUS_COLORS = {
  running: colors.blue,
  completed: colors.green,
  failed: colors.red,
}

const STATUS_BG = {
  running: colors.blueDark,
  completed: colors.greenDark,
  failed: colors.redDark,
}

const STATUS_BORDER = {
  running: colors.blueBorder,
  completed: colors.greenBorder,
  failed: colors.redBorder,
}

function formatDuration(start, end) {
  if (!start) return '\u2014'
  const s = new Date(start)
  const e = end ? new Date(end) : new Date()
  const sec = Math.round((e - s) / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const rem = sec % 60
  return `${min}m ${rem}s`
}

function formatTime(dt) {
  if (!dt) return '\u2014'
  return new Date(dt).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function ScanHistory({ onClose, onLoadScan }) {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetchScans().then(setScans).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // Auto-refresh if any scans are running
    const interval = setInterval(() => {
      fetchScans().then(data => {
        setScans(data)
        if (!data.some(s => s.status === 'running')) clearInterval(interval)
      }).catch(() => {})
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleDelete = async (id) => {
    await deleteScan(id)
    load()
  }

  const handleLoad = async (id) => {
    const scan = await fetchScan(id)
    onLoadScan(scan)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 8,
        padding: 24, width: 700, maxWidth: '95vw', maxHeight: '85vh', overflow: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.textBright }}>
            SCAN HISTORY
          </div>
          <button onClick={onClose} style={{
            padding: '4px 12px', border: `1px solid ${colors.borderLight}`, borderRadius: 4,
            background: 'transparent', color: colors.textDim, fontSize: 11, fontFamily: fonts.mono,
            cursor: 'pointer',
          }}>
            Close
          </button>
        </div>

        {loading && scans.length === 0 && (
          <div style={{ textAlign: 'center', color: colors.textDim, fontSize: 11, padding: 20 }}>Loading...</div>
        )}

        {!loading && scans.length === 0 && (
          <div style={{ textAlign: 'center', color: colors.textDim, fontSize: 11, padding: 40 }}>
            No scans yet. Click "RUN SCAN" to start your first scan.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {scans.map(scan => (
            <div key={scan.id} style={{
              padding: 16, background: colors.bg, border: `1px solid ${colors.border}`,
              borderRadius: 6, borderLeft: `3px solid ${STATUS_BORDER[scan.status] || colors.border}`,
            }}>
              {/* Row 1: Status + time + actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 8px', fontSize: 9,
                    fontWeight: 700, letterSpacing: '0.08em', fontFamily: fonts.mono,
                    background: STATUS_BG[scan.status], border: `1px solid ${STATUS_BORDER[scan.status]}`,
                    borderRadius: 4, color: STATUS_COLORS[scan.status], textTransform: 'uppercase',
                  }}>
                    {scan.status === 'running' && '\u25CF '}
                    {scan.status}
                  </span>
                  <span style={{ fontSize: 11, color: colors.textMuted }}>
                    #{scan.id}
                  </span>
                  <span style={{ fontSize: 10, color: colors.textDim }}>
                    {formatTime(scan.started_at)}
                  </span>
                  <span style={{ fontSize: 10, color: colors.textFaint }}>
                    ({formatDuration(scan.started_at, scan.completed_at)})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {scan.status === 'completed' && (
                    <button onClick={() => handleLoad(scan.id)} style={{
                      padding: '4px 10px', border: `1px solid ${colors.greenBorder}`, borderRadius: 4,
                      background: colors.greenDark, color: colors.green, fontSize: 10,
                      fontFamily: fonts.mono, cursor: 'pointer', fontWeight: 600,
                    }}>
                      Load Results
                    </button>
                  )}
                  {scan.status !== 'running' && (
                    <button onClick={() => handleDelete(scan.id)} style={{
                      padding: '4px 10px', border: `1px solid ${colors.borderLight}`, borderRadius: 4,
                      background: 'transparent', color: colors.textFaint, fontSize: 10,
                      fontFamily: fonts.mono, cursor: 'pointer',
                    }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Params */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                {[
                  { label: 'UNIVERSE', value: scan.universe },
                  { label: 'LOOKBACK', value: `${scan.lookback_years}yr` },
                  { label: 'STALE', value: `${scan.stale_days}d` },
                  { label: 'RECENCY', value: `${scan.recency_days}d` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 8, color: colors.textFaint, letterSpacing: '0.1em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Row 3: Progress / results / diagnostics */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {scan.status === 'running' && (
                  <>
                    <div style={{ flex: 1, height: 4, background: colors.bgInput, borderRadius: 2 }}>
                      <div style={{
                        width: `${scan.progress}%`, height: '100%',
                        background: colors.blue, borderRadius: 2, transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 10, color: colors.blue, fontWeight: 600, minWidth: 35 }}>
                      {scan.progress}%
                    </span>
                  </>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 10, color: colors.textDim }}>
                    Scanned: <strong style={{ color: colors.textMuted }}>{scan.tickers_scanned}</strong>
                  </span>
                  <span style={{ fontSize: 10, color: colors.textDim }}>
                    Downloaded: <strong style={{ color: scan.tickers_downloaded > 0 ? colors.textMuted : colors.red }}>
                      {scan.tickers_downloaded}
                    </strong>
                  </span>
                  {scan.status === 'completed' && (
                    <span style={{ fontSize: 10, color: colors.textDim }}>
                      Signals: <strong style={{ color: scan.result_count > 0 ? colors.green : colors.yellow }}>
                        {scan.result_count}
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Error message */}
              {scan.error_message && (
                <div style={{
                  marginTop: 8, padding: '8px 10px', background: colors.redDark,
                  border: `1px solid ${colors.redBorder}`, borderRadius: 4,
                  fontSize: 10, color: colors.red, lineHeight: 1.5,
                  fontFamily: fonts.mono, wordBreak: 'break-word',
                }}>
                  {scan.error_message}
                </div>
              )}

              {/* Diagnostic: completed with 0 results */}
              {scan.status === 'completed' && scan.result_count === 0 && !scan.error_message && (
                <div style={{
                  marginTop: 8, padding: '8px 10px', background: colors.yellowDark,
                  border: `1px solid ${colors.yellowBorder}`, borderRadius: 4,
                  fontSize: 10, color: colors.yellow, lineHeight: 1.5,
                }}>
                  No signals found.
                  {scan.tickers_downloaded === 0
                    ? ' No ticker data was downloaded \u2014 the universe may not be available (e.g. Russell 3000 requires a local ticker file).'
                    : scan.tickers_downloaded < scan.tickers_scanned
                      ? ` Only ${scan.tickers_downloaded} of ${scan.tickers_scanned} tickers downloaded successfully. Some tickers may have insufficient data.`
                      : ' All tickers were analyzed but none matched the breakout/near criteria with the current params. Try adjusting stale days or recency window.'
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
