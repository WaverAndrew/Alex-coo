"""
Generate bill_of_materials data for Bella Casa Furniture.
~70 records mapping products to their required materials.
"""
import pandas as pd
import numpy as np


def generate_bom(rng: np.random.RandomState = None) -> pd.DataFrame:
    """Generate ~70 bill of materials records linking products to materials."""
    if rng is None:
        rng = np.random.RandomState(42)

    bom_records = [
        # PROD-001: Divano Roma (3-Seater Leather Sofa)
        {"product_id": "PROD-001", "material_id": "MAT-001", "quantity_needed": 0.15, "unit": "m3"},      # Walnut frame
        {"product_id": "PROD-001", "material_id": "MAT-005", "quantity_needed": 12.0, "unit": "m2"},      # Full grain leather
        {"product_id": "PROD-001", "material_id": "MAT-011", "quantity_needed": 0.8, "unit": "m3"},       # HR Foam
        {"product_id": "PROD-001", "material_id": "MAT-016", "quantity_needed": 1.5, "unit": "kg"},       # Hardware + feet

        # PROD-002: Divano Venezia (Sectional Fabric Sofa)
        {"product_id": "PROD-002", "material_id": "MAT-002", "quantity_needed": 0.20, "unit": "m3"},      # Oak frame
        {"product_id": "PROD-002", "material_id": "MAT-008", "quantity_needed": 18.0, "unit": "m2"},      # Cotton velvet
        {"product_id": "PROD-002", "material_id": "MAT-011", "quantity_needed": 1.2, "unit": "m3"},       # HR Foam
        {"product_id": "PROD-002", "material_id": "MAT-012", "quantity_needed": 0.3, "unit": "m3"},       # Memory foam
        {"product_id": "PROD-002", "material_id": "MAT-016", "quantity_needed": 2.0, "unit": "kg"},       # Hardware

        # PROD-003: Poltrona Capri (Accent Armchair)
        {"product_id": "PROD-003", "material_id": "MAT-003", "quantity_needed": 0.06, "unit": "m3"},      # Beech frame
        {"product_id": "PROD-003", "material_id": "MAT-009", "quantity_needed": 4.0, "unit": "m2"},       # Linen
        {"product_id": "PROD-003", "material_id": "MAT-013", "quantity_needed": 0.3, "unit": "m3"},       # Standard foam
        {"product_id": "PROD-003", "material_id": "MAT-017", "quantity_needed": 4.0, "unit": "piece"},    # Feet

        # PROD-004: Divano Amalfi (2-Seater Velvet Sofa)
        {"product_id": "PROD-004", "material_id": "MAT-002", "quantity_needed": 0.12, "unit": "m3"},      # Oak frame
        {"product_id": "PROD-004", "material_id": "MAT-008", "quantity_needed": 10.0, "unit": "m2"},      # Cotton velvet
        {"product_id": "PROD-004", "material_id": "MAT-011", "quantity_needed": 0.6, "unit": "m3"},       # HR Foam
        {"product_id": "PROD-004", "material_id": "MAT-016", "quantity_needed": 1.2, "unit": "kg"},       # Hardware

        # PROD-005: Letto Firenze (King Platform Bed)
        {"product_id": "PROD-005", "material_id": "MAT-001", "quantity_needed": 0.25, "unit": "m3"},      # Walnut
        {"product_id": "PROD-005", "material_id": "MAT-006", "quantity_needed": 6.0, "unit": "m2"},       # Nubuck headboard
        {"product_id": "PROD-005", "material_id": "MAT-012", "quantity_needed": 0.4, "unit": "m3"},       # Memory foam
        {"product_id": "PROD-005", "material_id": "MAT-016", "quantity_needed": 3.0, "unit": "kg"},       # Hardware

        # PROD-006: Letto Siena (Queen Upholstered Bed)
        {"product_id": "PROD-006", "material_id": "MAT-003", "quantity_needed": 0.18, "unit": "m3"},      # Beech
        {"product_id": "PROD-006", "material_id": "MAT-010", "quantity_needed": 8.0, "unit": "m2"},       # Microfiber
        {"product_id": "PROD-006", "material_id": "MAT-011", "quantity_needed": 0.5, "unit": "m3"},       # HR Foam
        {"product_id": "PROD-006", "material_id": "MAT-016", "quantity_needed": 2.5, "unit": "kg"},       # Hardware

        # PROD-007: Letto Verona (Storage Bed Frame)
        {"product_id": "PROD-007", "material_id": "MAT-002", "quantity_needed": 0.22, "unit": "m3"},      # Oak
        {"product_id": "PROD-007", "material_id": "MAT-004", "quantity_needed": 4.0, "unit": "sheet"},    # MDF
        {"product_id": "PROD-007", "material_id": "MAT-015", "quantity_needed": 4.0, "unit": "pair"},     # Soft-close guides
        {"product_id": "PROD-007", "material_id": "MAT-016", "quantity_needed": 3.5, "unit": "kg"},       # Hardware

        # PROD-008: Letto Portofino (Canopy Bed)
        {"product_id": "PROD-008", "material_id": "MAT-001", "quantity_needed": 0.35, "unit": "m3"},      # Walnut
        {"product_id": "PROD-008", "material_id": "MAT-009", "quantity_needed": 8.0, "unit": "m2"},       # Linen drapes
        {"product_id": "PROD-008", "material_id": "MAT-016", "quantity_needed": 4.0, "unit": "kg"},       # Hardware
        {"product_id": "PROD-008", "material_id": "MAT-020", "quantity_needed": 3.0, "unit": "liter"},    # Matte finish

        # PROD-009: Tavolo Milano (Walnut Dining Table)
        {"product_id": "PROD-009", "material_id": "MAT-001", "quantity_needed": 0.30, "unit": "m3"},      # Walnut
        {"product_id": "PROD-009", "material_id": "MAT-016", "quantity_needed": 2.0, "unit": "kg"},       # Hardware
        {"product_id": "PROD-009", "material_id": "MAT-017", "quantity_needed": 4.0, "unit": "piece"},    # Feet
        {"product_id": "PROD-009", "material_id": "MAT-021", "quantity_needed": 2.0, "unit": "liter"},    # Gloss finish

        # PROD-010: Tavolino Lago (Glass Coffee Table)
        {"product_id": "PROD-010", "material_id": "MAT-018", "quantity_needed": 1.2, "unit": "m2"},       # Tempered glass
        {"product_id": "PROD-010", "material_id": "MAT-016", "quantity_needed": 1.0, "unit": "kg"},       # Hardware
        {"product_id": "PROD-010", "material_id": "MAT-017", "quantity_needed": 4.0, "unit": "piece"},    # Feet

        # PROD-011: Scrivania Torino (Oak Home Office Desk)
        {"product_id": "PROD-011", "material_id": "MAT-002", "quantity_needed": 0.20, "unit": "m3"},      # Oak
        {"product_id": "PROD-011", "material_id": "MAT-015", "quantity_needed": 2.0, "unit": "pair"},     # Drawer guides
        {"product_id": "PROD-011", "material_id": "MAT-016", "quantity_needed": 1.5, "unit": "kg"},       # Hardware
        {"product_id": "PROD-011", "material_id": "MAT-022", "quantity_needed": 1.5, "unit": "liter"},    # Wood stain

        # PROD-012: Consolle Napoli (Console Table)
        {"product_id": "PROD-012", "material_id": "MAT-003", "quantity_needed": 0.08, "unit": "m3"},      # Beech
        {"product_id": "PROD-012", "material_id": "MAT-018", "quantity_needed": 0.5, "unit": "m2"},       # Glass top
        {"product_id": "PROD-012", "material_id": "MAT-016", "quantity_needed": 0.8, "unit": "kg"},       # Hardware
        {"product_id": "PROD-012", "material_id": "MAT-020", "quantity_needed": 1.0, "unit": "liter"},    # Matte finish

        # PROD-013: Sedia Toscana (Leather Dining Chair)
        {"product_id": "PROD-013", "material_id": "MAT-002", "quantity_needed": 0.04, "unit": "m3"},      # Oak
        {"product_id": "PROD-013", "material_id": "MAT-007", "quantity_needed": 1.5, "unit": "m2"},       # Semi-aniline leather
        {"product_id": "PROD-013", "material_id": "MAT-013", "quantity_needed": 0.05, "unit": "m3"},      # Standard foam
        {"product_id": "PROD-013", "material_id": "MAT-016", "quantity_needed": 0.5, "unit": "kg"},       # Hardware

        # PROD-014: Sedia Umbria (Fabric Dining Chair)
        {"product_id": "PROD-014", "material_id": "MAT-003", "quantity_needed": 0.03, "unit": "m3"},      # Beech
        {"product_id": "PROD-014", "material_id": "MAT-010", "quantity_needed": 1.2, "unit": "m2"},       # Microfiber
        {"product_id": "PROD-014", "material_id": "MAT-013", "quantity_needed": 0.04, "unit": "m3"},      # Standard foam

        # PROD-015: Poltrona Giardino (Outdoor Lounge Chair)
        {"product_id": "PROD-015", "material_id": "MAT-002", "quantity_needed": 0.06, "unit": "m3"},      # Oak (treated)
        {"product_id": "PROD-015", "material_id": "MAT-010", "quantity_needed": 3.0, "unit": "m2"},       # Microfiber
        {"product_id": "PROD-015", "material_id": "MAT-013", "quantity_needed": 0.15, "unit": "m3"},      # Standard foam
        {"product_id": "PROD-015", "material_id": "MAT-020", "quantity_needed": 1.5, "unit": "liter"},    # Weather finish

        # PROD-016: Sgabello Bar Moderno (Modern Bar Stool)
        {"product_id": "PROD-016", "material_id": "MAT-003", "quantity_needed": 0.02, "unit": "m3"},      # Beech
        {"product_id": "PROD-016", "material_id": "MAT-007", "quantity_needed": 0.5, "unit": "m2"},       # Semi-aniline
        {"product_id": "PROD-016", "material_id": "MAT-016", "quantity_needed": 0.6, "unit": "kg"},       # Hardware

        # PROD-017: Credenza Palermo (Sideboard)
        {"product_id": "PROD-017", "material_id": "MAT-001", "quantity_needed": 0.25, "unit": "m3"},      # Walnut
        {"product_id": "PROD-017", "material_id": "MAT-004", "quantity_needed": 3.0, "unit": "sheet"},    # MDF backing
        {"product_id": "PROD-017", "material_id": "MAT-014", "quantity_needed": 8.0, "unit": "piece"},    # Hinges
        {"product_id": "PROD-017", "material_id": "MAT-015", "quantity_needed": 3.0, "unit": "pair"},     # Drawer guides
        {"product_id": "PROD-017", "material_id": "MAT-021", "quantity_needed": 2.5, "unit": "liter"},    # Gloss finish

        # PROD-018: Libreria Bologna (Bookcase)
        {"product_id": "PROD-018", "material_id": "MAT-002", "quantity_needed": 0.20, "unit": "m3"},      # Oak
        {"product_id": "PROD-018", "material_id": "MAT-004", "quantity_needed": 2.0, "unit": "sheet"},    # MDF backing
        {"product_id": "PROD-018", "material_id": "MAT-016", "quantity_needed": 2.0, "unit": "kg"},       # Hardware
        {"product_id": "PROD-018", "material_id": "MAT-022", "quantity_needed": 2.0, "unit": "liter"},    # Wood stain
    ]

    bom_records = bom_records  # All records are valid (no placeholders)

    df = pd.DataFrame(bom_records)
    df["bom_id"] = [f"BOM-{i+1:03d}" for i in range(len(df))]
    # Reorder columns
    df = df[["bom_id", "product_id", "material_id", "quantity_needed", "unit"]]
    return df
