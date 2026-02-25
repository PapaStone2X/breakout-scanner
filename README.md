# 10Y Consolidation Breakout Scanner

A stock screener that detects breakouts from long-term consolidation patterns. It identifies stocks where the 10-year closing high (or low) was set more than 1 year ago and the price has recently broken through that level — a signal that a major trend shift may be underway.

## How It Works

The scanner runs in three phases:

1. **Download** — Fetches 10 years of daily price data for all tickers in the selected universe (S&P 500 by default) using `yfinance`
2. **Analyze** — For each ticker, checks whether the 10-year high/low was "stale" (set 252+ trading days ago) and whether the price has broken through it in the recent window
3. **Output** — Writes results to JSON and prints a summary to the terminal

### Signal Types

| Signal | Meaning |
|---|---|
| `breakout_high` | Price broke above a stale 10-year high |
| `breakout_low` | Price broke below a stale 10-year low |
| `near_high` | Price is within 2% of a stale 10-year high |
| `near_low` | Price is within 2% of a stale 10-year low |

## Dashboard

Open `index.html` in a browser to view scan results in an interactive React dashboard with filtering by signal type and sector.

## Setup

```bash
python -m venv venv
source venv/bin/activate
pip install yfinance pandas tqdm lxml requests html5lib
```

## Usage

```bash
# Scan the full S&P 500 (default)
python scanner.py

# Test with specific tickers
python scanner.py --tickers AAPL MSFT GE

# Scan Russell 3000 (requires a russell3000_tickers.txt file)
python scanner.py --universe russell3000

# Adjust the recency window (last N trading days)
python scanner.py --recency 10

# Custom output path
python scanner.py --output results.json

# Skip metadata lookups for faster scans
python scanner.py --skip-metadata
```

### Parameters

| Flag | Default | Description |
|---|---|---|
| `--universe` | `sp500` | Stock universe (`sp500` or `russell3000`) |
| `--recency` | `5` | Number of recent trading days to check for breakouts |
| `--stale` | `252` | Minimum trading days the high/low must be stale (~1 year) |
| `--lookback` | `10` | Lookback period in years for price history |
| `--output` | `breakout_results.json` | Output file path |
| `--tickers` | — | Override universe with specific tickers |
| `--skip-metadata` | `false` | Skip company name/sector lookups |
| `--batch-size` | `20` | Number of tickers to download per batch |

## Output

Results are saved to `breakout_results.json` with the following structure:

```json
{
  "scan_time": "2026-02-24T14:25:30",
  "params": { ... },
  "results": [
    {
      "ticker": "EQIX",
      "name": "Equinix",
      "sector": "Real Estate",
      "signal": "near_high",
      "price": 945.64,
      "level": 962.92,
      "level_date": "2024-12-06",
      "days_stale": 296,
      "pct_from_level": 1.79
    }
  ],
  "summary": {
    "breakout_highs": 0,
    "breakout_lows": 0,
    "near_highs": 2,
    "near_lows": 0
  }
}
```

## Requirements

- Python 3.10+
- `yfinance`, `pandas`, `tqdm`, `lxml`, `requests`, `html5lib`
