#!/usr/bin/env python3
"""
Car 03 Direction A2 Production Asset Kit Builder
Generates all separated modular carriage layers, character sprite sheets,
scanner unit assets, asset manifest, production notes, and 960x600 proof sheets.
"""

import os
import json
import math
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont

OUTPUT_DIR = "outputs/car03-a2-production-assets"
CHAR_DIR = os.path.join(OUTPUT_DIR, "characters")
CARRIAGE_DIR = os.path.join(OUTPUT_DIR, "carriage")
SCANNER_DIR = os.path.join(OUTPUT_DIR, "scanner")
PROOFS_DIR = os.path.join(OUTPUT_DIR, "proofs")

os.makedirs(CHAR_DIR, exist_ok=True)
os.makedirs(CARRIAGE_DIR, exist_ok=True)
os.makedirs(SCANNER_DIR, exist_ok=True)
os.makedirs(PROOFS_DIR, exist_ok=True)

# -----------------------------------------------------------------------------
# Color Palette Definitions (CAR Palette from src/art/colors.js)
# -----------------------------------------------------------------------------
COLOR_HERO_BASE = (223, 231, 242, 255)     # 0xdfe7f2
COLOR_HERO_TRIM = (207, 224, 240, 255)     # 0xcfe0f0
COLOR_HERO_ACCENT = (134, 184, 216, 255)   # 0x86b8d8

COLOR_BRASS_HI = (232, 213, 167, 255)      # 0xe8d5a7
COLOR_BRASS_MID = (202, 166, 107, 255)     # 0xcaa66b
COLOR_BRASS_DARK = (127, 101, 64, 255)     # 0x7f6540

COLOR_TUNGSTEN = (255, 201, 138, 255)      # 0xffc98a
COLOR_TUNGSTEN_REFLECT = (228, 180, 90, 255) # 0xe4b45a
COLOR_LAMP_WARN = (228, 194, 118, 255)     # 0xe4c276
COLOR_LAMP_OK = (117, 212, 205, 255)       # 0x75d4cd
COLOR_LAMP_ALERT = (228, 90, 95, 255)      # 0xe45a5f

COLOR_STEEL_HI = (159, 183, 192, 255)      # 0x9fb7c0
COLOR_STEEL_MID = (104, 121, 129, 255)     # 0x687981
COLOR_STEEL_DARK = (91, 100, 114, 255)     # 0x5b6472

COLOR_VINYL_HI = (176, 74, 80, 255)       # 0xb04a50
COLOR_VINYL = (142, 38, 52, 255)          # 0x8e2634

COLOR_ENAMEL_HI = (82, 99, 107, 255)       # 0x52636b
COLOR_ENAMEL_MID = (64, 81, 89, 255)       # 0x405159
COLOR_ENAMEL_DARK = (38, 50, 56, 255)      # 0x263238

COLOR_VOID_LIFT = (23, 35, 43, 255)       # 0x17232b
COLOR_VOID = (10, 16, 21, 255)             # 0x0a1015

CLEAR = (0, 0, 0, 0)

# Helper function to blend color with alpha
def hex_rgba(hex_val, alpha=255):
    r = (hex_val >> 16) & 0xFF
    g = (hex_val >> 8) & 0xFF
    b = hex_val & 0xFF
    return (r, g, b, alpha)

# -----------------------------------------------------------------------------
# 1. Character Sprite Sheet Generation
# -----------------------------------------------------------------------------
CELL_W, CELL_H = 96, 120

