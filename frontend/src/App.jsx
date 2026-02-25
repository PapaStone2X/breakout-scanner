import { useState, useEffect, useMemo } from 'react'
import { colors, fonts } from './theme'
import {
  fetchLatestScan, startScan, fetchScanStatus, fetchScan,
  fetchWatchlists, createWatchlist, deleteWatchlist, updateWatchlist,
  fetchWatchlist, addTickersToWatchlist, removeTickerFromWatchlist,
} from './api'
import Header from './components/Header'
import StatsBar from './components/StatsBar'
import FilterControls from './components/FilterControls'
import ScannerTable from './components/ScannerTable'
import DetailPanel from './components/DetailPanel'
import ScanConfigModal from './components/ScanConfigModal'
import WatchlistPanel from './components/WatchlistPanel'

export default function App() {
  const [scan, setScan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sector, setSector] = useState('All')
  const [sortCol, setSortCol] = useState('pctMove')
  const [sortDir, setSortDir] = useState('desc')
  const [search, setSearch] = useState('')
  const [selectedTicker, setSelectedTicker] = useState(null)
  const [showScanModal, setShowScanModal] = useState(false)
  const [scanning, setScanning] = useState(null)

  // Watchlists
  const [watchlists, setWatchlists] = useState([])
  const [activeWatchlist, setActiveWatchlist] = useState(null)
  const [watchlistDetail, setWatchlistDetail] = useState(null)

  // Load initial data
  useEffect(() => {
    fetchLatestScan()
      .then(data => setScan(data))
      .catch(() => {})
      .finally(() => setLoading(false))
    loadWatchlists()
  }, [])

  const loadWatchlists = () => {
    fetchWatchlists().then(setWatchlists).catch(() => {})
  }

  // Load watchlist detail when selected
  useEffect(() => {
    if (activeWatchlist) {
      fetchWatchlist(activeWatchlist).then(setWatchlistDetail).catch(() => {})
    } else {
      setWatchlistDetail(null)
    }
  }, [activeWatchlist])

  // Scan polling
  useEffect(() => {
    if (!scanning || scanning.status !== 'running') return
    const interval = setInterval(() => {
      fetchScanStatus(scanning.id).then(status => {
        setScanning(status)
        if (status.status === 'completed') {
          fetchScan(status.id).then(setScan)
        }
      }).catch(() => {})
    }, 3000)
    return () => clearInterval(interval)
  }, [scanning])

  const handleStartScan = async (params) => {
    setShowScanModal(false)
    try {
      const result = await startScan(params)
      setScanning({ id: result.id, progress: 0, status: 'running' })
    } catch (err) {
      console.error('Failed to start scan:', err)
    }
  }

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const handleAddToWatchlist = async (wlId, ticker) => {
    try {
      await addTickersToWatchlist(wlId, [ticker])
      loadWatchlists()
      if (activeWatchlist === wlId) {
        fetchWatchlist(wlId).then(setWatchlistDetail)
      }
    } catch (err) {
      console.error('Failed to add to watchlist:', err)
    }
  }

  const results = scan?.results || []

  const filtered = useMemo(() => {
    let d = [...results]
    if (filter === 'breakouts') d = d.filter(s => s.signal === 'breakout_high' || s.signal === 'breakout_low')
    else if (filter === 'high') d = d.filter(s => s.signal === 'breakout_high')
    else if (filter === 'low') d = d.filter(s => s.signal === 'breakout_low')
    else if (filter === 'near') d = d.filter(s => s.signal === 'near_high' || s.signal === 'near_low')
    if (sector !== 'All') d = d.filter(s => s.sector === sector)
    if (search) {
      const q = search.toUpperCase()
      d = d.filter(s => s.ticker.includes(q) || s.name.toUpperCase().includes(q))
    }
    if (activeWatchlist && watchlistDetail) {
      const wlTickers = new Set(watchlistDetail.tickers.map(t => t.ticker))
      d = d.filter(s => wlTickers.has(s.ticker))
    }
    d.sort((a, b) => {
      let va, vb
      switch (sortCol) {
        case 'ticker': va = a.ticker; vb = b.ticker; return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
        case 'price': va = a.price; vb = b.price; break
        case 'volume': va = a.volume || 0; vb = b.volume || 0; break
        case 'volRatio': va = (a.volume || 0) / (a.avg_volume_20d || 1); vb = (b.volume || 0) / (b.avg_volume_20d || 1); break
        case 'days_stale': va = a.days_stale || 0; vb = b.days_stale || 0; break
        case 'breakout_date': va = a.breakout_date ? new Date(a.breakout_date).getTime() : 0; vb = b.breakout_date ? new Date(b.breakout_date).getTime() : 0; break
        case 'pctMove': va = a.pct_above ?? a.pct_below ?? a.pct_from_level ?? 0; vb = b.pct_above ?? b.pct_below ?? b.pct_from_level ?? 0; break
        default: va = 0; vb = 0
      }
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return 0
    })
    return d
  }, [results, filter, sector, sortCol, sortDir, search, activeWatchlist, watchlistDetail])

  const counts = useMemo(() => ({
    breakout_high: results.filter(s => s.signal === 'breakout_high').length,
    breakout_low: results.filter(s => s.signal === 'breakout_low').length,
    near_high: results.filter(s => s.signal === 'near_high').length,
    near_low: results.filter(s => s.signal === 'near_low').length,
  }), [results])

  const selectedStock = selectedTicker ? results.find(s => s.ticker === selectedTicker) : null

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: colors.bg, color: colors.textDim,
        fontFamily: fonts.mono, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: colors.bg, color: colors.text,
      fontFamily: fonts.mono,
    }}>
      <Header
        params={scan ? { tickers_scanned: scan.tickers_scanned } : null}
        scanTime={scan?.started_at}
        onRunScan={() => setShowScanModal(true)}
      />

      {scanning && scanning.status === 'running' && (
        <div style={{
          padding: '10px 24px', background: colors.blueDark, borderBottom: `1px solid ${colors.blueBorder}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: colors.blue,
            animation: 'pulse 1s infinite',
          }} />
          <span style={{ fontSize: 11, color: colors.blue }}>
            Scan in progress... {scanning.progress}%
          </span>
          <div style={{ flex: 1, height: 4, background: colors.bgInput, borderRadius: 2 }}>
            <div style={{
              width: `${scanning.progress}%`, height: '100%',
              background: colors.blue, borderRadius: 2, transition: 'width 0.5s ease',
            }} />
          </div>
          {scanning.tickers_downloaded > 0 && (
            <span style={{ fontSize: 10, color: colors.textDim }}>
              {scanning.tickers_downloaded}/{scanning.tickers_scanned} tickers
            </span>
          )}
        </div>
      )}

      <StatsBar counts={counts} total={results.length} scanned={scan?.tickers_scanned || 0} />

      <WatchlistPanel
        watchlists={watchlists}
        activeWatchlist={activeWatchlist}
        watchlistDetail={watchlistDetail}
        onSelect={setActiveWatchlist}
        onCreate={async (name) => { await createWatchlist(name); loadWatchlists() }}
        onDelete={async (id) => {
          await deleteWatchlist(id)
          if (activeWatchlist === id) setActiveWatchlist(null)
          loadWatchlists()
        }}
        onRename={async (id, name) => { await updateWatchlist(id, name); loadWatchlists() }}
        onRemoveTicker={async (wlId, ticker) => {
          await removeTickerFromWatchlist(wlId, ticker)
          loadWatchlists()
          if (activeWatchlist === wlId) fetchWatchlist(wlId).then(setWatchlistDetail)
        }}
      />

      <FilterControls
        filter={filter} setFilter={setFilter}
        sector={sector} setSector={setSector}
        search={search} setSearch={setSearch}
        count={filtered.length}
      />

      <ScannerTable
        results={filtered}
        sortCol={sortCol} sortDir={sortDir} onSort={handleSort}
        selectedTicker={selectedTicker} onSelect={setSelectedTicker}
      />

      <DetailPanel
        stock={selectedStock}
        watchlists={watchlists}
        onAddToWatchlist={handleAddToWatchlist}
      />

      <div style={{
        padding: '16px 24px', borderTop: `1px solid ${colors.border}`,
        fontSize: 9, color: colors.textFaint, letterSpacing: '0.05em',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>10Y Consolidation Breakout Scanner &bull; S&P 500</span>
        <span>10Y lookback &bull; Level stale &ge;252 trading days &bull; Breakout in last 5 days &bull; Closes only</span>
      </div>

      {showScanModal && (
        <ScanConfigModal
          onClose={() => setShowScanModal(false)}
          onStart={handleStartScan}
        />
      )}
    </div>
  )
}
