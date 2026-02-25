"""Watchlist CRUD API routes."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Watchlist, WatchlistTicker
from app.schemas import (
    WatchlistCreate, WatchlistUpdate, WatchlistOut,
    WatchlistSummary, WatchlistTickerAdd,
)

router = APIRouter(prefix="/api/watchlists", tags=["watchlists"])


@router.get("", response_model=list[WatchlistSummary])
def list_watchlists(db: Session = Depends(get_db)):
    watchlists = db.query(Watchlist).order_by(Watchlist.name).all()
    return [
        WatchlistSummary(
            id=w.id,
            name=w.name,
            created_at=w.created_at,
            ticker_count=len(w.tickers),
        )
        for w in watchlists
    ]


@router.post("", response_model=WatchlistOut)
def create_watchlist(data: WatchlistCreate, db: Session = Depends(get_db)):
    existing = db.query(Watchlist).filter(Watchlist.name == data.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Watchlist name already exists")
    wl = Watchlist(name=data.name)
    db.add(wl)
    db.commit()
    db.refresh(wl)
    return wl


@router.get("/{wl_id}", response_model=WatchlistOut)
def get_watchlist(wl_id: int, db: Session = Depends(get_db)):
    wl = db.query(Watchlist).get(wl_id)
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    return wl


@router.put("/{wl_id}", response_model=WatchlistOut)
def update_watchlist(wl_id: int, data: WatchlistUpdate, db: Session = Depends(get_db)):
    wl = db.query(Watchlist).get(wl_id)
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    wl.name = data.name
    wl.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(wl)
    return wl


@router.delete("/{wl_id}")
def delete_watchlist(wl_id: int, db: Session = Depends(get_db)):
    wl = db.query(Watchlist).get(wl_id)
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    db.delete(wl)
    db.commit()
    return {"ok": True}


@router.post("/{wl_id}/tickers", response_model=WatchlistOut)
def add_tickers(wl_id: int, data: WatchlistTickerAdd, db: Session = Depends(get_db)):
    wl = db.query(Watchlist).get(wl_id)
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    existing = {t.ticker for t in wl.tickers}
    for ticker in data.tickers:
        t = ticker.upper().strip()
        if t and t not in existing:
            db.add(WatchlistTicker(watchlist_id=wl_id, ticker=t))
            existing.add(t)

    wl.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(wl)
    return wl


@router.delete("/{wl_id}/tickers/{ticker}")
def remove_ticker(wl_id: int, ticker: str, db: Session = Depends(get_db)):
    wt = (
        db.query(WatchlistTicker)
        .filter(WatchlistTicker.watchlist_id == wl_id, WatchlistTicker.ticker == ticker.upper())
        .first()
    )
    if not wt:
        raise HTTPException(status_code=404, detail="Ticker not in watchlist")
    db.delete(wt)
    db.commit()
    return {"ok": True}
