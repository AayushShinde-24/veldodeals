# -*- coding: utf-8 -*-
"""Generate Veldo's 100-step / 100-hour, one-month execution plan as a PDF."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# ---- Brand palette -------------------------------------------------------
INK      = colors.HexColor("#0B1220")   # near-black
SLATE    = colors.HexColor("#475569")
MUTED    = colors.HexColor("#94A3B8")
LINE     = colors.HexColor("#E2E8F0")
C_SALES  = colors.HexColor("#2563EB")   # blue
C_MKTG   = colors.HexColor("#9333EA")   # purple
C_FUND   = colors.HexColor("#059669")   # green
C_AUTO   = colors.HexColor("#EA580C")   # orange
BG_SOFT  = colors.HexColor("#F8FAFC")

styles = getSampleStyleSheet()

def S(name, **kw):
    return ParagraphStyle(name, parent=styles["Normal"], **kw)

title_style   = S("t", fontName="Helvetica-Bold", fontSize=34, leading=38, textColor=INK)
sub_style     = S("s", fontName="Helvetica", fontSize=12.5, leading=18, textColor=SLATE)
kicker_style  = S("k", fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=C_SALES)
sec_title     = S("sec", fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=colors.white)
sec_sub       = S("secsub", fontName="Helvetica", fontSize=10.5, leading=14, textColor=colors.white)
step_no       = S("no", fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=colors.white, alignment=TA_CENTER)
step_title    = S("st", fontName="Helvetica-Bold", fontSize=9.8, leading=12.5, textColor=INK)
step_detail   = S("sd", fontName="Helvetica", fontSize=8.6, leading=11.2, textColor=SLATE)
hour_style    = S("hr", fontName="Helvetica-Bold", fontSize=9, leading=11, textColor=SLATE, alignment=TA_CENTER)
small         = S("sm", fontName="Helvetica", fontSize=9, leading=13, textColor=SLATE)
small_b       = S("smb", fontName="Helvetica-Bold", fontSize=9, leading=13, textColor=INK)
foot          = S("ft", fontName="Helvetica", fontSize=8, leading=10, textColor=MUTED, alignment=TA_CENTER)

# ---- The plan ------------------------------------------------------------
# Each step: (title, detail, hours)
SALES = [
("Write the one-line promise", "Nail what Veldo does for a founder in one sentence. Everything downstream inherits this.", 1),
("Pick ONE beachhead ICP", "Choose a single narrow customer (e.g. pre-seed B2B SaaS founders). Resist the urge to serve everyone.", 1),
("List the top 3 pains", "For that ICP, write the 3 most expensive, urgent pains Veldo removes.", 0.5),
("Define the wedge", "Decide which single feature gets the first 'yes'. Sales is the wedge into the rest.", 1),
("Build a 90-second demo flow", "Script the shortest path that shows real value live, no fluff.", 1),
("Stand up a bare landing page", "Headline, sub, 3 bullets, one CTA. Ship ugly, ship today.", 1.5),
("Add a 'book a call' link", "Calendly/Cal.com embed. Remove every click between interest and a meeting.", 0.5),
("Draft the cold outreach v1", "3-line message: trigger, pain, ask. Personalisable in 20 seconds.", 1),
("Build a 50-lead list", "Hand-pick 50 ideal accounts. Quality over volume for the first batch.", 1),
("Enrich the list", "Find decision-maker + email + one personal trigger per lead.", 1.5),
("Send the first 25 outreaches", "Manually. Feel the responses. Do not automate yet.", 1),
("Log every reply verbatim", "Objections are gold. Capture exact wording in a sheet.", 0.5),
("Book 5 discovery calls", "Goal of week 1. Even 3 is a real signal.", 1),
("Run discovery, not pitch", "Ask about their process today. Listen 80%, talk 20%.", 1.5),
("Map the buying process", "Who decides, what budget, what timeline, what blocks them.", 1),
("Write the objection bank", "Top 8 objections + a tight one-paragraph answer each.", 1),
("Tighten the demo", "Cut anything that didn't make eyes light up on calls.", 1),
("Make a pilot offer", "Time-boxed, low-friction first engagement with a clear success metric.", 1),
("Close the first paying user", "Charge something, even if small. A paid 'yes' beats 10 free 'maybe's.", 1.5),
("Onboard them personally", "White-glove. Their success is your case study.", 1),
("Capture a quantified win", "Get a number: hours saved, replies booked, dollars influenced.", 1),
("Ask for a testimonial", "While the win is fresh. One sentence + name + logo.", 0.5),
("Ask for 2 referrals", "Best leads come warm. Make the ask explicit and easy.", 0.5),
("Set your real price", "Anchor to value/ROI, not cost. Test a higher number than feels comfortable.", 1),
("Build a one-page sales deck", "Problem, promise, proof, price. Sendable after any call.", 1.5),
("Create a follow-up sequence", "3 touches over 7 days for warm-but-not-closed leads.", 1),
("Define your sales metrics", "Track: outreach, reply rate, calls, close rate, ACV.", 0.5),
("Send the next 25 outreaches", "Apply everything learned. Watch reply rate climb.", 1),
("Close 2 more customers", "Now you have a repeatable motion, not a fluke.", 1.5),
("Write the sales playbook v1", "Document the motion so it can be repeated (and later automated).", 1),
]

MARKETING = [
("Define your category narrative", "The story of the world you're building. Bigger than a feature list.", 1),
("Pick 1 primary channel", "Where your ICP actually hangs out. One channel done well > five half-done.", 1),
("Claim your handles", "Same name everywhere. Consistent bio, link, and avatar.", 0.5),
("Write a content pillar set", "3 themes you'll own. Every post ladders up to one of them.", 1),
("Turn sales calls into content", "Each real objection/win is a post. You already did the research.", 1),
("Publish your founding story", "Why Veldo exists. People buy the why before the what.", 1),
("Ship 5 posts in week-3 voice", "Build the habit. Done beats perfect.", 1),
("Create a lead magnet", "A template/checklist your ICP would pay for, given free for an email.", 1),
("Add email capture to the site", "Connect the magnet to a simple list tool.", 1),
("Write a 3-email welcome flow", "Deliver value, tell the story, make a soft offer.", 1),
("Build a simple referral hook", "Give users a reason and a way to share Veldo.", 1),
("Reach out to 5 micro-influencers", "Niche voices your ICP trusts. Offer value, not just an ask.", 1),
("Guest on 1 podcast/newsletter", "Borrow an existing audience instead of building from zero.", 1),
("Publish 1 deep 'proof' piece", "A case study with your real customer number from the sales phase.", 1.5),
("Repurpose it 5 ways", "Long post -> thread -> short video -> email -> carousel.", 1),
("Set up basic analytics", "Know which channel/post drives signups. Kill what doesn't work.", 1),
("Run a tiny paid test", "$50-100 to learn messaging, not to scale. Watch CTR + signup cost.", 1),
("Start an SEO seed", "One keyword page targeting a real buying-intent search.", 1.5),
("Build a 'wall of love'", "Collect screenshots of praise. Social proof compounds.", 0.5),
("Engage 30 min daily in-channel", "Reply, help, be present. Distribution is a relationship.", 1),
("Launch on one platform", "Product Hunt / a relevant community. Prep assets a day ahead.", 1.5),
("Convert attention to calls", "Every campaign ends in your book-a-call or signup CTA.", 0.5),
("Measure CAC vs ACV", "Make sure a customer costs less than they pay. Margin matters now.", 1),
("Double down on the winner", "Whichever channel/post outperformed, pour the next week into it.", 1),
("Write the marketing playbook v1", "Document the repeatable distribution motion.", 1),
]

FUNDRAISING = [
("Decide if you should raise", "Only raise to pour fuel on a working motion. You now have proof.", 0.5),
("Set the round shape", "Amount, instrument (SAFE), target valuation, runway it buys.", 1),
("Build the traction slide", "Customers, revenue, growth rate, retention. Your strongest asset.", 1),
("Draft the 10-slide deck", "Problem, solution, market, traction, model, team, ask. Tight.", 2),
("Write the one-line blurb", "The forwardable sentence that gets you the meeting.", 0.5),
("Build a simple data room", "Deck, metrics, cap table, incorporation docs in one folder.", 1),
("Nail the metrics narrative", "Know your numbers cold: CAC, LTV, NRR, burn, growth.", 1),
("Define use of funds", "Exactly how the money buys growth. Tie it to the four pillars.", 1),
("Build the investor list", "50 investors who fund your stage + sector. Warm-path each.", 1),
("Rank by fit + warmth", "Tier A/B/C. Practice on C-tier before A-tier.", 1),
("Map intro paths", "For each target, find the warmest mutual connection.", 1),
("Draft the intro-request template", "Make it forwardable: blurb + ask + why-them in 4 lines.", 0.5),
("Write the cold investor email", "For the no-warm-path ones. Lead with traction.", 1),
("Practice the pitch out loud", "5 times. Record yourself. Cut the rambling.", 1),
("Run 3 practice pitches", "With C-tier or friendly founders. Collect every question.", 1),
("Refine deck from questions", "Pre-empt the top objections inside the deck.", 1),
("Open the round formally", "Send the first batch of intro requests + cold emails.", 1),
("Book 10 investor meetings", "Density matters. Cluster them to create momentum.", 1),
("Run meetings, drive to next step", "Always end with a clear next action and date.", 2),
("Send tight follow-ups", "Within 24h: thank, recap, attach, propose next step.", 1),
("Create competitive tension", "Parallel-process. A timeline turns 'maybe' into 'yes'.", 1),
("Get the first commitment", "One lead/anchor unlocks the herd. Push for it.", 1),
("Handle terms simply", "Standard SAFE. Don't over-negotiate a small round.", 1),
("Close and collect", "Signatures + wire. Money in the bank, not 'verbal'.", 1),
("Send an investor update", "Start the habit now. Updated backers fund the next round.", 0.5),
]

AUTOMATION = [
("List every repetitive task", "Across sales, marketing, ops, product, data, finance. Time-cost each.", 1),
("Rank by hours x frequency", "Automate the biggest time-sinks first. Follow the payroll, not the tool.", 1),
("Pick the top 5 to automate", "The ones replacing real hours/headcount carry the most value.", 0.5),
("Map each as a workflow", "Trigger -> steps -> output. Draw it before you build it.", 1),
("Automate lead enrichment", "Agent/API pipeline that builds + enriches lead lists hands-free.", 1),
("Automate outreach personalisation", "AI drafts the personalised first line at scale, you approve.", 1),
("Automate reply triage", "Classifier routes replies: interested / later / no. Saves daily hours.", 1),
("Automate content repurposing", "One asset -> many formats via an AI step. Marketing on autopilot.", 1.5),
("Automate the investor-update draft", "Pull metrics -> AI drafts the monthly update for review.", 1),
("Automate internal reporting", "Daily/weekly KPI digest assembled and delivered automatically.", 1),
("Connect your data sources", "One source of truth the agents read from. Kill copy-paste.", 1.5),
("Add a human-approval gate", "Automation drafts; a human ships anything customer-facing. Trust + speed.", 1),
("Automate onboarding steps", "New customer triggers the white-glove sequence automatically.", 1),
("Build an internal ops agent", "Handles a recurring back-office job (scheduling, follow-ups, data hygiene).", 1.5),
("Instrument everything", "Log time saved per automation. Prove the ROI you'll charge for.", 1),
("Set guardrails + monitoring", "Alerts when an automation fails or drifts. Safe to scale.", 1),
("Package automation as the premium tier", "Price to the labour it replaces (a salary), not a SaaS seat.", 1),
("Document the automation library", "Reusable building blocks so each new automation is faster.", 1),
("Review the full loop", "Sales -> Marketing -> Fundraising -> Automation now reinforce each other.", 0.5),
("Plan month 2", "Pick the next ICP/channel/automation. Compound from the peak.", 0.5),
]

# ---- Assemble document ---------------------------------------------------
DATA = [
    ("01", "SALES",       "The wedge — win paying customers & a repeatable motion", SALES,       C_SALES),
    ("02", "MARKETING",   "Amplify — turn proof into reach and a content engine",   MARKETING,   C_MKTG),
    ("03", "FUNDRAISING", "Fuel — convert traction into capital",                   FUNDRAISING, C_FUND),
    ("04", "AUTOMATION",  "Leverage — automate the company; price to the payroll",  AUTOMATION,  C_AUTO),
]

def hours_of(steps):
    return sum(h for _, _, h in steps)

TOTAL_STEPS = sum(len(d[3]) for d in DATA)
TOTAL_HOURS = sum(hours_of(d[3]) for d in DATA)

story = []

# ----- Cover --------------------------------------------------------------
story.append(Spacer(1, 40))
story.append(Paragraph("VELDO — FOUNDER EXECUTION SPRINT", kicker_style))
story.append(Spacer(1, 10))
story.append(Paragraph("Bottom of the Bottom<br/>to the Peak of the Peak", title_style))
story.append(Spacer(1, 14))
story.append(Paragraph(
    "An all-out moonshot to take Veldo from zero to <b>$1,000,000 ARR</b> in "
    "<b>one month</b> on a budget of <b>100 focused hours</b>. "
    "Sequenced through the four pillars — first you sell, then you amplify, "
    "then you fund, then you automate the whole machine.",
    sub_style))
story.append(Spacer(1, 18))

# Hard target banner
tgt = Table([[
    Paragraph("THE TARGET", S("tt", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white)),
    Paragraph("$1,000,000 ARR", S("ta", fontName="Helvetica-Bold", fontSize=21, leading=23, textColor=colors.white)),
    Paragraph("=", S("te", fontName="Helvetica-Bold", fontSize=18, textColor=colors.HexColor('#93C5FD'), alignment=TA_CENTER)),
    Paragraph("$80,000 MRR", S("tm", fontName="Helvetica-Bold", fontSize=21, leading=23, textColor=colors.white)),
    Paragraph("in 30 days", S("td", fontName="Helvetica", fontSize=10, textColor=colors.HexColor('#BFDBFE'))),
]], colWidths=[26*mm, 46*mm, 10*mm, 46*mm, 24*mm])
tgt.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), INK),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 14),
    ("BOTTOMPADDING", (0,0), (-1,-1), 14),
    ("LEFTPADDING", (0,0), (0,-1), 12),
]))
story.append(tgt)
story.append(Spacer(1, 8))
story.append(Paragraph(
    "<b>Reality check, stated up front:</b> $80K MRR in 30 days from a standing start is a "
    "moonshot, not a forecast. It is reachable on exactly one path — <b>high-ticket deals "
    "priced against the salary they replace ($5–8K/mo)</b> — and only if every hour below "
    "converts. The next page shows the unforgiving math.",
    S("rc", fontName="Helvetica", fontSize=9, leading=13, textColor=SLATE)))
story.append(Spacer(1, 18))

# Stat strip
stat_data = [[
    Paragraph("<b>100</b><br/><font size=8 color='#94A3B8'>STEPS</font>", S("x", alignment=TA_CENTER, fontSize=22, leading=24, textColor=INK, fontName="Helvetica-Bold")),
    Paragraph("<b>100</b><br/><font size=8 color='#94A3B8'>HOURS</font>", S("x", alignment=TA_CENTER, fontSize=22, leading=24, textColor=INK, fontName="Helvetica-Bold")),
    Paragraph("<b>4</b><br/><font size=8 color='#94A3B8'>PILLARS</font>", S("x", alignment=TA_CENTER, fontSize=22, leading=24, textColor=INK, fontName="Helvetica-Bold")),
    Paragraph("<b>~25</b><br/><font size=8 color='#94A3B8'>HRS / WEEK</font>", S("x", alignment=TA_CENTER, fontSize=22, leading=24, textColor=INK, fontName="Helvetica-Bold")),
]]
stat_tbl = Table(stat_data, colWidths=[42*mm]*4)
stat_tbl.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), BG_SOFT),
    ("BOX", (0,0), (-1,-1), 0.5, LINE),
    ("INNERGRID", (0,0), (-1,-1), 0.5, LINE),
    ("TOPPADDING", (0,0), (-1,-1), 14),
    ("BOTTOMPADDING", (0,0), (-1,-1), 14),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
]))
story.append(stat_tbl)
story.append(Spacer(1, 22))

# Roadmap overview
story.append(HRFlowable(width="100%", thickness=0.6, color=LINE))
story.append(Spacer(1, 12))
story.append(Paragraph("THE ROADMAP", S("rm", fontName="Helvetica-Bold", fontSize=11, textColor=INK)))
story.append(Spacer(1, 8))

road_rows = []
ranges = []
start = 1
for num, name, tag, steps, col in DATA:
    end = start + len(steps) - 1
    ranges.append((start, end))
    road_rows.append([
        Paragraph(f"<b>{num}</b>",
                  S("r", fontName="Helvetica-Bold", fontSize=13, textColor=col)),
        Paragraph(f"<b>{name}</b>", S("rn", fontName="Helvetica-Bold", fontSize=11, textColor=INK)),
        Paragraph(tag, small),
        Paragraph(f"Steps {start}–{end}", S("rr", fontName="Helvetica-Bold", fontSize=9, textColor=SLATE)),
        Paragraph(f"{hours_of(steps):g} h", S("rh", fontName="Helvetica-Bold", fontSize=9, textColor=col)),
    ])
    start = end + 1

road = Table(road_rows, colWidths=[12*mm, 30*mm, 78*mm, 24*mm, 16*mm])
road_style = [
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 9),
    ("BOTTOMPADDING", (0,0), (-1,-1), 9),
    ("LINEBELOW", (0,0), (-1,-2), 0.4, LINE),
    ("LEFTPADDING", (0,0), (0,-1), 0),
]
for i, (_, _, _, _, col) in enumerate(DATA):
    road_style.append(("LINEBEFORE", (0,i), (0,i), 2.5, col))
road.setStyle(TableStyle(road_style))
story.append(road)
story.append(Spacer(1, 16))
story.append(Paragraph(
    "<b>How to use this:</b> work top to bottom. Each step has an hour budget; the "
    "four pillars sum to exactly 100 hours. Don't jump ahead — selling first is what "
    "earns the proof that makes marketing land, fundraising credible, and automation "
    "worth paying a premium for.", small))

story.append(PageBreak())

# ----- Moonshot math page -------------------------------------------------
story.append(Paragraph("THE MOONSHOT MATH", kicker_style))
story.append(Spacer(1, 8))
story.append(Paragraph("What $80K MRR actually demands", S("mm", fontName="Helvetica-Bold", fontSize=19, textColor=INK)))
story.append(Spacer(1, 12))
story.append(Paragraph(
    "Revenue is gated by buying decisions, not effort. At self-serve prices the target needs "
    "hundreds of customers — impossible in 30 days. High-ticket is the <b>only</b> door:",
    small))
story.append(Spacer(1, 12))

# Price -> customers table
price_rows = [[
    Paragraph("<b>PRICE / MO</b>", S("ph", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.white)),
    Paragraph("<b>CUSTOMERS FOR $80K MRR</b>", S("ph", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.white)),
    Paragraph("<b>VERDICT IN 30 DAYS</b>", S("ph", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.white)),
]]
for price, cust, verdict, ok in [
    ("$200", "400 customers", "Impossible", 0),
    ("$500", "160 customers", "No", 0),
    ("$1,000", "80 customers", "Very unlikely", 0),
    ("$2,000", "40 customers", "Brutal", 0),
    ("$5,000", "16 customers", "Hard — the floor", 1),
    ("$8,000", "10 customers", "The moonshot path", 1),
]:
    price_rows.append([
        Paragraph(f"<b>{price}</b>", S("pp", fontName="Helvetica-Bold", fontSize=9.5, textColor=INK)),
        Paragraph(cust, small),
        Paragraph(("» " if ok else "× ") + verdict,
                  S("pv", fontName="Helvetica-Bold", fontSize=9, textColor=(C_FUND if ok else colors.HexColor('#DC2626')))),
    ])
ptbl = Table(price_rows, colWidths=[34*mm, 70*mm, 68*mm])
pst = [
    ("BACKGROUND", (0,0), (-1,0), INK),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
    ("LEFTPADDING", (0,0), (-1,-1), 8),
    ("LINEBELOW", (0,1), (-1,-1), 0.4, LINE),
]
for r in (5, 6):
    pst.append(("BACKGROUND", (0,r), (-1,r), colors.HexColor('#ECFDF5')))
ptbl.setStyle(TableStyle(pst))
story.append(ptbl)
story.append(Spacer(1, 16))

# The funnel to 13 deals
story.append(Paragraph("THE FUNNEL TO LAND ~13 DEALS @ ~$6.25K AVG = $81K MRR", S("fh", fontName="Helvetica-Bold", fontSize=10, textColor=INK)))
story.append(Spacer(1, 8))
fun_rows = [[Paragraph(f"<b>{a}</b>", S("f", fontName="Helvetica-Bold", fontSize=9.5, textColor=C_SALES, alignment=TA_CENTER)),
             Paragraph(b, S("f2", fontName="Helvetica", fontSize=8.3, leading=10.5, textColor=SLATE, alignment=TA_CENTER))]
            for a, b in [
    ("~3,000", "quality outreaches sent"),
    ("~150", "qualified calls booked"),
    ("~55", "real opportunities"),
    ("~13", "closed @ ~$6.25K/mo"),
    ("$81K", "MRR → $975K ARR"),
]]
ftbl = Table([[c[0] for c in [(Paragraph(f"<b>{a}</b>", S('fa', fontName='Helvetica-Bold', fontSize=14, textColor=C_SALES, alignment=TA_CENTER)),) for a,_ in [
    ("~3,000","x"),("~150","x"),("~55","x"),("~13","x"),("$81K","x")]]],
    [Paragraph(b, S("fb", fontName="Helvetica", fontSize=8, leading=10, textColor=SLATE, alignment=TA_CENTER)) for _,b in [
    ("","quality\noutreaches"),("","qualified\ncalls"),("","real\nopportunities"),("","closed @\n$6.25K/mo"),("","MRR =\n$975K ARR")]]],
    colWidths=[34*mm]*5)
ftbl.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), BG_SOFT),
    ("BOX", (0,0), (-1,-1), 0.5, LINE),
    ("INNERGRID", (0,0), (-1,-1), 0.5, colors.white),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,0), 12), ("BOTTOMPADDING", (0,1), (-1,1), 12),
    ("BACKGROUND", (4,0), (4,-1), colors.HexColor('#ECFDF5')),
]))
story.append(ftbl)
story.append(Spacer(1, 8))
story.append(Paragraph(
    "<b>The honest tension:</b> ~3,000 outreaches and 150 calls by hand in 100 hours is impossible solo — "
    "which is why the moonshot version <i>front-loads</i> the automate-able sales steps (enrichment, "
    "personalisation, reply triage) from Day 1, even though Automation is formally Pillar 4. "
    "Automation isn't just the prize at the end here — it's the only way the funnel math closes at all.",
    S("ft2", fontName="Helvetica", fontSize=8.6, leading=12, textColor=SLATE)))
story.append(Spacer(1, 16))

# Weekly MRR ladder
story.append(Paragraph("THE 4-WEEK MRR LADDER", S("wh", fontName="Helvetica-Bold", fontSize=10, textColor=INK)))
story.append(Spacer(1, 8))
ladder_rows = [[
    Paragraph("<b>WEEK</b>", S("w", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.white)),
    Paragraph("<b>FOCUS</b>", S("w", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.white)),
    Paragraph("<b>DEALS (cum.)</b>", S("w", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.white, alignment=TA_CENTER)),
    Paragraph("<b>MRR (cum.)</b>", S("w", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.white, alignment=TA_CENTER)),
]]
for wk, focus, deals, mrr, col in [
    ("Week 1", "Sales — first high-ticket closes", "3", "$19K", C_SALES),
    ("Week 2", "Marketing — pipeline explodes", "7", "$44K", C_MKTG),
    ("Week 3", "Fundraising — fuel + credibility", "11", "$69K", C_FUND),
    ("Week 4", "Automation — close the last batch", "13", "$81K »", C_AUTO),
]:
    ladder_rows.append([
        Paragraph(f"<b>{wk}</b>", S("wl", fontName="Helvetica-Bold", fontSize=9.5, textColor=col)),
        Paragraph(focus, small),
        Paragraph(deals, S("wd", fontName="Helvetica-Bold", fontSize=9.5, textColor=INK, alignment=TA_CENTER)),
        Paragraph(mrr, S("wm", fontName="Helvetica-Bold", fontSize=10, textColor=col, alignment=TA_CENTER)),
    ])
ltbl = Table(ladder_rows, colWidths=[24*mm, 84*mm, 30*mm, 34*mm])
lst = [
    ("BACKGROUND", (0,0), (-1,0), INK),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 8), ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ("LEFTPADDING", (0,0), (-1,-1), 8),
    ("LINEBELOW", (0,1), (-1,-1), 0.4, LINE),
]
for i in range(4):
    lst.append(("LINEBEFORE", (0,i+1), (0,i+1), 2.5, [C_SALES,C_MKTG,C_FUND,C_AUTO][i]))
ltbl.setStyle(TableStyle(lst))
story.append(ltbl)
story.append(PageBreak())

# ----- Section pages ------------------------------------------------------
def section_header(num, name, tag, col):
    band = Table([[
        Paragraph(num, S("bn", fontName="Helvetica-Bold", fontSize=26, textColor=colors.white)),
        Paragraph(f"{name}<br/><font size=10 face='Helvetica' color='#FFFFFF'>{tag}</font>", sec_title),
    ]], colWidths=[24*mm, 150*mm])
    band.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), col),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0), (-1,-1), 12),
        ("BOTTOMPADDING", (0,0), (-1,-1), 12),
        ("LEFTPADDING", (0,0), (0,-1), 12),
        ("RIGHTPADDING", (-1,0), (-1,-1), 12),
    ]))
    return band

n = 1
for num, name, tag, steps, col in DATA:
    story.append(section_header(num, name, tag, col))
    story.append(Spacer(1, 6))
    sec_hours = hours_of(steps)
    story.append(Paragraph(
        f"<font color='#94A3B8'>Steps {n}–{n+len(steps)-1}</font> &nbsp;·&nbsp; "
        f"<font color='#94A3B8'>{len(steps)} steps</font> &nbsp;·&nbsp; "
        f"<font color='#94A3B8'>{sec_hours:g} hours</font>",
        S("meta", fontName="Helvetica-Bold", fontSize=8.5)))
    story.append(Spacer(1, 8))

    rows = [[
        Paragraph("#", S("h", fontName="Helvetica-Bold", fontSize=8, textColor=colors.white, alignment=TA_CENTER)),
        Paragraph("STEP", S("h", fontName="Helvetica-Bold", fontSize=8, textColor=colors.white)),
        Paragraph("HRS", S("h", fontName="Helvetica-Bold", fontSize=8, textColor=colors.white, alignment=TA_CENTER)),
    ]]
    for title, detail, hrs in steps:
        rows.append([
            Paragraph(str(n), step_no),
            Paragraph(f"<b>{title}.</b> <font color='#475569'>{detail}</font>", step_title),
            Paragraph(f"{hrs:g}", hour_style),
        ])
        n += 1

    tbl = Table(rows, colWidths=[11*mm, 147*mm, 14*mm], repeatRows=1)
    tstyle = [
        ("BACKGROUND", (0,0), (-1,0), col),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,1), (-1,-1), 6),
        ("BOTTOMPADDING", (0,1), (-1,-1), 6),
        ("TOPPADDING", (0,0), (-1,0), 5),
        ("BOTTOMPADDING", (0,0), (-1,0), 5),
        ("LINEBELOW", (0,1), (-1,-1), 0.4, LINE),
        ("BACKGROUND", (0,1), (0,-1), col),
        ("LEFTPADDING", (1,0), (1,-1), 8),
        ("RIGHTPADDING", (1,0), (1,-1), 8),
    ]
    # subtle zebra on the wide column
    for r in range(1, len(rows)):
        if r % 2 == 0:
            tstyle.append(("BACKGROUND", (1,r), (2,r), BG_SOFT))
    tbl.setStyle(TableStyle(tstyle))
    story.append(tbl)
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        {
            "SALES": "Revenue checkpoint → ~3 high-ticket customers closed · ~$19K MRR · objection bank + playbook v1.",
            "MARKETING": "Revenue checkpoint → pipeline full, 7 cumulative closes · ~$44K MRR · CAC < ACV proven.",
            "FUNDRAISING": "Revenue checkpoint → 11 cumulative closes · ~$69K MRR · anchor commitment wired to fund the final push.",
            "AUTOMATION": "Revenue checkpoint → 13 cumulative closes · ~$81K MRR = ~$1M ARR — TARGET HIT · premium tier priced to the payroll it replaces.",
        }[name],
        S("exit", fontName="Helvetica-Oblique", fontSize=8.8, textColor=col)))
    story.append(PageBreak())

# ----- Closing page -------------------------------------------------------
story.append(Spacer(1, 30))
story.append(Paragraph("THE COMPOUNDING LOOP", kicker_style))
story.append(Spacer(1, 8))
story.append(Paragraph("Why this order is the whole game", S("c", fontName="Helvetica-Bold", fontSize=18, textColor=INK)))
story.append(Spacer(1, 14))
for t, d, col in [
    ("Sales first", "creates proof and revenue — the only thing that makes everything after it credible.", C_SALES),
    ("Marketing second", "takes that proof and turns one customer into a repeatable flow of attention.", C_MKTG),
    ("Fundraising third", "converts visible traction into capital on the best possible terms.", C_FUND),
    ("Automation last", "uses the capital to replace hours and headcount — the pillar you charge the most for, because it's priced against a salary, not a subscription.", C_AUTO),
]:
    story.append(Paragraph(f"<b><font color='#0B1220'>{t}</font></b> — {d}",
                           S("cl", fontName="Helvetica", fontSize=10.5, leading=16, textColor=SLATE)))
    story.append(Spacer(1, 6))
story.append(Spacer(1, 16))
story.append(HRFlowable(width="100%", thickness=0.6, color=LINE))
story.append(Spacer(1, 12))
# Final target restate
endt = Table([[
    Paragraph("13 deals × ~$6.25K/mo", S("e1", fontName="Helvetica-Bold", fontSize=12, textColor=colors.white, alignment=TA_CENTER)),
    Paragraph("=", S("e2", fontName="Helvetica-Bold", fontSize=14, textColor=colors.HexColor('#93C5FD'), alignment=TA_CENTER)),
    Paragraph("$81K MRR", S("e3", fontName="Helvetica-Bold", fontSize=14, textColor=colors.white, alignment=TA_CENTER)),
    Paragraph("=", S("e4", fontName="Helvetica-Bold", fontSize=14, textColor=colors.HexColor('#93C5FD'), alignment=TA_CENTER)),
    Paragraph("$1M ARR", S("e5", fontName="Helvetica-Bold", fontSize=14, textColor=colors.white, alignment=TA_CENTER)),
]], colWidths=[58*mm, 10*mm, 34*mm, 10*mm, 34*mm])
endt.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), INK),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 12), ("BOTTOMPADDING", (0,0), (-1,-1), 12),
]))
story.append(endt)
story.append(Spacer(1, 12))
story.append(Paragraph(
    "This is a moonshot — most months won't land all 13. But aim at $80K MRR and miss to "
    "$30K, and you've still built, in 100 hours, a company most founders don't reach in a year. "
    "Light the engine.",
    S("end", fontName="Helvetica-BoldOblique", fontSize=11.5, leading=17, textColor=INK)))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(20*mm, 12*mm, "Veldo — 100-Step / 100-Hour Sprint")
    canvas.drawRightString(190*mm, 12*mm, f"{doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(
    "Veldo_100_Step_Plan.pdf", pagesize=A4,
    leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=20*mm,
    title="Veldo — 100-Step / 100-Hour Sprint", author="Veldo",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("Total steps:", sum(len(d[3]) for d in DATA))
print("Total hours:", sum(hours_of(d[3]) for d in DATA))
print("Per section:", [(d[1], len(d[3]), hours_of(d[3])) for d in DATA])
print("PDF written: Veldo_100_Step_Plan.pdf")
