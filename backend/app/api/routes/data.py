from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel

from backend.app.data.ingestion import upload_file as _upload_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/data", tags=["data"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    sql: str


class QueryResponse(BaseModel):
    columns: list[str]
    rows: list[dict[str, Any]]
    row_count: int


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/tables")
async def list_tables(request: Request) -> list[dict[str, Any]]:
    """Return the schema of every table in the warehouse."""
    warehouse = request.app.state.warehouse
    return warehouse.get_schema()


@router.get("/tables/{table_name}")
async def get_table(table_name: str, request: Request) -> dict[str, Any]:
    """Return schema + sample rows for a single table."""
    warehouse = request.app.state.warehouse
    schema = warehouse.get_schema()
    table_schema = next((t for t in schema if t["table_name"] == table_name), None)
    if table_schema is None:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")

    sample = warehouse.get_table_sample(table_name)
    return {
        **table_schema,
        "sample": sample,
    }


@router.get("/tables/{table_name}/stats")
async def get_table_stats(table_name: str, request: Request) -> dict[str, Any]:
    """Return statistics for a single table."""
    warehouse = request.app.state.warehouse
    try:
        return warehouse.get_table_stats(table_name)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/query", response_model=QueryResponse)
async def execute_query(body: QueryRequest, request: Request) -> QueryResponse:
    """Execute a raw SQL query against the warehouse (for debugging)."""
    warehouse = request.app.state.warehouse
    try:
        rows = warehouse.execute_query(body.sql)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    columns = list(rows[0].keys()) if rows else []
    return QueryResponse(columns=columns, rows=rows, row_count=len(rows))


@router.post("/upload")
async def upload(file: UploadFile = File(...), request: Request = None) -> dict[str, Any]:
    """Upload a CSV file and load it into the warehouse."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    warehouse = request.app.state.warehouse
    data_dir = request.app.state.settings.DATA_DIR

    result = await _upload_file(file, data_dir, warehouse)
    return result
