from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/company", tags=["company"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CompanyProfileUpdate(BaseModel):
    name: str
    industry: Optional[str] = None
    description: Optional[str] = None
    key_metrics: list[dict[str, Any]] = Field(default_factory=list)


class CompanyProfileResponse(BaseModel):
    id: int
    name: str
    industry: Optional[str] = None
    description: Optional[str] = None
    key_metrics: list[dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_response(profile) -> dict[str, Any]:
    return {
        "id": profile.id,
        "name": profile.name,
        "industry": profile.industry,
        "description": profile.description,
        "key_metrics": profile.get_key_metrics(),
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("")
async def get_company_profile(request: Request) -> dict[str, Any]:
    store = request.app.state.memory
    profile = store.get_company_profile()
    if profile is None:
        return {"id": None, "name": "", "industry": None, "description": None, "key_metrics": []}
    return _to_response(profile)


@router.put("")
async def update_company_profile(
    body: CompanyProfileUpdate, request: Request
) -> dict[str, Any]:
    store = request.app.state.memory
    profile = store.save_company_profile(
        name=body.name,
        industry=body.industry,
        description=body.description,
        key_metrics=body.key_metrics,
    )
    return _to_response(profile)


@router.post("/demo")
async def load_demo_profile(request: Request) -> dict[str, Any]:
    """Load the Bella Casa Interiors demo company profile."""
    store = request.app.state.memory

    profile = store.save_company_profile(
        name="Bella Casa Interiors",
        industry="Home Furnishings & Interior Design",
        description=(
            "Bella Casa Interiors is a mid-market home furnishings retailer "
            "specialising in curated furniture, decor, and interior design "
            "services. Operating both online and through select showrooms, "
            "the company targets style-conscious homeowners looking for "
            "quality pieces at accessible price points."
        ),
        key_metrics=[
            {"name": "monthly_revenue", "display_name": "Monthly Revenue", "unit": "USD"},
            {"name": "gross_margin", "display_name": "Gross Margin", "unit": "%"},
            {"name": "customer_acquisition_cost", "display_name": "CAC", "unit": "USD"},
            {"name": "customer_lifetime_value", "display_name": "CLV", "unit": "USD"},
            {"name": "inventory_turnover", "display_name": "Inventory Turnover", "unit": "x"},
            {"name": "order_count", "display_name": "Monthly Orders", "unit": "count"},
            {"name": "avg_order_value", "display_name": "Avg Order Value", "unit": "USD"},
            {"name": "return_rate", "display_name": "Return Rate", "unit": "%"},
        ],
    )

    return _to_response(profile)
