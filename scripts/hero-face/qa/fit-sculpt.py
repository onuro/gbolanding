#!/usr/bin/env python3
"""Fit the cell-scale light map (look.sculptMap) so a render's lit pattern matches ref 2.

Feedback loop: render the lab still with the current map, compare the mean luminance of every map
cell (a ~0.075 W box, so the dot structure averages out) against the same box in the reference, and
update the map multiplicatively in log space. Only cells fully inside the head silhouette are fitted;
the eye sockets and the nose-tip / mouth block are excluded, because there the female identity's
geometry (shorter nose and philtrum) differs from the reference's male face; those stay driven by the
mesh lighting. Border texels stay 1.

usage:
  python3 fit-sculpt.py --url "http://127.0.0.1:8761/lab/f5.html?mesh=f5&frame=ref2<look query>" \
      --capture <capture.mjs> --ref 10.webp --out map.json [--iters 6] [--init map.json] [--alpha 0.7]
The url must NOT contain &sculpt=; the fitter appends it (the map json must be reachable by the url's
server, so --out has to live under the served directory; --serve-prefix maps it to a url path).
"""
import sys, os, math, json, argparse, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from run_qa import Img

CX, EY, WPX = 990.5, 703.5, 818.0

def grid(nx, ny, rect):
    x0, y0, x1, y1 = rect
    return [(x0 + (x1 - x0) * i / (nx - 1), y0 + (y1 - y0) * j / (ny - 1)) for j in range(ny) for i in range(nx)]

def box_mean(img, x, y, b):
    s = 0.0; c = 0
    for yy in range(int(y - b / 2), int(y + b / 2), 2):
        for xx in range(int(x - b / 2), int(x + b / 2), 2):
            s += img.lum(xx, yy); c += 1
    return s / max(1, c)

def weight(x, y, cov, pupils):
    """fit weight for a map point at object (x, y) (W, y up)."""
    # only cells well inside the silhouette: the rim and flanks belong to the dissolve (envelope,
    # survivors, mist), and pushing them up paints a bright outline
    if cov < 0.85: return 0.0
    w = min(1.0, (cov - 0.85) / 0.13)
    ax = abs(x)
    if ax > 0.52: return 0.0
    if ax > 0.40: w *= (0.52 - ax) / 0.12
    v = -y
    for px, py in pupils:  # eye sockets (the socket ellipse + lids are the eye work, not the map)
        d = math.hypot((x - px) / 0.19, (y - py) / 0.115)
        if d < 1.0: return 0.0
        w *= min(1.0, (d - 1.0) / 0.25)
    if abs(x) < 0.24 and 0.19 < v < 0.69:  # nose tip, nostrils, lips (identity geometry)
        return 0.0
    if abs(x) < 0.3 and 0.14 < v < 0.75:
        w *= 0.4
    return w

