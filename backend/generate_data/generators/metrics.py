"""
Generate daily_metrics and supplier_performance data for Bella Casa Furniture.
~550 daily metrics and ~150 monthly supplier performance records.
"""
import pandas as pd
import numpy as np
from datetime import date, timedelta

from backend.generate_data.config import START_DATE, END_DATE, SEED
from backend.generate_data.stories import (
    get_online_channel_weight,
    get_foam_cost_multiplier,
    is_tessuti_late_period,
)


def generate_daily_metrics(
    sales_df: pd.DataFrame = None,
    production_df: pd.DataFrame = None,
    rng: np.random.RandomState = None,
) -> pd.DataFrame:
    """
    Generate ~550 daily metrics records.
    If sales_df and production_df are provided, derive metrics from actual data.
    Otherwise generate synthetic standalone metrics.
    """
    if rng is None:
        rng = np.random.RandomState(SEED)

    records = []
    current = START_DATE

    # If we have actual sales data, aggregate from it
    if sales_df is not None:
        sales_df = sales_df.copy()
        sales_df["order_date_date"] = pd.to_datetime(sales_df["order_date"]).dt.date

        daily_agg = sales_df.groupby("order_date_date").agg(
            revenue=("total", "sum"),
            orders=("order_id", "count"),
            avg_order_value=("total", "mean"),
        ).reset_index()
        daily_agg.rename(columns={"order_date_date": "date"}, inplace=True)
        daily_agg_dict = daily_agg.set_index("date").to_dict("index")

        # Online share by day
        online_daily = sales_df[sales_df["channel"] == "online"].groupby("order_date_date").agg(
            online_rev=("total", "sum"),
        ).reset_index()
        online_daily.rename(columns={"order_date_date": "date"}, inplace=True)
        online_dict = online_daily.set_index("date")["online_rev"].to_dict()
    else:
        daily_agg_dict = {}
        online_dict = {}

    # Production metrics if available
    if production_df is not None:
        prod_df = production_df.copy()
        prod_df["start_date_date"] = pd.to_datetime(prod_df["start_date"]).dt.date
        prod_daily = prod_df.groupby("start_date_date").agg(
            production_units=("quantity", "sum"),
            defects=("defect_count", "sum"),
            total_qty=("quantity", "sum"),
        ).reset_index()
        prod_daily.rename(columns={"start_date_date": "date"}, inplace=True)
        prod_daily_dict = prod_daily.set_index("date").to_dict("index")
    else:
        prod_daily_dict = {}

    while current <= END_DATE:
        d = current

        if d in daily_agg_dict:
            agg = daily_agg_dict[d]
            revenue = round(agg["revenue"], 2)
            orders = int(agg["orders"])
            aov = round(agg["avg_order_value"], 2)
        else:
            # No orders this day (weekend or holiday)
            revenue = 0.0
            orders = 0
            aov = 0.0

        # Customer metrics (synthetic approximation)
        if orders > 0:
            new_cust = max(0, int(rng.poisson(orders * 0.15)))
            returning_cust = max(0, orders - new_cust)
        else:
            new_cust = 0
            returning_cust = 0

        # Production metrics
        if d in prod_daily_dict:
            prod = prod_daily_dict[d]
            prod_units = int(prod["production_units"])
            defects = int(prod["defects"])
            total_q = int(prod["total_qty"])
            defect_rate = round(defects / total_q, 4) if total_q > 0 else 0.0
        else:
            prod_units = 0
            defect_rate = 0.0

        # Inventory turnover (synthetic: ratio-based, annualized)
        inv_turnover = round(rng.uniform(4.0, 8.0), 2)

        # Online share
        if d in online_dict and revenue > 0:
            online_share = round(online_dict[d] / revenue, 4)
        else:
            online_share = round(get_online_channel_weight(d), 4)

        records.append({
            "date": d,
            "revenue": revenue,
            "orders": orders,
            "avg_order_value": aov,
            "new_customers": new_cust,
            "returning_customers": returning_cust,
            "production_units": prod_units,
            "defect_rate": defect_rate,
            "inventory_turnover": inv_turnover,
            "online_share": online_share,
        })

        current += timedelta(days=1)

    df = pd.DataFrame(records)
    df["date"] = pd.to_datetime(df["date"])
    return df


