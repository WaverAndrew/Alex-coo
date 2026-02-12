"""
Generate materials data for Bella Casa Furniture.
25 materials across all supplier categories.
"""
import pandas as pd
import numpy as np


def generate_materials(rng: np.random.RandomState = None) -> pd.DataFrame:
    """Generate 25 materials with realistic Italian furniture components."""
    if rng is None:
        rng = np.random.RandomState(42)

    materials = [
        # Wood materials (SUP-001: Legnami Toscani)
        {"material_id": "MAT-001", "name": "Noce Massello (Solid Walnut)", "category": "wood", "unit": "m3", "unit_cost": 850.00, "supplier_id": "SUP-001", "reorder_point": 15, "reorder_qty": 40},
        {"material_id": "MAT-002", "name": "Rovere Europeo (European Oak)", "category": "wood", "unit": "m3", "unit_cost": 720.00, "supplier_id": "SUP-001", "reorder_point": 20, "reorder_qty": 50},
        {"material_id": "MAT-003", "name": "Faggio Evaporato (Steamed Beech)", "category": "wood", "unit": "m3", "unit_cost": 480.00, "supplier_id": "SUP-001", "reorder_point": 10, "reorder_qty": 30},
        {"material_id": "MAT-004", "name": "Pannello MDF Premium", "category": "wood", "unit": "sheet", "unit_cost": 45.00, "supplier_id": "SUP-001", "reorder_point": 100, "reorder_qty": 250},

        # Leather materials (SUP-002: Pelle di Firenze)
        {"material_id": "MAT-005", "name": "Pelle Pieno Fiore (Full Grain Leather)", "category": "leather", "unit": "m2", "unit_cost": 95.00, "supplier_id": "SUP-002", "reorder_point": 50, "reorder_qty": 150},
        {"material_id": "MAT-006", "name": "Pelle Nabuk (Nubuck Leather)", "category": "leather", "unit": "m2", "unit_cost": 78.00, "supplier_id": "SUP-002", "reorder_point": 30, "reorder_qty": 100},
        {"material_id": "MAT-007", "name": "Pelle Semi-Anilina", "category": "leather", "unit": "m2", "unit_cost": 65.00, "supplier_id": "SUP-002", "reorder_point": 40, "reorder_qty": 120},

        # Fabric materials (SUP-003: Tessuti Milano)
        {"material_id": "MAT-008", "name": "Velluto di Cotone (Cotton Velvet)", "category": "fabric", "unit": "m2", "unit_cost": 32.00, "supplier_id": "SUP-003", "reorder_point": 80, "reorder_qty": 200},
        {"material_id": "MAT-009", "name": "Lino Italiano (Italian Linen)", "category": "fabric", "unit": "m2", "unit_cost": 28.00, "supplier_id": "SUP-003", "reorder_point": 60, "reorder_qty": 180},
        {"material_id": "MAT-010", "name": "Microfibra Resistente", "category": "fabric", "unit": "m2", "unit_cost": 18.00, "supplier_id": "SUP-003", "reorder_point": 100, "reorder_qty": 300},

        # Foam materials (SUP-004: Schiuma Veneta)
        {"material_id": "MAT-011", "name": "Schiuma HR Alta Densita (HR Foam)", "category": "foam", "unit": "m3", "unit_cost": 120.00, "supplier_id": "SUP-004", "reorder_point": 25, "reorder_qty": 60},
        {"material_id": "MAT-012", "name": "Memory Foam Premium", "category": "foam", "unit": "m3", "unit_cost": 180.00, "supplier_id": "SUP-004", "reorder_point": 20, "reorder_qty": 50},
        {"material_id": "MAT-013", "name": "Schiuma Poliuretanica Standard", "category": "foam", "unit": "m3", "unit_cost": 65.00, "supplier_id": "SUP-004", "reorder_point": 30, "reorder_qty": 80},

        # Hardware materials (SUP-005: Ferramenta Napoli)
        {"material_id": "MAT-014", "name": "Cerniere Acciaio Inox (SS Hinges)", "category": "hardware", "unit": "piece", "unit_cost": 4.50, "supplier_id": "SUP-005", "reorder_point": 500, "reorder_qty": 1500},
        {"material_id": "MAT-015", "name": "Guide Cassetto Soft-Close", "category": "hardware", "unit": "pair", "unit_cost": 12.00, "supplier_id": "SUP-005", "reorder_point": 200, "reorder_qty": 600},
        {"material_id": "MAT-016", "name": "Viti e Bulloni Assortiti", "category": "hardware", "unit": "kg", "unit_cost": 8.00, "supplier_id": "SUP-005", "reorder_point": 50, "reorder_qty": 150},
        {"material_id": "MAT-017", "name": "Piedini Regolabili (Adjustable Feet)", "category": "hardware", "unit": "piece", "unit_cost": 3.20, "supplier_id": "SUP-005", "reorder_point": 300, "reorder_qty": 900},

        # Glass materials (SUP-006: Vetro di Murano)
        {"material_id": "MAT-018", "name": "Vetro Temperato 10mm", "category": "glass", "unit": "m2", "unit_cost": 55.00, "supplier_id": "SUP-006", "reorder_point": 30, "reorder_qty": 80},
        {"material_id": "MAT-019", "name": "Specchio Bisellato (Beveled Mirror)", "category": "glass", "unit": "m2", "unit_cost": 42.00, "supplier_id": "SUP-006", "reorder_point": 20, "reorder_qty": 50},

        # Paint materials (SUP-007: Colori Romani)
        {"material_id": "MAT-020", "name": "Vernice Opaca Italiana (Matte Finish)", "category": "paint", "unit": "liter", "unit_cost": 22.00, "supplier_id": "SUP-007", "reorder_point": 80, "reorder_qty": 200},
        {"material_id": "MAT-021", "name": "Finitura Lucida Poliuretanica", "category": "paint", "unit": "liter", "unit_cost": 28.00, "supplier_id": "SUP-007", "reorder_point": 60, "reorder_qty": 150},
        {"material_id": "MAT-022", "name": "Tinta Legno Naturale (Wood Stain)", "category": "paint", "unit": "liter", "unit_cost": 18.00, "supplier_id": "SUP-007", "reorder_point": 40, "reorder_qty": 120},

        # Packaging materials (SUP-008: Imballaggio Siciliano)
        {"material_id": "MAT-023", "name": "Cartone Ondulato Pesante", "category": "packaging", "unit": "piece", "unit_cost": 6.50, "supplier_id": "SUP-008", "reorder_point": 200, "reorder_qty": 600},
        {"material_id": "MAT-024", "name": "Pluriball Protettivo (Bubble Wrap)", "category": "packaging", "unit": "roll", "unit_cost": 15.00, "supplier_id": "SUP-008", "reorder_point": 50, "reorder_qty": 150},
        {"material_id": "MAT-025", "name": "Angolari in Polistirolo", "category": "packaging", "unit": "piece", "unit_cost": 2.00, "supplier_id": "SUP-008", "reorder_point": 400, "reorder_qty": 1200},
    ]

    df = pd.DataFrame(materials)
    return df
