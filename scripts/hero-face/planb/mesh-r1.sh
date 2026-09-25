#!/bin/sh
# Plan B round 1: the look-data mesh (lab/mesh-<name>) from the final rig export lab/mesh-sfp (sfp-look-mesh.mjs).
#   sh mesh-r1.sh [name (sfr)] [extra sfp-look-mesh flags ...]   (later flags override the base ones below)
# Base (the judges' r1 fixes, all from the rig's own targets or look data):
#   rest: brows up 0.5 (as v002), lids open, relaxed almond (no rest blink; squint 0.3, wide 0.05), a faint warm mouth (smile 0.1,
#         stretch 0.1, upper lip up 0.06) with slightly fuller lips (rollUpper -0.3, rollLower -0.2)
#   the sculpt's lash 'visor' + lower lash wings removed (anime shells; the lid's own margin becomes the lid line),
#   brows laid flat onto the skin as hair (0.75 tone), lifted 0.008 W inner / 0.018 W outer; vis / AO rebaked for the
#   new rest shape; lid margins from the front view (upper: 0.012 W film at 0.8 light, lower: 0.007 W tear line); jawOpen x1.35 with
#   0.3 upper-lip lift coupled in; funnel / pucker x1.3; teeth 0.012 W forward, 0.01 W down (show in open visemes)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
NAME=${1:-sfr}; [ $# -gt 0 ] && shift
cd /tmp
node "$HERE/sfp-look-mesh.mjs" --name $NAME \
  --rest ${REST:-browInnerUpLeft:0.5,browInnerUpRight:0.5,eyeSquintLeft:0.3,eyeSquintRight:0.3,eyeWideLeft:0.05,eyeWideRight:0.05,mouthSmileLeft:0.1,mouthSmileRight:0.1,mouthStretchLeft:0.1,mouthStretchRight:0.1,mouthUpperUpLeft:0.06,mouthUpperUpRight:0.06,mouthRollUpper:-0.3,mouthRollLower:-0.2} \
  --lash-shell remove --brow-shell flat --brow-lift 0.008,0.018 --brow-tone 0.75 --rebake \
  --iris 0.047 --rim-mode band --rim-up-mode part5 --rim-band-up 0.012 --rim-up-k 0.8 --rim-band-lo 0.007 --hair-y -1.02 \
  --jaw-gain 1.35 --jaw-couple mouthUpperUpLeft:0.3,mouthUpperUpRight:0.3 --gain mouthFunnel:1.3,mouthPucker:1.3 --teeth -0.01,0.012 --track-lm \
  ${RETOUCH:+$RETOUCH} "$@"
# RETOUCH (optional, set by retouch variants): extra --warp flags, e.g. RETOUCH="$(cat retouch-r1.flags)"
