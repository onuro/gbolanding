#!/bin/sh
# Plan B x approved-v002 look, end to end (about 40 s): per-mesh look data for the rigged sculpt, then the sheets.
#   lab/mesh-sfp.{json,bin} (final rig, run.sh)  ->  lab/mesh-sfb.{json,bin}  ->  sheets/*.png
# The look itself is preset 'planb-v002' in the engine SNAPSHOT planb/lab/engine-v002 (never src/).
#   sh look-v002.sh            mesh + bundle + sheets
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
cd /tmp
# rest shape: brows lifted (the sculpt's brows sit low and slope to the nose), relaxed lids (blink 0.1 renormalised so
# blink 1 still closes exactly, squint 0.2); human iris 0.047 W; lower-lid rim tagged as the lacrimal line; brow
# ribbons / lash strips shaded as hair (darker, smoothed normals); shoulders out of the hair fit; jawOpen x1.35
node "$HERE/sfp-look-mesh.mjs" --name sfb \
  --rest browInnerUpLeft:0.5,browInnerUpRight:0.5,eyeBlinkLeft:0.1,eyeBlinkRight:0.1,eyeSquintLeft:0.2,eyeSquintRight:0.2 \
  --rest-renorm eyeBlinkLeft,eyeBlinkRight \
  --iris 0.047 --rim-mode skin --lid-rim 0.02 \
  --brow 0.7 --brow-flat 0.85 --lash 0.6 --lash-flat 0.6 \
  --hair-y -1.02 --jaw-gain 1.35
BUILD=1 sh "$HERE/sheets-v002.sh" sfb planb-v002
