"""Chart data API routes."""

import asyncio

from fastapi import APIRouter, Query

from app.services.market_data import get_ohlcv, PERIOD_MAP
from app.schemas import OHLCVPoint

router = APIRouter(prefix="/api/charts", tags=["charts"])


@router.get("/{ticker}", response_model=list[OHLCVPoint])
async def get_chart_data(
    ticker: str,
    period: str = Query("1y", enum=list(PERIOD_MAP.keys())),
):
    """Get OHLCV data for a ticker, suitable for TradingView Lightweight Charts."""
    data = await asyncio.to_thread(get_ohlcv, ticker.upper(), period)
    return data
