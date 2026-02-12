"""
Generate suppliers data for Bella Casa Furniture.
8 Italian-themed suppliers, each specializing in a material category.
"""
import pandas as pd
import numpy as np


def generate_suppliers(rng: np.random.RandomState = None) -> pd.DataFrame:
    """Generate 8 suppliers with Italian-themed names."""
    if rng is None:
        rng = np.random.RandomState(42)

    suppliers = [
        {
            "supplier_id": "SUP-001",
            "name": "Legnami Toscani",
            "country": "Italy",
            "category": "wood",
            "lead_time_days": 14,
            "reliability_score": 0.94,
            "payment_terms": "Net 30",
        },
        {
            "supplier_id": "SUP-002",
            "name": "Pelle di Firenze",
            "country": "Italy",
            "category": "leather",
            "lead_time_days": 21,
            "reliability_score": 0.91,
            "payment_terms": "Net 45",
        },
        {
            "supplier_id": "SUP-003",
            "name": "Tessuti Milano",
            "country": "Italy",
            "category": "fabric",
            "lead_time_days": 10,
            "reliability_score": 0.88,
            "payment_terms": "Net 30",
        },
        {
            "supplier_id": "SUP-004",
            "name": "Schiuma Veneta",
            "country": "Italy",
            "category": "foam",
            "lead_time_days": 7,
            "reliability_score": 0.92,
            "payment_terms": "Net 15",
        },
        {
            "supplier_id": "SUP-005",
            "name": "Ferramenta Napoli",
            "country": "Italy",
            "category": "hardware",
            "lead_time_days": 5,
            "reliability_score": 0.96,
            "payment_terms": "Net 30",
        },
        {
            "supplier_id": "SUP-006",
            "name": "Vetro di Murano",
            "country": "Italy",
            "category": "glass",
            "lead_time_days": 18,
            "reliability_score": 0.89,
            "payment_terms": "Net 45",
        },
        {
            "supplier_id": "SUP-007",
            "name": "Colori Romani",
            "country": "Italy",
            "category": "paint",
            "lead_time_days": 8,
            "reliability_score": 0.95,
            "payment_terms": "Net 30",
        },
        {
            "supplier_id": "SUP-008",
            "name": "Imballaggio Siciliano",
            "country": "Italy",
            "category": "packaging",
            "lead_time_days": 4,
            "reliability_score": 0.97,
            "payment_terms": "Net 15",
        },
    ]

    df = pd.DataFrame(suppliers)
    return df
