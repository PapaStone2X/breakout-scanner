"""Core scanner logic — extracted from scanner.py with DB write orchestration."""

import datetime
import time

import pandas as pd
import yfinance as yf
from sqlalchemy.orm import Session

from app.models import Scan, ScanResult
from app.services.universe import get_sp500_tickers_and_meta
from app.services.market_data import download_batch


def analyze_ticker(
    closes: pd.Series,
    volumes: pd.Series,
    recency_days: int,
    stale_threshold: int,
) -> dict | None:
    """Analyze a single ticker's close series for breakout signals."""
    if len(closes) < stale_threshold + recency_days + 20:
        return None

    current_close = float(closes.iloc[-1])
    pre_recency = closes.iloc[:-recency_days]
    recency_closes = closes.iloc[-recency_days:]

    if len(pre_recency) < stale_threshold + 10:
        return None

    # --- HIGH BREAKOUT ---
    ten_year_high = float(pre_recency.max())
    high_date = pre_recency.idxmax()
    days_since_high = len(pre_recency) - pre_recency.index.get_loc(high_date) - 1
    high_is_stale = days_since_high >= stale_threshold

    high_breakout = high_is_stale and float(recency_closes.max()) > ten_year_high

    # --- LOW BREAKOUT ---
    ten_year_low = float(pre_recency.min())
    low_date = pre_recency.idxmin()
    days_since_low = len(pre_recency) - pre_recency.index.get_loc(low_date) - 1
    low_is_stale = days_since_low >= stale_threshold

    low_breakout = low_is_stale and float(recency_closes.min()) < ten_year_low

    # --- NEAR BREAKOUT (within 2%) ---
    near_high = high_is_stale and not high_breakout and current_close >= ten_year_high * 0.98
    near_low = low_is_stale and not low_breakout and current_close <= ten_year_low * 1.02

    if not (high_breakout or low_breakout or near_high or near_low):
        return None

    # --- Volume ---
    current_volume = int(volumes.iloc[-1]) if len(volumes) > 0 else 0
    avg_volume_20d = int(volumes.iloc[-20:].mean()) if len(volumes) >= 20 else current_volume

    result = {
        "price": round(current_close, 2),
        "ten_year_high": round(ten_year_high, 2),
        "ten_year_low": round(ten_year_low, 2),
        "volume": current_volume,
        "avg_volume_20d": avg_volume_20d,
    }

    if high_breakout:
        breakout_day = None
        breakout_close = None
        for i in range(len(recency_closes)):
            if float(recency_closes.iloc[i]) > ten_year_high:
                breakout_day = str(recency_closes.index[i].date())
                breakout_close = float(recency_closes.iloc[i])
                break

        result.update({
            "signal": "breakout_high",
            "level": round(ten_year_high, 2),
            "level_date": str(high_date.date()) if hasattr(high_date, "date") else str(high_date),
            "days_stale": int(days_since_high),
            "breakout_date": breakout_day,
            "breakout_close": round(breakout_close, 2) if breakout_close else None,
            "pct_above": round((current_close / ten_year_high - 1) * 100, 2),
        })
    elif low_breakout:
        breakout_day = None
        breakout_close = None
        for i in range(len(recency_closes)):
            if float(recency_closes.iloc[i]) < ten_year_low:
                breakout_day = str(recency_closes.index[i].date())
                breakout_close = float(recency_closes.iloc[i])
                break

        result.update({
            "signal": "breakout_low",
            "level": round(ten_year_low, 2),
            "level_date": str(low_date.date()) if hasattr(low_date, "date") else str(low_date),
            "days_stale": int(days_since_low),
            "breakout_date": breakout_day,
            "breakout_close": round(breakout_close, 2) if breakout_close else None,
            "pct_below": round((1 - current_close / ten_year_low) * 100, 2),
        })
    elif near_high:
        result.update({
            "signal": "near_high",
            "level": round(ten_year_high, 2),
            "level_date": str(high_date.date()) if hasattr(high_date, "date") else str(high_date),
            "days_stale": int(days_since_high),
            "pct_from_level": round((1 - current_close / ten_year_high) * 100, 2),
        })
    elif near_low:
        result.update({
            "signal": "near_low",
            "level": round(ten_year_low, 2),
            "level_date": str(low_date.date()) if hasattr(low_date, "date") else str(low_date),
            "days_stale": int(days_since_low),
            "pct_from_level": round((current_close / ten_year_low - 1) * 100, 2),
        })

    return result


