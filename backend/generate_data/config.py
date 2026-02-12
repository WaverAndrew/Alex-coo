"""
Configuration constants for Bella Casa Furniture synthetic data generation.
"""
import os
from datetime import date

# Reproducibility
SEED = 42

# Date range for generated data
START_DATE = date(2023, 7, 1)
END_DATE = date(2025, 1, 31)

# Output directory (relative to project root)
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Company info
COMPANY_NAME = "Bella Casa Furniture"

# Key story thresholds
ONLINE_RELAUNCH_DATE = date(2024, 3, 1)
FOAM_PRICE_HIKE_DATE = date(2024, 10, 1)
VIP_CONCENTRATION_TOP_PCT = 0.05
VIP_REVENUE_SHARE = 0.41
TOP_CUSTOMER_REVENUE_SHARE = 0.12
TOP_CUSTOMER_NAME = "Rossi Interiors"
TOP_CUSTOMER_LAST_ORDER = date(2024, 11, 15)

# Channel names
CHANNELS = ["showroom_1", "showroom_2", "showroom_3", "online", "wholesale"]

# Product categories
PRODUCT_CATEGORIES = {
    "Sofas": 4,
    "Beds": 4,
    "Tables": 4,
    "Chairs": 4,
    "Storage": 2,
}

# Target record counts
TARGET_CUSTOMERS = 800
TARGET_PURCHASE_ORDERS = 1200
TARGET_PRODUCTION_ORDERS = 600
TARGET_SALES_ORDERS = 3500
TARGET_LINE_ITEMS = 7000
TARGET_INVENTORY_SNAPSHOTS = 450
TARGET_DAILY_METRICS = 550
TARGET_SUPPLIER_PERFORMANCE = 150
TARGET_BOM_RECORDS = 70
