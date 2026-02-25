"""Market data download — extracted from scanner.py + chart OHLCV support."""

import gc
import os
import time
import datetime

import pandas as pd
import yfinance as yf

# Disable yfinance's SQLite cache
os.environ["YF_CACHE"] = "0"
try:
    yf.set_tz_cache_location(os.path.join(os.path.expanduser("~"), ".yf_tz_cache_tmp"))
except Exception:
    pass


def download_batch(
    tickers: list[str],
    start_date: str,
    end_date: str,
    batch_size: int = 20,
    on_progress: callable = None,
) -> dict[str, pd.DataFrame]:
    """Download daily Close+Volume data for tickers in batches."""
    all_data = {}
    batches = [tickers[i:i + batch_size] for i in range(0, len(tickers), batch_size)]

    for batch_idx, batch in enumerate(batches):
        try:
            df = yf.download(
                batch,
                start=start_date,
                end=end_date,
                progress=False,
                auto_adjust=True,
                threads=False,
            )

            if not df.empty:
                if isinstance(df.columns, pd.MultiIndex):
                    for ticker in batch:
                        try:
                            ticker_df = pd.DataFrame({
                                "Close": df["Close"][ticker],
                                "Volume": df["Volume"][ticker],
                            }).dropna(subset=["Close"])
                            if len(ticker_df) > 0:
                                all_data[ticker] = ticker_df
                        except (KeyError, TypeError):
                            pass
                elif len(batch) == 1:
                    ticker = batch[0]
                    if isinstance(df.columns, pd.MultiIndex):
                        df.columns = df.columns.get_level_values(0)
                    ticker_df = df[["Close", "Volume"]].dropna(subset=["Close"])
                    if len(ticker_df) > 0:
                        all_data[ticker] = ticker_df

        except Exception:
            for ticker in batch:
                try:
                    df = yf.download(
                        ticker, start=start_date, end=end_date,
                        progress=False, auto_adjust=True,
                    )
                    if isinstance(df.columns, pd.MultiIndex):
                        df.columns = df.columns.get_level_values(0)
                    if not df.empty:
                        ticker_df = df[["Close", "Volume"]].dropna(subset=["Close"])
                        if len(ticker_df) > 0:
                            all_data[ticker] = ticker_df
                except Exception:
                    pass

        gc.collect()
        time.sleep(1.5)

        if on_progress:
            pct = int((batch_idx + 1) / len(batches) * 70)  # download = 0-70%
            on_progress(pct)

    return all_data


PERIOD_MAP = {
    "3m": 90,
    "6m": 180,
    "1y": 365,
    "2y": 730,
    "5y": 1825,
    "10y": 3650,
}


def get_ohlcv(ticker: str, period: str = "1y") -> list[dict]:
    """Fetch OHLCV data for a single ticker for charting."""
    days = PERIOD_MAP.get(period, 365)
    end = datetime.date.today()
    start = end - datetime.timedelta(days=days + 30)

    df = yf.download(
        ticker, start=start.isoformat(), end=end.isoformat(),
        progress=False, auto_adjust=True,
    )
    if df.empty:
        return []

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    records = []
    for idx, row in df.iterrows():
        try:
            records.append({
                "time": str(idx.date()) if hasattr(idx, "date") else str(idx),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })
        except (ValueError, KeyError):
            continue
    return records
