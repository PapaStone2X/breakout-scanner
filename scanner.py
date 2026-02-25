"""
10Y Consolidation Breakout Scanner
====================================
Detects stocks where:
  - The 10-year closing high (low) was set MORE than 1 year ago
  - The stock has broken above (below) that level in the last N trading days

Requirements:
  pip install yfinance pandas tqdm lxml requests html5lib

Usage:
  python scanner.py                          # S&P 500, default settings
  python scanner.py --tickers AAPL MSFT GE   # Test with specific tickers first
  python scanner.py --universe russell3000   # Russell 3000 (needs ticker file)
  python scanner.py --recency 10             # Last 10 trading days
  python scanner.py --output results.json    # Custom output path
  python scanner.py --skip-metadata          # Skip name/sector lookups (faster)
"""

import argparse
import json
import datetime
import time
import sys
from pathlib import Path

import pandas as pd
import requests
import yfinance as yf
from tqdm import tqdm

# Disable yfinance's SQLite cache — it leaks file descriptors on macOS
import os
os.environ["YF_CACHE"] = "0"
try:
    yf.set_tz_cache_location(os.path.join(os.path.expanduser("~"), ".yf_tz_cache_tmp"))
except Exception:
    pass


# ---------------------------------------------------------------------------
# Universe definitions
# ---------------------------------------------------------------------------

def get_sp500_tickers_and_meta() -> tuple[list[str], dict]:
    """Scrape S&P 500 tickers + metadata from Wikipedia (one request)."""
    import io

    url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
    print("  Fetching S&P 500 list from Wikipedia...")
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()

    # Try multiple parsers — lxml and html5lib can both fail depending on install
    table = None
    for parser in ["lxml", "html5lib", "html.parser"]:
        try:
            tables = pd.read_html(io.StringIO(resp.text), flavor=parser)
            if tables and len(tables[0]) > 400:  # S&P 500 table should have 500+ rows
                table = tables[0]
                print(f"  Parsed Wikipedia table with '{parser}' — {len(table)} tickers found")
                break
        except Exception as e:
            print(f"  Parser '{parser}' failed: {e}")
            continue

    if table is None:
        print("  ERROR: Could not parse Wikipedia table with any parser.")
        print("  Fix: pip install lxml html5lib --break-system-packages")
        print("  (or inside your venv: pip install lxml html5lib)")
        sys.exit(1)

    meta = {}
    tickers = []
    for _, row in table.iterrows():
        ticker = str(row.get("Symbol", "")).strip().replace(".", "-")
        if not ticker or ticker == "nan":
            continue
        tickers.append(ticker)
        meta[ticker] = {
            "name": row.get("Security", ticker),
            "sector": row.get("GICS Sector", "Unknown"),
            "sub_industry": row.get("GICS Sub-Industry", ""),
        }
    return sorted(tickers), meta


def get_russell3000_tickers() -> list[str]:
    """Load from local file. Create this file yourself with one ticker per line."""
    path = Path("russell3000_tickers.txt")
    if path.exists():
        return sorted([t.strip() for t in path.read_text().splitlines() if t.strip()])
    print("ERROR: russell3000_tickers.txt not found.")
    print("Create a text file with one ticker per line.")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Data download (batched for speed)
# ---------------------------------------------------------------------------

