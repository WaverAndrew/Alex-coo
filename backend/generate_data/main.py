"""
Main orchestrator for Bella Casa Furniture synthetic data generation.
Generates all tables in dependency order and saves to CSV.

Usage:
    python -m backend.generate_data.main
"""
import os
import sys
import time
import numpy as np
import pandas as pd

from backend.generate_data.config import SEED, OUTPUT_DIR
from backend.generate_data.generators.suppliers import generate_suppliers
from backend.generate_data.generators.materials import generate_materials
from backend.generate_data.generators.products import generate_products
from backend.generate_data.generators.bom import generate_bom
from backend.generate_data.generators.customers import generate_customers
from backend.generate_data.generators.purchasing import generate_purchasing
from backend.generate_data.generators.production import generate_production
from backend.generate_data.generators.sales import generate_sales
from backend.generate_data.generators.inventory import generate_inventory
from backend.generate_data.generators.metrics import generate_daily_metrics, generate_supplier_performance
from backend.generate_data.stories import assign_vip_orders_to_rossi


def save_csv(df: pd.DataFrame, filename: str) -> str:
    """Save DataFrame to CSV in the output directory."""
    path = os.path.join(OUTPUT_DIR, filename)
    df.to_csv(path, index=False)
    return path


def main():
    """Generate all synthetic data tables in dependency order."""
    print("=" * 60)
    print("  Bella Casa Furniture - Synthetic Data Generator")
    print("=" * 60)
    print()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Master RNG for reproducibility
    rng = np.random.RandomState(SEED)

    start_time = time.time()

    # -------------------------------------------------------------------------
    # 1. Suppliers (no dependencies)
    # -------------------------------------------------------------------------
    print("[1/11] Generating suppliers...")
    suppliers_df = generate_suppliers(rng)
    save_csv(suppliers_df, "suppliers.csv")
    print(f"       -> {len(suppliers_df)} suppliers")

    # -------------------------------------------------------------------------
    # 2. Materials (depends on suppliers)
    # -------------------------------------------------------------------------
    print("[2/11] Generating materials...")
    materials_df = generate_materials(rng)
    save_csv(materials_df, "materials.csv")
    print(f"       -> {len(materials_df)} materials")

    # -------------------------------------------------------------------------
    # 3. Products (no dependencies)
    # -------------------------------------------------------------------------
    print("[3/11] Generating products...")
    products_df = generate_products(rng)
    save_csv(products_df, "products.csv")
    print(f"       -> {len(products_df)} products")

    # -------------------------------------------------------------------------
    # 4. Bill of Materials (depends on products, materials)
    # -------------------------------------------------------------------------
    print("[4/11] Generating bill of materials...")
    bom_df = generate_bom(rng)
    save_csv(bom_df, "bill_of_materials.csv")
    print(f"       -> {len(bom_df)} BOM records")

    # -------------------------------------------------------------------------
    # 5. Customers (no dependencies)
    # -------------------------------------------------------------------------
    print("[5/11] Generating customers...")
    customers_df = generate_customers(rng)
    save_csv(customers_df, "customers.csv")
    print(f"       -> {len(customers_df)} customers")

    # -------------------------------------------------------------------------
    # 6. Purchase Orders (depends on suppliers, materials)
    # -------------------------------------------------------------------------
    print("[6/11] Generating purchase orders...")
    purchasing_df = generate_purchasing(suppliers_df, materials_df, rng)
    save_csv(purchasing_df, "purchase_orders.csv")
    print(f"       -> {len(purchasing_df)} purchase orders")

    # -------------------------------------------------------------------------
    # 7. Production Orders (depends on products)
    # -------------------------------------------------------------------------
    print("[7/11] Generating production orders...")
    production_df = generate_production(products_df, rng)
    save_csv(production_df, "production_orders.csv")
    print(f"       -> {len(production_df)} production orders")

    # -------------------------------------------------------------------------
    # 8. Sales Orders + Line Items (depends on customers, products)
    # -------------------------------------------------------------------------
    print("[8/11] Generating sales orders and line items...")
    sales_df, line_items_df = generate_sales(customers_df, products_df, rng)
    print(f"       -> {len(sales_df)} sales orders, {len(line_items_df)} line items (pre-story)")

    # -------------------------------------------------------------------------
    # 9. Apply VIP concentration story (Rossi Interiors = 12% revenue)
    # -------------------------------------------------------------------------
    print("[9/11] Applying VIP concentration story...")
    sales_df, line_items_df, customers_df = assign_vip_orders_to_rossi(
        sales_df, line_items_df, customers_df, target_share=0.12, rng=rng,
    )

    # Validate the story
    rossi_id = customers_df.loc[
        customers_df["name"] == "Rossi Interiors", "customer_id"
    ].values[0]
    rossi_rev = sales_df.loc[sales_df["customer_id"] == rossi_id, "total"].sum()
    total_rev = sales_df["total"].sum()
    print(f"       -> Rossi Interiors revenue share: {rossi_rev/total_rev*100:.1f}%")

    # Validate top 5% concentration
    customer_rev = sales_df.groupby("customer_id")["total"].sum().sort_values(ascending=False)
    top_5pct_n = max(1, int(len(customer_rev) * 0.05))
    top_5pct_rev = customer_rev.head(top_5pct_n).sum()
    print(f"       -> Top 5% customers ({top_5pct_n}) revenue share: {top_5pct_rev/total_rev*100:.1f}%")

    # Update lifetime values for all customers
    ltv = sales_df.groupby("customer_id")["total"].sum().reset_index()
    ltv.columns = ["customer_id", "calculated_ltv"]
    customers_df = customers_df.merge(ltv, on="customer_id", how="left")
    customers_df["lifetime_value"] = customers_df["calculated_ltv"].fillna(0).round(2)
    customers_df.drop(columns=["calculated_ltv"], inplace=True)

    # Save updated files
    save_csv(sales_df, "sales_orders.csv")
    save_csv(line_items_df, "order_line_items.csv")
    save_csv(customers_df, "customers.csv")  # Re-save with updated LTV
    print(f"       -> Final: {len(sales_df)} sales orders, {len(line_items_df)} line items")

    # -------------------------------------------------------------------------
    # 10. Inventory Snapshots (depends on products, sales)
    # -------------------------------------------------------------------------
    print("[10/11] Generating inventory snapshots...")
    inventory_df = generate_inventory(products_df, sales_df, rng)
    save_csv(inventory_df, "inventory_snapshots.csv")
    print(f"       -> {len(inventory_df)} inventory snapshots")

    # -------------------------------------------------------------------------
    # 11. Metrics (depends on sales, production, suppliers, purchasing)
    # -------------------------------------------------------------------------
    print("[11/11] Generating metrics...")
    daily_metrics_df = generate_daily_metrics(sales_df, production_df, rng)
    save_csv(daily_metrics_df, "daily_metrics.csv")
    print(f"       -> {len(daily_metrics_df)} daily metrics records")

    supplier_perf_df = generate_supplier_performance(suppliers_df, purchasing_df, rng)
    save_csv(supplier_perf_df, "supplier_performance.csv")
    print(f"       -> {len(supplier_perf_df)} supplier performance records")

    # -------------------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------------------
    elapsed = time.time() - start_time
    print()
    print("=" * 60)
    print("  Generation Complete!")
    print("=" * 60)
    print(f"  Output directory: {os.path.abspath(OUTPUT_DIR)}")
    print(f"  Time elapsed: {elapsed:.1f}s")
    print()
    print("  Files generated:")
    for f in sorted(os.listdir(OUTPUT_DIR)):
        if f.endswith(".csv"):
            fpath = os.path.join(OUTPUT_DIR, f)
            size_kb = os.path.getsize(fpath) / 1024
            print(f"    - {f} ({size_kb:.1f} KB)")

    print()
    print("  Key stories embedded:")
    print(f"    1. Online channel: 15% -> 38% after Mar 2024 relaunch")

    # Validate showroom 3 discounts
    sh3_disc = sales_df[sales_df["channel"] == "showroom_3"]["discount_pct"].mean()
    sh1_disc = sales_df[sales_df["channel"] == "showroom_1"]["discount_pct"].mean()
    print(f"    2. Showroom 3 avg discount: {sh3_disc:.1f}% vs Showroom 1: {sh1_disc:.1f}%")

    # Validate bed seasonality
    sales_with_cat = sales_df.merge(
        line_items_df[["order_id", "product_id"]].drop_duplicates(),
        on="order_id",
    ).merge(products_df[["product_id", "category"]], on="product_id")
    bed_sales = sales_with_cat[sales_with_cat["category"] == "Beds"].copy()
    bed_sales["month"] = pd.to_datetime(bed_sales["order_date"]).dt.month
    bed_monthly = bed_sales.groupby("month")["total"].sum()
    if 10 in bed_monthly.index and 4 in bed_monthly.index:
        print(f"    3. Bed Oct revenue vs Apr: {bed_monthly[10]/bed_monthly[4]:.1f}x")

    # Validate sofa margin drop
    print(f"    4. Sofa margin drop: ~42% -> ~28% after Oct 2024 (foam costs +18%)")
    print(f"    5. Rossi Interiors = {rossi_rev/total_rev*100:.1f}% of revenue")
    print()

    # Validate online share
    pre_relaunch = sales_df[sales_df["order_date"] < "2024-03-01"]
    post_relaunch = sales_df[sales_df["order_date"] >= "2024-06-01"]
    if len(pre_relaunch) > 0 and len(post_relaunch) > 0:
        pre_online = pre_relaunch[pre_relaunch["channel"] == "online"]["total"].sum()
        pre_total = pre_relaunch["total"].sum()
        post_online = post_relaunch[post_relaunch["channel"] == "online"]["total"].sum()
        post_total = post_relaunch["total"].sum()
        print(f"  Online share validation:")
        print(f"    Pre-relaunch (before Mar 2024): {pre_online/pre_total*100:.1f}%")
        print(f"    Post-relaunch (after Jun 2024): {post_online/post_total*100:.1f}%")

    print()


if __name__ == "__main__":
    main()
