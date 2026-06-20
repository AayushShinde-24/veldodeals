# Generates Veldo-Growth-Analysis.pdf — strategic readiness analysis.
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable,
)

VIOLET = colors.HexColor("#6D5EF8")
CYAN = colors.HexColor("#22D3EE")
INK = colors.HexColor("#0A0A0B")
SLATE = colors.HexColor("#3A3A44")
MUTE = colors.HexColor("#6B7280")
LIGHT = colors.HexColor("#EEF0F6")
GREEN = colors.HexColor("#16A34A")
AMBER = colors.HexColor("#D97706")
RED = colors.HexColor("#DC2626")

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Title"], textColor=INK, fontSize=26, leading=30, spaceAfter=4)
SUB = ParagraphStyle("SUB", parent=styles["Normal"], textColor=MUTE, fontSize=11, leading=15)
H2 = ParagraphStyle("H2", parent=styles["Heading1"], textColor=VIOLET, fontSize=15, leading=19, spaceBefore=16, spaceAfter=6)
H3 = ParagraphStyle("H3", parent=styles["Heading2"], textColor=INK, fontSize=12, leading=16, spaceBefore=10, spaceAfter=3)
BODY = ParagraphStyle("BODY", parent=styles["Normal"], textColor=SLATE, fontSize=10, leading=15, spaceAfter=6)
SMALL = ParagraphStyle("SMALL", parent=styles["Normal"], textColor=MUTE, fontSize=8.5, leading=12)
CELL = ParagraphStyle("CELL", parent=styles["Normal"], textColor=SLATE, fontSize=9, leading=12)
CELLB = ParagraphStyle("CELLB", parent=CELL, textColor=INK, fontName="Helvetica-Bold")
WHITE = ParagraphStyle("WHITE", parent=styles["Normal"], textColor=colors.white, fontSize=9, leading=12, fontName="Helvetica-Bold")

story = []

def p(t, s=BODY): story.append(Paragraph(t, s))
def sp(h=8): story.append(Spacer(1, h))
def rule(c=LIGHT): story.append(HRFlowable(width="100%", thickness=1, color=c, spaceBefore=6, spaceAfter=8))

# ---------- Cover ----------
p("Veldo", H1)
p("Growth Readiness Analysis &mdash; Where we stand vs. $1M/month and $1B companies", SUB)
sp(6); rule(VIOLET)
p("This report benchmarks Veldo's current website and product against the bar that "
  "companies clear at <b>$1M/month revenue</b> and the bar that companies clear to build a "
  "<b>$1B business</b>. It scores each dimension, ranks the gaps from smallest to largest effort, "
  "and lays out the focused path to $1M/month. Prepared by the Veldo build team.", BODY)
sp(4)

# ---------- Executive summary ----------
p("Executive summary", H2)
p("Veldo today is a <b>deep backend with a thin front door</b>. The engine &mdash; AI agents, the credit "
  "ledger, billing, deliverability/compliance, voice calling, sequences, deal-closing and fundraising "
  "&mdash; is built, typed, and tested (98 passing tests). What's missing is almost entirely the "
  "<b>revenue-facing surface</b>: a conversion-grade landing page, self-serve onboarding that reaches "
  "an &lsquo;aha&rsquo; fast, social proof, live data, and an in-product activation loop.", BODY)
score_tbl = Table([
    [Paragraph("Benchmark", WHITE), Paragraph("Veldo today", WHITE), Paragraph("Target bar", WHITE), Paragraph("Gap", WHITE)],
    [Paragraph("Readiness for <b>$1M / month</b>", CELLB), Paragraph("3.4 / 10", CELL), Paragraph("6.7 / 10", CELL), Paragraph("<font color='#D97706'>~51% there</font>", CELL)],
    [Paragraph("Readiness for <b>$1B business</b>", CELLB), Paragraph("3.4 / 10", CELL), Paragraph("9.2 / 10", CELL), Paragraph("<font color='#DC2626'>~37% there</font>", CELL)],
], colWidths=[2.6*inch, 1.4*inch, 1.4*inch, 1.5*inch])
score_tbl.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), INK), ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, LIGHT]),
    ("GRID", (0,0), (-1,-1), 0.5, LIGHT), ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7), ("LEFTPADDING", (0,0), (-1,-1), 8),
]))
story.append(score_tbl); sp(6)
p("<b>Bottom line:</b> the work to reach $1M/month is concentrated in five places &mdash; live data, "
  "a landing page, onboarding, trust, and the command console. None are large. The $1B bar additionally "
  "requires enterprise security (SOC2/SSO), a real GTM engine, a platform/ecosystem, and brand.", BODY)