def download_batch(
    tickers: list[str],
    start_date: str,
    end_date: str,
    batch_size: int = 20,
    progress: bool = True,
) -> dict[str, pd.DataFrame]:
    """
    Download daily data for all tickers in batches.
    Returns dict of ticker -> DataFrame with 'Close' and 'Volume' columns.
    """
    all_data = {}
    batches = [tickers[i:i + batch_size] for i in range(0, len(tickers), batch_size)]

    iterator = tqdm(batches, desc="Downloading", disable=not progress)
    for batch in iterator:
        iterator.set_postfix_str(f"{batch[0]}..{batch[-1]}")
        try:
            # yfinance batch download
            df = yf.download(
                batch,
                start=start_date,
                end=end_date,
                progress=False,
                auto_adjust=True,
                threads=False,
            )

            if df.empty:
                continue

            # Handle yfinance column formats:
            # Single ticker: columns are just ['Open','High','Low','Close','Volume']
            # Multiple tickers: MultiIndex columns like ('Close', 'AAPL')
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
                        pass  # ticker not in results
            elif len(batch) == 1:
                ticker = batch[0]
                # Flatten if MultiIndex crept in for single ticker
                if isinstance(df.columns, pd.MultiIndex):
                    df.columns = df.columns.get_level_values(0)
                ticker_df = df[["Close", "Volume"]].dropna(subset=["Close"])
                if len(ticker_df) > 0:
                    all_data[ticker] = ticker_df

        except Exception as e:
            print(f"\n  Batch download failed ({batch[0]}..{batch[-1]}): {e}")
            # Fall back to individual downloads for this batch
            for ticker in batch:
                try:
                    df = yf.download(
                        ticker,
                        start=start_date,
                        end=end_date,
                        progress=False,
                        auto_adjust=True,
                    )
                    if isinstance(df.columns, pd.MultiIndex):
                        df.columns = df.columns.get_level_values(0)
                    if not df.empty:
                        ticker_df = df[["Close", "Volume"]].dropna(subset=["Close"])
                        if len(ticker_df) > 0:
                            all_data[ticker] = ticker_df
                except Exception:
                    pass

        # Pause between batches to let file handles close
        import gc
        gc.collect()
        time.sleep(1.5)

    return all_data


# ---------------------------------------------------------------------------
# Core breakout logic
# ---------------------------------------------------------------------------

