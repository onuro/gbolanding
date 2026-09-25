#!/bin/sh
# Plan B round 1: render the engine SNAPSHOT planb/lab/engine-v003 (src 03:03 = a4 fix-r2 + volCentre; never src/)
# http.server (root = planb/lab) and its own headless Chrome + profile (planb/chrome-prof-v003).
# usage: render-r1.sh <out.png> "<query>"      (query as in planb/lab/lab-v003-main.ts)
#   env PORT (8852) DEVTOOLS (9852) W=916 H=790 (CSS px, DPR 2; hero card: W=532 H=768) BUILD=1 (rebundle first)
#       FRAMES=<frames.json> (sequence mode: also writes <out>-000.png ... via window.__frame)
#   multi: MULTI=<list file> with lines "<out.png> <query>" renders each (one server, one Chrome per shot)
set -e
PB=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planb
LAB=$PB/lab
HERE=$(cd "$(dirname "$0")" && pwd)
PORT=${PORT:-8852}; DEVTOOLS=${DEVTOOLS:-9852}
CW=${W:-916}; CH=${H:-790}
if [ -n "$BUILD" ]; then
  (cd "$HERE/.." && node build-lab.mjs --entry $LAB/lab-v003-main.ts --engine $LAB/engine-v003 --out $LAB/lab-v003.js > $LAB/build-v003.log 2>&1) || { cat $LAB/build-v003.log; exit 1; }
fi
python3 -m http.server $PORT --bind 127.0.0.1 --directory $LAB > $PB/logs/http-$PORT.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT INT TERM
for i in $(seq 1 40); do
  curl -s -o /dev/null "http://127.0.0.1:$PORT/v003.html" && break
  python3 -c "import time; time.sleep(0.1)"
done
shot() {
  OUT=$1; Q=$2
  mkdir -p "$(dirname "$OUT")"
  rm -rf $PB/chrome-prof-v003/Default/Cache "$PB/chrome-prof-v003/Default/Code Cache" 2>/dev/null || true
  node "$HERE/capture-v002.mjs" --prof $PB/chrome-prof-v003 --port $DEVTOOLS --url "http://127.0.0.1:$PORT/v003.html?$Q" --out "$OUT" --w $CW --h $CH --dpr 2 --timeout 40000 ${FRAMES:+--frames "$FRAMES"} > "$OUT.capture.json" || { cat "$OUT.capture.json"; return 1; }
  grep -q '"ok": true' "$OUT.capture.json" || { cat "$OUT.capture.json"; return 1; }
  echo "$OUT"
}
if [ -n "$MULTI" ]; then
  while read -r o q; do [ -n "$o" ] && shot "$o" "$q"; done < "$MULTI"
else
  shot "$1" "${2:-mesh=f5s&frame=ref2&preset=approved-v002}"
fi
