"""Universe ticker fetching — extracted from scanner.py."""

import io
import csv

import pandas as pd
import requests

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}


def get_sp500_tickers_and_meta() -> tuple[list[str], dict]:
    """Scrape S&P 500 tickers + metadata from Wikipedia."""
    url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
    resp = requests.get(url, headers=HEADERS, timeout=30)
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


def get_russell3000_tickers_and_meta() -> tuple[list[str], dict]:
    """Fetch a broad US stock universe (~3000+ tickers) from NASDAQ's traded symbols list.

    Downloads the full NASDAQ-traded symbols file, filters for common stocks
    listed on NASDAQ and NYSE, excludes ETFs/test symbols/warrants, and returns
    tickers sorted alphabetically. This covers substantially all Russell 3000 constituents.
    """
    url = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqtraded.txt"
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()

    lines = resp.text.strip().split("\n")
    # First line is header, last line is a timestamp/footer
    if len(lines) < 3:
        raise RuntimeError("NASDAQ traded symbols file is empty or malformed")

    header = lines[0].split("|")
    reader = csv.DictReader(lines[1:-1], fieldnames=header, delimiter="|")

    tickers = []
    meta = {}
    for row in reader:
        # Filter criteria:
        # - Must be NASDAQ (Q) or NYSE (N) or NYSE American (A) or ARCA (P) listed
        # - Must be common stock or similar (not test, warrant, ETF)
        # - Not a test issue
        listing_exchange = row.get("Listing Exchange", "").strip()
        if listing_exchange not in ("Q", "N", "A", "P"):
            continue

        # Skip test issues
        if row.get("Test Issue", "").strip() == "Y":
            continue

        # ETF flag — skip ETFs
        if row.get("ETF", "").strip() == "Y":
            continue

        symbol = row.get("Symbol", "").strip()
        if not symbol or len(symbol) > 5:
            # Skip symbols > 5 chars (warrants, units, preferred shares like AAPL.WS)
            continue

        # Skip symbols with special characters (preferred shares, warrants)
        if any(c in symbol for c in ".$^/"):
            continue

        # Skip 5-char symbols ending in U/R/W (SPAC units, rights, warrants)
        if len(symbol) == 5 and symbol[-1] in ("U", "R", "W"):
            continue

        ticker = symbol.replace(".", "-")
        tickers.append(ticker)
        name = row.get("Security Name", ticker).strip()
        meta[ticker] = {
            "name": name,
            "sector": "Unknown",  # NASDAQ file doesn't include sector
            "sub_industry": "",
        }

    if len(tickers) < 1000:
        raise RuntimeError(
            f"Only found {len(tickers)} tickers from NASDAQ file — expected 3000+. "
            "The file format may have changed."
        )

    return sorted(tickers), meta
