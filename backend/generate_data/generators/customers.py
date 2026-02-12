"""
Generate customers data for Bella Casa Furniture.
~800 customers: mix of B2B interior designers, B2B hotel chains, and B2C retail.

Key story: Top 5% of customers = 41% of revenue.
          Top customer "Rossi Interiors" = 12% of revenue.
"""
import pandas as pd
import numpy as np
from datetime import date, timedelta

from backend.generate_data.config import START_DATE, END_DATE, CHANNELS


# Italian cities grouped by region
ITALIAN_CITIES = {
    "Lombardia": ["Milano", "Bergamo", "Brescia", "Como", "Monza"],
    "Lazio": ["Roma", "Frosinone", "Latina"],
    "Toscana": ["Firenze", "Siena", "Pisa", "Lucca"],
    "Veneto": ["Venezia", "Verona", "Padova", "Vicenza"],
    "Piemonte": ["Torino", "Novara", "Asti"],
    "Campania": ["Napoli", "Salerno", "Caserta"],
    "Emilia-Romagna": ["Bologna", "Parma", "Modena", "Rimini"],
    "Sicilia": ["Palermo", "Catania", "Messina"],
    "Puglia": ["Bari", "Lecce", "Taranto"],
    "Liguria": ["Genova", "Sanremo", "La Spezia"],
}

B2B_DESIGNER_NAMES = [
    "Rossi Interiors", "Studio Bianchi Design", "Moretti & Partners",
    "Casa Elegante Design", "Luca Ferrari Architettura", "Ricci Design Studio",
    "Valentini Interior Solutions", "Giordano Progetti", "Marchetti Design Group",
    "Conti Living Spaces", "De Luca Studio Creativo", "Pellegrini Design House",
    "Gallo Architecture & Interiors", "Caruso Interior Concepts", "Rinaldi Design Lab",
    "Costa Living Design", "Fontana Creative Studio", "Bruno & Associati",
    "Santoro Interior Group", "Vitale Design Partners", "Amato Studio Milano",
    "Barbieri Progetti d'Interni", "Colombo Design Collective", "D'Angelo Living",
    "Esposito Interior Architects", "Fabbri Design Works", "Grassi Studio",
    "Leone Interior Innovations", "Mancini Design Atelier", "Neri & Bianchi Studio",
]

B2B_HOTEL_NAMES = [
    "Grand Hotel Palazzo", "Hotel Belvedere Group", "Luxury Resorts Italia",
    "Albergo Reale Chain", "Villa Paradiso Hotels", "Hotel Vesuvio Collection",
    "Masseria del Sud Hotels", "Palazzo Ducale Hospitality", "Hotel Riviera Management",
    "Boutique Hotels Toscana", "Resort Costiera Group", "Hotel Dolce Vita",
    "Castello Hotels & Spa", "Seaside Luxury Resorts", "Montagna Hotels Group",
    "Alberghi Stellati Italia", "Hotel Piazza Collection", "Dimora Storica Hotels",
    "Borgo Antico Hospitality", "Lake Como Hotel Group",
]

B2C_FIRST_NAMES = [
    "Marco", "Alessandro", "Giuseppe", "Lorenzo", "Andrea", "Francesco",
    "Matteo", "Luca", "Giovanni", "Davide", "Giulia", "Francesca",
    "Sara", "Chiara", "Valentina", "Elisa", "Martina", "Sofia",
    "Anna", "Laura", "Roberto", "Stefano", "Antonio", "Simone",
    "Fabio", "Elena", "Paola", "Silvia", "Monica", "Claudia",
]

B2C_LAST_NAMES = [
    "Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano",
    "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo",
    "Conti", "De Luca", "Costa", "Giordano", "Mancini", "Rizzo",
    "Lombardi", "Moretti", "Barbieri", "Fontana", "Santoro", "Mariani",
    "Rinaldi", "Caruso", "Ferrara", "Pellegrini", "Vitale", "Serra",
]


