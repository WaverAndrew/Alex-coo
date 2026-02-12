"""
Generate inventory_snapshots data for Bella Casa Furniture.
~450 weekly inventory snapshots across all products.
"""
import pandas as pd
import numpy as np
from datetime import date, timedelta

from backend.generate_data.config import START_DATE, END_DATE, SEED


def generate_inventory(
    products_df: pd.DataFrame,
    sales_df: pd.DataFrame = None,
    rng: np.random.RandomState = None,
) -> pd.DataFrame:
    """Generate ~450 weekly inventory snapshots for all products."""
    if rng is None:
        rng = np.random.RandomState(SEED)

    product_ids = products_df["product_id"].values
    product_lookup = products_df.set_index("product_id").to_dict("index")

    # Generate snapshot dates to hit ~450 records (18 products x ~25 dates)
    # Use 1st of each month, plus mid-month (15th) for Q4 months (Oct-Dec)
    # when inventory monitoring is more frequent due to seasonal demand.
    snapshot_dates = []
    current = date(START_DATE.year, START_DATE.month, 1)
    while current <= END_DATE:
        # 1st of month snapshot
        if current >= START_DATE:
            snapshot_dates.append(current)
        # Mid-month snapshot for Q4 months (Oct, Nov, Dec) - busier period
        if current.month in [10, 11, 12]:
            mid = date(current.year, current.month, 15)
            if START_DATE <= mid <= END_DATE:
                snapshot_dates.append(mid)
        # Advance to next month
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)

    records = []
    snap_counter = 1

    # Base inventory levels by category
    base_inventory = {
        "Sofas": 25,
        "Beds": 20,
        "Tables": 30,
        "Chairs": 60,
        "Storage": 15,
    }

    # Track inventory state per product
    inventory_state = {}
    for pid in product_ids:
        cat = product_lookup[pid]["category"]
        inventory_state[pid] = base_inventory.get(cat, 20)

    # If we have sales data, compute weekly sales per product
    weekly_sales = {}
    if sales_df is not None:
        # Merge with line items would be ideal, but we use sales volume proxy
        pass

    for snap_date in snapshot_dates:
        for pid in product_ids:
            cat = product_lookup[pid]["category"]
            base = base_inventory.get(cat, 20)

            # Simulate inventory fluctuation
            # Seasonal effect for beds
            if cat == "Beds":
                month = snap_date.month
                if month in [10, 11]:
                    # High demand period: lower inventory
                    demand_factor = rng.uniform(1.8, 2.5)
                elif month in [3, 4, 5]:
                    # Low demand: higher inventory
                    demand_factor = rng.uniform(0.5, 0.8)
                else:
                    demand_factor = rng.uniform(0.9, 1.2)
            else:
                demand_factor = rng.uniform(0.8, 1.3)

            # Quantity on hand with some noise
            on_hand = max(0, int(base / demand_factor + rng.normal(0, base * 0.15)))
            reserved = max(0, min(on_hand, int(rng.uniform(0, on_hand * 0.4))))
            available = on_hand - reserved

            # Reorder needed if available < threshold
            threshold = base * 0.3
            reorder_needed = available < threshold

            records.append({
                "snapshot_id": f"SNAP-{snap_counter:05d}",
                "date": snap_date,
                "product_id": pid,
                "quantity_on_hand": on_hand,
                "quantity_reserved": reserved,
                "quantity_available": available,
                "reorder_needed": reorder_needed,
            })
            snap_counter += 1

    df = pd.DataFrame(records)
    df["date"] = pd.to_datetime(df["date"])
    return df