def capture(capture_js, url, out):
    r = subprocess.run(['node', capture_js, '--url', url, '--out', out, '--w', '916', '--h', '790', '--dpr', '2', '--timeout', '30000'], capture_output=True, text=True)
    if '"ok": true' not in r.stdout: raise SystemExit('capture failed: ' + r.stdout[-800:] + r.stderr[-400:])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', required=True); ap.add_argument('--capture', required=True); ap.add_argument('--ref', required=True)
    ap.add_argument('--out', required=True); ap.add_argument('--serve-root', required=True, help='directory the url server serves')
    ap.add_argument('--iters', type=int, default=6); ap.add_argument('--alpha', type=float, default=0.7)
    ap.add_argument('--init'); ap.add_argument('--nx', type=int, default=27); ap.add_argument('--ny', type=int, default=30)
    ap.add_argument('--rect', default='-0.78,-0.9,0.78,0.84'); ap.add_argument('--box', type=float, default=0.075)
    ap.add_argument('--lo', type=float, default=0.2); ap.add_argument('--hi', type=float, default=2.4)
    ap.add_argument('--work', default=None)
    a = ap.parse_args()
    rect = [float(v) for v in a.rect.split(',')]
    nx, ny = a.nx, a.ny
    pts = grid(nx, ny, rect)
    work = a.work or os.path.dirname(os.path.abspath(a.out))
    os.makedirs(work, exist_ok=True)
    rel = os.path.relpath(os.path.abspath(a.out), os.path.abspath(a.serve_root))
    base_url = a.url.split('#')[0]
    sep = '&' if '?' in base_url else '?'
    b = a.box * WPX
    ref = Img(a.ref)
    refv = [box_mean(ref, CX + x * WPX, EY - y * WPX, b) for x, y in pts]
    # silhouette coverage (ghost mask view: tone(1) ~ 0.68 -> ~174/255 inside)
    mpath = os.path.join(work, 'fit-mask.png')
    capture(a.capture, base_url + f'{sep}view=mask&sculpt=none', mpath)
    mimg = Img(mpath)
    inside = max(box_mean(mimg, CX, EY - 0.3 * WPX, 20), 1.0)
    cov = [box_mean(mimg, CX + x * WPX, EY - y * WPX, b) / inside for x, y in pts]
    pupils = [(-0.25, 0.0), (0.25, 0.0)]
    wts = [weight(x, y, c, pupils) for (x, y), c in zip(pts, cov)]
    m = [1.0] * (nx * ny)
    if a.init:
        m = json.load(open(a.init))['data']
    def save(data, path):
        json.dump({'rect': rect, 'nx': nx, 'ny': ny, 'data': [round(v, 4) for v in data]}, open(path, 'w'))
    for it in range(a.iters + 1):
        save(m, a.out)
        rpath = os.path.join(work, f'fit-it{it}.png')
        capture(a.capture, base_url + f'{sep}sculpt={rel}', rpath)
        img = Img(rpath)
        ren = [box_mean(img, CX + x * WPX, EY - y * WPX, b) for x, y in pts]
        err = [math.log((rv + 6) / (qv + 6)) for rv, qv in zip(refv, ren)]
        sw = sum(wts) or 1
        rms = math.sqrt(sum(w * e * e for w, e in zip(wts, err)) / sw)
        bias = sum(w * e for w, e in zip(wts, err)) / sw
        print(f'iter {it}: weighted log-RMS {rms:.3f}  bias {bias:+.3f}  (cells fitted {sum(1 for w in wts if w > 0)})', flush=True)
        if it == a.iters: break
        # multiplicative update in log space, weighted, then a light 3x3 smoothing of the log map
        lm = [math.log(v) for v in m]
        for k in range(len(m)):
            if wts[k] <= 0: continue
            step = max(-0.5, min(0.5, a.alpha * err[k] * wts[k]))
            lm[k] += step
        sm = lm[:]
        for j in range(ny):
            for i in range(nx):
                k = j * nx + i
                if wts[k] <= 0: continue
                acc = 0.0; ws = 0.0
                for dj in (-1, 0, 1):
                    for di in (-1, 0, 1):
                        ii, jj = i + di, j + dj
                        if 0 <= ii < nx and 0 <= jj < ny:
                            ww = (2.0 if di == 0 and dj == 0 else 0.5 if di == 0 or dj == 0 else 0.25)
                            acc += ww * lm[jj * nx + ii]; ws += ww
                sm[k] = 0.6 * lm[k] + 0.4 * acc / ws
        for j in range(ny):
            for i in range(nx):
                k = j * nx + i
                if i == 0 or j == 0 or i == nx - 1 or j == ny - 1: sm[k] = 0.0
        m = [max(a.lo, min(a.hi, math.exp(v))) for v in sm]
    # report the worst cells
    worst = sorted(((abs(e), e, x, y, rv, qv) for e, (x, y), rv, qv, w in zip(err, pts, refv, ren, wts) if w > 0), reverse=True)[:8]
    for _, e, x, y, rv, qv in worst:
        print(f'  cell x {x:+.2f} v {-y:+.2f}: ref {rv:.0f} render {qv:.0f} (log err {e:+.2f})')

if __name__ == '__main__':
    main()
