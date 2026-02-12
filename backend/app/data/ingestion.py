from __future__ import annotations

import logging
import os
from pathlib import Path

from fastapi import UploadFile

from backend.app.data.warehouse import DuckDBWarehouse

logger = logging.getLogger(__name__)


async def upload_file(
    file: UploadFile,
    data_dir: str,
    warehouse: DuckDBWarehouse,
) -> dict:
    """Save an uploaded CSV to *data_dir* and load it into the DuckDB warehouse.

    Returns metadata about the newly created table.
    """
    data_path = Path(data_dir)
    data_path.mkdir(parents=True, exist_ok=True)

    file_path = data_path / file.filename
    contents = await file.read()
    file_path.write_bytes(contents)
    logger.info("Saved uploaded file to %s (%d bytes)", file_path, len(contents))

    table_name = warehouse.load_csv_file(str(file_path))
    schema = warehouse.get_schema()
    table_schema = next((t for t in schema if t["table_name"] == table_name), None)

    row_count = warehouse.conn.execute(
        f"SELECT count(*) FROM {table_name}"
    ).fetchone()[0]

    return {
        "table_name": table_name,
        "file_name": file.filename,
        "row_count": row_count,
        "columns": table_schema["columns"] if table_schema else [],
    }


async def load_demo_data(
    data_dir: str,
    warehouse: DuckDBWarehouse,
) -> dict:
    """Load all CSVs from *data_dir* into the DuckDB warehouse.

    Returns a summary of all tables loaded.
    """
    tables = warehouse.load_csvs(data_dir)
    schema = warehouse.get_schema()
    return {
        "tables_loaded": len(tables),
        "table_names": tables,
        "schema": schema,
    }
