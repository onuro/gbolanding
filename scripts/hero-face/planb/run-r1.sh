#!/bin/sh
# Plan B round 1, end to end (about 1 min): both look meshes, the engine-v003 bundle, the r1 sheets.
#   lab/mesh-sfp (final rig, run.sh) -> mesh-r1.sh -> lab/mesh-sfr (sculpt proportions) + lab/mesh-sfw (+ retouch <8%)
#   -> preset 'planb-r1' in planb/lab/engine-v003 (snapshot of src 03:03, never src/) -> sheets/r1-*.png
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
PB=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planb
cd /tmp
sh "$HERE/mesh-r1.sh" sfr > $PB/logs/mesh-sfr.log 2>&1 &
RETOUCH="$(cat "$HERE/retouch-r1.flags")" sh "$HERE/mesh-r1.sh" sfw > $PB/logs/mesh-sfw.log 2>&1 &
wait
BUILD=1 sh "$HERE/sheets-r1.sh" sfw sfr planb-r1