def draw_character_frame(draw, cx, cy, char_type, pose_idx, is_walk=True):
    """
    Draws a painterly 2.5D character within a 96x120 cell.
    cx, cy: center bottom anchor (cx = cell_x + 48, cy = cell_y + 110)
    """
    # Animation offsets
    stride_phase = (pose_idx % 8) / 8.0 * 2 * math.pi if is_walk else 0
    leg_spread = math.sin(stride_phase) * 14 if is_walk else 0
    bob_y = abs(math.sin(stride_phase * 2)) * 3 if is_walk else math.sin(pose_idx * 0.8) * 1

    body_y = cy - bob_y

    if char_type == 'hero':
        # Protagonist: Rolled sleeves, unbuttoned tan jacket, crossbody strap & bag
        skin_color = (235, 195, 165, 255)
        shirt_color = COLOR_HERO_BASE
        jacket_color = (165, 115, 75, 255) # Tan jacket
        pants_color = COLOR_VOID_LIFT
        bag_color = COLOR_BRASS_DARK
        hair_color = (60, 45, 35, 255)

        # Legs
        draw.line([cx - leg_spread, body_y - 20, cx - leg_spread * 0.8, body_y], fill=pants_color, width=7)
        draw.line([cx + leg_spread, body_y - 20, cx + leg_spread * 0.8, body_y], fill=pants_color, width=7)
        # Shoes
        draw.ellipse([cx - leg_spread * 0.8 - 4, body_y - 3, cx - leg_spread * 0.8 + 5, body_y + 2], fill=COLOR_VOID)
        draw.ellipse([cx + leg_spread * 0.8 - 4, body_y - 3, cx + leg_spread * 0.8 + 5, body_y + 2], fill=COLOR_VOID)

        # Torso (Shirt + Jacket)
        draw.rectangle([cx - 10, body_y - 52, cx + 10, body_y - 20], fill=shirt_color)
        # Open Jacket
        draw.rectangle([cx - 13, body_y - 54, cx - 5, body_y - 18], fill=jacket_color)
        draw.rectangle([cx + 5, body_y - 54, cx + 13, body_y - 18], fill=jacket_color)

        # Crossbody bag strap
        draw.line([cx - 11, body_y - 52, cx + 11, body_y - 22], fill=bag_color, width=4)
        draw.rectangle([cx + 6, body_y - 28, cx + 16, body_y - 16], fill=bag_color) # Bag

        # Head & Hair
        draw.ellipse([cx - 7, body_y - 68, cx + 7, body_y - 54], fill=skin_color)
        draw.ellipse([cx - 8, body_y - 72, cx + 8, body_y - 62], fill=hair_color)

        # Arms (Rolled sleeves)
        arm_swing = math.sin(stride_phase + math.pi) * 12 if is_walk else 0
        draw.line([cx - 11, body_y - 50, cx - 12 + arm_swing, body_y - 32], fill=jacket_color, width=5)
        draw.line([cx - 12 + arm_swing, body_y - 32, cx - 13 + arm_swing, body_y - 22], fill=skin_color, width=4)

        draw.line([cx + 11, body_y - 50, cx + 12 - arm_swing, body_y - 32], fill=jacket_color, width=5)
        draw.line([cx + 12 - arm_swing, body_y - 32, cx + 13 - arm_swing, body_y - 22], fill=skin_color, width=4)

    elif char_type == 'companion':
        # Companion: Dark coat, dark pants, bright teal scarf (COLOR_LAMP_OK)
        skin_color = (230, 190, 160, 255)
        coat_color = COLOR_ENAMEL_DARK
        pants_color = COLOR_VOID_LIFT
        scarf_color = COLOR_LAMP_OK
        hair_color = (35, 30, 35, 255)

        # Legs
        draw.line([cx - leg_spread * 0.9, body_y - 18, cx - leg_spread * 0.7, body_y], fill=pants_color, width=6)
        draw.line([cx + leg_spread * 0.9, body_y - 18, cx + leg_spread * 0.7, body_y], fill=pants_color, width=6)

        # Coat & Torso
        draw.rectangle([cx - 11, body_y - 50, cx + 11, body_y - 18], fill=coat_color)

        # Head & Hair
        draw.ellipse([cx - 6, body_y - 66, cx + 6, body_y - 52], fill=skin_color)
        draw.ellipse([cx - 7, body_y - 70, cx + 7, body_y - 58], fill=hair_color)

        # Teal Scarf (Vibrant, unmistakable)
        draw.ellipse([cx - 10, body_y - 56, cx + 10, body_y - 46], fill=scarf_color)
        draw.polygon([(cx + 2, body_y - 50), (cx + 12, body_y - 40), (cx + 8, body_y - 36)], fill=scarf_color)

        # Arms
        arm_swing = math.sin(stride_phase + math.pi) * 10 if is_walk else 0
        draw.line([cx - 11, body_y - 48, cx - 11 + arm_swing, body_y - 26], fill=coat_color, width=4)
        draw.line([cx + 11, body_y - 48, cx + 11 - arm_swing, body_y - 26], fill=coat_color, width=4)

    elif char_type.startswith('commuter'):
        variant = int(char_type.split('_')[1])
        colors_suit = [COLOR_STEEL_MID, COLOR_ENAMEL_MID, COLOR_VINYL_HI]
        suit_col = colors_suit[variant % 3]
        pants_col = COLOR_ENAMEL_DARK
        skin_col = (220, 180, 150, 255)
        hair_col = (50, 40, 35, 255)

        is_panic = (pose_idx >= 8 and variant == 2)
        if is_panic:
            # Panic pose: body tilted, legs wide
            tilt = -15 if pose_idx % 2 == 0 else 15
            draw.line([cx - 12, body_y - 18, cx - 18, body_y], fill=pants_col, width=6)
            draw.line([cx + 6, body_y - 18, cx + 16, body_y], fill=pants_col, width=6)
            draw.rectangle([cx - 10, body_y - 50, cx + 10, body_y - 18], fill=suit_col)
            draw.ellipse([cx - 6, body_y - 66, cx + 6, body_y - 52], fill=skin_col)
            draw.ellipse([cx - 7, body_y - 70, cx + 7, body_y - 60], fill=hair_col)
            # Raised arms in panic
            draw.line([cx - 10, body_y - 48, cx - 18, body_y - 58], fill=suit_col, width=4)
            draw.line([cx + 10, body_y - 48, cx + 18, body_y - 58], fill=suit_col, width=4)
        else:
            # Standard commuter walk
            draw.line([cx - leg_spread, body_y - 18, cx - leg_spread * 0.8, body_y], fill=pants_col, width=6)
            draw.line([cx + leg_spread, body_y - 18, cx + leg_spread * 0.8, body_y], fill=pants_col, width=6)
            draw.rectangle([cx - 10, body_y - 50, cx + 10, body_y - 18], fill=suit_col)
            draw.ellipse([cx - 6, body_y - 66, cx + 6, body_y - 52], fill=skin_col)
            draw.ellipse([cx - 7, body_y - 70, cx + 7, body_y - 60], fill=hair_col)
            arm_swing = math.sin(stride_phase + math.pi) * 10
            draw.line([cx - 10, body_y - 48, cx - 10 + arm_swing, body_y - 26], fill=suit_col, width=4)
            draw.line([cx + 10, body_y - 48, cx + 10 - arm_swing, body_y - 26], fill=suit_col, width=4)

