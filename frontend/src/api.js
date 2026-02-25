const BASE = '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  if (res.status === 204) return null;
  return res.json();
}

// --- Scans ---

export const fetchScans = () => request('/api/scans');

export const fetchLatestScan = () => request('/api/scans/latest');

export const fetchScan = (id) => request(`/api/scans/${id}`);

export const fetchScanStatus = (id) => request(`/api/scans/${id}/status`);

export const startScan = (params) =>
  request('/api/scans', { method: 'POST', body: JSON.stringify(params) });

export const deleteScan = (id) =>
  request(`/api/scans/${id}`, { method: 'DELETE' });

// --- Charts ---

export const fetchChartData = (ticker, period = '1y') =>
  request(`/api/charts/${ticker}?period=${period}`);

// --- Watchlists ---

export const fetchWatchlists = () => request('/api/watchlists');

export const createWatchlist = (name) =>
  request('/api/watchlists', { method: 'POST', body: JSON.stringify({ name }) });

export const fetchWatchlist = (id) => request(`/api/watchlists/${id}`);

export const updateWatchlist = (id, name) =>
  request(`/api/watchlists/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });

export const deleteWatchlist = (id) =>
  request(`/api/watchlists/${id}`, { method: 'DELETE' });

export const addTickersToWatchlist = (id, tickers) =>
  request(`/api/watchlists/${id}/tickers`, { method: 'POST', body: JSON.stringify({ tickers }) });

export const removeTickerFromWatchlist = (id, ticker) =>
  request(`/api/watchlists/${id}/tickers/${ticker}`, { method: 'DELETE' });
