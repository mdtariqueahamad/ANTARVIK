#!/usr/bin/env python3
"""
ANTARVIK — SIH 2026 PDF Presentation Generator
Generates a SIH-standard 6-template PDF for Team Atrangi (SIH26060)
With system architecture flow diagram inspired by reference design.
"""

import os
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import inch, mm, cm
from reportlab.lib.colors import HexColor, Color, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import Paragraph, Frame
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image

# ============================================================
# CONSTANTS
# ============================================================
PAGE_W, PAGE_H = landscape(A4)  # 841.89 x 595.28 pts
OUTPUT = "ANTARVIK_SIH2026_TeamAtrangi.pdf"

# Color palette — dark Antarctic theme
BG_DEEP       = HexColor("#0a1628")
BG_DARK       = HexColor("#0f1f38")
BG_CARD       = HexColor("#14274a")
BG_CARD_LIGHT = HexColor("#1a3058")
ACCENT_BLUE   = HexColor("#3b9eff")
ACCENT_CYAN   = HexColor("#00d4ff")
ACCENT_ICE    = HexColor("#a8e0ff")
ACCENT_GREEN  = HexColor("#00e68a")
ACCENT_ORANGE = HexColor("#ff8c42")
ACCENT_RED    = HexColor("#ff4d6a")
ACCENT_PURPLE = HexColor("#a855f7")
ACCENT_GOLD   = HexColor("#ffd700")
TEXT_PRIMARY   = HexColor("#e8f0ff")
TEXT_SECONDARY = HexColor("#8bb8e8")
TEXT_MUTED     = HexColor("#5a7fa0")
BORDER_GLASS   = HexColor("#1e3a5f")
WHITE_10       = Color(1, 1, 1, 0.10)
WHITE_05       = Color(1, 1, 1, 0.05)
CYAN_15        = Color(0, 0.83, 1, 0.15)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ============================================================
# HELPER FUNCTIONS
# ============================================================
def draw_bg(c):
    """Draw dark gradient background."""
    # Base fill
    c.setFillColor(BG_DEEP)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Subtle gradient overlay
    for i in range(20):
        frac = i / 20.0
        col = Color(
            0.04 + frac * 0.03,
            0.09 + frac * 0.05,
            0.16 + frac * 0.08,
            0.5
        )
        c.setFillColor(col)
        c.rect(0, PAGE_H * (1 - frac - 0.05), PAGE_W, PAGE_H * 0.06, fill=1, stroke=0)

def draw_header_bar(c, slide_num, total=6):
    """Draw the top bar with SIH branding."""
    # Top bar background
    c.setFillColor(BG_CARD)
    c.roundRect(20, PAGE_H - 52, PAGE_W - 40, 38, 6, fill=1, stroke=0)
    
    # Left: ANTARVIK logo text
    c.setFillColor(ACCENT_CYAN)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(35, PAGE_H - 40, "❄  ANTARVIK")
    
    # Center: SIH info
    c.setFillColor(TEXT_SECONDARY)
    c.setFont("Helvetica", 9)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 37, "SMART INDIA HACKATHON 2026  •  SIH26060  •  Smart Automation  •  Software")
    
    # Right: Team + slide num
    c.setFillColor(ACCENT_ICE)
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(PAGE_W - 35, PAGE_H - 37, f"Team Atrangi  |  {slide_num}/{total}")

def draw_footer(c, template_num):
    """Draw footer with template indicator."""
    c.setFillColor(BG_CARD)
    c.roundRect(20, 10, PAGE_W - 40, 28, 6, fill=1, stroke=0)
    
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(35, 20, "Ministry of Earth Sciences / NCPOR  •  PS Category: Software  •  Theme: Smart Automation")
    
    c.setFillColor(ACCENT_CYAN)
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(PAGE_W - 35, 20, f"@SIH Idea Submission — Template {template_num}")

def draw_rounded_rect(c, x, y, w, h, r=8, fill_color=BG_CARD, stroke_color=None, stroke_w=0.5):
    """Draw a rounded rectangle with optional border."""
    c.setFillColor(fill_color)
    if stroke_color:
        c.setStrokeColor(stroke_color)
        c.setLineWidth(stroke_w)
        c.roundRect(x, y, w, h, r, fill=1, stroke=1)
    else:
        c.roundRect(x, y, w, h, r, fill=1, stroke=0)

def draw_tag(c, x, y, text, bg_color=ACCENT_BLUE, text_color=white, font_size=8):
    """Draw a small tag/badge."""
    tw = c.stringWidth(text, "Helvetica-Bold", font_size) + 14
    # bg
    c.setFillColor(Color(bg_color.red, bg_color.green, bg_color.blue, 0.2))
    c.roundRect(x, y - 4, tw, 18, 9, fill=1, stroke=0)
    # text
    c.setFillColor(bg_color)
    c.setFont("Helvetica-Bold", font_size)
    c.drawString(x + 7, y, text)
    return tw

def draw_bullet(c, x, y, text, color=TEXT_SECONDARY, font_size=9, bullet_color=ACCENT_CYAN):
    """Draw a bullet point."""
    c.setFillColor(bullet_color)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x, y, "▪")
    c.setFillColor(color)
    c.setFont("Helvetica", font_size)
    # Wrap text manually
    words = text.split()
    lines = []
    current = ""
    max_w = PAGE_W - x - 60
    for word in words:
        test = current + " " + word if current else word
        if c.stringWidth(test, "Helvetica", font_size) < max_w:
            current = test
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    for i, line in enumerate(lines):
        c.drawString(x + 12, y - i * (font_size + 3), line)
    return len(lines) * (font_size + 3)

