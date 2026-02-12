"""
Generate production_orders data for Bella Casa Furniture.
~600 production orders tied to products.
"""
import pandas as pd
import numpy as np
from datetime import date, timedelta

from backend.generate_data.config import START_DATE, END_DATE, SEED
from backend.generate_data.stories import get_bed_seasonal_multiplier, get_sofa_production_cost_multiplier


def generate_production(
    products_df: pd.DataFrame,
    rng: np.random.RandomState = None,
) -> pd.DataFrame:
    """Generate ~600 production orders across the date range."""
    if rng is None:
        rng = np.random.RandomState(SEED)

    total_days = (END_DATE - START_DATE).days
    product_ids = products_df["product_id"].values
    products_lookup = products_df.set_index("product_id").to_dict("index")

    records = []
    prod_counter = 1

    # Average ~33 production orders per product, but weighted by category demand
    category_weights = {
        "Sofas": 1.3,
        "Beds": 1.2,
        "Tables": 1.0,
        "Chairs": 1.4,  # Chairs sell in higher volumes
        "Storage": 0.7,
    }

    target_total = 600

    # Compute total weighted product count for normalization
    total_weighted = sum(
        category_weights.get(products_df.iloc[i]["category"], 1.0)
        for i in range(len(products_df))
    )

    for _, prod_row in products_df.iterrows():
        pid = prod_row["product_id"]
        cat = prod_row["category"]
        base_cost = prod_row["production_cost"]
        weight = category_weights.get(cat, 1.0)

        n_orders = int((target_total * weight) / total_weighted)

        for _ in range(n_orders):
            day_offset = rng.randint(0, total_days - 20)
            start_date = START_DATE + timedelta(days=int(day_offset))
            while start_date.weekday() >= 5:
                start_date += timedelta(days=1)

            # Batch sizes vary by product type
            if cat == "Chairs":
                qty = max(1, int(rng.normal(12, 4)))
            elif cat in ["Sofas", "Beds"]:
                qty = max(1, int(rng.normal(5, 2)))
                # Apply bed seasonal multiplier
                if cat == "Beds":
                    multiplier = get_bed_seasonal_multiplier(start_date)
                    qty = max(1, int(qty * multiplier))
            elif cat == "Tables":
                qty = max(1, int(rng.normal(6, 3)))
            else:  # Storage
                qty = max(1, int(rng.normal(4, 2)))

            # Production duration: 3-14 days depending on complexity
            if cat in ["Sofas", "Beds"]:
                duration = rng.randint(7, 15)
            elif cat == "Storage":
                duration = rng.randint(5, 12)
            else:
                duration = rng.randint(3, 8)

            end_date = start_date + timedelta(days=int(duration))

            # Status
            if end_date > END_DATE:
                status = "in_progress"
            elif end_date > END_DATE - timedelta(days=5):
                status = rng.choice(["completed", "in_progress"])
            else:
                status = "completed"

            # Production cost per unit (with sofa cost increase story)
            unit_prod_cost = base_cost
            if cat == "Sofas":
                unit_prod_cost *= get_sofa_production_cost_multiplier(start_date)
            # Small variation
            unit_prod_cost *= (1.0 + rng.uniform(-0.03, 0.03))
            total_prod_cost = round(unit_prod_cost * qty, 2)

            # Defect count: typically 0-3% defect rate
            defect_rate = rng.uniform(0.01, 0.04)
            defect_count = int(np.round(qty * defect_rate))

            records.append({
                "production_id": f"PROD-ORD-{prod_counter:04d}",
                "product_id": pid,
                "quantity": qty,
                "start_date": start_date,
                "end_date": end_date,
                "status": status,
                "production_cost": total_prod_cost,
                "defect_count": defect_count,
            })
            prod_counter += 1

    df = pd.DataFrame(records)
    df["start_date"] = pd.to_datetime(df["start_date"])
    df["end_date"] = pd.to_datetime(df["end_date"])
    df = df.sort_values("start_date").reset_index(drop=True)
    return df
