#!/bin/sh
# Plan C pipeline: "free Cute girl face" sculpt -> talking / blinking lab mesh + GLB + rig checks.
#   sh run.sh            (all steps)      sh run.sh 40        (from step 40 on)      sh run.sh 70   (lab stills only)
# Blender: headless, factory startup. Outputs: scratchpad/hero-face/planc/{mesh-cute.json,.bin,.glb, rig-checks/, inspect/}
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
B="/Applications/Blender.app/Contents/MacOS/Blender"
LOG=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planc/work/run.log
FROM=${1:-0}
run() {
  echo "== $1"
  "$B" -b --factory-startup --python "$HERE/$1" -- $2 > "$LOG" 2>&1 || true
  grep -E "^\[" "$LOG" | grep -v "seam x\|nose slice\|   cos " || true
  if grep -q "^Traceback" "$LOG"; then grep -A20 "^Traceback" "$LOG"; echo "FAILED: $1"; exit 1; fi
}
[ "$FROM" -le 0 ] && run s00_inspect.py
[ "$FROM" -le 1 ] && run s01_details.py
[ "$FROM" -le 3 ] && run s03_ict.py
[ "$FROM" -le 10 ] && run s10_decimate.py
[ "$FROM" -le 20 ] && run s20_landmarks.py
[ "$FROM" -le 30 ] && run s30_fit.py
[ "$FROM" -le 40 ] && run s40_rig.py
[ "$FROM" -le 45 ] && (cd "$HERE" && node export-lab.mjs)
[ "$FROM" -le 50 ] && run s50_glb.py && (cd "$HERE" && node glb-pack.mjs)
[ "$FROM" -le 60 ] && run s60_checks.py && (cd "$HERE" && R=$(dirname "$LOG")/../rig-checks && \
  node sheet.mjs --out $R/sheet_front_q34.png --crop full --scale 0.5 --cols 5 $R/rest_front.png $R/jaw020_front.png $R/jaw035_front.png $R/jaw050_front.png $R/blink100_front.png $R/rest_q34.png $R/jaw020_q34.png $R/jaw035_q34.png $R/jaw050_q34.png $R/blink100_q34.png && \
  node sheet.mjs --out $R/sheet_closeups.png --crop full --scale 0.5 --cols 4 $R/rest_mouth.png $R/jaw020_mouth.png $R/jaw035_mouth.png $R/jaw050_mouth.png $R/rest_eye.png $R/blink050_eye.png $R/blink100_eye.png $R/jaw035_mouth34.png $R/talk_a_mouth.png $R/talk_o_mouth.png $R/smile_mouth.png $R/blink100_eyeside.png)
[ "$FROM" -le 70 ] && sh "$HERE/lab-captures.sh"
echo "pipeline done"