def draw_flow_box(c, x, y, w, h, num, icon, title, subtitle, num_color=ACCENT_BLUE, details=None):
    """Draw an architecture flow box with number badge."""
    # Card
    draw_rounded_rect(c, x, y, w, h, r=8, fill_color=BG_CARD_LIGHT, stroke_color=BORDER_GLASS)
    
    # Number badge (top-left)
    c.setFillColor(num_color)
    c.circle(x + 12, y + h - 12, 10, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x + 12, y + h - 15, str(num))
    
    # Icon
    c.setFont("Helvetica", 18)
    c.setFillColor(TEXT_PRIMARY)
    c.drawCentredString(x + w/2, y + h - 32, icon)
    
    # Title
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x + w/2, y + h - 48, title)
    
    # Subtitle
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica", 7)
    c.drawCentredString(x + w/2, y + h - 60, subtitle)
    
    # Details (if provided)
    if details:
        c.setFillColor(TEXT_SECONDARY)
        c.setFont("Helvetica", 6.5)
        # Wrap details text
        words = details.split()
        lines = []
        current = ""
        for word in words:
            test = current + " " + word if current else word
            if c.stringWidth(test, "Helvetica", 6.5) < w - 12:
                current = test
            else:
                lines.append(current)
                current = word
        if current:
            lines.append(current)
        for i, line in enumerate(lines[:3]):
            c.drawCentredString(x + w/2, y + h - 72 - i * 9, line)

def draw_flow_arrow(c, x, y, direction="right"):
    """Draw a flow arrow."""
    c.setStrokeColor(ACCENT_CYAN)
    c.setFillColor(ACCENT_CYAN)
    c.setLineWidth(1.5)
    if direction == "right":
        c.line(x, y, x + 20, y)
        c.drawString(x + 8, y - 4, "→")
    elif direction == "down":
        c.line(x, y, x, y - 15)
        c.setFont("Helvetica", 12)
        c.drawCentredString(x, y - 14, "↓")

def embed_image(c, path, x, y, max_w, max_h):
    """Embed an image with aspect ratio maintained."""
    full_path = os.path.join(SCRIPT_DIR, path)
    if not os.path.exists(full_path):
        # Draw placeholder
        draw_rounded_rect(c, x, y, max_w, max_h, fill_color=BG_CARD)
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 9)
        c.drawCentredString(x + max_w/2, y + max_h/2, f"[Image: {path}]")
        return
    try:
        img = Image.open(full_path)
        iw, ih = img.size
        ratio = min(max_w / iw, max_h / ih)
        dw, dh = iw * ratio, ih * ratio
        # Center
        dx = x + (max_w - dw) / 2
        dy = y + (max_h - dh) / 2
        c.drawImage(full_path, dx, dy, dw, dh, preserveAspectRatio=True, mask='auto')
    except Exception as e:
        draw_rounded_rect(c, x, y, max_w, max_h, fill_color=BG_CARD)
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 8)
        c.drawCentredString(x + max_w/2, y + max_h/2, f"[{path}]")


# ============================================================
# SLIDE 1: TITLE PAGE (Template 1)
# ============================================================
def slide_title(c):
    draw_bg(c)
    
    # SIH header badge
    c.setFillColor(Color(0, 0.83, 1, 0.08))
    c.roundRect(PAGE_W/2 - 140, PAGE_H - 90, 280, 28, 14, fill=1, stroke=0)
    c.setFillColor(ACCENT_CYAN)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(PAGE_W/2, PAGE_H - 80, "SMART INDIA HACKATHON 2026")
    
    # Main title
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 64)
    c.drawCentredString(PAGE_W/2, PAGE_H - 170, "ANTARVIK")
    
    # Subtitle
    c.setFillColor(ACCENT_ICE)
    c.setFont("Helvetica", 16)
    c.drawCentredString(PAGE_W/2, PAGE_H - 200, "Digital Twin for Indian Antarctic Research Stations")
    
    # Etymology
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica-Oblique", 10)
    c.drawCentredString(PAGE_W/2, PAGE_H - 222, 'ANTARctica + VIVEK (विवेक) — Sanskrit for discernment')
    
    # Info cards row
    cards_data = [
        ("Problem Statement", "SIH26060", ACCENT_BLUE),
        ("PS Title", "Digital Platform for efficient remote\nmanagement of Indian Antarctic\nResearch Stations", ACCENT_CYAN),
        ("Theme", "Smart Automation", ACCENT_GREEN),
        ("Category", "Software", ACCENT_ORANGE),
        ("Team Name", "Team Atrangi", ACCENT_PURPLE),
    ]
    
    card_w = 148
    card_h = 80
    total_w = len(cards_data) * card_w + (len(cards_data) - 1) * 10
    start_x = (PAGE_W - total_w) / 2
    card_y = PAGE_H - 340
    
    for i, (label, value, color) in enumerate(cards_data):
        cx = start_x + i * (card_w + 10)
        draw_rounded_rect(c, cx, card_y, card_w, card_h, r=8, fill_color=BG_CARD, stroke_color=BORDER_GLASS)
        
        # Color accent line at top
        c.setFillColor(color)
        c.roundRect(cx + 4, card_y + card_h - 4, card_w - 8, 3, 1.5, fill=1, stroke=0)
        
        # Label
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 7)
        c.drawCentredString(cx + card_w/2, card_y + card_h - 18, label)
        
        # Value
        c.setFillColor(TEXT_PRIMARY)
        if len(value) > 30:
            c.setFont("Helvetica-Bold", 7)
            lines = value.split('\n')
            for j, line in enumerate(lines):
                c.drawCentredString(cx + card_w/2, card_y + card_h - 32 - j * 11, line)
        else:
            c.setFont("Helvetica-Bold", 12)
            c.drawCentredString(cx + card_w/2, card_y + card_h - 38, value)
    
    # Tagline at bottom
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica-Oblique", 10)
    c.drawCentredString(PAGE_W/2, 80, '"From India to the Ice, for a Sustainable Tomorrow"')
    
    # MoES / NCPOR
    c.setFillColor(TEXT_SECONDARY)
    c.setFont("Helvetica", 9)
    c.drawCentredString(PAGE_W/2, 55, "Ministry of Earth Sciences  /  National Centre for Polar and Ocean Research (NCPOR)")
    
    draw_footer(c, 1)