def build_hero_spritesheet():
    img = Image.new("RGBA", (CELL_W * 12, CELL_H), CLEAR)
    draw = ImageDraw.Draw(img)
    for i in range(4): # Idle
        cx = i * CELL_W + 48
        draw_character_frame(draw, cx, 110, 'hero', i, is_walk=False)
    for i in range(8): # Walk
        cx = (4 + i) * CELL_W + 48
        draw_character_frame(draw, cx, 110, 'hero', i, is_walk=True)
    path = os.path.join(CHAR_DIR, "hero-spritesheet.png")
    img.save(path)
    print(f"Created {path} ({img.size})")

def build_companion_spritesheet():
    img = Image.new("RGBA", (CELL_W * 12, CELL_H), CLEAR)
    draw = ImageDraw.Draw(img)
    for i in range(4): # Idle
        cx = i * CELL_W + 48
        draw_character_frame(draw, cx, 110, 'companion', i, is_walk=False)
    for i in range(8): # Walk
        cx = (4 + i) * CELL_W + 48
        draw_character_frame(draw, cx, 110, 'companion', i, is_walk=True)
    path = os.path.join(CHAR_DIR, "companion-spritesheet.png")
    img.save(path)
    print(f"Created {path} ({img.size})")

def build_commuters_spritesheet():
    img = Image.new("RGBA", (CELL_W * 12, CELL_H * 3), CLEAR)
    draw = ImageDraw.Draw(img)
    for row in range(3):
        for i in range(4): # Idle / Walk start
            cx = i * CELL_W + 48
            cy = row * CELL_H + 110
            draw_character_frame(draw, cx, cy, f'commuter_{row}', i, is_walk=False)
        for i in range(8): # Walk / Panic
            cx = (4 + i) * CELL_W + 48
            cy = row * CELL_H + 110
            draw_character_frame(draw, cx, cy, f'commuter_{row}', i + 4, is_walk=True)
    path = os.path.join(CHAR_DIR, "commuters-spritesheet.png")
    img.save(path)
    print(f"Created {path} ({img.size})")

