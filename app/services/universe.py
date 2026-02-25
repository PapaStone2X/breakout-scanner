"""Universe ticker fetching — extracted from scanner.py."""

import io

import pandas as pd
import requests


def get_sp500_tickers_and_meta() -> tuple[list[str], dict]:
    """Scrape S&P 500 tickers + metadata from Wikipedia."""
    url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()

    table = None
    for parser in ["lxml", "html5lib", "html.parser"]:
        try:
            tables = pd.read_html(io.StringIO(resp.text), flavor=parser)
            if tables and len(tables[0]) > 400:
                table = tables[0]
                break
        except Exception:
            continue

    if table is None:
        raise RuntimeError("Could not parse Wikipedia S&P 500 table with any parser")

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
