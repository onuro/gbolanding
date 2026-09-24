#!/usr/bin/env python3
"""Haze / floor QA: per named point (head-relative W), over a 3-pitch box:
p10 (floor between dots = bloom + mist), p50, p90 (dot peaks) and mean. Ref vs render.
usage: python3 haze.py REF RENDER [--cx 990.5 --ey 703.5 --W 818 --box 42]
"""
import sys, argparse
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from run_qa import Img

POINTS = [
    ('forehead_hl', 0, -0.47), ('forehead_lo', 0, -0.28), ('crown', 0, -0.70), ('temple_L', -0.45, -0.30), ('temple_R', 0.45, -0.30),
    ('cheek_L', -0.28, 0.20), ('cheek_R', 0.28, 0.20), ('ridge', 0, 0.12), ('cheekside_L', -0.47, 0.20), ('cheekside_R', 0.47, 0.20),
    ('jaw_L', -0.36, 0.55), ('chin', 0, 0.74),
    ('dissolve_L', -0.68, 0.10), ('dissolve_R', 0.62, 0.10), ('outer_L', -0.95, 0.10), ('outer_R', 0.85, 0.10),
    ('far_L', -1.15, 0.30), ('top', 0, -0.85), ('top_L', -0.5, -0.75), ('hair_L', -0.75, 0.7), ('below_chin', 0, 0.95),
]

def stats(img, x, y, b):
    v = sorted(img.lum(xx, yy) for yy in range(int(y - b / 2), int(y + b / 2)) for xx in range(int(x - b / 2), int(x + b / 2)))
    c = len(v)
    return v[c // 10], v[c // 2], v[9 * c // 10], sum(v) / c

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('ref'); ap.add_argument('render')
    ap.add_argument('--cx', type=float, default=990.5); ap.add_argument('--ey', type=float, default=703.5)
    ap.add_argument('--W', type=float, default=818); ap.add_argument('--box', type=float, default=42)
    a = ap.parse_args()
    A = Img(a.ref); B = Img(a.render)
    print(f"{'point':<12} {'ref p10/p50/p90/mean':>24}   {'render p10/p50/p90/mean':>24}")
    for n, u, v in POINTS:
        x, y = a.cx + u * a.W, a.ey + v * a.W
        ra, rb = stats(A, x, y, a.box), stats(B, x, y, a.box)
        f = lambda s: '/'.join(f'{q:.0f}' for q in s)
        print(f'{n:<12} {f(ra):>24}   {f(rb):>24}')