# -----------------------------------------------------------------------------
# 2. Modular Carriage Layer Generation (960x600 viewport)
# -----------------------------------------------------------------------------
def build_carriage_back_wall():
    img = Image.new("RGBA", (960, 600), CLEAR)
    draw = ImageDraw.Draw(img)

    # Ceiling & Top lining (y: 0..80)
    draw.rectangle([0, 0, 960, 80], fill=COLOR_VOID_LIFT)
    draw.rectangle([0, 75, 960, 80], fill=COLOR_STEEL_MID)

    # Back wall panels between windows
    # Window cutouts: x=80..340, x=380..640, x=680..940 (y=80..460) -> Cutouts are left TRANSPARENT
    draw.rectangle([0, 80, 80, 460], fill=COLOR_ENAMEL_DARK)
    draw.rectangle([340, 80, 380, 460], fill=COLOR_ENAMEL_DARK)
    draw.rectangle([640, 80, 680, 460], fill=COLOR_ENAMEL_DARK)
    draw.rectangle([940, 80, 960, 460], fill=COLOR_ENAMEL_DARK)

    # Window framing trim around cutouts
    for wx1, wx2 in [(80, 340), (380, 640), (680, 940)]:
        draw.rectangle([wx1-3, 77, wx2+3, 83], fill=COLOR_BRASS_MID)
        draw.rectangle([wx1-3, 457, wx2+3, 463], fill=COLOR_BRASS_MID)
        draw.rectangle([wx1-3, 77, wx1+3, 463], fill=COLOR_BRASS_MID)
        draw.rectangle([wx2-3, 77, wx2+3, 463], fill=COLOR_BRASS_MID)

    path = os.path.join(CARRIAGE_DIR, "carriage-back-wall.png")
    img.save(path)
    print(f"Created {path} ({img.size})")

def build_carriage_city_view():
    """
    Creates a desaturated, warm-tinted, soft-blurred city view derived from panorama.
    Tileable 1920x600 PNG.
    """
    pan_path = 'src/assets/world_03_present_city_panorama_fullres.png'
    if os.path.exists(pan_path):
        src_pan = Image.open(pan_path)
        # Crop a nice section and resize to 1920x600
        crop_sec = src_pan.crop((0, 0, 4000, 941)).resize((1920, 600))
    else:
        # Fallback procedural city skyline
        crop_sec = Image.new("RGB", (1920, 600), (45, 60, 80))
        d = ImageDraw.Draw(crop_sec)
        for x in range(0, 1920, 40):
            h = 150 + (x % 11) * 20
            d.rectangle([x, 600 - h, x + 35, 600], fill=(80, 95, 110))

    # Apply warm editorial color grade: desaturate + warm overlay + blur
    enhancer = ImageEnhance.Color(crop_sec)
    desat = enhancer.enhance(0.55) # Desaturate

    # Warm tint layer
    warm_tint = Image.new("RGB", (1920, 600), (220, 180, 140))
    graded = Image.blend(desat, warm_tint, 0.22)

    # Soft Gaussian blur for visual depth-of-field
    blurred = graded.filter(ImageFilter.GaussianBlur(radius=2.5))

    out_img = blurred.convert("RGBA")
    path = os.path.join(CARRIAGE_DIR, "carriage-city-view.png")
    out_img.save(path)
    print(f"Created {path} ({out_img.size})")

def build_carriage_doors_seats():
    img = Image.new("RGBA", (960, 600), CLEAR)
    draw = ImageDraw.Draw(img)

    # Sliding door frames & leaves at x=0..70 and x=890..960
    draw.rectangle([0, 70, 70, 460], fill=COLOR_STEEL_DARK)
    draw.rectangle([890, 70, 960, 460], fill=COLOR_STEEL_DARK)
    draw.line([35, 70, 35, 460], fill=COLOR_VOID, width=2)

    # Passenger Bench Seats under windows (y: 380..460)
    for wx1, wx2 in [(90, 330), (390, 630), (690, 890)]:
        # Back cushion (Burgundy Vinyl)
        draw.rectangle([wx1, 380, wx2, 430], fill=COLOR_VINYL)
        draw.rectangle([wx1, 380, wx2, 386], fill=COLOR_VINYL_HI)
        # Seat cushion
        draw.rectangle([wx1 - 5, 430, wx2 + 5, 455], fill=COLOR_VINYL)
        draw.rectangle([wx1 - 5, 430, wx2 + 5, 435], fill=COLOR_VINYL_HI)
        # Metallic seat base legs
        draw.rectangle([wx1 + 20, 455, wx1 + 28, 480], fill=COLOR_STEEL_MID)
        draw.rectangle([wx2 - 28, 455, wx2 - 20, 480], fill=COLOR_STEEL_MID)

    path = os.path.join(CARRIAGE_DIR, "carriage-doors-seats.png")
    img.save(path)
    print(f"Created {path} ({img.size})")

def build_carriage_floor_deck():
    """
    Two-lane spatial floor deck:
    Far Lane: y=460..500 (darker metallic deck with seam)
    Near Lane: y=500..600 (main foreground aisle deck)
    """
    img = Image.new("RGBA", (960, 600), CLEAR)
    draw = ImageDraw.Draw(img)

    # Far Lane Floor Deck (y: 460..500)
    draw.rectangle([0, 460, 960, 500], fill=COLOR_VOID_LIFT)
    # Seam dividing Far Lane and Near Lane
    draw.line([0, 500, 960, 500], fill=COLOR_STEEL_HI, width=3)

    # Near Lane Floor Deck (y: 500..600)
    draw.rectangle([0, 501, 960, 600], fill=COLOR_ENAMEL_DARK)
    # Floor deck trim line
    draw.line([0, 595, 960, 595], fill=COLOR_BRASS_MID, width=3)

    path = os.path.join(CARRIAGE_DIR, "carriage-floor-deck.png")
    img.save(path)
    print(f"Created {path} ({img.size})")

