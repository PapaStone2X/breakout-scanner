from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="running")  # running / completed / failed
    universe = Column(String, default="sp500")
    lookback_years = Column(Integer, default=10)
    stale_days = Column(Integer, default=252)
    recency_days = Column(Integer, default=5)
    tickers_scanned = Column(Integer, default=0)
    tickers_downloaded = Column(Integer, default=0)
    progress = Column(Integer, default=0)  # 0-100
    error_message = Column(Text, nullable=True)

    results = relationship("ScanResult", back_populates="scan", cascade="all, delete-orphan")


class ScanResult(Base):
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"))
    ticker = Column(String, index=True)
    name = Column(String, default="")
    sector = Column(String, default="Unknown")
    signal = Column(String)  # breakout_high, breakout_low, near_high, near_low
    price = Column(Float)
    ten_year_high = Column(Float)
    ten_year_low = Column(Float)
    level = Column(Float)
    level_date = Column(String)
    days_stale = Column(Integer)
    breakout_date = Column(String, nullable=True)
    breakout_close = Column(Float, nullable=True)
    pct_above = Column(Float, nullable=True)
    pct_below = Column(Float, nullable=True)
    pct_from_level = Column(Float, nullable=True)
    volume = Column(Integer)
    avg_volume_20d = Column(Integer)

    scan = relationship("Scan", back_populates="results")


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tickers = relationship("WatchlistTicker", back_populates="watchlist", cascade="all, delete-orphan")


class WatchlistTicker(Base):
    __tablename__ = "watchlist_tickers"
    __table_args__ = (UniqueConstraint("watchlist_id", "ticker"),)

    id = Column(Integer, primary_key=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id", ondelete="CASCADE"))
    ticker = Column(String)
    added_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    watchlist = relationship("Watchlist", back_populates="tickers")


class PriceCache(Base):
    __tablename__ = "price_cache"
    __table_args__ = (UniqueConstraint("ticker", "date"),)

    id = Column(Integer, primary_key=True)
    ticker = Column(String, index=True)
    date = Column(String)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Integer)
