#!/bin/sh
# Plan B Gate 1: planb/gate1/planb-*.png. Plan B = the deployed mesh (lab/mesh-planb = public/dev-hero-face/mesh-planb).
#   approved-v002 look: engine-final = snapshot of src/components/hero-face/engine (a4 fixes in) + the planb additions
#     (volCentre port, presets planb-v002 / planb-r1), plan B with 'planb-r1', #5 (live mesh-f5s) with 'approved-v002'
#   cinematic look: engine-cine-snap = snapshot of src/components/hero-face/engine-cine + 'cine-planb' (same block as src),
#     #5 with 'cine-v004-ml-live2-lift2' / 'cine-v004-ml-live2', plan B with 'cine-planb' / live2 + its per-mesh fit
# Talk frames 'talk' / t=... come from the site performer (src/components/hero-face/lipsync, ?talk=1 minimal) with 2 s of
# 30 fps warm-up, as a running page. usage: sh gate1.sh   (about 2 min)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
PB=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planb
HF=$(dirname $PB)
REF2=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/images/10.webp
PICK=$HF/a3/OWNER-PICK-volume-v1/v1.png
G=$PB/gate1; R=$G/renders; mkdir -p $R
F5=dev-hero-face/mesh-f5s.json
RL="$HERE/render-live.sh"
sheet() { node "$HERE/sheet-v002.mjs" "$@" > /dev/null; echo "$2"; }
stack() { node -e '
const sharp = require(process.argv[1]);
(async () => {
  const [out, ...fs] = process.argv.slice(2);
  const ms = await Promise.all(fs.map((f) => sharp(f).metadata()));
  const W = Math.max(...ms.map((m) => m.width)), H = ms.reduce((a, m) => a + m.height, 0) + 12 * (fs.length - 1);
  let y = 0; const comp = fs.map((f, i) => { const c = { input: f, left: 0, top: y }; y += ms[i].height + 12; return c; });
  await sharp({ create: { width: W, height: H, channels: 3, background: "#1b1b1b" } }).composite(comp).png().toFile(out);
  console.log(out);
})();' "/Users/onuroztaskiran/FE Apps/tt6/gbolanding/node_modules/sharp" "$@"; }
cd /tmp
cp $PB/sheets/renders/frames.json $R/frames.json
NAMES="rest jaw020 jaw035 jaw050 AA EE OO OH MBP FV talk blink050 blink100"

# ---- approved-v002 look (engine-final), ref-2 framing: rest + visemes + blinks (frames.json, same weights for both)
BUILD=1 BUNDLE=final FRAMES=$R/frames.json W=916 H=790 sh "$RL" $R/pb-ref2.png "mesh=planb&frame=ref2&preset=planb-r1" > /dev/null
BUNDLE=final FRAMES=$R/frames.json W=916 H=790 sh "$RL" $R/f5s-ref2.png "meshUrl=$F5&frame=ref2&preset=approved-v002" > /dev/null
k=0
for n in $NAMES; do i=$(printf %03d $k); for s in pb-ref2 f5s-ref2; do mv $R/$s-$i.png $R/$s-$n.png; done; k=$((k+1)); done
# regression: this engine snapshot + lab entry still draw the owner pick byte for byte (a4's two still-affecting fixes off)
BUNDLE=final W=916 H=790 sh "$RL" $R/f5s-regoff.png "mesh=f5s&frame=ref2&preset=approved-v002&L.volHazeKnee=1e9,1e9&L.scatterEyeClear=0,0.075,1.4" > /dev/null
node $HF/a4/integrate/tools/diff.mjs $PICK $R/f5s-regoff.png > $R/f5s-regoff-vs-ownerpick.json
# hero card (engine defaultFraming, 1064 x 1536 device px)
cat > $R/hero.txt <<EOL
$R/pb-hero-rest.png mesh=planb&preset=planb-r1
$R/f5s-hero-rest.png meshUrl=$F5&preset=approved-v002
$R/pb-hero-talk.png mesh=planb&preset=planb-r1&perf=talk&t=4.1
$R/f5s-hero-talk.png meshUrl=$F5&preset=approved-v002&perf=talk&t=4.1
$R/pb-hero-blink100.png mesh=planb&preset=planb-r1&blink=1
EOL
BUNDLE=final MULTI=$R/hero.txt sh "$RL" > /dev/null

# ---- cinematic look (engine-cine-snap), hero card
LIVE2PB='{"keyWrap":0.5,"keyPow":1.6,"ks":1.2,"kdFill":0.1,"fillShadow":0.3,"sculpt":[[0,-0.54,0.1,0.028,1.3],[0,-0.448,0.085,0.018,0.8],[0,-0.68,0.1,0.04,0.35],[0,-0.8,0.16,0.06,-0.35],[0,-0.13,0.03,0.07,-0.5],[-0.13,-0.28,0.06,0.13,0.65],[-0.25,-0.1,0.14,0.07,0.45],[0.25,-0.1,0.14,0.07,0.45],[0,-0.255,0.045,0.035,0.6],[0.13,-0.28,0.06,0.13,0.65]]}'
LIVE2PB=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$LIVE2PB")
cat > $R/cine.txt <<EOL
$R/f5s-cine-lift2.png meshUrl=$F5&preset=cine-v004-ml-live2-lift2&t=4&warm=2
$R/pb-cine-planb.png mesh=planb&preset=cine-planb&t=4&warm=2
$R/f5s-cine-live2.png meshUrl=$F5&preset=cine-v004-ml-live2&t=4&warm=2
$R/pb-cine-live2.png mesh=planb&preset=cine-planb&t=4&warm=2&look=$LIVE2PB
EOL
BUILD=1 BUNDLE=cine MULTI=$R/cine.txt sh "$RL" > /dev/null
# talk strip: the site performer at 8 moments (speech 1.3-15.9 s; jaw peak 4.1, upper lip 2.8, smile 10.2, funnel 12.9,
# lips closing 13.07, pucker 14.8, stretch 15.37)
TS="1.5 2.8 4.1 10.2 12.9 13.07 14.8 15.37"
python3 -c "import json,sys; print(json.dumps([{'t': float(t), 'perf': True, 'warm': 2} for t in sys.argv[1:]]))" $TS > $R/talk-frames.json
BUNDLE=cine FRAMES=$R/talk-frames.json sh "$RL" $R/f5s-cine-talk.png "meshUrl=$F5&preset=cine-v004-ml-live2-lift2&perf=talk&t=4.1" > /dev/null
BUNDLE=cine FRAMES=$R/talk-frames.json sh "$RL" $R/pb-cine-talk.png "mesh=planb&preset=cine-planb&perf=talk&t=4.1" > /dev/null

# ---- sheets
sheet --out $G/planb-full.png --tile 916,790 --cols 3 --title "ref-2 framing (1832 x 1580 device px, shown at 1/2): ref 2 | #5 owner pick (approved-v002) | plan B (planb-r1, engine-final)" \
  $REF2 "ref 2 (master)" $PICK "#5 owner pick (a3 v1.png)" $R/pb-ref2-rest.png "plan B (mesh-planb, planb-r1)"
sheet --out $G/planb-vs-5.png --tile 1064,1536 --cols 2 --title "hero card 1064 x 1536 device px (DPR 2), approved-v002 look, engine-final: #5 | plan B" \
  $R/f5s-hero-rest.png "#5 approved-v002" $R/pb-hero-rest.png "plan B planb-r1"
sheet --out $G/planb-eyes.png --tile 900,340 --cols 1 --crop 540,540,900,340 --title "eyes, native device px (ref-2 framing)" \
  $REF2 "ref 2" $PICK "#5 owner pick" $R/f5s-ref2-rest.png "#5 current engine" $R/pb-ref2-rest.png "plan B"
sheet --out $G/planb-lips.png --tile 600,330 --cols 2 --crop 690,950,600,330 --title "lips, native device px (ref-2 framing)" \
  $REF2 "ref 2" $PICK "#5 owner pick" $R/f5s-ref2-rest.png "#5 current engine" $R/pb-ref2-rest.png "plan B"
sheet --out $G/planb-hero-card.png --tile 1064,1536 --cols 3 --title "plan B hero card at 2x (1064 x 1536 device px), approved-v002 look: rest | talk (site performer, t 4.1 s) | blink 1" \
  $R/pb-hero-rest.png "rest" $R/pb-hero-talk.png "talk (performer t 4.1)" $R/pb-hero-blink100.png "blink 1"
MC=690,950,600,330; FC=596,430,790,920
set -- ; for n in rest jaw020 jaw035 jaw050 AA EE OO OH MBP FV talk; do set -- "$@" $R/f5s-ref2-$n.png "#5 $n"; done
for n in rest jaw020 jaw035 jaw050 AA EE OO OH MBP FV talk; do set -- "$@" $R/pb-ref2-$n.png "B $n"; done
sheet --out $R/talk-mouth.png --tile 330,182 --cols 11 --crop $MC --title "talk: mouth crops, #5 (row 1) vs plan B (row 2) at the same driver weights (native device px, ref-2 framing, approved-v002 look)" "$@"
set -- ; for n in rest jaw020 jaw035 jaw050 AA EE OO OH MBP FV talk; do set -- "$@" $R/pb-ref2-$n.png "B $n"; done
sheet --out $R/talk-face.png --tile 316,368 --cols 11 --crop $FC --title "plan B face at each viseme (planb-r1; jawOpen x1.35 + upper-lip lift baked into mesh-planb)" "$@"
stack $G/planb-talk.png $R/talk-mouth.png $R/talk-face.png
sheet --out $G/planb-blink.png --tile 500,582 --cols 4 --crop $FC --title "blink (ref-2 framing): plan B rest / 0.5 / 1, #5 blink 1" \
  $R/pb-ref2-rest.png "plan B rest" $R/pb-ref2-blink050.png "plan B blink 0.5" $R/pb-ref2-blink100.png "plan B blink 1" $R/f5s-ref2-blink100.png "#5 blink 1"
# cinematic: hero cards + talk strip (lower face, device px)
TC=312,540,440,600
sheet --out $R/cine-cards.png --tile 532,768 --cols 4 --title "cinematic look, hero card (532 x 768 CSS, DPR 2), t 4 s: #5 | plan B" \
  $R/f5s-cine-lift2.png "#5 lift2 (live look)" $R/pb-cine-planb.png "plan B cine-planb" $R/f5s-cine-live2.png "#5 live2" $R/pb-cine-live2.png "plan B live2 + per-mesh"
set -- ; k=0; for t in $TS; do i=$(printf %03d $k); set -- "$@" "$R/f5s-cine-talk-$i.png@$TC" "#5 t $t"; k=$((k+1)); done
k=0; for t in $TS; do i=$(printf %03d $k); set -- "$@" "$R/pb-cine-talk-$i.png@$TC" "B t $t"; k=$((k+1)); done
sheet --out $R/cine-talk.png --tile 264,360 --cols 8 --title "cinematic talk strip (site performer ?talk=1 minimal, 2 s warm-up; lower face, device px): #5 lift2 (row 1) vs plan B cine-planb (row 2)" "$@"
stack $G/planb-cine-full.png $R/cine-cards.png $R/cine-talk.png
cat $R/f5s-regoff-vs-ownerpick.json
