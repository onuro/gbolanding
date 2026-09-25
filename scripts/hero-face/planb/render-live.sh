#!/bin/sh
# Plan B live deploy / gate-1: render planb/lab/lab-live-main.ts (site performer, seeded) bundled against one engine:
#   BUNDLE=cine  -> planb/lab/engine-cine-snap (snapshot of src/components/hero-face/engine-cine + 'cine-planb')
#   BUNDLE=final -> planb/lab/engine-final (snapshot of src/components/hero-face/engine + volCentre / planb presets)
#   BUNDLE=src   -> src/components/hero-face/engine-cine itself (read only: esbuild writes only the bundle), for the live check
# Own http.server (root planb/lab; lab/dev-hero-face -> public/dev-hero-face, read only) and headless Chrome + profile.
# usage: render-live.sh <out.png> "<query>"      env PORT (8871) DEVTOOLS (9871) W=532 H=768 (CSS px, DPR 2) BUILD=1
#   FRAMES=<frames.json> (sequence via window.__frame)   MULTI=<list file> ("<out.png> <query>" per line)
set -e
PB=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planb
LAB=$PB/lab
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../../.." && pwd)
BUNDLE=${BUNDLE:-cine}
PORT=${PORT:-8871}; DEVTOOLS=${DEVTOOLS:-9871}
CW=${W:-532}; CH=${H:-768}
case $BUNDLE in
  cine) ENG=$LAB/engine-cine-snap ;;
  final) ENG=$LAB/engine-final ;;
  src) ENG="$REPO/src/components/hero-face/engine-cine" ;;
  *) echo "BUNDLE?"; exit 1 ;;
esac
[ -e $LAB/dev-hero-face ] || ln -s "$REPO/public/dev-hero-face" $LAB/dev-hero-face
if [ -n "$BUILD" ] || [ ! -f $LAB/lab-live-$BUNDLE.js ]; then
  (cd "$HERE/.." && node build-lab.mjs --entry $LAB/lab-live-main.ts --engine "$ENG" --out $LAB/lab-live-$BUNDLE.js > $LAB/build-live-$BUNDLE.log 2>&1) || { cat $LAB/build-live-$BUNDLE.log; exit 1; }
  sed "s/lab-v003.js/lab-live-$BUNDLE.js/; s/engine-v003/live $BUNDLE/" $LAB/v003.html > $LAB/live-$BUNDLE.html
fi
python3 -m http.server $PORT --bind 127.0.0.1 --directory $LAB > $PB/logs/http-$PORT.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT INT TERM
for i in $(seq 1 40); do
  curl -s -o /dev/null "http://127.0.0.1:$PORT/live-$BUNDLE.html" && break
  python3 -c "import time; time.sleep(0.1)"
done
PROF=$PB/chrome-prof-live
shot() {
  OUT=$1; Q=$2
  mkdir -p "$(dirname "$OUT")"
  rm -rf $PROF/Default/Cache "$PROF/Default/Code Cache" 2>/dev/null || true
  node "$HERE/capture-v002.mjs" --prof $PROF --port $DEVTOOLS --url "http://127.0.0.1:$PORT/live-$BUNDLE.html?$Q" --out "$OUT" --w $CW --h $CH --dpr 2 --timeout 60000 ${FRAMES:+--frames "$FRAMES"} > "$OUT.capture.json" || { cat "$OUT.capture.json"; return 1; }
  grep -q '"ok": true' "$OUT.capture.json" || { cat "$OUT.capture.json"; return 1; }
  echo "$OUT"
}
if [ -n "$MULTI" ]; then
  while read -r o q; do [ -n "$o" ] && shot "$o" "$q"; done < "$MULTI"
else
  shot "$1" "${2:-mesh=planb&preset=cine-planb}"
fi
