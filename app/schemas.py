from pydantic import BaseModel
from datetime import datetime


# --- Scan ---

class ScanCreate(BaseModel):
    universe: str = "sp500"
    lookback_years: int = 10
    stale_days: int = 252
    recency_days: int = 5
    tickers: list[str] | None = None


class ScanResultOut(BaseModel):
    id: int
    ticker: str
    name: str
    sector: str
    signal: str
    price: float
    ten_year_high: float
    ten_year_low: float
    level: float
    level_date: str
    days_stale: int
    breakout_date: str | None
    breakout_close: float | None
    pct_above: float | None
    pct_below: float | None
    pct_from_level: float | None
    volume: int
    avg_volume_20d: int

    class Config:
        from_attributes = True


class ScanOut(BaseModel):
    id: int
    started_at: datetime
    completed_at: datetime | None
    status: str
    universe: str
    lookback_years: int
    stale_days: int
    recency_days: int
    tickers_scanned: int
    tickers_downloaded: int
    progress: int
    error_message: str | None
    results: list[ScanResultOut] = []

    class Config:
        from_attributes = True


class ScanSummary(BaseModel):
    id: int
    started_at: datetime
    completed_at: datetime | None
    status: str
    universe: str
    tickers_scanned: int
    progress: int

    class Config:
        from_attributes = True


# --- Charts ---

class OHLCVPoint(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: int


# --- Watchlists ---

class WatchlistCreate(BaseModel):
    name: str


class WatchlistUpdate(BaseModel):
    name: str


class WatchlistTickerAdd(BaseModel):
    tickers: list[str]


class WatchlistTickerOut(BaseModel):
    id: int
    ticker: str
    added_at: datetime
    notes: str | None

    class Config:
        from_attributes = True


class WatchlistOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime
    tickers: list[WatchlistTickerOut] = []

    class Config:
        from_attributes = True


class WatchlistSummary(BaseModel):
    id: int
    name: str
    created_at: datetime
    ticker_count: int

    class Config:
        from_attributes = True