# ============================================================
# SLIDE 2: PROPOSED SOLUTION (Template 2)
# ============================================================
def slide_solution(c):
    draw_bg(c)
    draw_header_bar(c, 2)
    
    # Section title
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(35, PAGE_H - 82, "PROPOSED SOLUTION  •  IDEA / SOLUTION / PROTOTYPE")
    
    # ANTARVIK name box
    draw_rounded_rect(c, 35, PAGE_H - 130, 200, 35, fill_color=BG_CARD, stroke_color=ACCENT_CYAN, stroke_w=1)
    c.setFillColor(ACCENT_CYAN)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, PAGE_H - 122, "ANTARVIK")
    c.setFillColor(TEXT_SECONDARY)
    c.setFont("Helvetica", 8)
    c.drawString(135, PAGE_H - 120, "Digital Twin")
    
    # Description
    c.setFillColor(TEXT_SECONDARY)
    c.setFont("Helvetica", 9)
    c.drawString(245, PAGE_H - 118, "An operator-facing digital twin of Maitri & Bharati stations")
    c.drawString(245, PAGE_H - 130, "Four domains — infrastructure, energy, logistics, environment — fused in ONE coupled model, not four dashboards.")
    
    # ===== COUPLING CHAIN =====
    draw_tag(c, 35, PAGE_H - 158, "THE COUPLING THAT MAKES IT A TWIN, NOT A DASHBOARD — LIVE DEMO CHAIN", bg_color=ACCENT_RED, font_size=7)
    
    chain_y = PAGE_H - 230
    chain_items = [
        ("🌡️", "Outside temp\ndrops −10°C"),
        ("🔥", "Heating load\nspikes"),
        ("⛽", "Diesel burn\nrate climbs"),
        ("📅", "Fuel-out date\nmoves earlier"),
        ("🚢", "Crosses resupply\nwindow"),
        ("🚨", "RED ALERT +\naction plan"),
    ]
    
    cw = 105
    ch = 55
    gap = 18
    total_chain = len(chain_items) * cw + (len(chain_items) - 1) * gap
    cx_start = (PAGE_W - total_chain) / 2
    
    for i, (icon, text) in enumerate(chain_items):
        cx = cx_start + i * (cw + gap)
        is_alert = (i == len(chain_items) - 1)
        fill = HexColor("#2a1520") if is_alert else BG_CARD_LIGHT
        border = ACCENT_RED if is_alert else BORDER_GLASS
        draw_rounded_rect(c, cx, chain_y, cw, ch, fill_color=fill, stroke_color=border)
        
        c.setFont("Helvetica", 16)
        c.setFillColor(TEXT_PRIMARY)
        c.drawCentredString(cx + cw/2, chain_y + ch - 18, icon)
        
        c.setFont("Helvetica", 7)
        c.setFillColor(TEXT_SECONDARY if not is_alert else ACCENT_RED)
        lines = text.split('\n')
        for j, line in enumerate(lines):
            c.drawCentredString(cx + cw/2, chain_y + ch - 32 - j * 9, line)
        
        # Arrow
        if i < len(chain_items) - 1:
            c.setFillColor(ACCENT_CYAN)
            c.setFont("Helvetica-Bold", 14)
            c.drawCentredString(cx + cw + gap/2, chain_y + ch/2 - 3, "→")
    
    # ===== THREE COLUMNS: What / How / Innovation =====
    col_w = (PAGE_W - 80) / 3
    col_y = 50
    col_h = PAGE_H - 255
    
    cols_data = [
        ("1  WHAT IT IS", ACCENT_BLUE, [
            "Federated, edge-first twin of both stations — one registry, more stations plug in",
            "Four subsystem twins joined by a cross-domain coupling engine (physics + ML)",
            "Five layers: asset → telemetry → model → analytics → decision",
            "Operator console: alerts, work orders, resupply plans, full-season replay",
            "Synthetic telemetry built from documented station specs, with adapters for real NCPOR feeds",
        ]),
        ("2  HOW IT SOLVES THE PROBLEM", ACCENT_GREEN, [
            "NCPOR Goa has zero live view of fuel, power, stores or building health, 4,000 km away",
            "Predicts winter shortfalls months ahead of the single annual resupply window",
            "Keeps working through satellite blackouts: Connected → Degraded → Recovery",
            "Unifies NCPOR's existing silos (Bharati-TIMES, itinerary tools) into one layer",
            "Sensing in Antarctica is already mature — the unsolved problem is integration",
        ]),
        ("3  INNOVATION & UNIQUENESS", ACCENT_PURPLE, [
            "Born-Digital Maitri II: ₹2,000 cr DPR being written now — twin ships with the station, sensors pre-build",
            "Winter-Over Risk Index: fuel margin + food-days + medical stores + power redundancy as one forecast score",
            "Sea-ice-aware resupply router: ice delays → auto-recompute winter margins + airlift shortlist",
            "Degraded-mode governance: twin honestly drops to a shadow, then forensic replay on reconnect",
            "LLM ops-copilot: explains alerts, drafts work orders, answers 'what if genset fails in winter?'",
        ]),
    ]
    
    for i, (title, color, bullets) in enumerate(cols_data):
        cx = 35 + i * (col_w + 5)
        draw_rounded_rect(c, cx, col_y, col_w - 5, col_h, fill_color=BG_CARD, stroke_color=BORDER_GLASS)
        
        # Title bar
        c.setFillColor(color)
        c.roundRect(cx, col_y + col_h - 3, col_w - 5, 3, 1, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(cx + 10, col_y + col_h - 18, title)
        
        # Bullets
        by = col_y + col_h - 35
        for bullet in bullets:
            c.setFillColor(ACCENT_CYAN)
            c.setFont("Helvetica", 6)
            c.drawString(cx + 10, by, "▪")
            c.setFillColor(TEXT_SECONDARY)
            c.setFont("Helvetica", 7.5)
            # Word wrap
            words = bullet.split()
            lines = []
            current = ""
            for word in words:
                test = current + " " + word if current else word
                if c.stringWidth(test, "Helvetica", 7.5) < col_w - 35:
                    current = test
                else:
                    lines.append(current)
                    current = word
            if current:
                lines.append(current)
            for j, line in enumerate(lines):
                c.drawString(cx + 20, by - j * 10, line)
            by -= len(lines) * 10 + 6
    
    draw_footer(c, 2)


# ============================================================
# SLIDE 3: TECHNICAL APPROACH (Template 3) — SYSTEM ARCHITECTURE
# ============================================================
def slide_technical(c):
    draw_bg(c)
    draw_header_bar(c, 3)
    
    # Section title
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(35, PAGE_H - 82, "TECHNICAL APPROACH")
    
    # Two-column layout like the reference image
    # LEFT: Technology Stack | RIGHT: System Architecture
    
    left_w = 240
    right_w = PAGE_W - left_w - 65
    content_y = 46
    content_h = PAGE_H - 135
    
    # ===== LEFT COLUMN: TECHNOLOGY STACK =====
    draw_tag(c, 35, PAGE_H - 108, "TECHNOLOGY STACK", bg_color=ACCENT_BLUE, font_size=8)
    
    tech_items = [
        ("🌐", "3D Twin & UI", "Three.js · React · Recharts\nDashboards, 3D station viewer, operator console", ACCENT_CYAN),
        ("📡", "Data Transmission", "MQTT with Mosquitto (JSON)\nQoS for satellite links, topic-based routing", ACCENT_BLUE),
        ("⚙️", "Backend", "Python (FastAPI) · Pydantic v2\nTimescaleDB · Redis 7 · WebSocket", ACCENT_GREEN),
        ("🤖", "AI / Analytics", "Prophet · Isolation Forest · LSTM\nRAG-based LLM ops-copilot", ACCENT_PURPLE),
        ("🔗", "Coupling Engine", "Physics + ML cross-domain\nBattery SOC/SOH, microgrid dispatch, RUL", ACCENT_ORANGE),
        ("🐳", "Deployment", "Docker Compose · Nginx\n100% offline, <5 min cold start", ACCENT_RED),
    ]
    
    ty = PAGE_H - 130
    for icon, title, desc, color in tech_items:
        # Color bar
        c.setFillColor(color)
        c.roundRect(37, ty - 2, 3, 52, 1.5, fill=1, stroke=0)
        
        # Icon
        c.setFont("Helvetica", 14)
        c.setFillColor(TEXT_PRIMARY)
        c.drawString(46, ty + 28, icon)
        
        # Title
        c.setFillColor(TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(65, ty + 32, title)
        
        # Description
        c.setFillColor(TEXT_SECONDARY)
        c.setFont("Helvetica", 7)
        lines = desc.split('\n')
        for j, line in enumerate(lines):
            c.drawString(65, ty + 18 - j * 10, line)
        
        ty -= 68
    
    # ===== RIGHT COLUMN: SYSTEM ARCHITECTURE FLOW =====
    rx = left_w + 45
    draw_tag(c, rx, PAGE_H - 108, "SYSTEM ARCHITECTURE", bg_color=ACCENT_GREEN, font_size=8)
    
    # Flow diagram boxes
    box_w = 130
    box_h = 72
    gap_h = 22  # horizontal gap for arrows
    gap_v = 16  # vertical gap
    
    # Row 1: Sensors → Data Ingest → Backend → Database
    row1_y = PAGE_H - 200
    row1_items = [
        (1, "📡", "SENSORS / IoT", "Simulated station sensors\nTemp, wind, power, fuel,\nstructural monitors", ACCENT_BLUE),
        (2, "📨", "DATA INGEST", "MQTT Protocol (JSON)\nESP32 / edge gateway\nCompressed satellite uplink", ACCENT_CYAN),
        (3, "⚙️", "BACKEND", "Receives & validates\nFastAPI + Pydantic\nExposes REST + WS APIs", ACCENT_GREEN),
        (4, "🗄️", "DATABASE", "TimescaleDB hypertables\nRedis live-state cache\nHistorical + real-time", ACCENT_PURPLE),
    ]
    
    for i, (num, icon, title, desc, color) in enumerate(row1_items):
        bx = rx + i * (box_w + gap_h)
        draw_flow_box(c, bx, row1_y, box_w, box_h, num, icon, title, desc.split('\n')[0], color)
        
        # Detail lines inside
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 6)
        dlines = desc.split('\n')
        for j, dl in enumerate(dlines[1:]):
            c.drawCentredString(bx + box_w/2, row1_y + 12 - j * 8, dl)
        
        # Arrow to next
        if i < len(row1_items) - 1:
            ax = bx + box_w + 2
            c.setFillColor(ACCENT_CYAN)
            c.setFont("Helvetica-Bold", 14)
            c.drawCentredString(ax + gap_h/2, row1_y + box_h/2 - 3, "→")
    
    # Down arrows
    c.setFillColor(ACCENT_CYAN)
    c.setFont("Helvetica-Bold", 14)
    down_y = row1_y - 4
    c.drawCentredString(rx + box_w/2, down_y, "↓")
    c.drawCentredString(rx + 3 * (box_w + gap_h) + box_w/2, down_y, "↓")
    
    # Row 2: Coupling Engine → Analytics & AI → Decision Layer → Operator Console
    row2_y = row1_y - box_h - gap_v - 15
    row2_items = [
        (5, "🔗", "COUPLING ENGINE", "Cross-domain physics\nEnv→Thermal→Fuel→Logistics\nHOMER-calibrated", ACCENT_ORANGE),
        (6, "🧠", "ANALYTICS & AI", "Prophet forecasting\nAnomaly detection\nHybrid RUL estimation", ACCENT_RED),
        (7, "🎯", "DECISION LAYER", "Cascading alerts\nWork orders · Risk Index\nLLM ops-copilot (RAG)", ACCENT_GOLD),
        (8, "🖥️", "OPERATOR CONSOLE", "React + Three.js\nDashboards · 3D twin\nProvenance tooltips", ACCENT_BLUE),
    ]
    
    for i, (num, icon, title, desc, color) in enumerate(row2_items):
        bx = rx + i * (box_w + gap_h)
        draw_flow_box(c, bx, row2_y, box_w, box_h, num, icon, title, desc.split('\n')[0], color)
        
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 6)
        dlines = desc.split('\n')
        for j, dl in enumerate(dlines[1:]):
            c.drawCentredString(bx + box_w/2, row2_y + 12 - j * 8, dl)
        
        if i < len(row2_items) - 1:
            ax = bx + box_w + 2
            c.setFillColor(ACCENT_CYAN)
            c.setFont("Helvetica-Bold", 14)
            c.drawCentredString(ax + gap_h/2, row2_y + box_h/2 - 3, "→")
    
    # Feedback loop at bottom
    loop_y = row2_y - 28
    c.setStrokeColor(ACCENT_GREEN)
    c.setDash(4, 3)
    c.setLineWidth(1)
    loop_left = rx + 20
    loop_right = rx + 4 * (box_w + gap_h) - gap_h + box_w - 20
    c.line(loop_left, loop_y + 5, loop_right, loop_y + 5)
    c.setDash()
    
    c.setFillColor(ACCENT_GREEN)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString((loop_left + loop_right) / 2, loop_y - 5,
        "🔄 Continuous monitoring  •  Edge/Cloud sync  •  Connected → Degraded → Recovery modes")
    
    # WHERE THE DATA COMES FROM box
    dbox_y = loop_y - 42
    draw_rounded_rect(c, rx, dbox_y, right_w - 20, 32, fill_color=BG_CARD, stroke_color=ACCENT_ORANGE, stroke_w=0.8)
    c.setFillColor(ACCENT_ORANGE)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(rx + 8, dbox_y + 18, "WHERE THE DATA COMES FROM:")
    c.setFillColor(TEXT_SECONDARY)
    c.setFont("Helvetica", 7)
    c.drawString(rx + 8, dbox_y + 6,
        "No dataset ships with this PS. We generate physics-plausible telemetry calibrated to published studies — adapter layer ready for real NCPOR feeds.")
    
    # THREE OPERATING MODES box at very bottom
    modes_y = dbox_y - 42
    mode_w = (right_w - 30) / 3
    modes = [
        ("CONNECTED", "Live two-way sync. Full twin\nfidelity; analytics available.", ACCENT_GREEN),
        ("DEGRADED", "Link down. Edge autonomy;\ntwin drops to digital shadow.", ACCENT_ORANGE),
        ("RECOVERY", "Store-and-forward sync;\nconflict review, forensic replay.", ACCENT_BLUE),
    ]
    
    for i, (title, desc, color) in enumerate(modes):
        mx = rx + i * (mode_w + 5)
        draw_rounded_rect(c, mx, modes_y, mode_w, 34, fill_color=BG_CARD, stroke_color=color, stroke_w=0.8)
        
        # Status dot
        c.setFillColor(color)
        c.circle(mx + 10, modes_y + 24, 3, fill=1, stroke=0)
        
        c.setFont("Helvetica-Bold", 7)
        c.drawString(mx + 18, modes_y + 21, title)
        
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 6)
        for j, line in enumerate(desc.split('\n')):
            c.drawString(mx + 8, modes_y + 10 - j * 8, line)
    
    draw_footer(c, 3)


