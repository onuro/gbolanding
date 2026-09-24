#!/usr/bin/env python3
"""Lighting-pattern QA: mean luminance over a 2-pitch box at named facial points (head-relative W),
for the reference and a render framed identically. Removes the dot structure so the underlying
lit-face pattern (forehead / cheek / ridge / sockets / lips / chin) can be matched.
usage: python3 lightmap.py REF RENDER [--cx 990.5 --ey 703.5 --W 818 --box 28]
"""
import sys, argparse
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from run_qa import Img

POINTS = [
    ('crown', 0, -0.70), ('forehead_hl', 0, -0.47), ('forehead_lo', 0, -0.28), ('temple_L', -0.45, -0.30), ('temple_R', 0.45, -0.30),
    ('brow_L', -0.25, -0.14), ('socket_L', -0.25, 0.0), ('socket_R', 0.25, 0.0), ('undereye_L', -0.25, 0.10), ('undereye_R', 0.25, 0.10),
    ('cheek_L', -0.28, 0.20), ('cheek_R', 0.28, 0.20), ('cheekside_L', -0.47, 0.20), ('cheekside_R', 0.47, 0.20),
    ('ridge', 0, 0.12), ('nose_tip', 0, 0.27), ('under_nose', 0, 0.37), ('upper_lip', -0.08, 0.47), ('mouth_gap', 0, 0.545),
    ('lower_lip', 0, 0.595), ('chin', 0, 0.74), ('jaw_L', -0.36, 0.55), ('jaw_R', 0.36, 0.55), ('neck', 0, 0.97),
    ('side_L', -0.8, 0.1), ('side_R', 0.8, 0.1), ('hair_L', -0.75, 0.7), ('hair_R', 0.75, 0.7),
]

def box(img, x, y, b):
    s = 0; c = 0
    for yy in range(int(y - b / 2), int(y + b / 2), 2):
        for xx in range(int(x - b / 2), int(x + b / 2), 2):
            s += img.lum(xx, yy); c += 1
    return s / c

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('ref'); ap.add_argument('render')
    ap.add_argument('--cx', type=float, default=990.5); ap.add_argument('--ey', type=float, default=703.5)
    ap.add_argument('--W', type=float, default=818); ap.add_argument('--box', type=float, default=28)
    a = ap.parse_args()
    A = Img(a.ref); B = Img(a.render)
    print(f"{'point':<13}{'ref':>7}{'render':>8}{'ratio':>7}")
    for n, u, v in POINTS:
        x, y = a.cx + u * a.W, a.ey + v * a.W
        ra, rb = box(A, x, y, a.box), box(B, x, y, a.box)
        print(f'{n:<13}{ra:7.1f}{rb:8.1f}{(rb / ra if ra > 0.5 else 0):7.2f}')
