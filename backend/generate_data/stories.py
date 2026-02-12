"""
Story modifier functions that inject the 5 key anomalies/stories into generated data.

Stories:
1. Online channel grows from 15% to 38% of revenue after March 2024 website relaunch.
2. Showroom 3: lowest revenue, highest discounts (avg 12% vs 5-7%), worst ratings (3.4 vs 4.1/4.3).
3. Seasonal bed boom: 2.5x spike in Oct-Nov each year (sinusoidal pattern).
4. Sofa margins drop from 42% to 28% due to foam cost increase starting Oct 2024.
5. VIP concentration: top customer "Rossi Interiors" = 12% revenue, last order Nov 2024.
   Tessuti Milano (foam supplier) price hike + late deliveries from Oct 2024.
"""
import numpy as np
import pandas as pd
from datetime import date


def get_online_channel_weight(order_date: date) -> float:
    """
    Return the weight multiplier for online channel orders.
    Pre-March 2024: online is ~15% of orders.
    Post-March 2024: ramps up to ~38% by mid-2024.
    """
    relaunch = date(2024, 3, 1)
    if order_date < relaunch:
        return 0.15
    else:
        months_since = (order_date.year - relaunch.year) * 12 + (order_date.month - relaunch.month)
        # Ramp from 0.15 to 0.40 over ~4 months, then plateau
        growth = min(0.25, months_since * 0.065)
        return 0.15 + growth


def get_channel_weights(order_date: date) -> dict:
    """
    Return channel probability weights for a given date.
    Ensures online channel grows while showrooms shrink proportionally.
    """
    online_w = get_online_channel_weight(order_date)
    remaining = 1.0 - online_w
    # Showroom 3 always gets a smaller share
    return {
        "showroom_1": remaining * 0.28,
        "showroom_2": remaining * 0.25,
        "showroom_3": remaining * 0.12,
        "online": online_w,
        "wholesale": remaining * 0.35,
    }


def get_showroom3_discount(rng: np.random.RandomState, channel: str) -> float:
    """
    Showroom 3 gives excessively high discounts (avg 12%).
    Other channels: showroom_1 avg ~5%, showroom_2 avg ~7%, online avg ~3%, wholesale avg ~6%.
    """
    if channel == "showroom_3":
        return round(float(np.clip(rng.normal(12.0, 3.0), 5.0, 22.0)), 1)
    elif channel == "showroom_1":
        return round(float(np.clip(rng.normal(5.0, 2.0), 0.0, 12.0)), 1)
    elif channel == "showroom_2":
        return round(float(np.clip(rng.normal(7.0, 2.5), 0.0, 14.0)), 1)
    elif channel == "online":
        return round(float(np.clip(rng.normal(3.0, 1.5), 0.0, 10.0)), 1)
    else:  # wholesale
        return round(float(np.clip(rng.normal(6.0, 2.0), 0.0, 12.0)), 1)


def get_showroom3_rating(rng: np.random.RandomState, channel: str) -> float:
    """
    Showroom 3 has worst ratings (avg 3.4).
    Others: showroom_1 avg 4.3, showroom_2 avg 4.1, online avg 4.0, wholesale avg 4.2.
    """
    if channel == "showroom_3":
        return round(float(np.clip(rng.normal(3.4, 0.6), 1.0, 5.0)), 1)
    elif channel == "showroom_1":
        return round(float(np.clip(rng.normal(4.3, 0.4), 2.0, 5.0)), 1)
    elif channel == "showroom_2":
        return round(float(np.clip(rng.normal(4.1, 0.5), 2.0, 5.0)), 1)
    elif channel == "online":
        return round(float(np.clip(rng.normal(4.0, 0.5), 2.0, 5.0)), 1)
    else:  # wholesale
        return round(float(np.clip(rng.normal(4.2, 0.4), 2.0, 5.0)), 1)


def get_bed_seasonal_multiplier(order_date: date) -> float:
    """
    Beds have a 2.5x spike in Oct-Nov each year (sinusoidal pattern).
    Uses a sine wave peaking in mid-October.
    """
    day_of_year = order_date.timetuple().tm_yday
    # Peak around day 288 (mid-Oct), valley around day 108 (mid-Apr)
    # sin peaks at pi/2, so shift: sin(2*pi*(day - 288 + 91.25)/365)
    # = sin(2*pi*(day - 196.75)/365)
    angle = 2 * np.pi * (day_of_year - 196.75) / 365.0
    seasonal = np.sin(angle)
    # Map from [-1, 1] to [0.6, 2.5]
    # At peak (sin=1): 2.5, at trough (sin=-1): 0.6
    multiplier = 1.55 + 0.95 * seasonal
    return float(multiplier)


