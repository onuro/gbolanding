#!/usr/bin/env python3
"""Numeric look QA for the hero face (PLAN.md §10). Pure Python + ffmpeg, no numpy.

Runs the same measurements as the scratchpad scripts (an.py pitch autocorrelation, dotsize.py FWHM,
falloff.py lateral density, color.py histogram/tint, stars.py, prof.py landmark rows) on ANY image,
in head-relative units so a render framed like ref 2 is measured exactly like ref 2.

usage:
  python3 run_qa.py IMAGE [--ref REF_IMAGE] [--cx 990.5 --ey 703.5 --ipd 409 --pitch 13.86]
                    [--rcx .. --rey .. --ripd .. --rpitch ..] [--json out.json] [--quick]
Head params: cx/ey = catchlight midpoint (eye line) in px, ipd = catchlight distance in px (W = 2 ipd),
pitch = expected lattice pitch in px. Defaults are ref 2 (10.webp, 1832x1580).
"""
import sys, math, json, subprocess, argparse

def load(path):
    probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                            '-of', 'csv=p=0', path], capture_output=True, text=True, check=True).stdout.strip().split(',')
    w, h = int(probe[0]), int(probe[1])
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    assert len(raw) == w * h * 3, (len(raw), w, h)
    return w, h, raw

class Img:
    def __init__(self, path):
        self.path = path
        self.w, self.h, self.b = load(path)
        w, h, b = self.w, self.h, self.b
        self.L = []
        for y in range(h):
            base = y * w * 3
            self.L.append([0.2126 * b[base + 3 * x] + 0.7152 * b[base + 3 * x + 1] + 0.0722 * b[base + 3 * x + 2] for x in range(w)])
    def lum(self, x, y):
        if x < 0 or y < 0 or x >= self.w or y >= self.h: return 0.0
        return self.L[y][x]
    def rgb(self, x, y):
        i = (y * self.w + x) * 3; return self.b[i], self.b[i + 1], self.b[i + 2]

# ------------------------------------------------------------------ an.py pitch
def autocorr(sig, maxlag):
    m = sum(sig) / len(sig); s = [v - m for v in sig]; d = sum(v * v for v in s) or 1
    return [sum(s[i] * s[i + l] for i in range(len(s) - l)) / d for l in range(maxlag)]
def pitch(img, x0, y0, x1, y1, axis):
    acc = None; cnt = 0
    if axis == 0:
        for y in range(y0, y1, 2):
            a = autocorr([img.lum(x, y) for x in range(x0, x1)], 40); acc = a if acc is None else [p + q for p, q in zip(acc, a)]; cnt += 1
    else:
        for x in range(x0, x1, 2):
            a = autocorr([img.lum(x, y) for y in range(y0, y1)], 40); acc = a if acc is None else [p + q for p, q in zip(acc, a)]; cnt += 1
    acc = [v / cnt for v in acc]
    for l in range(6, 39):
        if acc[l] > acc[l - 1] and acc[l] >= acc[l + 1]:
            a, b_, c = acc[l - 1], acc[l], acc[l + 1]; off = 0.5 * (a - c) / (a - 2 * b_ + c) if (a - 2 * b_ + c) != 0 else 0
            return l + off
    return None

