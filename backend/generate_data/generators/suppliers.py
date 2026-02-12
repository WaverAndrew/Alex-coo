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
            "city": "Siena",
            "lat": 43.32,
            "lng": 11.78,
            "category": "wood",
            "lead_time_days": 14,
            "reliability_score": 0.94,
            "payment_terms": "Net 30",
        },
        {
            "supplier_id": "SUP-002",
            "name": "Pelle di Firenze",
            "country": "Italy",
            "city": "Firenze",
            "lat": 43.77,
            "lng": 11.25,
            "category": "leather",
            "lead_time_days": 21,
            "reliability_score": 0.91,
            "payment_terms": "Net 45",
        },
        {
            "supplier_id": "SUP-003",
            "name": "Tessuti Milano",
            "country": "Italy",
            "city": "Milano",
            "lat": 45.46,
            "lng": 9.19,
            "category": "fabric",
            "lead_time_days": 10,
            "reliability_score": 0.88,
            "payment_terms": "Net 30",
        },
        {
            "supplier_id": "SUP-004",
            "name": "Schiuma Veneta",
            "country": "Italy",
            "city": "Venezia",
            "lat": 45.44,
            "lng": 12.33,
            "category": "foam",
            "lead_time_days": 7,
            "reliability_score": 0.92,
            "payment_terms": "Net 15",
        },
        {
            "supplier_id": "SUP-005",
            "name": "Ferramenta Bologna",
            "country": "Italy",
            "city": "Bologna",
            "lat": 44.49,
            "lng": 11.34,
            "category": "hardware",
            "lead_time_days": 5,
            "reliability_score": 0.96,
            "payment_terms": "Net 30",
        },
        {
            "supplier_id": "SUP-006",
            "name": "Vetro di Murano",
            "country": "Italy",
            "city": "Murano",
            "lat": 45.46,
            "lng": 12.35,
            "category": "glass",
            "lead_time_days": 18,
            "reliability_score": 0.89,
            "payment_terms": "Net 45",
        },
        {
            "supplier_id": "SUP-007",
            "name": "Colori Napoli",
            "country": "Italy",
            "city": "Napoli",
            "lat": 40.85,
            "lng": 14.27,
            "category": "paint",
            "lead_time_days": 8,
            "reliability_score": 0.95,
            "payment_terms": "Net 30",
        },
        {
            "supplier_id": "SUP-008",
            "name": "Imballaggi Roma",
            "country": "Italy",
            "city": "Roma",
            "lat": 41.90,
            "lng": 12.50,
            "category": "packaging",
            "lead_time_days": 4,
            "reliability_score": 0.97,
            "payment_terms": "Net 15",
        },
    ]

    df = pd.DataFrame(suppliers)
    return df