def get_foam_cost_multiplier(order_date: date) -> float:
    """
    Foam prices increase 18% starting Oct 2024 (Schiuma Veneta price hike).
    This impacts sofa production costs and thus margins.
    """
    hike_date = date(2024, 10, 1)
    if order_date < hike_date:
        return 1.0
    else:
        return 1.18


def get_sofa_production_cost_multiplier(order_date: date) -> float:
    """
    Sofa margins drop from ~42% to ~28% after Oct 2024 due to foam costs.
    Original margin: (price - cost) / price = 42% => cost = 0.58 * price
    New margin: 28% => cost = 0.72 * price
    Cost increase factor: 0.72 / 0.58 = 1.241
    """
    hike_date = date(2024, 10, 1)
    if order_date < hike_date:
        return 1.0
    else:
        return 1.241


def is_tessuti_late_period(order_date: date) -> bool:
    """Check if date falls in the Tessuti Milano disruption period (Oct 2024+)."""
    return order_date >= date(2024, 10, 1)


def get_tessuti_on_time_rate(order_date: date) -> float:
    """
    Tessuti Milano (foam supplier SUP-004) on-time drops from 92% to 65% after Oct 2024.
    Note: despite the name Tessuti Milano is actually SUP-003 (fabric),
    but the story says foam supplier. We map SUP-004 (Schiuma Veneta) for foam price hike
    and delivery issues. The story references 'Tessuti Milano' as the foam supplier
    with problems -- we assign the delivery problems to SUP-004 (foam).
    """
    if order_date >= date(2024, 10, 1):
        return 0.65
    return 0.92


def assign_vip_orders_to_rossi(
    sales_df: pd.DataFrame,
    line_items_df: pd.DataFrame,
    customers_df: pd.DataFrame,
    target_share: float = 0.12,
    rng: np.random.RandomState = None,
) -> tuple:
    """
    Ensure Rossi Interiors accounts for ~12% of total revenue.
    Also ensure their last order is in November 2024.
    Returns modified (sales_df, line_items_df, customers_df).
    """
    if rng is None:
        rng = np.random.RandomState(42)

    rossi_id = customers_df.loc[
        customers_df["name"] == "Rossi Interiors", "customer_id"
    ].values[0]

    total_revenue = sales_df["total"].sum()
    target_revenue = total_revenue * target_share

    # Find orders currently assigned to Rossi
    rossi_orders = sales_df[sales_df["customer_id"] == rossi_id]
    rossi_current = rossi_orders["total"].sum()

    if rossi_current >= target_revenue:
        return sales_df, line_items_df, customers_df

    needed = target_revenue - rossi_current

    # Reassign some large wholesale/B2B orders to Rossi
    # Pick non-Rossi wholesale orders, sorted by total descending
    candidates = sales_df[
        (sales_df["customer_id"] != rossi_id)
        & (sales_df["channel"] == "wholesale")
    ].sort_values("total", ascending=False)

    reassigned_total = 0.0
    reassigned_ids = []

    for idx, row in candidates.iterrows():
        if reassigned_total >= needed:
            break
        reassigned_ids.append(idx)
        reassigned_total += row["total"]

    # Reassign these orders to Rossi
    sales_df.loc[reassigned_ids, "customer_id"] = rossi_id
    sales_df.loc[reassigned_ids, "channel"] = "wholesale"

    # Ensure last Rossi order is in November 2024
    rossi_mask = sales_df["customer_id"] == rossi_id
    rossi_orders_sorted = sales_df.loc[rossi_mask].sort_values("order_date", ascending=False)

    # Move the latest order to Nov 15, 2024 if it's not already in Nov 2024
    if len(rossi_orders_sorted) > 0:
        latest_idx = rossi_orders_sorted.index[0]
        last_order_date = pd.Timestamp("2024-11-15")
        sales_df.loc[latest_idx, "order_date"] = last_order_date
        sales_df.loc[latest_idx, "delivery_date"] = last_order_date + pd.Timedelta(days=12)

    # Remove any Rossi orders after November 2024
    rossi_after_nov = sales_df[
        (sales_df["customer_id"] == rossi_id)
        & (sales_df["order_date"] > pd.Timestamp("2024-11-30"))
    ].index
    if len(rossi_after_nov) > 0:
        # Reassign these to other B2B customers
        other_b2b = customers_df[
            (customers_df["type"] == "B2B")
            & (customers_df["name"] != "Rossi Interiors")
        ]["customer_id"].values
        for idx in rossi_after_nov:
            sales_df.loc[idx, "customer_id"] = rng.choice(other_b2b)

    # Update lifetime values
    for cid in sales_df["customer_id"].unique():
        ltv = sales_df.loc[sales_df["customer_id"] == cid, "total"].sum()
        if cid in customers_df["customer_id"].values:
            customers_df.loc[customers_df["customer_id"] == cid, "lifetime_value"] = round(ltv, 2)

    return sales_df, line_items_df, customers_df