# ============================================================
# SLIDE 4: FEASIBILITY AND VIABILITY (Template 4)
# ============================================================
def slide_feasibility(c):
    draw_bg(c)
    draw_header_bar(c, 4)
    
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(35, PAGE_H - 82, "FEASIBILITY AND VIABILITY")
    
    # Two columns: Left = Feasibility | Right = Challenges
    mid = PAGE_W / 2 + 10
    
    # ===== LEFT: FEASIBILITY =====
    draw_tag(c, 35, PAGE_H - 108, "FEASIBILITY OF THE IDEA", bg_color=ACCENT_GREEN, font_size=8)
    
    # Technically Buildable
    c.setFillColor(ACCENT_GREEN)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(35, PAGE_H - 135, "TECHNICALLY BUILDABLE")
    
    left_bullets = [
        "Fully open-source stack, no exotic hardware — one edge box on station, one server at NCPOR",
        "Hackathon MVP: coupling engine + two live scenarios + degraded-mode failover",
    ]
    by = PAGE_H - 152
    for b in left_bullets:
        h = draw_bullet(c, 40, by, b, font_size=8)
        by -= h + 4
    
    # Calibrated stats
    c.setFillColor(ACCENT_CYAN)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(35, by - 8, "CALIBRATED, NOT GUESSED")
    by -= 24
    
    # Stats row
    stats = [
        ("170 kW", "station load"),
        ("124K gal/yr", "diesel baseline"),
        ("96%", "fuel saving"),
        ("3×240 kVA", "gensets"),
        ("40%", "CHP heat"),
        ("+1.8%", "HOMER dev."),
    ]
    
    sw = 62
    for i, (val, label) in enumerate(stats):
        sx = 40 + i * (sw + 4)
        draw_rounded_rect(c, sx, by - 30, sw, 30, fill_color=BG_CARD_LIGHT)
        c.setFillColor(ACCENT_CYAN)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(sx + sw/2, by - 10, val)
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 6)
        c.drawCentredString(sx + sw/2, by - 22, label)
    
    by -= 42
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica-Oblique", 7)
    c.drawString(40, by, "Sources: NREL REopt South Pole · Comandante Ferraz Brazilian Antarctic Station energy study")
    
    # Institutionally Viable
    by -= 18
    c.setFillColor(ACCENT_GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(35, by, "INSTITUTIONALLY VIABLE")
    by -= 16
    
    inst_bullets = [
        "Adapter layer ingests real NCPOR feeds (Bharati-TIMES, met, station WiFi) with no re-architecture",
        "Maitri II DPR is being drafted now — ₹29.2 cr sanctioned — sensor spec can go in before construction",
        "Cheaper and more sovereign than Siemens/Bentley suites, which ship no polar logistics couplings",
    ]
    for b in inst_bullets:
        h = draw_bullet(c, 40, by, b, font_size=7.5)
        by -= h + 3
    
    # ===== RIGHT: CHALLENGES =====
    draw_tag(c, mid, PAGE_H - 108, "POTENTIAL CHALLENGES, RISKS → OUR STRATEGY", bg_color=ACCENT_ORANGE, font_size=7)
    
    challenges = [
        ("No dataset released by NCPOR", "Physics-calibrated synthetic generators, labelled honestly; live-feed adapters ready from day one", ACCENT_RED),
        ("Iridium-class link: minutes of bandwidth", "Edge-first design, compressed delta sync, Degraded mode keeps the station autonomous", ACCENT_ORANGE),
        ("Sparse failure history breaks pure-ML", "Hybrid physics + AI RUL, so physics carries the model where data is thin", ACCENT_PURPLE),
        ("Twin drifts out of step with real station", "Time-discrepancy monitoring (Frasheri 2023) and recalibration on every Recovery sync", ACCENT_BLUE),
        ("Automation in life-critical setting", "Human-in-the-loop throughout; closed-loop control only in Phase 4, bounded and supervised", ACCENT_GREEN),
        ("Cyber exposure and data sovereignty", "On-prem at NCPOR, signed device onboarding, RBAC, local audit logs that survive an outage", ACCENT_CYAN),
    ]
    
    cy = PAGE_H - 135
    for challenge, strategy, color in challenges:
        draw_rounded_rect(c, mid, cy - 4, PAGE_W - mid - 35, 42, fill_color=BG_CARD, stroke_color=BORDER_GLASS)
        
        # Challenge (bold)
        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(mid + 8, cy + 22, "⚠ " + challenge)
        
        # Strategy
        c.setFillColor(TEXT_SECONDARY)
        c.setFont("Helvetica", 7)
        # Word wrap
        words = ("→ " + strategy).split()
        lines = []
        current = ""
        maxw = PAGE_W - mid - 55
        for word in words:
            test = current + " " + word if current else word
            if c.stringWidth(test, "Helvetica", 7) < maxw:
                current = test
            else:
                lines.append(current)
                current = word
        if current:
            lines.append(current)
        for j, line in enumerate(lines[:2]):
            c.drawString(mid + 8, cy + 10 - j * 9, line)
        
        cy -= 50
    
    # ===== PHASED ROADMAP (bottom) =====
    road_y = 50
    road_h = 55
    draw_tag(c, 35, road_y + road_h + 10, "PHASED ROADMAP — STAGED ADOPTION, NOT A BIG-BANG ROLLOUT", bg_color=ACCENT_PURPLE, font_size=7)
    
    phases = [
        ("PHASE 1", "Monitoring\nfoundation", "Ingest, historian,\nlive station state", ACCENT_BLUE, "✅ SIH"),
        ("PHASE 2", "Decision\nsupport", "Dashboards, alerts,\nwork orders", ACCENT_CYAN, "✅ SIH"),
        ("PHASE 3", "Predictive &\nscenario", "Forecasting, what-if,\nrisk index", ACCENT_GREEN, "✅ SIH"),
        ("PHASE 4", "Supervised\nclosed loop", "Bounded control,\nhuman-in-loop", ACCENT_PURPLE, "🔜 Future"),
    ]
    
    pw = (PAGE_W - 80) / 4
    for i, (num, title, desc, color, scope) in enumerate(phases):
        px = 35 + i * (pw + 5)
        draw_rounded_rect(c, px, road_y, pw, road_h, fill_color=BG_CARD, stroke_color=BORDER_GLASS)
        
        # Top accent
        c.setFillColor(color)
        c.roundRect(px, road_y + road_h - 3, pw, 3, 1, fill=1, stroke=0)
        
        c.setFont("Helvetica-Bold", 7)
        c.drawString(px + 6, road_y + road_h - 15, num)
        
        c.setFillColor(TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 8)
        for j, line in enumerate(title.split('\n')):
            c.drawString(px + 6, road_y + road_h - 26 - j * 9, line)
        
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 6.5)
        for j, line in enumerate(desc.split('\n')):
            c.drawString(px + 6, road_y + 14 - j * 8, line)
        
        # Scope badge
        is_sih = "SIH" in scope and "✅" in scope
        badge_color = ACCENT_BLUE if is_sih else ACCENT_PURPLE
        c.setFillColor(Color(badge_color.red, badge_color.green, badge_color.blue, 0.2))
        c.roundRect(px + pw - 42, road_y + 4, 38, 12, 3, fill=1, stroke=0)
        c.setFillColor(badge_color)
        c.setFont("Helvetica-Bold", 6)
        c.drawCentredString(px + pw - 23, road_y + 7, scope)
    
    draw_footer(c, 4)


