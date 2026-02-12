"""
Generate sales_orders and order_line_items data for Bella Casa Furniture.
~3500 sales orders and ~7000 line items.

Key stories embedded:
- Online channel grows from 15% to 38% after March 2024 website relaunch
- Showroom 3: lowest revenue, highest discounts (avg 12%), worst ratings (3.4)
- Seasonal bed boom: 2.5x spike in Oct-Nov each year
- Sofa margins drop from 42% to 28% after Oct 2024 (foam cost increase)
- VIP concentration: Rossi Interiors = 12% revenue, last order Nov 2024
"""
import pandas as pd
import numpy as np
from datetime import date, timedelta

from backend.generate_data.config import (
    START_DATE, END_DATE, SEED, CHANNELS,
)
from backend.generate_data.stories import (
    get_channel_weights,
    get_showroom3_discount,
    get_showroom3_rating,
    get_bed_seasonal_multiplier,
    get_sofa_production_cost_multiplier,
)


def generate_sales(
    customers_df: pd.DataFrame,
    products_df: pd.DataFrame,
    rng: np.random.RandomState = None,
) -> tuple:
    """
    Generate ~3500 sales orders and ~7000 line items.
    Returns (sales_orders_df, order_line_items_df).
    """
    if rng is None:
        rng = np.random.RandomState(SEED)

    total_days = (END_DATE - START_DATE).days
    product_lookup = products_df.set_index("product_id").to_dict("index")
    product_ids = products_df["product_id"].values

    # Separate customer pools
    b2b_customers = customers_df[customers_df["type"] == "B2B"]["customer_id"].values
    b2c_customers = customers_df[customers_df["type"] == "B2C"]["customer_id"].values
    vip_customers = customers_df[customers_df["segment"] == "VIP"]["customer_id"].values
    all_customers = customers_df["customer_id"].values

    # Build channel->customer mapping
    channel_customers = {}
    for ch in CHANNELS:
        mask = customers_df["channel"] == ch
        cids = customers_df.loc[mask, "customer_id"].values
        if len(cids) > 0:
            channel_customers[ch] = cids

    # Product category index
    sofa_ids = products_df[products_df["category"] == "Sofas"]["product_id"].values
    bed_ids = products_df[products_df["category"] == "Beds"]["product_id"].values
    table_ids = products_df[products_df["category"] == "Tables"]["product_id"].values
    chair_ids = products_df[products_df["category"] == "Chairs"]["product_id"].values
    storage_ids = products_df[products_df["category"] == "Storage"]["product_id"].values

    sales_records = []
    line_records = []
    order_counter = 1
    line_counter = 1

    target_orders = 3500
    # Distribute orders across days with some daily variation
    orders_per_day = target_orders / total_days

    current_date = START_DATE
    while current_date <= END_DATE:
        # Skip weekends for fewer orders (but not zero -- online orders happen)
        if current_date.weekday() >= 5:
            daily_orders = max(0, int(rng.poisson(orders_per_day * 0.3)))
        else:
            daily_orders = max(0, int(rng.poisson(orders_per_day * 1.25)))

        for _ in range(daily_orders):
            order_date = current_date

            # Determine channel based on date-dependent weights
            ch_weights = get_channel_weights(order_date)
            channels_list = list(ch_weights.keys())
            probs = np.array([ch_weights[c] for c in channels_list])
            probs = probs / probs.sum()
            channel = rng.choice(channels_list, p=probs)

            # Pick customer from that channel (or any if pool is small)
            if channel in channel_customers and len(channel_customers[channel]) > 0:
                customer_id = rng.choice(channel_customers[channel])
            else:
                customer_id = rng.choice(all_customers)

            # VIP customers more likely to be picked for wholesale
            if channel == "wholesale" and rng.random() < 0.35 and len(vip_customers) > 0:
                customer_id = rng.choice(vip_customers)

            # Generate line items (1-4 items per order, avg ~2)
            n_items = rng.choice([1, 1, 2, 2, 2, 3, 3, 4])

            # Product selection with seasonal bed boost
            bed_multiplier = get_bed_seasonal_multiplier(order_date)

            # Category weights (base)
            cat_weights = {
                "Sofas": 0.25,
                "Beds": 0.20 * bed_multiplier,  # Boosted in Oct-Nov
                "Tables": 0.22,
                "Chairs": 0.23,
                "Storage": 0.10,
            }

            cat_list = list(cat_weights.keys())
            cat_probs = np.array([cat_weights[c] for c in cat_list])
            cat_probs = cat_probs / cat_probs.sum()

            cat_to_ids = {
                "Sofas": sofa_ids,
                "Beds": bed_ids,
                "Tables": table_ids,
                "Chairs": chair_ids,
                "Storage": storage_ids,
            }

            order_lines = []
            subtotal = 0.0

            for _ in range(n_items):
                category = rng.choice(cat_list, p=cat_probs)
                pid = rng.choice(cat_to_ids[category])
                prod = product_lookup[pid]

                # Quantity: chairs/bar stools often bought in sets
                if category == "Chairs":
                    qty = rng.choice([1, 2, 2, 4, 4, 6])
                elif channel == "wholesale":
                    qty = rng.choice([2, 3, 4, 5, 6, 8, 10])
                else:
                    qty = rng.choice([1, 1, 1, 2])

                unit_price = prod["base_price"]
                # Small price jitter (+/- 2%)
                unit_price *= (1.0 + rng.uniform(-0.02, 0.02))
                unit_price = round(unit_price, 2)

                line_total = round(unit_price * qty, 2)
                subtotal += line_total

                order_lines.append({
                    "line_id": f"LINE-{line_counter:06d}",
                    "order_id": f"ORD-{order_counter:05d}",
                    "product_id": pid,
                    "quantity": qty,
                    "unit_price": unit_price,
                    "line_total": line_total,
                })
                line_counter += 1

            subtotal = round(subtotal, 2)

            # Discount (channel-dependent, Showroom 3 story)
            discount_pct = get_showroom3_discount(rng, channel)
            discount_amount = round(subtotal * discount_pct / 100.0, 2)
            total = round(subtotal - discount_amount, 2)

            # Shipping cost
            if channel == "online":
                shipping = round(rng.uniform(25, 120), 2) if total < 2000 else 0.0
            elif channel == "wholesale":
                shipping = round(rng.uniform(50, 300), 2)
            else:
                shipping = 0.0  # Showroom = free local delivery

            # Delivery date: 5-21 days after order
            delivery_days = rng.randint(5, 22)
            delivery_date = order_date + timedelta(days=int(delivery_days))

            # Rating (channel-dependent, Showroom 3 story)
            # ~80% of orders get a rating
            if rng.random() < 0.80:
                rating = get_showroom3_rating(rng, channel)
            else:
                rating = None

            # Status
            if delivery_date > END_DATE:
                status = rng.choice(["confirmed", "processing", "shipped"])
            else:
                status_choices = ["delivered", "delivered", "delivered", "delivered",
                                  "delivered", "delivered", "delivered", "delivered",
                                  "delivered", "returned"]
                status = rng.choice(status_choices)

            sales_records.append({
                "order_id": f"ORD-{order_counter:05d}",
                "customer_id": customer_id,
                "order_date": order_date,
                "channel": channel,
                "status": status,
                "subtotal": subtotal,
                "discount_pct": discount_pct,
                "total": total,
                "shipping_cost": shipping,
                "delivery_date": delivery_date,
                "rating": rating,
            })
            line_records.extend(order_lines)
            order_counter += 1

        current_date += timedelta(days=1)

    sales_df = pd.DataFrame(sales_records)
    sales_df["order_date"] = pd.to_datetime(sales_df["order_date"])
    sales_df["delivery_date"] = pd.to_datetime(sales_df["delivery_date"])

    line_items_df = pd.DataFrame(line_records)

    return sales_df, line_items_df