def build_carriage_ceiling_rail():
    img = Image.new("RGBA", (960, 600), CLEAR)
    draw = ImageDraw.Draw(img)

    # Ceiling rail structure (y: 0..60)
    draw.rectangle([0, 0, 960, 30], fill=COLOR_STEEL_DARK)
    # Industrial ceiling rail track for scanner
    draw.rectangle([0, 25, 960, 35], fill=COLOR_STEEL_HI)
    draw.line([0, 30, 960, 30], fill=COLOR_VOID, width=2)

    # Fluorescent Light Strips
    for lx in range(40, 960, 240):
        draw.rectangle([lx, 10, lx + 160, 22], fill=COLOR_TUNGSTEN)
        draw.rectangle([lx - 5, 8, lx + 165, 24], outline=COLOR_BRASS_MID, width=2)

    path = os.path.join(CARRIAGE_DIR, "carriage-ceiling-rail.png")
    img.save(path)
    print(f"Created {path} ({img.size})")

def build_carriage_foreground_poles():
    img = Image.new("RGBA", (960, 600), CLEAR)
    draw = ImageDraw.Draw(img)

    # Foreground grab poles for depth occlusion (x=190, 480, 770)
    for px in [190, 480, 770]:
        # Vertical Brass Pole
        draw.rectangle([px - 4, 0, px + 4, 600], fill=COLOR_BRASS_MID)
        draw.rectangle([px - 2, 0, px + 1, 600], fill=COLOR_BRASS_HI)
        # Mounting brackets at top & floor
        draw.rectangle([px - 10, 25, px + 10, 40], fill=COLOR_STEEL_HI)
        draw.rectangle([px - 10, 580, px + 10, 595], fill=COLOR_STEEL_HI)

    path = os.path.join(CARRIAGE_DIR, "carriage-foreground-poles.png")
    img.save(path)
    print(f"Created {path} ({img.size})")

def build_carriage_alert_overlay():
    img = Image.new("RGBA", (960, 600), CLEAR)
    draw = ImageDraw.Draw(img)

    # Red Emergency Light Strips on Pillars (CAR.LAMP_ALERT)
    alert_red = COLOR_LAMP_ALERT
    for px in [75, 375, 675]:
        draw.rectangle([px - 6, 80, px + 6, 460], fill=alert_red)
        draw.rectangle([px - 2, 80, px + 2, 460], fill=(255, 200, 200, 255))

    # Ambient red glow over carriage top
    glow = Image.new("RGBA", (960, 600), CLEAR)
    gd = ImageDraw.Draw(glow)
    gd.rectangle([0, 0, 960, 150], fill=(228, 90, 95, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=15))

    img.paste(glow, (0, 0), glow)

    path = os.path.join(CARRIAGE_DIR, "carriage-alert-overlay.png")
    img.save(path)
    print(f"Created {path} ({img.size})")

# -----------------------------------------------------------------------------
# 3. Scanner Unit Generation
# -----------------------------------------------------------------------------
def build_scanner_unit():
    """
    Ceiling-rail inspection scanner (384x120 px, 3 cells of 128x120 px).
    Cell 0: Normal state (CAR.LAMP_WARN lens)
    Cell 1: Safe state (CAR.LAMP_OK cyan lens)
    Cell 2: Alert state (CAR.LAMP_ALERT red lens)
    """
    img = Image.new("RGBA", (128 * 3, 120), CLEAR)
    draw = ImageDraw.Draw(img)

    lens_colors = [COLOR_LAMP_WARN, COLOR_LAMP_OK, COLOR_LAMP_ALERT]

    for i in range(3):
        ox = i * 128
        # Ceiling rail mount bracket
        draw.rectangle([ox + 48, 0, ox + 80, 25], fill=COLOR_STEEL_DARK)
        draw.rectangle([ox + 52, 0, ox + 76, 20], fill=COLOR_STEEL_HI)

        # Scanner Main Body (Dome/Housing)
        draw.ellipse([ox + 34, 15, ox + 94, 65], fill=COLOR_VOID_LIFT)
        draw.ellipse([ox + 38, 18, ox + 90, 61], fill=COLOR_STEEL_DARK)
        draw.rectangle([ox + 40, 45, ox + 88, 75], fill=COLOR_ENAMEL_DARK)

        # Sensor Lens (Beam Origin at x=64, y=96)
        lens_col = lens_colors[i]
        draw.ellipse([ox + 48, 70, ox + 80, 95], fill=COLOR_STEEL_HI)
        draw.ellipse([ox + 52, 74, ox + 76, 91], fill=lens_col)
        draw.ellipse([ox + 58, 78, ox + 70, 87], fill=(255, 255, 255, 230)) # Lens glint

    path = os.path.join(SCANNER_DIR, "scanner-unit.png")
    img.save(path)
    print(f"Created {path} ({img.size})")

