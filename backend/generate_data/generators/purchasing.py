"""
Generate purchase_orders data for Bella Casa Furniture.
~1200 purchase orders with the foam supplier disruption story.

Key story: Schiuma Veneta (foam supplier SUP-004) raises prices 18% starting Oct 2024,
           and on-time delivery drops from 92% to 65%.
"""
import pandas as pd
import numpy as np
from datetime import date, timedelta

from backend.generate_data.config import START_DATE, END_DATE, SEED
from backend.generate_data.stories import get_foam_cost_multiplier, is_tessuti_late_period


def generate_purchasing(
    suppliers_df: pd.DataFrame,
    materials_df: pd.DataFrame,
    rng: np.random.RandomState = None,
) -> pd.DataFrame:
    """Generate ~1200 purchase orders across the date range."""
    if rng is None:
        rng = np.random.RandomState(SEED)

    supplier_ids = suppliers_df["supplier_id"].values
    material_by_supplier = {}
    for _, row in materials_df.iterrows():
        sid = row["supplier_id"]
        if sid not in material_by_supplier:
            material_by_supplier[sid] = []
        material_by_supplier[sid].append(row)

    total_days = (END_DATE - START_DATE).days
    records = []
    po_counter = 1

    # Generate roughly evenly across suppliers but weighted by usage
    # More orders for wood, leather, foam, fabric (high-usage categories)
    supplier_weights = {
        "SUP-001": 0.16,  # wood
        "SUP-002": 0.14,  # leather
        "SUP-003": 0.12,  # fabric
        "SUP-004": 0.14,  # foam
        "SUP-005": 0.12,  # hardware
        "SUP-006": 0.06,  # glass
        "SUP-007": 0.10,  # paint
        "SUP-008": 0.16,  # packaging
    }

    target_orders = 1200

    for supplier_id, weight in supplier_weights.items():
        n_orders = int(target_orders * weight)
        sup_row = suppliers_df[suppliers_df["supplier_id"] == supplier_id].iloc[0]
        mats = material_by_supplier.get(supplier_id, [])
        if not mats:
            continue

        lead_time = sup_row["lead_time_days"]

        for _ in range(n_orders):
            mat = mats[rng.randint(0, len(mats))]
            mat_id = mat["material_id"]
            base_unit_cost = mat["unit_cost"]
            reorder_qty = mat["reorder_qty"]

            # Random order date (business days)
            day_offset = rng.randint(0, total_days)
            order_date = START_DATE + timedelta(days=int(day_offset))

            # Skip weekends
            while order_date.weekday() >= 5:
                order_date += timedelta(days=1)

            # Quantity: around reorder_qty with some variation
            qty = max(1, int(rng.normal(reorder_qty, reorder_qty * 0.2)))

            # Unit cost: apply foam price hike story
            unit_cost = base_unit_cost
            if supplier_id == "SUP-004":  # Schiuma Veneta (foam)
                unit_cost *= get_foam_cost_multiplier(order_date)
            # Small random price variation (+/- 5%)
            unit_cost *= (1.0 + rng.uniform(-0.05, 0.05))
            unit_cost = round(unit_cost, 2)

            total_cost = round(qty * unit_cost, 2)

            # Expected delivery
            expected_delivery = order_date + timedelta(days=int(lead_time))
            while expected_delivery.weekday() >= 5:
                expected_delivery += timedelta(days=1)

            # Actual delivery: mostly on time, but foam supplier gets late after Oct 2024
            if supplier_id == "SUP-004" and is_tessuti_late_period(order_date):
                # 65% on-time, 35% late (significantly late: 5-20 days)
                if rng.random() < 0.65:
                    delay = rng.randint(0, 3)
                else:
                    delay = rng.randint(5, 21)
            else:
                # Normal: ~92% on-time for most suppliers
                reliability = sup_row["reliability_score"]
                if rng.random() < reliability:
                    delay = rng.randint(0, 2)
                else:
                    delay = rng.randint(3, 12)

            actual_delivery = expected_delivery + timedelta(days=int(delay))
            while actual_delivery.weekday() >= 5:
                actual_delivery += timedelta(days=1)

            # Status
            if actual_delivery > END_DATE:
                status = "pending"
            elif actual_delivery <= date.today():
                status = "delivered"
            else:
                status = "in_transit"

            # Override: most should be delivered since END_DATE is Jan 2025
            if order_date < END_DATE - timedelta(days=30):
                status = "delivered"
            elif order_date < END_DATE - timedelta(days=7):
                status = rng.choice(["delivered", "delivered", "in_transit"])
            else:
                status = rng.choice(["pending", "in_transit"])

            records.append({
                "po_id": f"PO-{po_counter:04d}",
                "supplier_id": supplier_id,
                "material_id": mat_id,
                "quantity": qty,
                "unit_cost": unit_cost,
                "total_cost": total_cost,
                "order_date": order_date,
                "expected_delivery": expected_delivery,
                "actual_delivery": actual_delivery if status == "delivered" else None,
                "status": status,
            })
            po_counter += 1

    df = pd.DataFrame(records)
    df["order_date"] = pd.to_datetime(df["order_date"])
    df["expected_delivery"] = pd.to_datetime(df["expected_delivery"])
    df["actual_delivery"] = pd.to_datetime(df["actual_delivery"])
    df = df.sort_values("order_date").reset_index(drop=True)
    return df