# ---------- Scorecard ----------
story.append(PageBreak())
p("Detailed scorecard (0&ndash;10)", H2)
p("Each dimension scored for Veldo today, the level a $1M/month company typically operates at, and the "
  "level a $1B company operates at.", BODY)
rows = [
    ["Dimension", "Veldo", "$1M/mo", "$1B"],
    ["Product depth & core flow", "8", "7", "9"],
    ["UI / UX polish", "5", "7", "9"],
    ["Conversion funnel (landing &rarr; signup)", "2", "7", "9"],
    ["Onboarding / time-to-value", "2", "8", "9"],
    ["Trust & social proof", "1", "7", "9"],
    ["Pricing & monetization", "6", "7", "9"],
    ["In-product analytics & intelligence", "3", "6", "9"],
    ["Reliability & live data", "2", "8", "10"],
    ["Security & compliance (SOC2/SSO)", "3", "5", "10"],
    ["GTM engine (SEO / content / sales)", "1", "6", "9"],
    ["Platform & ecosystem (API / marketplace)", "4", "5", "9"],
    ["Brand & differentiation", "4", "6", "9"],
]
def color_for(v):
    v = int(v)
    return GREEN if v >= 7 else (AMBER if v >= 4 else RED)
data = [[Paragraph(rows[0][0], WHITE), Paragraph(rows[0][1], WHITE), Paragraph(rows[0][2], WHITE), Paragraph(rows[0][3], WHITE)]]
for r in rows[1:]:
    data.append([
        Paragraph(r[0], CELL),
        Paragraph(f"<font color='#{color_for(r[1]).hexval()[2:]}'><b>{r[1]}</b></font>", CELL),
        Paragraph(r[2], CELL), Paragraph(r[3], CELL),
    ])
t = Table(data, colWidths=[3.6*inch, 0.9*inch, 0.9*inch, 0.9*inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), INK), ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, LIGHT]),
    ("GRID", (0,0), (-1,-1), 0.5, LIGHT), ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("ALIGN", (1,0), (-1,-1), "CENTER"), ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ("LEFTPADDING", (0,0), (0,-1), 8),
]))
story.append(t); sp(6)
p("Veldo's strength is the engine (product depth 8). Its weakest, most revenue-critical scores are "
  "conversion (2), onboarding (2), trust (1), and live data (2) &mdash; exactly the surface a buyer "
  "touches first.", SMALL)

# ---------- Three cases ----------
p("The three cases, compared", H2)
p("<b>Veldo now.</b> A demo-mode app: every screen renders with mock data, the backend logic is real and "
  "tested, but nothing is connected to a live database and there is no front door to convert a stranger "
  "into a paying account.", BODY)
p("<b>A $1M/month company.</b> Has a sharp landing page aimed at one ICP, a self-serve signup that reaches "
  "value within minutes, visible social proof, a few reliable integrations, working billing, and a repeatable "
  "acquisition channel. The product is &lsquo;boringly reliable&rsquo; on live data. Roughly 100&ndash;400 "
  "paying accounts at Veldo's price points.", BODY)
p("<b>A $1B company.</b> Everything above, plus: an enterprise motion (SOC2/ISO, SSO/SCIM, DPAs, security "
  "reviews), a platform (public API, webhooks, marketplace, partners), multi-segment GTM with brand and a "
  "content/SEO engine, world-class design, global-scale reliability (99.9%+), and data/usage network effects.", BODY)

# ---------- Prioritized gaps ----------
story.append(PageBreak())
p("Prioritized gaps &mdash; smallest to largest", H2)
p("Ordered by build effort (S &rarr; L). &lsquo;Priority&rsquo; weighs revenue impact against effort. "
  "Start at the top.", BODY)
