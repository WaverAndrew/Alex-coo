import type { ChartConfig } from "@/lib/types";

export interface DeepDiveData {
  id: string;
  title: string;
  summary: string;
  fullContent: string;
  charts: ChartConfig[];
  createdAt: string;
  followUpSuggestions: string[];
}

export const DEMO_DEEP_DIVES: DeepDiveData[] = [
  {
    id: "dd-1",
    title: "Discount Impact on Revenue per Store",
    summary: "Every 1% discount increase costs EUR 103K annually across all showrooms. Showroom 3 is over-discounting at 11.78%.",
    fullContent: `Here's the breakdown: **every 1% increase in discount costs us real money**, and the impact varies significantly across our showrooms.

**Showroom 1** — our top performer with **EUR 4.38M in revenue** — would lose **EUR 46,129** for every 1 percentage point we add to discounts. That's a **1.05% hit** to current revenue. They're running at 4.96% average discount right now, so they have relatively low promotional pressure.

**Showroom 2** pulls **EUR 3.58M** and would lose **EUR 38,539** per 1% discount increase (a **1.08% revenue impact**). They're already at 6.98% discount rate — higher than Showroom 1 — so piling on more discounts here gets expensive fast.

**Showroom 3** is the outlier. They're at **11.78% average discount** — more than double Showroom 1 — and generating only **EUR 1.61M**. A 1% discount bump costs them **EUR 18,276**, which is **1.14% of their revenue**.

Bottom line: Across all three showrooms, a 1% blanket discount increase would cost us roughly **EUR 103K in total annual revenue**. Showroom 3 is already over-discounting — we need to look at pricing strategy and product mix there, not more promotions.`,
    charts: [
      {
        type: "bar",
        title: "Revenue Impact per 1% Discount Increase",
        data: [
          { showroom: "Showroom 1", impact: 46129 },
          { showroom: "Showroom 2", impact: 38539 },
          { showroom: "Showroom 3", impact: 18276 },
        ],
        xKey: "showroom",
        yKeys: ["impact"],
        colors: ["#dc2626"],
      },
      {
        type: "bar",
        title: "Current Average Discount Rate (%)",
        data: [
          { showroom: "Showroom 1", rate: 4.96 },
          { showroom: "Showroom 2", rate: 6.98 },
          { showroom: "Showroom 3", rate: 11.78 },
        ],
        xKey: "showroom",
        yKeys: ["rate"],
        colors: ["#d97706"],
      },
    ],
    createdAt: "2025-01-31",
    followUpSuggestions: [
      "What products are most discounted at Showroom 3?",
      "Run a regression of discount vs conversion rate",
      "What would happen if we cap Showroom 3 discounts at 8%?",
    ],
  },
  {
    id: "dd-2",
    title: "Sofa Margin Squeeze: Foam Cost Analysis",
    summary: "Foam supplier Tessuti Milano raised prices 18% in Oct 2024. Sofa margins dropped from 42% to 28%.",
    fullContent: `Our sofa margins have been under serious pressure since **October 2024** when Tessuti Milano — our foam supplier — pushed through an **18% price increase**.

Before the hike, we were running at a healthy **42% gross margin** on sofas. Post-hike, that's dropped to **28%**. That's a 14 percentage point swing on our highest-volume product category.

The impact flows through every sofa we make. We're looking at roughly **EUR 180K in lost margin** over the last quarter alone.

We should negotiate a volume commitment with Tessuti Milano for a 5-8% discount. We should also source quotes from alternative foam suppliers and consider a selective price increase on premium sofa lines (5-7%).`,
    charts: [
      {
        type: "line",
        title: "Sofa Gross Margin Over Time",
        data: [
          { month: "Jul 24", margin: 42 },
          { month: "Aug 24", margin: 41 },
          { month: "Sep 24", margin: 40 },
          { month: "Oct 24", margin: 33 },
          { month: "Nov 24", margin: 29 },
          { month: "Dec 24", margin: 28 },
          { month: "Jan 25", margin: 28 },
        ],
        xKey: "month",
        yKeys: ["margin"],
        colors: ["#dc2626"],
      },
    ],
    createdAt: "2025-01-28",
    followUpSuggestions: [
      "Which sofa models are hit hardest?",
      "How much foam does each sofa use?",
      "What's our price elasticity on sofas?",
    ],
  },
  {
    id: "dd-3",
    title: "VIP Customer Concentration Risk",
    summary: "Top 5% of customers drive 41% of revenue. Rossi Interiors (12%) hasn't ordered since November.",
    fullContent: `We have a significant **concentration risk** in our customer base. Our top 5% of customers account for **41% of total revenue**.

The biggest concern is **Rossi Interiors** — they represent **12% of our entire revenue** and their last order was in **November 2024**. That's over 2 months of silence from a customer that was ordering regularly.

If we lose Rossi Interiors, we're looking at a **EUR 1.2M annual revenue gap** that would take 15-20 regular customers to replace.

We should schedule an immediate outreach to Rossi Interiors and diversify the top-customer portfolio — target 3 new B2B accounts at EUR 300K+ potential.`,
    charts: [
      {
        type: "pie",
        title: "Revenue Concentration",
        data: [
          { segment: "Rossi Interiors", revenue: 12 },
          { segment: "Other Top 5%", revenue: 29 },
          { segment: "Remaining 95%", revenue: 59 },
        ],
        xKey: "segment",
        yKeys: ["revenue"],
      },
    ],
    createdAt: "2025-01-25",
    followUpSuggestions: [
      "Show Rossi Interiors' full order history",
      "Which other VIP customers are at risk?",
      "What's our customer acquisition cost for B2B?",
    ],
  },
  {
    id: "dd-4",
    title: "Discount-to-Revenue Regression: Optimal Pricing Strategy",
    summary: "Linear regression across 3,491 orders reveals the optimal discount threshold per channel. Showroom 3 is 4.2% past the inflection point.",
    fullContent: `## Executive Summary

A linear regression analysis across **3,491 sales orders** reveals a statistically significant negative relationship between discount percentage and order revenue. Every **1% increase in discount** reduces average order value by **EUR 28.40** (p < 0.001, R² = 0.34). However, the effect varies dramatically by channel.

## Statistical Model

We ran an OLS regression: \`revenue ~ discount_pct + channel + discount_pct:channel\`

**Model fit:** R² = **0.34**, Adjusted R² = **0.33**, F-statistic = **184.7** (p < 0.001)

Key coefficients:
- **Base effect:** -28.40 EUR per 1% discount (95% CI: [-31.2, -25.6])
- **Showroom 1 interaction:** +4.10 (discounts slightly less harmful here)
- **Showroom 3 interaction:** -12.80 (discounts are *more* harmful — each 1% costs extra)
- **Online interaction:** +8.30 (online customers are more discount-responsive)

## Key Findings

**1. Showroom 3 is past the inflection point**

At **11.78% average discount**, Showroom 3 has crossed the optimal discount threshold of **7.5%**. Beyond this point, additional discounting destroys more margin than it generates in volume. They're **4.28 percentage points** past the inflection.

**2. Online has a higher optimal threshold**

The online channel shows a flatter discount-revenue curve, with an optimal range of **3-6%**. Currently at **3.1%**, there's actually room for tactical promotions online without damaging the brand.

**3. Showroom 1 is the benchmark**

At **4.96% average discount** and the lowest sensitivity coefficient, Showroom 1 demonstrates that strong conversion can be achieved with minimal discounting. The product mix and sales team quality are the differentiators, not price.

**4. Diminishing returns after 8%**

Across all channels, the regression shows sharply diminishing returns after the **8% discount mark**. Orders with >8% discount have **23% lower average revenue** but only **7% higher volume** — a net negative.

We should immediately cap Showroom 3 discounts at 8% maximum. This would recover approximately **EUR 62K annually** in margin with minimal volume impact based on our elasticity estimates.

## Risk Factors

- The regression assumes linear relationships; actual response curves may be non-linear at extreme values
- Seasonal effects (Q4 holiday pricing) may skew the overall coefficient
- Showroom 3's high discounts may reflect a fundamentally different customer base requiring separate strategy`,
    charts: [
      {
        type: "line",
        title: "Discount % vs Average Order Revenue (Regression)",
        data: [
          { discount: "0-2%", revenue: 2890, predicted: 2850 },
          { discount: "2-4%", revenue: 2720, predicted: 2790 },
          { discount: "4-6%", revenue: 2650, predicted: 2680 },
          { discount: "6-8%", revenue: 2510, predicted: 2570 },
          { discount: "8-10%", revenue: 2280, predicted: 2460 },
          { discount: "10-12%", revenue: 2050, predicted: 2350 },
          { discount: "12-14%", revenue: 1780, predicted: 2240 },
          { discount: "14%+", revenue: 1520, predicted: 2130 },
        ],
        xKey: "discount",
        yKeys: ["revenue", "predicted"],
        colors: ["#818cf8", "#34d399"],
      },
      {
        type: "bar",
        title: "Regression Coefficient by Channel (EUR per 1% discount)",
        data: [
          { channel: "Showroom 1", coefficient: -24.3 },
          { channel: "Showroom 2", coefficient: -28.4 },
          { channel: "Showroom 3", coefficient: -41.2 },
          { channel: "Online", coefficient: -20.1 },
          { channel: "Wholesale", coefficient: -31.5 },
        ],
        xKey: "channel",
        yKeys: ["coefficient"],
        colors: ["#f87171"],
      },
      {
        type: "area",
        title: "Optimal Discount Zone — Margin vs Volume Tradeoff",
        data: [
          { discount: "0%", margin_index: 100, volume_index: 72 },
          { discount: "2%", margin_index: 96, volume_index: 78 },
          { discount: "4%", margin_index: 91, volume_index: 85 },
          { discount: "6%", margin_index: 85, volume_index: 91 },
          { discount: "8%", margin_index: 77, volume_index: 95 },
          { discount: "10%", margin_index: 68, volume_index: 97 },
          { discount: "12%", margin_index: 58, volume_index: 98 },
          { discount: "14%", margin_index: 47, volume_index: 99 },
        ],
        xKey: "discount",
        yKeys: ["margin_index", "volume_index"],
        colors: ["#818cf8", "#22d3ee"],
      },
      {
        type: "bar",
        title: "Current vs Optimal Discount Rate by Store",
        data: [
          { store: "Showroom 1", current: 4.96, optimal: 5.0 },
          { store: "Showroom 2", current: 6.98, optimal: 6.5 },
          { store: "Showroom 3", current: 11.78, optimal: 7.5 },
          { store: "Online", current: 3.10, optimal: 5.0 },
        ],
        xKey: "store",
        yKeys: ["current", "optimal"],
        colors: ["#f87171", "#34d399"],
      },
    ],
    createdAt: "2025-01-31",
    followUpSuggestions: [
      "What would capping Showroom 3 at 8% do to revenue?",
      "Run the same regression by product category",
      "How does seasonality affect the discount sensitivity?",
      "Show me the residual plot for this regression",
    ],
  },
];