# -----------------------------------------------------------------------------
# 4. Proof Sheet Compositing (Actual 960x600)
# -----------------------------------------------------------------------------
def build_proof_sheets():
    # Load required layers
    back_wall = Image.open(os.path.join(CARRIAGE_DIR, "carriage-back-wall.png"))
    city_view = Image.open(os.path.join(CARRIAGE_DIR, "carriage-city-view.png")).crop((0, 0, 960, 600))
    doors_seats = Image.open(os.path.join(CARRIAGE_DIR, "carriage-doors-seats.png"))
    floor_deck = Image.open(os.path.join(CARRIAGE_DIR, "carriage-floor-deck.png"))
    ceiling_rail = Image.open(os.path.join(CARRIAGE_DIR, "carriage-ceiling-rail.png"))
    foreground_poles = Image.open(os.path.join(CARRIAGE_DIR, "carriage-foreground-poles.png"))
    alert_overlay = Image.open(os.path.join(CARRIAGE_DIR, "carriage-alert-overlay.png"))

    hero_sheet = Image.open(os.path.join(CHAR_DIR, "hero-spritesheet.png"))
    companion_sheet = Image.open(os.path.join(CHAR_DIR, "companion-spritesheet.png"))
    commuters_sheet = Image.open(os.path.join(CHAR_DIR, "commuters-spritesheet.png"))
    scanner_sheet = Image.open(os.path.join(SCANNER_DIR, "scanner-unit.png"))

    # Extract individual sprite frames
    hero_idle = hero_sheet.crop((0, 0, 96, 120))
    hero_walk = hero_sheet.crop((96 * 4, 0, 96 * 5, 120))
    companion_walk = companion_sheet.crop((96 * 4, 0, 96 * 5, 120))

    commuter_v0 = commuters_sheet.crop((96 * 4, 0, 96 * 5, 120))
    commuter_v1 = commuters_sheet.crop((96 * 4, 120, 96 * 5, 240))
    commuter_panic = commuters_sheet.crop((96 * 8, 240, 96 * 9, 360))

    scanner_normal = scanner_sheet.crop((0, 0, 128, 120))
    scanner_safe = scanner_sheet.crop((128, 0, 256, 120))
    scanner_alert = scanner_sheet.crop((256, 0, 384, 120))

    # --- PROOF 1: Entry & Isolated Scan ---
    p1 = Image.new("RGBA", (960, 600), COLOR_VOID)
    p1.paste(city_view, (0, 0), city_view)
    p1.paste(back_wall, (0, 0), back_wall)
    p1.paste(doors_seats, (0, 0), doors_seats)
    p1.paste(floor_deck, (0, 0), floor_deck)
    p1.paste(ceiling_rail, (0, 0), ceiling_rail)

    # Far Lane Actor (Straggler) - Scale 0.88x (y_anchor = 480)
    straggler = commuter_v1.resize((int(96 * 0.88), int(120 * 0.88)))
    p1.paste(straggler, (680, 375), straggler)

    # Near Lane Actors (Group) - Scale 1.00x (y_anchor = 540)
    p1.paste(hero_idle, (120, 420), hero_idle) # Hero observing
    p1.paste(commuter_v0, (400, 420), commuter_v0)
    p1.paste(commuter_v1, (480, 420), commuter_v1)
    p1.paste(commuter_v0, (560, 420), commuter_v0)

    # Dynamic Phaser Graphics Simulation: Red Scan Cone over straggler
    scan_layer = Image.new("RGBA", (960, 600), CLEAR)
    sd = ImageDraw.Draw(scan_layer)
    sd.polygon([(744, 115), (640, 480), (840, 480)], fill=(228, 90, 95, 90), outline=COLOR_LAMP_ALERT)
    p1.paste(scan_layer, (0, 0), scan_layer)

    p1.paste(scanner_alert, (680, 20), scanner_alert)
    p1.paste(foreground_poles, (0, 0), foreground_poles)

    p1_path = os.path.join(PROOFS_DIR, "proof-01-entry-scan.png")
    p1.save(p1_path)
    print(f"Created proof {p1_path} ({p1.size})")

    # --- PROOF 2: Lane Anchor & Stride ---
    p2 = Image.new("RGBA", (960, 600), COLOR_VOID)
    p2.paste(city_view, (0, 0), city_view)
    p2.paste(back_wall, (0, 0), back_wall)
    p2.paste(doors_seats, (0, 0), doors_seats)
    p2.paste(floor_deck, (0, 0), floor_deck)
    p2.paste(ceiling_rail, (0, 0), ceiling_rail)

    # Near Lane Anchored Group
    p2.paste(hero_walk, (380, 420), hero_walk)
    p2.paste(commuter_v0, (460, 420), commuter_v0)
    p2.paste(commuter_v1, (540, 420), commuter_v1)
    p2.paste(commuter_v0, (620, 420), commuter_v0)

    # Dynamic Phaser Graphics Simulation: Cyan Footprint Bar & Safe Scan Beam
    overlay = Image.new("RGBA", (960, 600), CLEAR)
    od = ImageDraw.Draw(overlay)
    # Cyan Footprint Bar
    od.rectangle([370, 525, 710, 535], fill=(117, 212, 205, 100), outline=COLOR_LAMP_OK, width=2)
    # Safe Cyan Scan Beam
    od.polygon([(544, 115), (340, 530), (740, 530)], fill=(117, 212, 205, 60), outline=COLOR_LAMP_OK)
    p2.paste(overlay, (0, 0), overlay)

    p2.paste(scanner_safe, (480, 20), scanner_safe)
    p2.paste(foreground_poles, (0, 0), foreground_poles)

    p2_path = os.path.join(PROOFS_DIR, "proof-02-lane-anchor.png")
    p2.save(p2_path)
    print(f"Created proof {p2_path} ({p2.size})")

    # --- PROOF 3: Alert Dispersal & Duo Sync ---
    p3 = Image.new("RGBA", (960, 600), COLOR_VOID)
    p3.paste(city_view, (0, 0), city_view)
    p3.paste(back_wall, (0, 0), back_wall)
    p3.paste(doors_seats, (0, 0), doors_seats)
    p3.paste(floor_deck, (0, 0), floor_deck)
    p3.paste(ceiling_rail, (0, 0), ceiling_rail)
    p3.paste(alert_overlay, (0, 0), alert_overlay)

    # Fleeing commuters on sides
    p3.paste(commuter_panic, (100, 420), commuter_panic)
    p3.paste(commuter_panic, (200, 420), commuter_panic)
    p3.paste(commuter_panic, (720, 420), commuter_panic)
    p3.paste(commuter_panic, (810, 420), commuter_panic)

    # Central Duo Pair (Hero + Companion)
    p3.paste(hero_walk, (430, 420), hero_walk)
    p3.paste(companion_walk, (500, 420), companion_walk)

    # Dynamic Duo Pair Bracket Simulation
    duo_lay = Image.new("RGBA", (960, 600), CLEAR)
    dd = ImageDraw.Draw(duo_lay)
    # Corner brackets around pair
    dd.rectangle([415, 395, 590, 535], outline=COLOR_LAMP_OK, width=3)
    p3.paste(duo_lay, (0, 0), duo_lay)

    p3.paste(scanner_safe, (480, 20), scanner_safe)
    p3.paste(foreground_poles, (0, 0), foreground_poles)

    p3_path = os.path.join(PROOFS_DIR, "proof-03-alert-duo.png")
    p3.save(p3_path)
    print(f"Created proof {p3_path} ({p3.size})")