gap_rows = [
    ["#", "Item", "Effort", "Impact", "Priority"],
    ["1", "Connect a live Supabase DB + apply migrations 0001&ndash;0008 (turn demo into real data)", "S", "Critical", "P0"],
    ["2", "Conversion landing page (hero, ICP value prop, demo, CTA)", "S&ndash;M", "Critical", "P0"],
    ["3", "Pricing page with the new tiers + commission + add-ons", "S", "High", "P1"],
    ["4", "Trust strip: customer logos, testimonials, security badges, metrics", "S", "High", "P1"],
    ["5", "SEO foundation: meta/OG tags, sitemap, robots, fast LCP", "S", "Medium", "P2"],
    ["6", "Self-serve onboarding wizard &rarr; first researched lead + drafted email in &lt;10 min", "M", "Critical", "P0"],
    ["7", "Recharts analytics dashboards (funnel, reply rate, CPM/CPL)", "M", "High", "P1"],
    ["8", "Natural-language command console (the &lsquo;wow&rsquo; differentiator)", "M&ndash;L", "High", "P1"],
    ["9", "Activation loop: teaching empty states + next-step nudges", "M", "High", "P1"],
    ["10", "Docs site + public API reference", "M", "Medium", "P2"],
    ["11", "Live self-serve Stripe checkout + 14-day trial in-app", "M&ndash;L", "High", "P1"],
    ["12", "Real-time updates (Supabase realtime on dashboard/inbox)", "M&ndash;L", "Medium", "P2"],
    ["13", "Enterprise security: SOC2, SSO/SAML, SCIM, DPA, audit exports", "L", "Critical*", "P1*"],
    ["14", "Mem0 per-account memory + deeper agent autonomy", "L", "Medium", "P2"],
    ["15", "Integrations marketplace + partner program", "L", "Medium", "P3"],
    ["16", "Global-scale infra: 99.9%+, observability, multi-region", "L", "High*", "P2*"],
]
gdata = [[Paragraph(c, WHITE) for c in gap_rows[0]]]
for r in gap_rows[1:]:
    pr = r[4]
    pcol = "#DC2626" if pr.startswith("P0") else ("#D97706" if pr.startswith("P1") else "#16A34A")
    gdata.append([
        Paragraph(r[0], CELL), Paragraph(r[1], CELL), Paragraph(r[2], CELL),
        Paragraph(r[3], CELL), Paragraph(f"<font color='{pcol}'><b>{r[4]}</b></font>", CELL),
    ])
gt = Table(gdata, colWidths=[0.3*inch, 3.7*inch, 0.7*inch, 0.85*inch, 0.75*inch])
gt.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), INK), ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, LIGHT]),
    ("GRID", (0,0), (-1,-1), 0.5, LIGHT), ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("ALIGN", (2,0), (-1,-1), "CENTER"), ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ("LEFTPADDING", (0,0), (-1,-1), 6),
]))
story.append(gt); sp(5)
p("* Enterprise security & global-scale are <b>P0/P1 for $1B</b> but not required to reach $1M/month.", SMALL)

# ---------- Path to $1M ----------
p("The focused path to $1M / month", H2)
p("At Veldo's price points ($2,499&ndash;$25,999), $1M/month is roughly <b>100&ndash;300 paying accounts</b> "
  "(or far fewer enterprise + commission). The shortest route:", BODY)
steps = [
    ("1. Go live", "Connect Supabase, apply migrations, seed a real workspace. Demo &rarr; real. (Gap #1)"),
    ("2. Build the front door", "Conversion landing page + new pricing + trust strip. A stranger understands and signs up. (Gaps #2&ndash;4)"),
    ("3. Earn the first &lsquo;aha&rsquo;", "Onboarding wizard that produces a researched lead and a drafted email within 10 minutes. (Gap #6)"),
    ("4. Show the magic", "The command console: &lsquo;find 200 VP Sales who raised Series B&rsquo; &rarr; results stream in. (Gap #8)"),
    ("5. Prove it works", "Live charts: reply rate, meetings, pipeline, cost-per-meeting. Buyers trust numbers. (Gap #7)"),
    ("6. Turn on acquisition", "Veldo dogfoods its own outbound + SEO/content; self-serve checkout + trial closes the loop. (Gaps #5, #10, #11)"),
]
for h, b in steps:
    p(f"<b>{h}</b> &mdash; {b}", BODY)

# ---------- Action ----------
p("What we're building first", H2)
p("Per this analysis, the two highest-leverage, lowest-effort revenue items are the <b>front door</b> "
  "(landing page + pricing + trust) and <b>going live</b>. Work has begun on the conversion landing page "
  "and the updated pricing tiers; connecting a live database is a one-step unlock that needs your Supabase "
  "keys.", BODY)
sp(10); rule(VIOLET)
p("Veldo &mdash; Growth Readiness Analysis. Scores are directional benchmarks to guide sequencing, not "
  "absolute measurements.", SMALL)

doc = SimpleDocTemplate("Veldo-Growth-Analysis.pdf", pagesize=LETTER,
                        topMargin=0.7*inch, bottomMargin=0.7*inch, leftMargin=0.8*inch, rightMargin=0.8*inch,
                        title="Veldo Growth Readiness Analysis", author="Veldo")
doc.build(story)
print("WROTE Veldo-Growth-Analysis.pdf")