# ------------------------------------------------------------------ dotsize.py
def dotsize(img, p, x0, y0, x1, y1):
    Lf = img.lum; R = int(p * 0.35); hp = int(p / 2); res = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            v = Lf(x, y)
            if v < 30: continue
            ok = True
            for dy in range(-R, R + 1):
                for dx in range(-R, R + 1):
                    if (dx or dy) and Lf(x + dx, y + dy) > v: ok = False; break
                if not ok: break
            if not ok: continue
            fl = min(Lf(x + dx, y + dy) for dy in (-hp, 0, hp) for dx in (-hp, 0, hp) if dx or dy)
            half = fl + (v - fl) * 0.5; ds = []
            for (ux, uy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                k = 0
                while k < p and Lf(x + ux * k, y + uy * k) > half: k += 1
                ds.append(k)
            res.append((v, fl, (ds[0] + ds[1] + ds[2] + ds[3]) / 2.0 / p))
    bins = {}
    for v, fl, d in res: bins.setdefault(min(6, int(v // 40)), []).append((fl, d))
    out = {}
    for k in sorted(bins):
        a = bins[k]; c = len(a); ds = sorted(x[1] for x in a)
        out[f'{k*40}-{k*40+39 if k<6 else 255}'] = {'n': c, 'floor': round(sum(x[0] for x in a) / c, 1), 'fwhm': round(ds[c // 2], 3)}
    mid = sorted(d for v, fl, d in res if 40 <= v < 160)
    clip = sorted(d for v, fl, d in res if v >= 240)
    return out, (mid[len(mid) // 2] if mid else None), (clip[len(clip) // 2] if clip else None)

# ------------------------------------------------------------------ maxima (falloff.py)
def maxima(img, thr, R=2):
    L = img.L; w, h = img.w, img.h; out = []
    for y in range(R, h - R):
        r = L[y]
        for x in range(R, w - R):
            v = r[x]
            if v < thr: continue
            ok = True
            for dy in range(-R, R + 1):
                rr = L[y + dy]
                for dx in range(-R, R + 1):
                    if (dx or dy) and (rr[x + dx] > v or (rr[x + dx] == v and (dy < 0 or (dy == 0 and dx < 0)))): ok = False; break
                if not ok: break
            if ok: out.append((x, y, v))
    return out

def falloff(mx, cx, ey, ipd, p, img_w):
    y0 = ey - 0.4 * ipd; y1 = ey + 1.1 * ipd
    bins = {}; side = {}
    for x, y, v in mx:
        if y0 <= y < y1:
            d = abs(x - cx) / ipd; k = int(d / 0.25)
            bins.setdefault(k, []).append(v)
            side.setdefault(('L' if x < cx else 'R', k), []).append(v)
    cells_both = (0.25 * ipd * 2) * (y1 - y0) / (p * p)
    series = {}
    for k in sorted(bins):
        vs = bins[k]
        series[f'{k*0.25:.2f}'] = {'dens': round(len(vs) / cells_both, 3), 'mean': round(sum(vs) / len(vs)), 'frac200': round(sum(1 for v in vs if v > 200) / len(vs), 3)}
    one = cells_both / 2
    lr = {}
    for (s, k), vs in sorted(side.items()):
        # clip the bin to the image extent
        lo = k * 0.25 * ipd; hi = lo + 0.25 * ipd
        avail = (min(hi, cx) - lo) if s == 'L' else (min(hi, img_w - cx) - lo)
        if avail <= 0.1 * ipd: continue
        lr.setdefault(s, {})[f'{k*0.25:.2f}'] = round(len(vs) / (one * avail / (0.25 * ipd)), 3)
    return series, lr

def vertical_density(mx, cx, ey, ipd, p):
    vb = {}
    for x, y, v in mx:
        if abs(x - cx) < 0.6 * ipd:
            k = math.floor((y - ey) / ipd / 0.25); vb.setdefault(k, []).append(v)
    cells = (1.2 * ipd) * (0.25 * ipd) / (p * p)
    return {f'{k*0.25:.2f}': round(len(vb[k]) / cells, 3) for k in sorted(vb)}

def density_map(mx, cx, ey, W, p, w, h, step=0.125):
    # maxima per lattice cell in step x step W bins, rows top->bottom
    cells = (step * W) ** 2 / (p * p)
    nx0 = math.floor(-cx / (step * W)); nx1 = math.ceil((w - cx) / (step * W))
    ny0 = math.floor(-ey / (step * W)); ny1 = math.ceil((h - ey) / (step * W))
    grid = {}
    for x, y, v in mx:
        i = math.floor((x - cx) / (step * W)); j = math.floor((y - ey) / (step * W)); grid[(i, j)] = grid.get((i, j), 0) + 1
    rows = []
    for j in range(ny0, ny1):
        rows.append([round(grid.get((i, j), 0) / cells, 2) for i in range(nx0, nx1)])
    return {'u0': nx0 * step, 'v0': ny0 * step, 'step': step, 'rows': rows}

# ------------------------------------------------------------------ color.py
def color_stats(img):
    w, h, b = img.w, img.h, img.b
    bands = [(0, 4), (4, 20), (20, 60), (60, 120), (120, 200), (200, 245), (245, 256)]
    acc = {k: [0, 0, 0, 0] for k in bands}; hist = [0] * 256
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            i = (y * w + x) * 3; r, g, bb = b[i], b[i + 1], b[i + 2]; L = 0.2126 * r + 0.7152 * g + 0.0722 * bb
            hist[int(L)] += 1
            for k in bands:
                if k[0] <= L < k[1]: a = acc[k]; a[0] += r; a[1] += g; a[2] += bb; a[3] += 1; break
    tot = sum(hist); cum = 0; pct = {}
    for v in range(256):
        cum += hist[v]
        for q in (50, 75, 90, 95, 99, 99.9):
            if q not in pct and cum / tot * 100 >= q: pct[q] = v
    out = {}
    for k, a in acc.items():
        c = a[3] or 1
        out[f'{k[0]}-{k[1]}'] = {'frac': round(a[3] / tot, 4), 'rgb': [round(a[0] / c, 1), round(a[1] / c, 1), round(a[2] / c, 1)], 'GR': round((a[1] / c) / max(a[0] / c, 0.01), 3), 'BR': round((a[2] / c) / max(a[0] / c, 0.01), 3)}
    return out, {str(k): v for k, v in pct.items()}, hist[0] / tot, sum(hist[245:]) / tot

# ------------------------------------------------------------------ prof.py rows + landmarks
def vprofile(img, xa, xb, step=10):
    out = []
    for y0 in range(0, img.h, step):
        s = 0; c = 0
        for x in range(max(0, xa), min(img.w, xb), 2):
            for y in range(y0, min(img.h, y0 + step), 2): s += img.lum(x, y); c += 1
        out.append((y0 + step / 2, s / c))
    return out

def landmarks(img, cx, ey, W):
    prof = vprofile(img, int(cx - 0.134 * W), int(cx + 0.134 * W), 6)
    def ext(lo, hi, fn):
        c = [(v, y) for y, v in prof if lo <= (y - ey) / W <= hi]
        if not c: return None
        v, y = fn(c); return round((y - ey) / W, 3), round(v, 1)
    return {
        'nostril_dark': ext(0.30, 0.44, min), 'upper_lip': ext(0.40, 0.50, max), 'mouth_gap': ext(0.47, 0.58, min),
        'lower_lip': ext(0.55, 0.66, max), 'mentolabial': ext(0.60, 0.70, min), 'chin': ext(0.66, 0.82, max),
    }

def ridge_profile(img, cx, ey, W):
    # x-profile across the ridge, rows v in [0.1, 0.22] W
    ya, yb = int(ey + 0.10 * W), int(ey + 0.22 * W)
    xs = range(int(cx - 0.12 * W), int(cx + 0.12 * W), 3)
    prof = [(x, sum(img.lum(x, y) for y in range(ya, yb, 2)) / len(range(ya, yb, 2))) for x in xs]
    pk = max(v for x, v in prof); above = [x for x, v in prof if v >= pk * 0.5]
    return round(pk, 1), round((max(above) - min(above) + 3) / W, 3), round((sum(x for x, v in prof if v >= pk * 0.5) / len(above) - cx) / W, 3)

def stars(img, cx, cy, ipd, rmin=2.0, R=6):
    L = img.L; w, h = img.w, img.h; out = []
    for y in range(R, h - R):
        r = L[y]
        for x in range(R, w - R):
            v = r[x]
            if v < 40: continue
            d = math.hypot((x - cx) / ipd, (y - cy) / ipd / 1.3)
            if d < rmin: continue
            ok = True
            for yy in range(y - R, y + R + 1):
                rr = L[yy]
                for xx in range(x - R, x + R + 1):
                    if (xx != x or yy != y) and (rr[xx] > v or (rr[xx] == v and (yy, xx) < (y, x))): ok = False; break
                if not ok: break
            if ok: out.append(v)
    return {'n': len(out), 'sat': sum(1 for v in out if v >= 240), 'mid': sum(1 for v in out if 150 <= v < 240), 'dim': sum(1 for v in out if v < 150)}

def region_stats(img, x0, y0, x1, y1):
    v = sorted(img.lum(x, y) for y in range(y0, y1) for x in range(x0, x1)); c = len(v)
    return {'p10': round(v[c // 10]), 'p50': round(v[c // 2]), 'p90': round(v[9 * c // 10]), 'mean': round(sum(v) / c, 1)}

def measure(path, cx, ey, ipd, p, quick=False):
    img = Img(path); W = 2 * ipd
    R = lambda u0, v0, u1, v1: (int(cx + u0 * W), int(ey + v0 * W), int(cx + u1 * W), int(ey + v1 * W))
    res = {'path': path, 'size': [img.w, img.h], 'head': {'cx': cx, 'ey': ey, 'ipd': ipd, 'W': W, 'pitch_expected': p}}
    pc = R(-0.42, 0.10, -0.12, 0.34); pf = R(-0.22, -0.60, 0.22, -0.36)
    res['pitch'] = {'cheekH': pitch(img, *pc, 0), 'cheekV': pitch(img, *pc, 1), 'foreheadH': pitch(img, *pf, 0), 'foreheadV': pitch(img, *pf, 1)}
    res['pitch_W_over'] = {k: (round(W / v, 2) if v else None) for k, v in res['pitch'].items()}
    ds, mid, clip = dotsize(img, p, *R(-0.45, -0.62, 0.45, 0.80))
    res['dotsize'] = {'bins': ds, 'mid_fwhm': mid, 'clip_fwhm': clip}
    mx = maxima(img, 50)
    series, lr = falloff(mx, cx, ey, ipd, p, img.w)
    res['falloff'] = series; res['falloff_side'] = lr
    core = [v for x, y, v in mx if abs(x - cx) < 0.75 * ipd and ey - 0.4 * ipd <= y < ey + 1.1 * ipd]
    res['core_frac200'] = round(sum(1 for v in core if v > 200) / max(1, len(core)), 3)
    res['vertical_density'] = vertical_density(mx, cx, ey, ipd, p)
    res['density_map'] = density_map(mx, cx, ey, W, p, img.w, img.h)
    cs, pct, zero, sat = color_stats(img)
    res['color'] = cs; res['percentiles'] = pct; res['frac_zero'] = round(zero, 4); res['frac_ge245'] = round(sat, 4)
    res['min_lum'] = round(min(min(r) for r in img.L), 2)
    res['landmarks'] = landmarks(img, cx, ey, W)
    res['ridge'] = dict(zip(('peak', 'fwhm_W', 'centre_W'), ridge_profile(img, cx, ey, W)))
    res['regions'] = {'eye_socket_L': region_stats(img, *R(-0.36, -0.07, -0.14, 0.05)), 'mouth_gap': region_stats(img, *R(-0.09, 0.52, 0.09, 0.56)),
                      'ridge': region_stats(img, *R(-0.025, 0.02, 0.025, 0.26))}
    if not quick: res['stars'] = stars(img, cx, ey, ipd)
    return res

def compare(r, ref):
    rows = []
    def add(name, val, target, ok): rows.append((name, val, target, 'PASS' if ok else 'FAIL'))
    W = r['head']['W']
    for k in ('cheekH', 'cheekV', 'foreheadH', 'foreheadV'):
        v = r['pitch'][k]; ok = v is not None and abs(v / (W / 59) - 1) <= 0.03
        add(f'pitch {k} (px)', v and round(v, 2), f'W/59={W/59:.2f} +-3%', ok)
    m = r['dotsize']['mid_fwhm']; add('mid-dot FWHM (p)', m, '0.36-0.45', m is not None and 0.36 <= m <= 0.45)
    c = r['dotsize']['clip_fwhm']; add('clipped-dot FWHM (p)', c, '>=0.65', c is not None and c >= 0.65)
    add('core dots >200', r['core_frac200'], '0.45-0.52', 0.45 <= r['core_frac200'] <= 0.52)
    for k in ('1.00', '1.25', '1.50', '1.75', '2.00', '2.25'):
        v = r['falloff'].get(k, {}).get('dens', 0); t = ref['falloff'].get(k, {}).get('dens', 0)
        add(f'side density |dx|/IPD {k}', v, f'{t} +-25%', t > 0 and abs(v / t - 1) <= 0.25)
    for q in (50, 75, 90, 95, 99):
        v = r['percentiles'][str(q)]; t = ref['percentiles'][str(q)]
        add(f'histogram p{q}', v, f'{t} +-15%', abs(v - t) <= max(0.15 * t, 1.0))
    gr = r['color']['60-120']['GR']; add('mid-tone G/R', gr, '1.08-1.20', 1.08 <= gr <= 1.20)
    add('background min', r['min_lum'], '0', r['min_lum'] == 0)
    add('frac pixels == 0', r['frac_zero'], f"ref {ref['frac_zero']}", r['frac_zero'] >= 0.5 * ref['frac_zero'])
    for k in ('nostril_dark', 'upper_lip', 'mouth_gap', 'lower_lip', 'mentolabial', 'chin'):
        v = r['landmarks'][k]; t = ref['landmarks'][k]
        add(f'landmark {k} (W)', v and v[0], f'{t and t[0]} +-0.03', v is not None and t is not None and abs(v[0] - t[0]) <= 0.03)
    return rows

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('image'); ap.add_argument('--ref')
    ap.add_argument('--cx', type=float, default=990.5); ap.add_argument('--ey', type=float, default=703.5)
    ap.add_argument('--ipd', type=float, default=409); ap.add_argument('--pitch', type=float, default=13.86)
    ap.add_argument('--rcx', type=float, default=990.5); ap.add_argument('--rey', type=float, default=703.5)
    ap.add_argument('--ripd', type=float, default=409); ap.add_argument('--rpitch', type=float, default=13.86)
    ap.add_argument('--ref-json'); ap.add_argument('--json'); ap.add_argument('--quick', action='store_true')
    a = ap.parse_args()
    r = measure(a.image, a.cx, a.ey, a.ipd, a.pitch, a.quick)
    ref = None
    if a.ref_json:
        ref = json.load(open(a.ref_json))
    elif a.ref:
        ref = measure(a.ref, a.rcx, a.rey, a.ripd, a.rpitch, a.quick)
    out = {'render': r, 'ref': ref}
    if ref:
        rows = compare(r, ref); out['table'] = rows
        wN = max(len(x[0]) for x in rows)
        print(f"{'metric':<{wN}}  {'value':>10}  {'target':<22} result")
        for n, v, t, s in rows: print(f'{n:<{wN}}  {str(v):>10}  {t:<22} {s}')
        print(f"passed {sum(1 for x in rows if x[3]=='PASS')}/{len(rows)}")
    if a.json: json.dump(out, open(a.json, 'w'), indent=1)
    if not ref: print(json.dumps({k: r[k] for k in r if k not in ('density_map', 'color')}, indent=1))
