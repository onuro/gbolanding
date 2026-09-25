#!/bin/sh
# Plan B pipeline: Sketchfab "Stylized Anime Female Head" (Rodesqa, CC BY 4.0) -> talking/blinking hero-face lab mesh.
# Headless Blender for geometry, Node (three + three-mesh-bvh from ../node_modules) for the lab-mesh bake.
# Outputs go to the Plan B scratchpad (see common.py OUT). Never touches src/ or the dev server.
#   sh run.sh            full run (inspect steps s00-s03 only when their caches are missing)
#   sh run.sh rig        from the rig step on (s40 -> s85)
#   sh run.sh check      only the verification + final grey renders of the current export (s80, s85, sheets)
# Final engine mesh: OUT/lab/mesh-sfp.{json,bin} (W = 2 x IPD, the ICT lab meshes' units; lip-sync + eye/brow targets).
# All 34 targets: OUT/mesh-sfp-all.{json,bin}; GLB: OUT/mesh-sfp.glb. Checks: OUT/rig-checks/final-*.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
B=/Applications/Blender.app/Contents/MacOS/Blender
OUT=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planb
mkdir -p "$OUT/logs"
bl() { echo "== $1 $2"; "$B" -b --factory-startup --python "$HERE/$1" -- ${2:-} > "$OUT/logs/${1%.py}$3.log" 2>&1 || { tail -30 "$OUT/logs/${1%.py}$3.log"; exit 1; }; grep '^\[' "$OUT/logs/${1%.py}$3.log" | tail -3; }
if [ "$1" != "check" ]; then
  if [ "$1" != "rig" ]; then
    [ -f "$OUT/work/sculpt_comp.npy" ] || { bl s00_inspect.py; bl s01_components.py; }
    [ -f "$OUT/work/ict_tris.npy" ] || bl s03_ict_inspect.py
    bl s10_decimate.py
    bl s20_features.py
    bl s30_fit.py
  fi
  bl s40_rig.py
  bl s50_checks.py
  bl s60_export_src.py
  (cd "$HERE" && node sf-mesh.mjs --out "$OUT/lab" --name sfp && node sf-mesh.mjs --targets all --name sfp-all)
  bl s70_glb.py
  bl s75_glb_check.py
fi
bl s80_verify.py "--mesh $OUT/lab/mesh-sfp.json --json $OUT/rig-checks/final-verify.json"
bl s85_lab_renders.py "--mesh $OUT/lab/mesh-sfp.json --prefix final"
# contact sheets (sharp)
M="$HERE/montage.mjs"; R="$OUT/rig-checks"
node "$M" --out "$R/final-sheet-required.png" --scale 0.45 --label --cols 3 \
  $R/final-rest_front.png $R/final-rest_q34.png $R/final-rest_mouth.png $R/final-jaw020_front.png $R/final-jaw020_q34.png $R/final-jaw020_mouth.png \
  $R/final-jaw035_front.png $R/final-jaw035_q34.png $R/final-jaw035_mouth.png $R/final-jaw050_front.png $R/final-jaw050_q34.png $R/final-jaw050_mouth.png \
  $R/final-blink100_front.png $R/final-blink100_q34.png $R/final-blink100_mouth.png
node "$M" --out "$R/final-sheet-visemes.png" --scale 0.45 --label --cols 4 \
  $R/final-AA_front.png $R/final-AA_mouth.png $R/final-EE_front.png $R/final-EE_mouth.png $R/final-OO_front.png $R/final-OO_mouth.png \
  $R/final-OH_front.png $R/final-OH_mouth.png $R/final-MBP_front.png $R/final-MBP_mouth.png $R/final-FV_front.png $R/final-FV_mouth.png \
  $R/final-talk_front.png $R/final-talk_mouth.png $R/final-roundMax_front.png $R/final-roundMax_mouth.png \
  $R/final-smile_front.png $R/final-smile_mouth.png
node "$M" --out "$R/final-sheet-eyes.png" --scale 0.75 --label --cols 1 \
  $R/final-rest_eyes.png $R/final-blink050_eyes.png $R/final-blink100_eyes.png
echo "done: $OUT/lab/mesh-sfp.{json,bin} $OUT/mesh-sfp-all.{json,bin} $OUT/mesh-sfp.glb $R/final-*"