def generate_customers(rng: np.random.RandomState = None) -> pd.DataFrame:
    """Generate ~800 customers with realistic Italian names and distribution."""
    if rng is None:
        rng = np.random.RandomState(42)

    customers = []
    customer_id_counter = 1

    regions = list(ITALIAN_CITIES.keys())
    all_cities = [(city, region) for region, cities in ITALIAN_CITIES.items() for city in cities]

    date_range_days = (END_DATE - START_DATE).days

    # --- B2B Interior Designers (~50) ---
    for i, name in enumerate(B2B_DESIGNER_NAMES):
        city, region = all_cities[rng.randint(0, len(all_cities))]
        channel = rng.choice(["showroom_1", "showroom_2", "wholesale"])
        created_offset = rng.randint(0, date_range_days - 90)
        created_date = START_DATE + timedelta(days=int(created_offset))

        # Rossi Interiors gets a very high lifetime value (top customer)
        if name == "Rossi Interiors":
            lifetime_value = 0.0  # Will be set by sales generator / stories
            segment = "VIP"
            channel = "wholesale"
            city = "Milano"
            region = "Lombardia"
            created_date = START_DATE  # Long-standing customer
        elif i < 8:
            lifetime_value = 0.0
            segment = "VIP"
        else:
            lifetime_value = 0.0
            segment = "Regular"

        customers.append({
            "customer_id": f"CUST-{customer_id_counter:04d}",
            "name": name,
            "type": "B2B",
            "channel": channel,
            "city": city,
            "region": region,
            "created_date": created_date,
            "lifetime_value": lifetime_value,
            "segment": segment,
        })
        customer_id_counter += 1

    # --- B2B Hotel Chains (~20) ---
    for i, name in enumerate(B2B_HOTEL_NAMES):
        city, region = all_cities[rng.randint(0, len(all_cities))]
        channel = rng.choice(["wholesale", "showroom_1"])
        created_offset = rng.randint(0, date_range_days - 60)
        created_date = START_DATE + timedelta(days=int(created_offset))
        segment = "VIP" if i < 5 else "Regular"

        customers.append({
            "customer_id": f"CUST-{customer_id_counter:04d}",
            "name": name,
            "type": "B2B",
            "channel": channel,
            "city": city,
            "region": region,
            "created_date": created_date,
            "lifetime_value": 0.0,
            "segment": segment,
        })
        customer_id_counter += 1

    # --- B2C Retail (~730) ---
    n_b2c = 800 - len(customers)
    for i in range(n_b2c):
        first = B2C_FIRST_NAMES[rng.randint(0, len(B2C_FIRST_NAMES))]
        last = B2C_LAST_NAMES[rng.randint(0, len(B2C_LAST_NAMES))]
        name = f"{first} {last}"
        city, region = all_cities[rng.randint(0, len(all_cities))]

        # Channel distribution evolves: early customers more showroom, later more online
        created_offset = rng.randint(0, date_range_days)
        created_date = START_DATE + timedelta(days=int(created_offset))

        if created_date >= date(2024, 3, 1):
            # After website relaunch, higher online share
            channel = rng.choice(
                ["showroom_1", "showroom_2", "showroom_3", "online", "online", "online"],
            )
        else:
            channel = rng.choice(
                ["showroom_1", "showroom_2", "showroom_3", "online"],
            )

        # Segment assignment
        if i < 15:
            segment = "VIP"
        elif created_offset > date_range_days - 120:
            segment = "New"
        else:
            segment = rng.choice(["Regular", "Regular", "Regular", "New"])

        customers.append({
            "customer_id": f"CUST-{customer_id_counter:04d}",
            "name": name,
            "type": "B2C",
            "channel": channel,
            "city": city,
            "region": region,
            "created_date": created_date,
            "lifetime_value": 0.0,
            "segment": segment,
        })
        customer_id_counter += 1

    df = pd.DataFrame(customers)
    df["created_date"] = pd.to_datetime(df["created_date"])
    return df