# ============================================================
# SLIDE 5: IMPACT AND BENEFITS (Template 5)
# ============================================================
def slide_impact(c):
    draw_bg(c)
    draw_header_bar(c, 5)
    
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(35, PAGE_H - 82, "IMPACT AND BENEFITS")
    
    # ===== Top stat cards =====
    top_stats = [
        ("₹2,000 cr", "Maitri II rebuild approved Oct 2025\n— a station the twin can be born with", ACCENT_GOLD),
        ("96%", "Diesel displacement achievable at a\npolar station with PV + wind + battery", ACCENT_GREEN),
        ("1/year", "Resupply window — one missed item\ncosts a whole wintering season", ACCENT_ORANGE),
        ("4,000 km", "Between NCPOR Goa and two stations\nit currently manages with no live view", ACCENT_RED),
    ]
    
    tsw = (PAGE_W - 90) / 4
    tsy = PAGE_H - 140
    for i, (val, desc, color) in enumerate(top_stats):
        tsx = 35 + i * (tsw + 8)
        draw_rounded_rect(c, tsx, tsy, tsw, 48, fill_color=BG_CARD, stroke_color=color, stroke_w=0.8)
        
        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(tsx + 10, tsy + 26, val)
        
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 6.5)
        for j, line in enumerate(desc.split('\n')):
            c.drawString(tsx + 10, tsy + 14 - j * 8, line)
    
    # ===== Benefits 4-column =====
    draw_tag(c, 35, tsy - 18, "BENEFITS OF THE SOLUTION", bg_color=ACCENT_BLUE, font_size=8)
    
    benefits = [
        ("OPERATIONAL", ACCENT_BLUE, [
            "Live view of fuel, power, stores & structural health across the whole station",
            "Failures forecast rather than discovered mid-winter",
            "Operations continue through satellite blackouts",
            "Winter-Over Risk Index gives station leader one number to act on",
        ]),
        ("ECONOMIC", ACCENT_GREEN, [
            "Lower diesel spend & fewer emergency airlifts",
            "Optimal cargo manifest — less dead weight on the annual voyage",
            "Condition-based maintenance extends life of imported assets",
            "One framework amortised across stations, and later polar vessels",
        ]),
        ("ENVIRONMENTAL", ACCENT_CYAN, [
            "Renewable utilisation up, diesel litres & CO₂ down",
            "Auto-generated Antarctic Treaty and CCAMLR compliance reporting",
            "Spill, waste & emissions risk tracked continuously",
            "Supports net-zero polar operations, the direction BAS has already set",
        ]),
        ("STRATEGIC & NATIONAL", ACCENT_GOLD, [
            "UK (BAS PolarDT) & EU (ESA 4DAntarctica) have polar twins; India has none",
            "Maitri II handed over BIM-native instead of retrofitted years later",
            "Replicates to Himadri in the Arctic and to polar research vessels",
            "Builds indigenous polar-ops capability inside MoES and NCPOR",
        ]),
    ]
    
    bcw = (PAGE_W - 90) / 4
    bcy = tsy - 32
    bch = 180
    
    for i, (title, color, items) in enumerate(benefits):
        bx = 35 + i * (bcw + 8)
        draw_rounded_rect(c, bx, bcy - bch, bcw, bch, fill_color=BG_CARD, stroke_color=BORDER_GLASS)
        
        # Color bar
        c.setFillColor(color)
        c.roundRect(bx, bcy - 3, bcw, 3, 1, fill=1, stroke=0)
        
        c.setFont("Helvetica-Bold", 8)
        c.drawString(bx + 8, bcy - 16, title)
        
        iy = bcy - 30
        for item in items:
            c.setFillColor(ACCENT_CYAN)
            c.setFont("Helvetica", 5)
            c.drawString(bx + 8, iy, "▪")
            c.setFillColor(TEXT_SECONDARY)
            c.setFont("Helvetica", 7)
            # Word wrap
            words = item.split()
            lines = []
            current = ""
            for word in words:
                test = current + " " + word if current else word
                if c.stringWidth(test, "Helvetica", 7) < bcw - 25:
                    current = test
                else:
                    lines.append(current)
                    current = word
            if current:
                lines.append(current)
            for j, line in enumerate(lines):
                c.drawString(bx + 16, iy - j * 9, line)
            iy -= len(lines) * 9 + 5
    
    # ===== WHO BENEFITS + KPIs =====
    bot_y = 50
    bot_h = 58
    hw = (PAGE_W - 80) / 2
    
    # WHO BENEFITS
    draw_rounded_rect(c, 35, bot_y, hw, bot_h, fill_color=BG_CARD, stroke_color=BORDER_GLASS)
    c.setFillColor(ACCENT_ICE)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(45, bot_y + bot_h - 14, "WHO BENEFITS")
    
    who = [
        "NCPOR and MoES programme managers in Goa",
        "Station leader, engineers and the wintering crew",
        "Logistics and resupply planners for the annual voyage",
        "Maitri II DPR architects and MoES decision-makers",
    ]
    wy = bot_y + bot_h - 28
    for w in who:
        c.setFillColor(ACCENT_CYAN)
        c.setFont("Helvetica", 5)
        c.drawString(48, wy, "▪")
        c.setFillColor(TEXT_SECONDARY)
        c.setFont("Helvetica", 7)
        c.drawString(56, wy, w)
        wy -= 11
    
    # KPIs
    draw_rounded_rect(c, 35 + hw + 10, bot_y, hw, bot_h, fill_color=BG_CARD, stroke_color=BORDER_GLASS)
    c.setFillColor(ACCENT_ICE)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(35 + hw + 20, bot_y + bot_h - 14, "KPIs THE PLATFORM MOVES")
    
    kpis = [
        "Unplanned downtime down · asset availability up",
        "Renewable utilisation up · diesel litres and CO₂ down",
        "Forecast accuracy on load, weather and stock depletion",
        "Inventory visibility, lead time, data availability under a degraded link",
    ]
    ky = bot_y + bot_h - 28
    for k in kpis:
        c.setFillColor(ACCENT_CYAN)
        c.setFont("Helvetica", 5)
        c.drawString(35 + hw + 23, ky, "▪")
        c.setFillColor(TEXT_SECONDARY)
        c.setFont("Helvetica", 7)
        c.drawString(35 + hw + 31, ky, k)
        ky -= 11
    
    draw_footer(c, 5)


