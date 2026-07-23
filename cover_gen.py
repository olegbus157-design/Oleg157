from PIL import Image, ImageDraw, ImageFont
import math
import random

W, H = 640, 360
img = Image.new("RGB", (W, H))
draw = ImageDraw.Draw(img)

# Vertical gradient background (dark cave -> deep purple/blue)
top = (20, 22, 33)
bottom = (10, 11, 18)
for y in range(H):
    t = y / H
    r = int(top[0] + (bottom[0] - top[0]) * t)
    g = int(top[1] + (bottom[1] - top[1]) * t)
    b = int(top[2] + (bottom[2] - top[2]) * t)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# Radial glow behind center
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
cx, cy = W // 2, H // 2 + 20
max_r = 260
for i in range(max_r, 0, -4):
    alpha = int(70 * (1 - i / max_r))
    gd.ellipse([cx - i, cy - i * 0.6, cx + i, cy + i * 0.6], fill=(255, 209, 102, alpha))
img.paste(Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB"), (0, 0))
draw = ImageDraw.Draw(img)

# Scatter small "gold nugget" dots
random.seed(7)
for _ in range(60):
    x = random.randint(0, W)
    y = random.randint(0, H)
    r = random.choice([1, 1, 2])
    shade = random.randint(120, 255)
    draw.ellipse([x - r, y - r, x + r, y + r], fill=(shade, int(shade * 0.85), 90))

def load_font(size, bold=False, emoji=False):
    if emoji:
        candidates = ["C:/Windows/Fonts/seguiemj.ttf"]
    else:
        candidates = [
            "C:/Windows/Fonts/seguisb.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
            "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        ]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except Exception:
            continue
    return ImageFont.load_default()

emoji_font = load_font(150, emoji=True)
title_font = load_font(54, bold=True)
sub_font = load_font(22)

def draw_center_text(draw_obj, text, y, font, fill, stroke_fill=None, stroke_width=0):
    bbox = draw_obj.textbbox((0, 0), text, font=font, stroke_width=stroke_width)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = (W - w) / 2 - bbox[0]
    draw_obj.text((x, y), text, font=font, fill=fill, stroke_width=stroke_width, stroke_fill=stroke_fill)
    return h

# Rock + pickaxe emoji row
try:
    draw_center_text(draw, "⛏️\U0001faa8", 40, emoji_font, (255, 255, 255))
except Exception:
    pass

# Title
draw_center_text(draw, "IDLE MINER", 210, title_font, (255, 215, 102), stroke_fill=(30, 20, 5), stroke_width=3)

# Subtitle
draw_center_text(draw, "Тапай, нанимай, богатей", 280, sub_font, (220, 220, 230))

img.save("cover.png", "PNG")
print("saved", img.size)
