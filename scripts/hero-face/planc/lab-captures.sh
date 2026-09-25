#!/bin/sh
# Plan C: particle-engine stills of mesh-cute in the frozen engine snapshot (planc/lab, bundle from build-lab.mjs).
# Serves the plan C scratch dir on 127.0.0.1:8931, captures with headless Chrome (DevTools port 9431),
# builds contact sheets, then stops the server.   sh lab-captures.sh
HERE=$(cd "$(dirname "$0")" && pwd)
SP=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planc
C=$SP/captures
PORT=8931
mkdir -p "$C"
(cd "$SP" && exec python3 -m http.server $PORT --bind 127.0.0.1 > "$SP/work/http-$PORT.log" 2>&1) &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
for i in $(seq 1 50); do curl -s -o /dev/null "http://127.0.0.1:$PORT/mesh-cute.json" && break; sleep 0.2; done
BASE="http://127.0.0.1:$PORT/lab/index.html?mesh=cute&frame=ref2"
cd "$HERE"
cap() { node capture.mjs --port 9431 --url "$BASE$2" --out "$C/$1.png" | grep -E '"ok"|EXC|ERROR' | tr -d '\n'; echo " $1"; }
cap rest ""
cap jaw020 "&expr=jawOpen:0.2"
cap jaw035 "&expr=jawOpen:0.35"
cap jaw050 "&expr=jawOpen:0.5"
cap blink050 "&expr=eyeBlinkLeft:0.5,eyeBlinkRight:0.5"
cap blink100 "&expr=eyeBlinkLeft:1,eyeBlinkRight:1"
cap talk_a "&expr=jawOpen:0.35,mouthLowerDownLeft:0.2,mouthLowerDownRight:0.2,mouthUpperUpLeft:0.07,mouthUpperUpRight:0.07,mouthSmileLeft:0.1,mouthSmileRight:0.1"
cap yaw18_jaw035 "&yaw=18&expr=jawOpen:0.35"
node sheet.mjs --out "$C/sheet_face.png" --crop face --scale 0.42 --cols 4 "$C/rest.png" "$C/jaw020.png" "$C/jaw035.png" "$C/jaw050.png" "$C/blink050.png" "$C/blink100.png" "$C/talk_a.png" "$C/yaw18_jaw035.png"
node sheet.mjs --out "$C/sheet_mouth.png" --crop mouth --scale 1 --cols 2 "$C/rest.png" "$C/jaw020.png" "$C/jaw035.png" "$C/jaw050.png"
node sheet.mjs --out "$C/sheet_eyes.png" --crop eyes --scale 1 --cols 1 "$C/rest.png" "$C/blink050.png" "$C/blink100.png"
