"""
Generate products data for Bella Casa Furniture.
18 Italian furniture products across 5 categories.
"""
import pandas as pd
import numpy as np


def generate_products(rng: np.random.RandomState = None) -> pd.DataFrame:
    """Generate 18 products - Italian luxury furniture."""
    if rng is None:
        rng = np.random.RandomState(42)

    products = [
        # Sofas (4)
        {
            "product_id": "PROD-001",
            "name": "Divano Roma (3-Seater Leather Sofa)",
            "category": "Sofas",
            "base_price": 3200.00,
            "production_cost": 1856.00,
            "weight_kg": 85.0,
            "active": True,
        },
        {
            "product_id": "PROD-002",
            "name": "Divano Venezia (Sectional Fabric Sofa)",
            "category": "Sofas",
            "base_price": 4500.00,
            "production_cost": 2610.00,
            "weight_kg": 120.0,
            "active": True,
        },
        {
            "product_id": "PROD-003",
            "name": "Poltrona Capri (Accent Armchair)",
            "category": "Sofas",
            "base_price": 1400.00,
            "production_cost": 812.00,
            "weight_kg": 35.0,
            "active": True,
        },
        {
            "product_id": "PROD-004",
            "name": "Divano Amalfi (2-Seater Velvet Sofa)",
            "category": "Sofas",
            "base_price": 2600.00,
            "production_cost": 1508.00,
            "weight_kg": 65.0,
            "active": True,
        },

        # Beds (4)
        {
            "product_id": "PROD-005",
            "name": "Letto Firenze (King Platform Bed)",
            "category": "Beds",
            "base_price": 2800.00,
            "production_cost": 1540.00,
            "weight_kg": 95.0,
            "active": True,
        },
        {
            "product_id": "PROD-006",
            "name": "Letto Siena (Queen Upholstered Bed)",
            "category": "Beds",
            "base_price": 2200.00,
            "production_cost": 1210.00,
            "weight_kg": 80.0,
            "active": True,
        },
        {
            "product_id": "PROD-007",
            "name": "Letto Verona (Storage Bed Frame)",
            "category": "Beds",
            "base_price": 1900.00,
            "production_cost": 1045.00,
            "weight_kg": 110.0,
            "active": True,
        },
        {
            "product_id": "PROD-008",
            "name": "Letto Portofino (Canopy Bed)",
            "category": "Beds",
            "base_price": 3500.00,
            "production_cost": 1925.00,
            "weight_kg": 130.0,
            "active": True,
        },

        # Tables (4)
        {
            "product_id": "PROD-009",
            "name": "Tavolo Milano (Walnut Dining Table)",
            "category": "Tables",
            "base_price": 2400.00,
            "production_cost": 1320.00,
            "weight_kg": 70.0,
            "active": True,
        },
        {
            "product_id": "PROD-010",
            "name": "Tavolino Lago (Glass Coffee Table)",
            "category": "Tables",
            "base_price": 850.00,
            "production_cost": 467.50,
            "weight_kg": 28.0,
            "active": True,
        },
        {
            "product_id": "PROD-011",
            "name": "Scrivania Torino (Oak Home Office Desk)",
            "category": "Tables",
            "base_price": 1600.00,
            "production_cost": 880.00,
            "weight_kg": 55.0,
            "active": True,
        },
        {
            "product_id": "PROD-012",
            "name": "Consolle Napoli (Console Table)",
            "category": "Tables",
            "base_price": 980.00,
            "production_cost": 539.00,
            "weight_kg": 22.0,
            "active": True,
        },

        # Chairs (4)
        {
            "product_id": "PROD-013",
            "name": "Sedia Toscana (Leather Dining Chair)",
            "category": "Chairs",
            "base_price": 650.00,
            "production_cost": 357.50,
            "weight_kg": 8.5,
            "active": True,
        },
        {
            "product_id": "PROD-014",
            "name": "Sedia Umbria (Fabric Dining Chair)",
            "category": "Chairs",
            "base_price": 420.00,
            "production_cost": 231.00,
            "weight_kg": 7.0,
            "active": True,
        },
        {
            "product_id": "PROD-015",
            "name": "Poltrona Giardino (Outdoor Lounge Chair)",
            "category": "Chairs",
            "base_price": 780.00,
            "production_cost": 429.00,
            "weight_kg": 12.0,
            "active": True,
        },
        {
            "product_id": "PROD-016",
            "name": "Sgabello Bar Moderno (Modern Bar Stool)",
            "category": "Chairs",
            "base_price": 380.00,
            "production_cost": 209.00,
            "weight_kg": 6.0,
            "active": True,
        },

        # Storage (2)
        {
            "product_id": "PROD-017",
            "name": "Credenza Palermo (Sideboard)",
            "category": "Storage",
            "base_price": 2100.00,
            "production_cost": 1155.00,
            "weight_kg": 75.0,
            "active": True,
        },
        {
            "product_id": "PROD-018",
            "name": "Libreria Bologna (Bookcase)",
            "category": "Storage",
            "base_price": 1450.00,
            "production_cost": 797.50,
            "weight_kg": 60.0,
            "active": True,
        },
    ]

    df = pd.DataFrame(products)
    return df