def run_scan(scan_id: int, db: Session, params: dict) -> None:
    """Run a full scan, writing progress and results to the database.

    This function is designed to run in a background thread via asyncio.to_thread().
    """
    scan = db.query(Scan).get(scan_id)
    if not scan:
        return

    try:
        # Determine tickers
        universe = params.get("universe", "sp500")
        custom_tickers = params.get("tickers")
        meta = {}

        if custom_tickers:
            tickers = [t.upper() for t in custom_tickers]
        else:
            tickers, meta = get_sp500_tickers_and_meta()

        scan.tickers_scanned = len(tickers)
        db.commit()

        # Download data
        lookback = params.get("lookback_years", 10)
        end_date = datetime.date.today()
        start_date = end_date - datetime.timedelta(days=lookback * 365 + 60)

        def on_progress(pct):
            scan.progress = pct
            db.commit()

        all_data = download_batch(
            tickers,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            on_progress=on_progress,
        )
        scan.tickers_downloaded = len(all_data)
        scan.progress = 70
        db.commit()

        # Analyze
        recency_days = params.get("recency_days", 5)
        stale_days = params.get("stale_days", 252)
        results = []

        for i, ticker in enumerate(all_data):
            df = all_data[ticker]
            signal = analyze_ticker(
                closes=df["Close"],
                volumes=df["Volume"],
                recency_days=recency_days,
                stale_threshold=stale_days,
            )
            if signal:
                signal["ticker"] = ticker
                signal["name"] = meta.get(ticker, {}).get("name", ticker)
                signal["sector"] = meta.get(ticker, {}).get("sector", "Unknown")
                results.append(signal)

            # Update progress: analyze = 70-90%
            if (i + 1) % 50 == 0 or i == len(all_data) - 1:
                scan.progress = 70 + int((i + 1) / len(all_data) * 20)
                db.commit()

        # Fetch metadata for tickers missing names
        tickers_needing_meta = [r["ticker"] for r in results if r["name"] == r["ticker"]]
        if tickers_needing_meta:
            for ticker in tickers_needing_meta:
                try:
                    info = yf.Ticker(ticker).info or {}
                    for r in results:
                        if r["ticker"] == ticker:
                            r["name"] = info.get("shortName", info.get("longName", ticker))
                            r["sector"] = info.get("sector", "Unknown")
                    time.sleep(0.2)
                except Exception:
                    pass

        scan.progress = 95
        db.commit()

        # Write results to DB
        signal_order = {"breakout_high": 0, "breakout_low": 1, "near_high": 2, "near_low": 3}
        results.sort(key=lambda x: signal_order.get(x.get("signal", ""), 99))

        for r in results:
            db.add(ScanResult(
                scan_id=scan_id,
                ticker=r["ticker"],
                name=r.get("name", r["ticker"]),
                sector=r.get("sector", "Unknown"),
                signal=r["signal"],
                price=r["price"],
                ten_year_high=r["ten_year_high"],
                ten_year_low=r["ten_year_low"],
                level=r["level"],
                level_date=r.get("level_date"),
                days_stale=r.get("days_stale", 0),
                breakout_date=r.get("breakout_date"),
                breakout_close=r.get("breakout_close"),
                pct_above=r.get("pct_above"),
                pct_below=r.get("pct_below"),
                pct_from_level=r.get("pct_from_level"),
                volume=r["volume"],
                avg_volume_20d=r["avg_volume_20d"],
            ))

        scan.status = "completed"
        scan.completed_at = datetime.datetime.utcnow()
        scan.progress = 100
        db.commit()

    except Exception as e:
        scan.status = "failed"
        scan.error_message = str(e)
        scan.completed_at = datetime.datetime.utcnow()
        db.commit()