def generate_supplier_performance(
    suppliers_df: pd.DataFrame,
    purchasing_df: pd.DataFrame = None,
    rng: np.random.RandomState = None,
) -> pd.DataFrame:
    """
    Generate ~150 monthly supplier performance records.
    If purchasing_df provided, derive from actual PO data.
    """
    if rng is None:
        rng = np.random.RandomState(SEED)

    supplier_ids = suppliers_df["supplier_id"].values
    sup_lookup = suppliers_df.set_index("supplier_id").to_dict("index")

    # Generate monthly periods
    months = pd.date_range(start=START_DATE, end=END_DATE, freq="MS")

    records = []

    if purchasing_df is not None:
        po_df = purchasing_df.copy()
        po_df["month"] = pd.to_datetime(po_df["order_date"]).dt.to_period("M")

        for month_start in months:
            month_period = month_start.to_period("M")

            for sid in supplier_ids:
                sup_info = sup_lookup[sid]
                month_pos = po_df[
                    (po_df["supplier_id"] == sid) & (po_df["month"] == month_period)
                ]

                total_orders = len(month_pos)
                if total_orders == 0:
                    continue

                total_spend = round(month_pos["total_cost"].sum(), 2)

                # On-time calculation
                delivered = month_pos[month_pos["status"] == "delivered"]
                if len(delivered) > 0:
                    on_time = (
                        delivered["actual_delivery"] <= delivered["expected_delivery"] + pd.Timedelta(days=2)
                    ).sum()
                    on_time_pct = round(on_time / len(delivered) * 100, 1)
                    avg_lead = round(
                        (delivered["actual_delivery"] - pd.to_datetime(delivered["order_date"]))
                        .dt.days.mean(), 1
                    )
                else:
                    on_time_pct = None
                    avg_lead = sup_info["lead_time_days"]

                # Quality score (synthetic: reliability-based with variation)
                base_quality = sup_info["reliability_score"] * 100
                # Foam supplier quality drops after Oct 2024
                if sid == "SUP-004" and month_start >= pd.Timestamp("2024-10-01"):
                    base_quality -= 15
                quality_score = round(
                    float(np.clip(rng.normal(base_quality, 3), 50, 100)), 1
                )

                records.append({
                    "month": str(month_period),
                    "supplier_id": sid,
                    "on_time_pct": on_time_pct,
                    "quality_score": quality_score,
                    "avg_lead_days": avg_lead,
                    "total_orders": total_orders,
                    "total_spend": total_spend,
                })
    else:
        # Standalone generation
        for month_start in months:
            for sid in supplier_ids:
                sup_info = sup_lookup[sid]
                base_reliability = sup_info["reliability_score"]

                on_time_pct = round(
                    float(np.clip(rng.normal(base_reliability * 100, 5), 50, 100)), 1
                )
                # Foam supplier story
                if sid == "SUP-004" and month_start >= pd.Timestamp("2024-10-01"):
                    on_time_pct = round(float(np.clip(rng.normal(65, 8), 40, 80)), 1)

                quality = round(
                    float(np.clip(rng.normal(base_reliability * 100, 3), 50, 100)), 1
                )
                if sid == "SUP-004" and month_start >= pd.Timestamp("2024-10-01"):
                    quality = round(float(np.clip(rng.normal(75, 5), 55, 90)), 1)

                avg_lead = round(
                    float(np.clip(rng.normal(sup_info["lead_time_days"], 2), 2, 40)), 1
                )
                if sid == "SUP-004" and month_start >= pd.Timestamp("2024-10-01"):
                    avg_lead = round(float(np.clip(rng.normal(14, 4), 7, 28)), 1)

                total_orders = max(1, int(rng.normal(8, 3)))
                total_spend = round(rng.uniform(5000, 50000), 2)

                records.append({
                    "month": str(month_start.to_period("M")),
                    "supplier_id": sid,
                    "on_time_pct": on_time_pct,
                    "quality_score": quality,
                    "avg_lead_days": avg_lead,
                    "total_orders": total_orders,
                    "total_spend": total_spend,
                })

    df = pd.DataFrame(records)
    return df