# ============================================================
# SLIDE 6: RESEARCH AND REFERENCES (Template 6)
# ============================================================
def slide_references(c):
    draw_bg(c)
    draw_header_bar(c, 6)
    
    c.setFillColor(TEXT_PRIMARY)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(35, PAGE_H - 82, "RESEARCH AND REFERENCES")
    
    # ===== PRIOR ART COMPARISON =====
    draw_tag(c, 35, PAGE_H - 108, "PRIOR ART — AND THE GAP WE FILL", bg_color=ACCENT_ORANGE, font_size=8)
    
    prior_arts = [
        ("BAS PolarDT", "UK 🇬🇧", "Twins of Antarctic stations and ships,\nIceNet sea-ice forecasting, PolarRoute\nship routing.", "Not deployed as an integrated\nstation-operations platform.", ACCENT_BLUE),
        ("ESA 4DAntarctica", "EU 🇪🇺 · €1.35M", "Digital Twin of Antarctica for ice-sheet\nhydrology, under Digital Twin Earth.", "Continent-scale science,\nnot station operations.", ACCENT_PURPLE),
        ("NavVis / Polarstern", "AWI 🇩🇪", "Walkable 3D digital twin of a polar\nresearch vessel used for logistics\nplanning.", "Geometry and logistics only;\nno energy or condition coupling.", ACCENT_GREEN),
        ("NCPOR In-house", "India 🇮🇳", "Bharati-TIMES life-support issue\ntracking, station WiFi, expedition\nitinerary tools.", "Useful but siloed — no cross-\ndomain twin sits above them.", ACCENT_ORANGE),
    ]
    
    paw = (PAGE_W - 90) / 4
    pay = PAGE_H - 130
    pah = 120
    
    for i, (name, org, desc, gap, color) in enumerate(prior_arts):
        px = 35 + i * (paw + 8)
        draw_rounded_rect(c, px, pay - pah, paw, pah, fill_color=BG_CARD, stroke_color=BORDER_GLASS)
        
        c.setFillColor(color)
        c.roundRect(px, pay - 3, paw, 3, 1, fill=1, stroke=0)
        
        c.setFillColor(TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(px + paw/2, pay - 18, name)
        
        c.setFillColor(ACCENT_CYAN)
        c.setFont("Helvetica", 7)
        c.drawCentredString(px + paw/2, pay - 30, org)
        
        c.setFillColor(TEXT_SECONDARY)
        c.setFont("Helvetica", 6.5)
        for j, line in enumerate(desc.split('\n')):
            c.drawCentredString(px + paw/2, pay - 44 - j * 9, line)
        
        # Gap label
        c.setFillColor(Color(ACCENT_ORANGE.red, ACCENT_ORANGE.green, ACCENT_ORANGE.blue, 0.15))
        gap_lines = gap.split('\n')
        c.roundRect(px + 6, pay - pah + 6, paw - 12, 10 + len(gap_lines) * 8, 4, fill=1, stroke=0)
        c.setFillColor(ACCENT_ORANGE)
        c.setFont("Helvetica-Bold", 6)
        for j, line in enumerate(gap_lines):
            c.drawCentredString(px + paw/2, pay - pah + 12 + (len(gap_lines) - 1 - j) * 8, line)
    
    # Central statement
    stmt_y = pay - pah - 28
    draw_rounded_rect(c, 35, stmt_y, PAGE_W - 70, 22, fill_color=BG_CARD_LIGHT, stroke_color=ACCENT_CYAN, stroke_w=0.5)
    c.setFillColor(ACCENT_ICE)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(PAGE_W/2, stmt_y + 7,
        "No published work unifies met, power & facility telemetry in a single Antarctic station twin. Sensing is mature — integration is the open problem. That's where ANTARVIK sits.")
    
    # ===== REFERENCES =====
    ref_y = stmt_y - 18
    col_w = (PAGE_W - 80) / 2
    
    draw_tag(c, 35, ref_y, "DIGITAL TWINS & POLAR OPERATIONS", bg_color=ACCENT_BLUE, font_size=7)
    draw_tag(c, 35 + col_w + 10, ref_y, "ANTARCTIC ENERGY, LOGISTICS & STATION DATA", bg_color=ACCENT_GREEN, font_size=7)
    
    left_refs = [
        "Spasova, D. (2023). Digital Twin and Polar Digital Space in Antarctica. SPIE Proceedings.",
        "British Antarctic Survey — PolarDT; IceNet six-month sea-ice forecasting; PolarRoute. bas.ac.uk",
        "ESA 4DAntarctica — Digital Twin Earth programme, University of Edinburgh. 4dantarctica.org",
        "NavVis / AWI — digital twin of RV Polarstern for logistics planning.",
        "Zhang et al. (2021). Economic dispatch for an Antarctic station microgrid.",
        "Frasheri, M. et al. (2023). Time discrepancy between a digital twin and its physical counterpart.",
        "Lin et al. (2021). Remote monitoring platform for an Antarctic greenhouse — direct precedent.",
        "Williams et al. (2026). Digital twin + LLM for cross-domain predictive maintenance. Computers & IE.",
    ]
    
    right_refs = [
        "NREL REopt — South Pole Station: 170 kW load, 124,000 gal/yr diesel; PV + wind + battery → 96% fuel saving, 2–4 yr payback.",
        "Comandante Ferraz, Brazilian Antarctic Station — 3×240 kVA gensets (duty/redundancy/emergency), CHP 40% exhaust heat; HOMER +1.8%.",
        "Sensors (2021) — bandwidth-constrained Antarctic telemetry sensor networks.",
        "MoES / PIB — Maitri II approved 15 Oct 2025, ₹2,000 cr, solar + wind hybrid, completion ~2032. ₹29.2 cr sanctioned for DPR.",
        "45th Indian Scientific Expedition to Antarctica (ISEA) — departed Oct 31, 2025; reached Maitri Nov 4, 2025.",
        "NCPOR — Bharati-TIMES, station WiFi, expedition management tools.",
    ]
    
    ry = ref_y - 18
    for ref in left_refs:
        c.setFillColor(ACCENT_BLUE)
        c.setFont("Helvetica", 5)
        c.drawString(40, ry, "▪")
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 6.5)
        # Wrap
        words = ref.split()
        lines = []
        current = ""
        for word in words:
            test = current + " " + word if current else word
            if c.stringWidth(test, "Helvetica", 6.5) < col_w - 20:
                current = test
            else:
                lines.append(current)
                current = word
        if current:
            lines.append(current)
        for j, line in enumerate(lines):
            c.drawString(48, ry - j * 8, line)
        ry -= len(lines) * 8 + 3
    
    ry2 = ref_y - 18
    for ref in right_refs:
        rx = 35 + col_w + 10
        c.setFillColor(ACCENT_GREEN)
        c.setFont("Helvetica", 5)
        c.drawString(rx + 5, ry2, "▪")
        c.setFillColor(TEXT_MUTED)
        c.setFont("Helvetica", 6.5)
        words = ref.split()
        lines = []
        current = ""
        for word in words:
            test = current + " " + word if current else word
            if c.stringWidth(test, "Helvetica", 6.5) < col_w - 20:
                current = test
            else:
                lines.append(current)
                current = word
        if current:
            lines.append(current)
        for j, line in enumerate(lines):
            c.drawString(rx + 13, ry2 - j * 8, line)
        ry2 -= len(lines) * 8 + 3
    
    # Standards footer
    std_y = 46
    draw_rounded_rect(c, 35, std_y, PAGE_W - 70, 18, fill_color=BG_CARD)
    c.setFillColor(TEXT_MUTED)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawCentredString(PAGE_W/2, std_y + 5,
        "STANDARDS & FRAMEWORKS:  ISO 23247 digital-twin reference  ·  IEC 62443 OT/edge security  ·  Antarctic Treaty System  ·  CCAMLR  ·  MoES / NCPOR expedition SOPs")
    
    draw_footer(c, 6)


# ============================================================
# MAIN: GENERATE PDF
# ============================================================
def main():
    output_path = os.path.join(SCRIPT_DIR, OUTPUT)
    c = canvas.Canvas(output_path, pagesize=landscape(A4))
    c.setTitle("ANTARVIK — SIH 2026 | Team Atrangi | SIH26060")
    c.setAuthor("Team Atrangi")
    c.setSubject("Digital Twin Platform for Indian Antarctic Research Stations")
    
    # Slide 1: Title
    slide_title(c)
    c.showPage()
    
    # Slide 2: Proposed Solution
    slide_solution(c)
    c.showPage()
    
    # Slide 3: Technical Approach (System Architecture)
    slide_technical(c)
    c.showPage()
    
    # Slide 4: Feasibility and Viability
    slide_feasibility(c)
    c.showPage()
    
    # Slide 5: Impact and Benefits
    slide_impact(c)
    c.showPage()
    
    # Slide 6: Research and References
    slide_references(c)
    c.showPage()
    
    c.save()
    print(f"\n✅ PDF generated: {output_path}")
    print(f"   File size: {os.path.getsize(output_path) / 1024:.1f} KB")
    print(f"   Pages: 6 (SIH Standard Template 1-6)")

if __name__ == "__main__":
    main()
