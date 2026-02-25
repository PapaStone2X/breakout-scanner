"""Scanner API routes."""

import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models import Scan
from app.schemas import ScanCreate, ScanOut, ScanSummary
from app.services.scanner_engine import run_scan

router = APIRouter(prefix="/api/scans", tags=["scans"])


@router.post("", response_model=ScanSummary)
async def create_scan(params: ScanCreate, db: Session = Depends(get_db)):
    """Start a new scan. Runs in a background thread."""
    scan = Scan(
        universe=params.universe if not params.tickers else "custom",
        lookback_years=params.lookback_years,
        stale_days=params.stale_days,
        recency_days=params.recency_days,
        status="running",
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    scan_id = scan.id
    scan_params = params.model_dump()

    def _run():
        thread_db = SessionLocal()
        try:
            run_scan(scan_id, thread_db, scan_params)
        finally:
            thread_db.close()

    asyncio.get_event_loop().run_in_executor(None, _run)

    d = ScanSummary.model_validate(scan)
    d.result_count = 0
    return d


@router.get("", response_model=list[ScanSummary])
def list_scans(db: Session = Depends(get_db)):
    """List all scans, newest first, with result counts."""
    scans = db.query(Scan).order_by(Scan.started_at.desc()).all()
    out = []
    for s in scans:
        d = ScanSummary.model_validate(s)
        d.result_count = len(s.results)
        out.append(d)
    return out


@router.get("/latest", response_model=ScanOut | None)
def get_latest_scan(db: Session = Depends(get_db)):
    """Get the most recent completed scan with results."""
    scan = (
        db.query(Scan)
        .filter(Scan.status == "completed")
        .order_by(Scan.started_at.desc())
        .first()
    )
    if not scan:
        return None
    return scan


@router.get("/{scan_id}", response_model=ScanOut)
def get_scan(scan_id: int, db: Session = Depends(get_db)):
    """Get a specific scan with results."""
    scan = db.query(Scan).get(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.get("/{scan_id}/status")
def get_scan_status(scan_id: int, db: Session = Depends(get_db)):
    """Poll scan progress."""
    scan = db.query(Scan).get(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {
        "id": scan.id,
        "status": scan.status,
        "progress": scan.progress,
        "tickers_scanned": scan.tickers_scanned,
        "tickers_downloaded": scan.tickers_downloaded,
        "error_message": scan.error_message,
    }


@router.delete("/{scan_id}")
def delete_scan(scan_id: int, db: Session = Depends(get_db)):
    """Delete a scan and its results."""
    scan = db.query(Scan).get(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    db.delete(scan)
    db.commit()
    return {"ok": True}
