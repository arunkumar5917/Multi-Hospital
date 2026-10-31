import math
from fontTools.ttLib import TTCollection
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

PINK = "#FF2D78"
NAVY = "#0B1D3A"

FONT_PATH = "/System/Library/Fonts/Supplemental/Futura.ttc"
coll = TTCollection(FONT_PATH)
F_BOLD = coll.fonts[2]
F_MED = coll.fonts[0]


def glyph_run(font, text, tracking=0.0):
    """Return (path_d, advance) in font units. Pen coords are y-up."""
    glyphset = font.getGlyphSet()
    cmap = font.getBestCmap()
    pen = SVGPathPen(glyphset)
    x = 0
    for i, ch in enumerate(text):
        gname = cmap.get(ord(ch))
        glyphset[gname].draw(TransformPen(pen, Transform(1, 0, 0, 1, x, 0)))
        x += glyphset[gname].width
        if i < len(text) - 1:
            x += tracking
    return pen.getCommands(), x


def text_bbox(font, text, tracking=0.0):
    glyphset = font.getGlyphSet()
    cmap = font.getBestCmap()
    bp = BoundsPen(glyphset)
    x = 0
    for i, ch in enumerate(text):
        gname = cmap.get(ord(ch))
        glyphset[gname].draw(TransformPen(bp, Transform(1, 0, 0, 1, x, 0)))
        x += glyphset[gname].width
        if i < len(text) - 1:
            x += tracking
    return bp.bounds  # xMin, yMin, xMax, yMax


def offset_polyline(points, halfwidths):
    """Offset a polyline with per-vertex half widths, using averaged normals."""
    left, right = [], []
    n = len(points)
    for i, (p, hw) in enumerate(zip(points, halfwidths)):
        if i == 0:
            dx, dy = points[1][0] - p[0], points[1][1] - p[1]
        elif i == n - 1:
            dx, dy = p[0] - points[i - 1][0], p[1] - points[i - 1][1]
        else:
            ax, ay = p[0] - points[i - 1][0], p[1] - points[i - 1][1]
            bx, by = points[i + 1][0] - p[0], points[i + 1][1] - p[1]
            la = math.hypot(ax, ay)
            lb = math.hypot(bx, by)
            dx, dy = ax / la + bx / lb, ay / la + by / lb
        L = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / L, dx / L
        left.append((p[0] + nx * hw, p[1] + ny * hw))
        right.append((p[0] - nx * hw, p[1] - ny * hw))
    return left + right[::-1]


def poly_d(pts):
    d = "M " + " L ".join(f"{x:.2f},{y:.2f}" for x, y in pts) + " Z"
    return d


def bbox_of(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


# ----------------------------------------------------------------------------
# X mark geometry (local coords, y down)
# ----------------------------------------------------------------------------
swoosh = offset_polyline(
    [(62, 34), (282, 252), (408, 186)],
    [50, 54, 0],
)
counter = offset_polyline(
    [(322, 26), (92, 288)],
    [40, 40],
)

xmin, ymin, xmax, ymax = bbox_of(swoosh + counter)
CAP_X = 300.0
sx = CAP_X / (ymax - ymin)
X_W = (xmax - xmin) * sx
X_H = CAP_X


def place_x(pts, scale, tx, ty):
    return [((p[0] - xmin) * scale + tx, (p[1] - ymin) * scale + ty) for p in pts]


# ----------------------------------------------------------------------------
# Typography
# ----------------------------------------------------------------------------
ORA_CAP = 222.0
ora_font = F_BOLD
ora_cap_units = ora_font["OS/2"].sCapHeight if hasattr(ora_font["OS/2"], "sCapHeight") else 700
ora_scale = ORA_CAP / ora_cap_units
ORA_TRACK = 26.0 / ora_scale  # font units

ora_d, ora_adv = glyph_run(ora_font, "ORA", tracking=ORA_TRACK)
bx0, by0, bx1, by1 = text_bbox(ora_font, "ORA", tracking=ORA_TRACK)
ORA_W = (ora_adv) * ora_scale

TECH_CAP = 46.0
tech_font = F_MED
tech_cap_units = tech_font["OS/2"].sCapHeight
tech_scale = TECH_CAP / tech_cap_units
TECH_TRACK = 0.46 * tech_font["head"].unitsPerEm  # wide tracking, font units
tech_d, tech_adv = glyph_run(tech_font, "TECHNOLOGIES", tracking=TECH_TRACK)
tbx0, tby0, tbx1, tby1 = text_bbox(tech_font, "TECHNOLOGIES", tracking=TECH_TRACK)
TECH_W = tech_adv * tech_scale

# ----------------------------------------------------------------------------
# Layout (canvas 2000 x 1000)
# ----------------------------------------------------------------------------
W, H = 2000, 1000
GAP = 44.0
word_w = X_W + GAP + ORA_W
x_left = (W - word_w) / 2.0
baseline = 600.0
X_top = baseline - X_H
ora_top = baseline - ORA_CAP
tech_baseline = baseline + 128.0

x_poly_swoosh = place_x(swoosh, sx, x_left, X_top)
x_poly_counter = place_x(counter, sx, x_left, X_top)
ora_x = x_left + X_W + GAP

# center technologies under the full wordmark, on its optical center
tech_x = x_left + (word_w - TECH_W) / 2.0
tech_y = tech_baseline

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <rect width="{W}" height="{H}" fill="#FFFFFF"/>
  <g fill="{PINK}">
    <path d="{poly_d(x_poly_swoosh)}"/>
    <path d="{poly_d(x_poly_counter)}"/>
  </g>
  <g transform="translate({ora_x:.2f},{baseline:.2f}) scale({ora_scale:.6f},{-ora_scale:.6f})" fill="{NAVY}">
    <path d="{ora_d}"/>
  </g>
  <g transform="translate({tech_x:.2f},{tech_y:.2f}) scale({tech_scale:.6f},{-tech_scale:.6f})" fill="{NAVY}">
    <path d="{tech_d}"/>
  </g>
</svg>
'''

with open("logo/xora-logo.svg", "w") as f:
    f.write(svg)

print(f"X_W={X_W:.1f} ORA_W={ORA_W:.1f} TECH_W={TECH_W:.1f} word_w={word_w:.1f} x_left={x_left:.1f}")
print(f"X bbox local: {xmin:.1f},{ymin:.1f} {xmax:.1f},{ymax:.1f}  scale={sx:.4f}")
print(f"ora bbox units: {bx0},{by0},{bx1},{by1}  adv={ora_adv}")
