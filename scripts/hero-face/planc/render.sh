#!/bin/sh
# Plan C render pass: bundle the lab (frozen engine snapshot planc/lab/engine, esbuild only; no site build),
# serve the plan C scratch dir on 127.0.0.1:8932 and capture a job list with one headless Chrome (DevTools 9433).
# The server and Chrome are stopped on exit.
#   sh render.sh <jobs.json>            (NOBUILD=1 skips the bundle)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
SP=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planc
PORT=${PORT:-8932}
DEVTOOLS=${DEVTOOLS:-9433}
mkdir -p "$SP/work"
if [ -z "$NOBUILD" ]; then
  (cd "$HERE" && node build-lab.mjs > "$SP/work/build-lab.log" 2>&1) || { cat "$SP/work/build-lab.log"; exit 1; }
fi
python3 -m http.server $PORT --bind 127.0.0.1 --directory "$SP" > "$SP/work/http-$PORT.log" 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT INT TERM
for i in $(seq 1 50); do curl -s -o /dev/null "http://127.0.0.1:$PORT/lab/index.html" && break; python3 -c "import time; time.sleep(0.1)"; done
node "$HERE/shots.mjs" --jobs "$1" --port $DEVTOOLS
