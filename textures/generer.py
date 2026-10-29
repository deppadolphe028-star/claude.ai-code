"""Matières de la maison 3D d'A R Rénovation.

Calcule, dans ce dossier, les textures tuilables lues par roof3d.js : la couleur (fichiers
« nom.webp », en sRGB) et le relief (fichiers « nom_n.webp », cartes de normales au format
OpenGL). Aucune image extérieure : tout vient de bruits fractals et de motifs dessinés ici,
donc aucune question de droits d'auteur.

Usage : python3 textures/generer.py      (nécessite numpy et Pillow)
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent


def noise(size, beta=2.0, seed=0, stretch=1.0, angle=0.0):
    """Bruit fractal tuilable, centré réduit. beta règle la douceur (spectre en 1/f^beta) ;
    stretch allonge les motifs dans la direction angle (en radians, 0 = le long de x)."""
    h, w = size if isinstance(size, tuple) else (size, size)
    rng = np.random.default_rng(seed)
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    along = fx * np.cos(angle) + fy * np.sin(angle)
    across = -fx * np.sin(angle) + fy * np.cos(angle)
    f = np.sqrt((along * stretch) ** 2 + across ** 2)
    f[0, 0] = 1.0
    spectrum = np.fft.fft2(rng.standard_normal((h, w))) / f ** (beta / 2)
    spectrum[0, 0] = 0
    n = np.real(np.fft.ifft2(spectrum))
    return (n - n.mean()) / (n.std() + 1e-9)


def blur(a, sigma):
    """Flou gaussien qui respecte le raccord des bords."""
    h, w = a.shape
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    g = np.exp(-2 * (np.pi * sigma) ** 2 * (fx ** 2 + fy ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(a) * g))


def normals(height, slope):
    """Carte de normales (OpenGL, vert vers le haut) ; slope = pente moyenne voulue du relief."""
    dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * 0.5
    dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * 0.5
    rms = np.sqrt(np.mean(dx ** 2 + dy ** 2)) + 1e-9
    k = slope / rms
    n = np.stack([-dx * k, dy * k, np.ones_like(height)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


def half(height):
    h, w = height.shape
    return height.reshape(h // 2, 2, w // 2, 2).mean(axis=(1, 3))


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def mix(a, b, t):
    t = np.asarray(t)[..., None]
    return a * (1 - t) + b * t


def save(name, rgb, alpha=None, quality=88):
    data = np.clip(np.asarray(rgb) * 255 + 0.5, 0, 255).astype(np.uint8)
    if alpha is not None:
        data = np.dstack([data, np.clip(alpha * 255 + 0.5, 0, 255).astype(np.uint8)])
    Image.fromarray(data, 'RGBA' if alpha is not None else 'RGB').save(
        OUT / f'{name}.webp', 'WEBP', quality=quality, method=6)


def specks(shape, density, seed):
    return np.random.default_rng(seed).random(shape) < density


# Ardoise naturelle : surface clivée, ondulations le long des lits, paillettes de mica
def ardoise():
    s = 1024
    relief = (0.6 * noise(s, 2.8, 11, 7) + 0.3 * noise(s, 1.7, 12, 14)
              + 0.12 * noise(s, 1.0, 13))
    lum = (1 + 0.05 * noise(s, 3.2, 14) + 0.06 * np.tanh(relief)
           + 0.05 * noise(s, 1.1, 16, 30))
    col = hexrgb('#454c56')[None, None, :] * lum[..., None]
    col[..., 2] *= 1 + 0.03 * noise(s, 3.0, 15)
    mica = specks((s, s), 0.0012, 17)
    col[mica] = col[mica] * 1.5 + 0.06
    save('ardoise', col)
    save('ardoise_n', normals(half(relief), 0.13))


# Terre cuite (tuiles et faîtières) : base claire teintée par la couleur de chaque tuile
def terre_cuite():
    s = 1024
    sand = noise(s, 0.2, 21)
    relief = 0.55 * noise(s, 2.3, 22) + 0.45 * blur(sand, 0.8)
    lum = 0.95 + 0.045 * noise(s, 3.0, 23) + 0.035 * blur(sand, 0.9)
    flame = np.clip(noise(s, 2.7, 24), 0, None)              # flammés de cuisson
    run = np.clip(noise(s, 2.2, 25, 18, np.pi / 2), 0, None)  # coulures dans le sens de la pente
    col = np.stack([lum * (1 - 0.07 * flame), lum * (0.96 - 0.1 * flame), lum * (0.92 - 0.11 * flame)], -1)
    col *= (1 - 0.04 * run)[..., None]
    for density, k, seed in ((0.02, 0.78, 26), (0.012, 1.08, 27)):  # grains de sable foncés et clairs
        m = specks((s, s), density, seed)
        col[m] *= k
    save('terre_cuite', col)
    save('terre_cuite_n', normals(half(relief), 0.14))


# Bois de charpente et liteaux : fil du bois le long de u (la longueur de la pièce)
def bois():
    s = 512
    y = np.arange(s)[:, None] / s
    warp = 0.035 * noise(s, 3.0, 31, 6) + 0.01 * noise(s, 2.0, 34, 3)
    phase = (y + warp) * 2 * np.pi * 9 + 1.6 * noise(s, 3.4, 35, 10)
    rings = np.sin(phase)
    late = np.clip((rings - 0.25) / 0.75, 0, 1) ** 1.2         # bois d'été, plus sombre
    fibre = noise(s, 1.0, 32, 40)
    lum = 0.96 - 0.22 * late + 0.05 * fibre + 0.06 * noise(s, 2.6, 33, 4)
    col = np.stack([lum, lum * 0.97, lum * 0.93], -1)
    relief = -0.7 * late + 0.25 * fibre
    save('bois', col)
    save('bois_n', normals(relief, 0.08))


# Laine de verre : feutre de fibres jaunes dans tous les sens
def laine():
    s = 512
    fibres = np.max([noise(s, 1.3, 40 + i, 16, a) for i, a in enumerate(np.linspace(0, np.pi, 6, endpoint=False))], 0)
    fluff = noise(s, 2.6, 47)
    relief = 0.7 * fibres + 0.6 * fluff
    t = np.clip(0.5 + 0.18 * relief, 0, 1)
    col = mix(hexrgb('#b9891c'), hexrgb('#f4d877'), t)
    save('laine', col)
    save('laine_n', normals(relief, 0.35))


# Écran sous-toiture : film gris bleuté, bande de recouvrement et marquage imprimé, plis légers
def ecran():
    s = 512
    lum = 1 + 0.025 * noise(s, 2.5, 51) + 0.02 * noise(s, 0.6, 52)
    col = hexrgb('#c9d2da')[None, None, :] * lum[..., None]
    img = Image.fromarray(np.clip(col * 255, 0, 255).astype(np.uint8), 'RGB')
    d = ImageDraw.Draw(img)
    d.rectangle([0, 40, s, 52], fill=(74, 112, 160))                   # bande de recouvrement
    for y in range(150, s, 112):                                       # marquage (pavés de texte)
        for x in range(10, s, 128):
            d.rectangle([x, y, x + 64, y + 6], fill=(98, 110, 124))
            d.rectangle([x + 70, y, x + 92, y + 6], fill=(98, 110, 124))
    col = np.asarray(img, dtype=float) / 255
    relief = 0.8 * noise(s, 3.4, 53, 3, 0.3) + 0.15 * noise(s, 0.8, 54)
    save('ecran', col)
    save('ecran_n', normals(relief, 0.05))


# Brique de la souche : appareil en panneresses, joints creusés, briques toutes différentes
def brique():
    s = 512
    rows, per = 8, 2
    bh = s // rows
    bw = s // per
    joint = 7
    rng = np.random.default_rng(61)
    col = np.zeros((s, s, 3))
    relief = np.zeros((s, s))
    mortar = hexrgb('#cfc8bb')
    yy, xx = np.mgrid[0:s, 0:s]
    grain = noise(s, 1.2, 62)
    for r in range(rows):
        offset = (r % 2) * bw // 2
        for c in range(per + 1):
            x0 = (c * bw + offset) % s
            base = hexrgb(['#9b4a33', '#a85a3c', '#8a4230', '#b0623f', '#94503a', '#7f3d2c'][rng.integers(6)])
            base = base * (0.88 + 0.24 * rng.random())
            inside = (yy >= r * bh + joint // 2) & (yy < (r + 1) * bh - joint // 2)
            xs = (xx - x0) % s
            inside &= (xs >= joint // 2) & (xs < bw - joint // 2)
            col[inside] = base
            relief[inside] = 1.0
    is_mortar = relief == 0
    col[is_mortar] = mortar
    shade = 1 + 0.08 * grain + 0.06 * noise(s, 2.4, 63)
    col *= shade[..., None]
    relief = blur(relief, 1.2) + 0.06 * grain
    save('brique', col)
    save('brique_n', normals(relief, 0.25))


# Crépi : enduit gratté, grain fin et régulier
def crepi():
    s = 512
    grains = blur(np.clip(noise(s, 0.4, 71), 0.6, None), 0.7)
    relief = 0.85 * grains + 0.25 * noise(s, 2.4, 72)
    lum = 0.97 + 0.02 * noise(s, 2.8, 73) - 0.05 * np.clip(grains - 0.6, 0, None)
    col = np.stack([lum, lum * 0.99, lum * 0.965], -1)
    save('crepi', col)
    save('crepi_n', normals(relief, 0.22))


# Gazon : brins dans tous les sens, nuances de vert et touches plus sèches
def gazon():
    s = 512
    blades = np.max([noise(s, 0.9, 80 + i, 7, a) for i, a in enumerate(np.linspace(0, np.pi, 8, endpoint=False))], 0)
    patch = noise(s, 3.4, 90)
    dry = np.clip(noise(s, 3.0, 91), 0.6, None) - 0.6
    t = np.clip(0.48 + 0.26 * blades + 0.07 * patch, 0, 1)
    col = mix(hexrgb('#335f22'), hexrgb('#7aa947'), t)
    col = mix(col, hexrgb('#a3a35a'), np.clip(dry * 0.6, 0, 0.3))
    col *= (0.8 + 0.2 * np.clip(0.5 + 0.4 * blades, 0, 1))[..., None]
    save('gazon', col, quality=86)


# Terre de l'îlot, vue en coupe : motte de gazon, terre végétale, sous-sol caillouteux
def terre():
    w, h = 512, 256
    y = np.arange(h)[:, None] / h
    edge1 = 0.07 + 0.012 * noise((h, w), 3.0, 101)[0:1, :]
    edge2 = 0.42 + 0.05 * noise((h, w), 3.0, 102)[0:1, :]
    grain = noise((h, w), 0.8, 103)
    topsoil = mix(hexrgb('#3a281a'), hexrgb('#4e3624'), np.clip(0.5 + 0.3 * grain, 0, 1))
    subsoil = mix(hexrgb('#6e5137'), hexrgb('#8a6a4a'), np.clip(0.5 + 0.3 * grain, 0, 1))
    turf = mix(hexrgb('#2f4a1d'), hexrgb('#4f6b2a'), np.clip(0.5 + 0.3 * grain, 0, 1))
    col = np.where((y < edge1)[..., None], turf, np.where((y < edge2)[..., None], topsoil, subsoil))
    relief = 0.5 * grain
    rng = np.random.default_rng(104)
    yy, xx = np.mgrid[0:h, 0:w]
    for _ in range(140):                                               # cailloux du sous-sol
        cx, cy = rng.random() * w, 0.45 * h + rng.random() * 0.55 * h
        rx, ry = 3 + rng.random() * 9, 2 + rng.random() * 6
        dx = (xx - cx + w / 2) % w - w / 2
        d = (dx / rx) ** 2 + ((yy - cy) / ry) ** 2
        m = d < 1
        tone = hexrgb(['#b9ae9c', '#9d9384', '#c7bda9', '#8c8274'][rng.integers(4)])
        col[m] = tone * (0.75 + 0.35 * (1 - d[m]))[..., None]
        relief[m] += 1.2 * np.sqrt(1 - d[m])
    save('terre', col)
    save('terre_n', normals(relief, 0.3))


# Dalles de pierre de l'allée : pierre beige grisé, pores et nuances
def dalle():
    s = 512
    pores = specks((s, s), 0.01, 112)
    relief = 0.6 * noise(s, 2.0, 111) + 0.4 * noise(s, 0.7, 113) - 0.8 * blur(pores.astype(float), 0.6)
    lum = 1 + 0.06 * noise(s, 3.0, 114) + 0.03 * noise(s, 1.0, 115)
    col = hexrgb('#c4beb2')[None, None, :] * lum[..., None]
    col[pores] *= 0.7
    save('dalle', col)
    save('dalle_n', normals(relief, 0.1))


# Peinture du bac acier : peau d'orange très fine
def acier():
    s = 256
    save('acier_n', normals(noise(s, 2.2, 121), 0.02))


# Volets et porte : planches verticales peintes, joints et fil du bois
def planches():
    s = 256
    x = np.arange(s)[None, :] / s
    boards = 5
    pos = (x * boards) % 1
    groove = np.exp(-((pos - 0.0) / 0.02) ** 2) + np.exp(-((pos - 1.0) / 0.02) ** 2)
    fibre = noise(s, 1.2, 131, 30, np.pi / 2)
    relief = -1.0 * groove + 0.08 * fibre
    lum = 1 - 0.25 * groove + 0.02 * fibre + 0.02 * noise(s, 2.5, 132)
    save('planches', np.stack([lum, lum, lum], -1))
    save('planches_n', normals(relief, 0.15))


# Feuillage des massifs : bouquet de feuilles détouré (canal alpha), éclairé par le haut
def feuilles():
    big = 1024
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(141)
    leaves = []
    for _ in range(38):
        cx, cy = big * (0.18 + 0.64 * rng.random()), big * (0.18 + 0.64 * rng.random())
        ang = rng.random() * 2 * np.pi
        length = big * (0.13 + 0.09 * rng.random())
        width = length * (0.36 + 0.12 * rng.random())
        leaves.append((cy, cx, ang, length, width))
    leaves.sort()
    for cy, cx, ang, length, width in leaves:
        pts = []
        for t in np.linspace(0, 1, 24):
            half = width * 0.5 * np.sin(np.pi * t) ** 0.8
            pts.append((t * length - length / 2, half))
        pts += [(px, -py) for px, py in reversed(pts)]
        c, s_ = np.cos(ang), np.sin(ang)
        poly = [(cx + px * c - py * s_, cy + px * s_ + py * c) for px, py in pts]
        shade = 0.7 + 0.45 * rng.random() - 0.25 * (cy / big)
        g = hexrgb(['#3f7a2a', '#4d8a33', '#36692a', '#5b9a3c'][rng.integers(4)]) * shade
        d.polygon(poly, fill=tuple(int(v * 255) for v in np.clip(g, 0, 1)) + (255,))
        tip = (cx + length / 2 * c, cy + length / 2 * s_)
        tail = (cx - length / 2 * c, cy - length / 2 * s_)
        d.line([tail, tip], fill=tuple(int(v * 255) for v in np.clip(g * 1.25, 0, 1)) + (255,), width=4)
    img = img.resize((256, 256), Image.LANCZOS)
    a = np.asarray(img, dtype=float) / 255
    save('feuilles', a[..., :3], alpha=a[..., 3], quality=90)


if __name__ == '__main__':
    for make in (ardoise, terre_cuite, bois, laine, ecran, brique, crepi, gazon, terre, dalle, acier, planches, feuilles):
        make()
        print('ok', make.__name__)