def analyze_ticker(
    closes: pd.Series,
    volumes: pd.Series,
    recency_days: int,
    stale_threshold: int,
) -> dict | None:
    """
    Analyze a single ticker's close series for breakout signals.
    Returns signal dict or None.
    """
    if len(closes) < stale_threshold + recency_days + 20:
        return None

    current_close = float(closes.iloc[-1])

    # Split: everything before recency window vs the recency window
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
        # Find first breakout day in recency window
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


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="10Y Consolidation Breakout Scanner")
    parser.add_argument("--universe", choices=["sp500", "russell3000"], default="sp500")
    parser.add_argument("--recency", type=int, default=5, help="Breakout recency window (trading days)")
    parser.add_argument("--stale", type=int, default=252, help="Min trading days the level must be stale")
    parser.add_argument("--lookback", type=int, default=10, help="Lookback period in years")
    parser.add_argument("--output", type=str, default="breakout_results.json")
    parser.add_argument("--tickers", type=str, nargs="*", help="Override: scan specific tickers only")
    parser.add_argument("--skip-metadata", action="store_true", help="Skip name/sector lookups (faster)")
    parser.add_argument("--batch-size", type=int, default=20, help="Download batch size")
    args = parser.parse_args()

    # --- Determine tickers and metadata ---
    meta = {}
    if args.tickers:
        tickers = [t.upper() for t in args.tickers]
    elif args.universe == "russell3000":
        tickers = get_russell3000_tickers()
    else:
        tickers, meta = get_sp500_tickers_and_meta()

    print(f"{'='*60}")
    print(f"10Y CONSOLIDATION BREAKOUT SCANNER")
    print(f"{'='*60}")
    print(f"  Universe:    {len(tickers)} tickers")
    print(f"  Lookback:    {args.lookback} years")
    print(f"  Stale:       {args.stale} trading days")
    print(f"  Recency:     {args.recency} trading days")
    print(f"  Batch size:  {args.batch_size}")
    print(f"{'='*60}")

    # --- Download data ---
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=args.lookback * 365 + 60)

    print(f"\nPhase 1/3: Downloading {len(tickers)} tickers ({start_date} to {end_date})...")
    all_data = download_batch(
        tickers,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        batch_size=args.batch_size,
    )
    print(f"  Downloaded: {len(all_data)}/{len(tickers)} tickers")

    # --- Analyze ---
    print(f"\nPhase 2/3: Analyzing for breakout signals...")
    results = []
    for ticker in tqdm(all_data, desc="Analyzing"):
        df = all_data[ticker]
        signal = analyze_ticker(
            closes=df["Close"],
            volumes=df["Volume"],
            recency_days=args.recency,
            stale_threshold=args.stale,
        )
        if signal:
            signal["ticker"] = ticker
            signal["name"] = meta.get(ticker, {}).get("name", ticker)
            signal["sector"] = meta.get(ticker, {}).get("sector", "Unknown")
            results.append(signal)

    # --- Fetch metadata for non-SP500 tickers if needed ---
    if not args.skip_metadata:
        tickers_needing_meta = [r["ticker"] for r in results if r["name"] == r["ticker"]]
        if tickers_needing_meta:
            print(f"\nPhase 3/3: Fetching metadata for {len(tickers_needing_meta)} signal tickers...")
            for ticker in tqdm(tickers_needing_meta, desc="Metadata"):
                try:
                    info = yf.Ticker(ticker).info or {}
                    for r in results:
                        if r["ticker"] == ticker:
                            r["name"] = info.get("shortName", info.get("longName", ticker))
                            r["sector"] = info.get("sector", "Unknown")
                    time.sleep(0.2)
                except Exception:
                    pass
        else:
            print(f"\nPhase 3/3: Metadata — all tickers covered by universe data.")
    else:
        print(f"\nPhase 3/3: Metadata — skipped (--skip-metadata)")

    # --- Sort and output ---
    signal_order = {"breakout_high": 0, "breakout_low": 1, "near_high": 2, "near_low": 3}
    results.sort(key=lambda x: signal_order.get(x.get("signal", ""), 99))

    output = {
        "scan_time": datetime.datetime.now().isoformat(),
        "params": {
            "universe": args.universe if not args.tickers else "custom",
            "lookback_years": args.lookback,
            "stale_threshold_days": args.stale,
            "recency_days": args.recency,
            "tickers_scanned": len(tickers),
            "tickers_downloaded": len(all_data),
        },
        "results": results,
        "summary": {
            "breakout_highs": sum(1 for r in results if r["signal"] == "breakout_high"),
            "breakout_lows": sum(1 for r in results if r["signal"] == "breakout_low"),
            "near_highs": sum(1 for r in results if r["signal"] == "near_high"),
            "near_lows": sum(1 for r in results if r["signal"] == "near_low"),
        },
    }

    Path(args.output).write_text(json.dumps(output, indent=2))

    print(f"\n{'='*60}")
    print(f"RESULTS → {args.output}")
    print(f"{'='*60}")
    print(f"  ▲ Breakout highs: {output['summary']['breakout_highs']}")
    print(f"  ▼ Breakout lows:  {output['summary']['breakout_lows']}")
    print(f"  ◆ Near highs:     {output['summary']['near_highs']}")
    print(f"  ◇ Near lows:      {output['summary']['near_lows']}")
    print(f"  Total signals:    {len(results)}")
    print(f"{'='*60}")

    # Print breakout tickers for quick glance
    for signal_type, label in [("breakout_high", "▲ HIGH"), ("breakout_low", "▼ LOW")]:
        items = [r for r in results if r["signal"] == signal_type]
        if items:
            print(f"\n  {label} BREAKOUTS:")
            for r in items:
                pct = r.get("pct_above", r.get("pct_below", 0))
                sign = "+" if "pct_above" in r else "-"
                vol_ratio = r["volume"] / r["avg_volume_20d"] if r["avg_volume_20d"] > 0 else 0
                print(f"    {r['ticker']:6s} {r['name'][:25]:25s} ${r['price']:>8.2f}  {sign}{pct:.1f}%  level: ${r['level']:.2f} ({r['days_stale']}d stale)  vol: {vol_ratio:.1f}x")


if __name__ == "__main__":
    main()
