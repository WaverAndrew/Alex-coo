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
];
