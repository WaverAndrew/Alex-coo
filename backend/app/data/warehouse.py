from __future__ import annotations

import logging
import os
import threading
from pathlib import Path
from typing import Any

import duckdb

logger = logging.getLogger(__name__)


class DuckDBWarehouse:
    """In-memory DuckDB warehouse that loads CSVs and executes analytical queries."""

    def __init__(self, db_path: str = ":memory:") -> None:
        self.db_path = db_path
        self.conn = duckdb.connect(database=db_path)
        self._lock = threading.Lock()
        logger.info("DuckDB warehouse initialised (path=%s)", db_path)

    # ------------------------------------------------------------------
    # Data loading
    # ------------------------------------------------------------------

    def load_csvs(self, data_dir: str) -> list[str]:
        """Scan *data_dir* for CSV files and create a table for each one.

        Table names are derived from the file stem (lowercase, spaces replaced
        with underscores).  Returns the list of table names created.
        """
        data_path = Path(data_dir)
        if not data_path.exists():
            logger.warning("Data directory does not exist: %s", data_dir)
            return []

        created: list[str] = []
        for csv_file in sorted(data_path.glob("*.csv")):
            table_name = csv_file.stem.lower().replace(" ", "_").replace("-", "_")
            try:
                with self._lock:
                    self.conn.execute(f"DROP TABLE IF EXISTS {table_name}")
                    self.conn.execute(
                        f"CREATE TABLE {table_name} AS SELECT * FROM read_csv_auto('{csv_file}')"
                    )
                    row_count = self.conn.execute(
                        f"SELECT count(*) FROM {table_name}"
                    ).fetchone()[0]
                logger.info(
                    "Loaded %s -> table '%s' (%d rows)", csv_file.name, table_name, row_count
                )
                created.append(table_name)
            except Exception:
                logger.exception("Failed to load CSV %s", csv_file)

        return created

    def load_csv_file(self, file_path: str, table_name: str | None = None) -> str:
        """Load a single CSV file into the warehouse.  Returns the table name."""
        path = Path(file_path)
        if table_name is None:
            table_name = path.stem.lower().replace(" ", "_").replace("-", "_")

        with self._lock:
            self.conn.execute(f"DROP TABLE IF EXISTS {table_name}")
            self.conn.execute(
                f"CREATE TABLE {table_name} AS SELECT * FROM read_csv_auto('{path}')"
            )
            row_count = self.conn.execute(
                f"SELECT count(*) FROM {table_name}"
            ).fetchone()[0]
        logger.info("Loaded %s -> table '%s' (%d rows)", path.name, table_name, row_count)
        return table_name

    # ------------------------------------------------------------------
    # Querying
    # ------------------------------------------------------------------

    def execute_query(self, sql: str) -> list[dict[str, Any]]:
        """Execute arbitrary SQL and return results as a list of dicts."""
        try:
            with self._lock:
                result = self.conn.execute(sql)
                columns = [desc[0] for desc in result.description]
                rows = result.fetchall()
            return [dict(zip(columns, row)) for row in rows]
        except Exception as exc:
            logger.error("Query failed: %s\nSQL: %s", exc, sql)
            raise

    # ------------------------------------------------------------------
    # Schema introspection
    # ------------------------------------------------------------------

    def get_schema(self) -> list[dict[str, Any]]:
        """Return all table names with their column names and types."""
        with self._lock:
            tables_result = self.conn.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'"
            ).fetchall()

            schema: list[dict[str, Any]] = []
            for (table_name,) in tables_result:
                columns_result = self.conn.execute(
                    "SELECT column_name, data_type "
                    "FROM information_schema.columns "
                    f"WHERE table_name = '{table_name}' AND table_schema = 'main' "
                    "ORDER BY ordinal_position"
                ).fetchall()
                schema.append(
                    {
                        "table_name": table_name,
                        "columns": [
                            {"name": col_name, "type": col_type}
                            for col_name, col_type in columns_result
                        ],
                    }
                )
        return schema

    def get_table_sample(self, table_name: str, limit: int = 5) -> list[dict[str, Any]]:
        """Return a small sample of rows from the given table."""
        return self.execute_query(f"SELECT * FROM {table_name} LIMIT {limit}")

    def get_table_stats(self, table_name: str) -> dict[str, Any]:
        """Return row count and per-column statistics for *table_name*."""
        with self._lock:
            row_count = self.conn.execute(
                f"SELECT count(*) FROM {table_name}"
            ).fetchone()[0]

            columns_result = self.conn.execute(
                "SELECT column_name, data_type "
                "FROM information_schema.columns "
                f"WHERE table_name = '{table_name}' AND table_schema = 'main' "
                "ORDER BY ordinal_position"
            ).fetchall()

            column_stats: list[dict[str, Any]] = []
            for col_name, col_type in columns_result:
                stat: dict[str, Any] = {
                    "name": col_name,
                    "type": col_type,
                }
                try:
                    if col_type in (
                        "INTEGER", "BIGINT", "DOUBLE", "FLOAT", "DECIMAL",
                        "SMALLINT", "TINYINT", "HUGEINT",
                    ):
                        agg = self.conn.execute(
                            f"SELECT min({col_name}), max({col_name}), "
                            f"avg({col_name}), count(DISTINCT {col_name}) "
                            f"FROM {table_name}"
                        ).fetchone()
                        stat.update(
                            {"min": agg[0], "max": agg[1], "avg": agg[2], "distinct": agg[3]}
                        )
                    else:
                        distinct = self.conn.execute(
                            f"SELECT count(DISTINCT {col_name}) FROM {table_name}"
                        ).fetchone()[0]
                        nulls = self.conn.execute(
                            f"SELECT count(*) FROM {table_name} WHERE {col_name} IS NULL"
                        ).fetchone()[0]
                        stat.update({"distinct": distinct, "nulls": nulls})
                except Exception:
                    logger.debug("Could not compute stats for %s.%s", table_name, col_name)
                column_stats.append(stat)

        return {
            "table_name": table_name,
            "row_count": row_count,
            "columns": column_stats,
        }

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def close(self) -> None:
        self.conn.close()
        logger.info("DuckDB warehouse closed")
