import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts'
import { fetchChartData } from '../api'
import { colors, fonts } from '../theme'

const PERIODS = ['3m', '6m', '1y', '2y', '5y', '10y']

export default function Chart({ ticker, level, signal }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const priceLineRef = useRef(null)
  const [period, setPeriod] = useState('1y')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Create chart once on mount
  useEffect(() => {
    if (!containerRef.current) return

    try {
      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 350,
        layout: {
          background: { type: ColorType.Solid, color: colors.bgCard },
          textColor: colors.textDim,
          fontFamily: fonts.mono,
          fontSize: 10,
        },
        grid: {
          vertLines: { color: '#1a1a2e' },
          horzLines: { color: '#1a1a2e' },
        },
        crosshair: {
          mode: 0,
        },
        rightPriceScale: {
          borderColor: colors.border,
        },
        timeScale: {
          borderColor: colors.border,
          timeVisible: false,
        },
      })

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: colors.green,
        downColor: colors.red,
        borderUpColor: colors.green,
        borderDownColor: colors.red,
        wickUpColor: colors.green,
        wickDownColor: colors.red,
      })

      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      })

      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      })

      chartRef.current = { chart, candleSeries, volumeSeries }

      const handleResize = () => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth })
        }
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        chart.remove()
        chartRef.current = null
      }
    } catch (err) {
      console.error('Chart init error:', err)
      setError('Failed to initialize chart')
    }
  }, [])

  // Load data when ticker/period changes
  useEffect(() => {
    if (!chartRef.current) return
    const { candleSeries, volumeSeries, chart } = chartRef.current

    // Remove old price line
    if (priceLineRef.current) {
      try {
        candleSeries.removePriceLine(priceLineRef.current)
      } catch (_) {}
      priceLineRef.current = null
    }

    setLoading(true)
    setError(null)

    fetchChartData(ticker, period)
      .then(data => {
        if (!chartRef.current) return
        if (!data || data.length === 0) {
          setError('No chart data available')
          return
        }

        candleSeries.setData(data.map(d => ({
          time: d.time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        })))

        volumeSeries.setData(data.map(d => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? colors.green + '40' : colors.red + '40',
        })))

        // Draw horizontal price line at level
        if (level != null) {
          try {
            priceLineRef.current = candleSeries.createPriceLine({
              price: level,
              color: signal?.includes('high') ? colors.yellow : colors.orange,
              lineWidth: 1,
              lineStyle: 2,
              axisLabelVisible: true,
              title: `Level: $${level}`,
            })
          } catch (_) {}
        }

        chart.timeScale().fitContent()
      })
      .catch(err => {
        console.error('Chart data error:', err)
        setError('Failed to load chart data')
      })
      .finally(() => setLoading(false))
  }, [ticker, period, level, signal])

  if (error && !loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: colors.textDim, fontSize: 11 }}>
        {error}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: '4px 10px', border: 'none', borderRadius: 4,
            background: period === p ? colors.borderLight : 'transparent',
            color: period === p ? colors.textBright : colors.textDim,
            fontSize: 10, fontFamily: fonts.mono, cursor: 'pointer',
            fontWeight: period === p ? 600 : 400,
          }}>
            {p.toUpperCase()}
          </button>
        ))}
        {loading && (
          <span style={{ fontSize: 10, color: colors.textFaint, marginLeft: 8, alignSelf: 'center' }}>Loading...</span>
        )}
      </div>
      <div ref={containerRef} style={{ borderRadius: 6, overflow: 'hidden' }} />
    </div>
  )
}