# -----------------------------------------------------------------------------
# 5. Manifest and Production Notes Generation
# -----------------------------------------------------------------------------
def build_manifest():
    manifest = {
        "manifest_version": "1.0.0",
        "direction": "Direction A2 (Revised Baseline)",
        "viewport": {"width": 960, "height": 600},
        "palette_reference": "CAR Palette (src/art/colors.js)",
        "assets": {
            "characters": {
                "hero": {
                    "file": "characters/hero-spritesheet.png",
                    "dimensions": {"width": 1152, "height": 120},
                    "cell_size": {"width": 96, "height": 120},
                    "anchor": {"x": 0.5, "y": 0.916},
                    "mirror_permitted": True,
                    "animations": {
                        "idle": {"frames": [0, 1, 2, 3], "frame_rate": 6, "loop": True},
                        "walk": {"frames": [4, 5, 6, 7, 8, 9, 10, 11], "frame_rate": 12, "loop": True}
                    }
                },
                "companion": {
                    "file": "characters/companion-spritesheet.png",
                    "dimensions": {"width": 1152, "height": 120},
                    "cell_size": {"width": 96, "height": 120},
                    "anchor": {"x": 0.5, "y": 0.916},
                    "mirror_permitted": True,
                    "animations": {
                        "idle": {"frames": [0, 1, 2, 3], "frame_rate": 6, "loop": True},
                        "walk": {"frames": [4, 5, 6, 7, 8, 9, 10, 11], "frame_rate": 12, "loop": True}
                    }
                },
                "commuters": {
                    "file": "characters/commuters-spritesheet.png",
                    "dimensions": {"width": 1152, "height": 360},
                    "cell_size": {"width": 96, "height": 120},
                    "anchor": {"x": 0.5, "y": 0.916},
                    "mirror_permitted": True,
                    "variants": [
                        {"id": "suit", "row": 0, "walk_frames": [4, 5, 6, 7, 8, 9, 10, 11]},
                        {"id": "trenchcoat", "row": 1, "walk_frames": [4, 5, 6, 7, 8, 9, 10, 11]},
                        {"id": "casual", "row": 2, "walk_frames": [0, 1, 2, 3], "panic_frames": [4, 5, 6, 7, 8, 9, 10, 11]}
                    ]
                }
            },
            "carriage_layers": [
                {
                    "id": "city_view",
                    "file": "carriage/carriage-city-view.png",
                    "depth": 0,
                    "dimensions": {"width": 1920, "height": 600},
                    "repeat": "repeat-x",
                    "scroll_factor": {"x": 0.4, "y": 0.0}
                },
                {
                    "id": "back_wall",
                    "file": "carriage/carriage-back-wall.png",
                    "depth": 100,
                    "dimensions": {"width": 960, "height": 600},
                    "repeat": "repeat-x",
                    "scroll_factor": {"x": 1.0, "y": 0.0}
                },
                {
                    "id": "doors_seats",
                    "file": "carriage/carriage-doors-seats.png",
                    "depth": 200,
                    "dimensions": {"width": 960, "height": 600},
                    "repeat": "repeat-x",
                    "scroll_factor": {"x": 1.0, "y": 0.0}
                },
                {
                    "id": "floor_deck",
                    "file": "carriage/carriage-floor-deck.png",
                    "depth": 300,
                    "dimensions": {"width": 960, "height": 600},
                    "repeat": "repeat-x",
                    "lanes": {
                        "far_lane": {"y_baseline": 480, "scale": 0.88, "depth": 450},
                        "near_lane": {"y_baseline": 540, "scale": 1.00, "depth": 550}
                    }
                },
                {
                    "id": "ceiling_rail",
                    "file": "carriage/carriage-ceiling-rail.png",
                    "depth": 600,
                    "dimensions": {"width": 960, "height": 600},
                    "repeat": "repeat-x"
                },
                {
                    "id": "foreground_poles",
                    "file": "carriage/carriage-foreground-poles.png",
                    "depth": 700,
                    "dimensions": {"width": 960, "height": 600},
                    "repeat": "repeat-x"
                },
                {
                    "id": "alert_overlay",
                    "file": "carriage/carriage-alert-overlay.png",
                    "depth": 650,
                    "dimensions": {"width": 960, "height": 600},
                    "repeat": "repeat-x",
                    "trigger_state": "alert"
                }
            ],
            "scanner": {
                "file": "scanner/scanner-unit.png",
                "dimensions": {"width": 384, "height": 120},
                "cell_size": {"width": 128, "height": 120},
                "beam_origin": {"x": 64, "y": 96},
                "states": {
                    "normal": {"cell_index": 0, "color": "CAR.LAMP_WARN"},
                    "safe": {"cell_index": 1, "color": "CAR.LAMP_OK"},
                    "alert": {"cell_index": 2, "color": "CAR.LAMP_ALERT"}
                }
            }
        }
    }

    path = os.path.join(OUTPUT_DIR, "ASSET_MANIFEST.json")
    with open(path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Created {path}")

def main():
    print("Building Car 03 Direction A2 Asset Kit...")
    build_hero_spritesheet()
    build_companion_spritesheet()
    build_commuters_spritesheet()

    build_carriage_back_wall()
    build_carriage_city_view()
    build_carriage_doors_seats()
    build_carriage_floor_deck()
    build_carriage_ceiling_rail()
    build_carriage_foreground_poles()
    build_carriage_alert_overlay()

    build_scanner_unit()
    build_proof_sheets()
    build_manifest()
    print("Asset Kit Build Complete!")

if __name__ == "__main__":
    main()
