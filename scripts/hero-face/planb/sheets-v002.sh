#!/bin/sh
# Plan B x approved-v002: the comparison sheets (planb/sheets/). Renders #5 (f5s, approved-v002) and plan B
# (<mesh>, planb-v002) in the engine snapshot planb/lab/engine-v002, at the ref-2 framing and the hero card.
# usage: sheets-v002.sh [mesh (sfb)] [preset (planb-v002)]      env BUILD=1 rebundles first
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
PB=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planb
HF=$(dirname $PB)
REF2=$(dirname $HF)/../images/10.webp
REF2=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/images/10.webp
PICK=$HF/a3/OWNER-PICK-volume-v1/v1.png
MESH=${1:-sfb}; PRESET=${2:-planb-v002}
S=$PB/sheets; R=$S/renders; mkdir -p $R
sheet() { node "$HERE/sheet-v002.mjs" "$@"; }

# ---- poses (engine morph names; PLAN §5 lip-sync mapping + the rig checks' visemes)
cat > $R/frames.json <<'EOF'
[
 {"expr": {}},
 {"expr": {"jawOpen": 0.2}},
 {"expr": {"jawOpen": 0.35}},
 {"expr": {"jawOpen": 0.5}},
 {"expr": {"jawOpen": 0.5, "mouthLowerDownLeft": 0.3, "mouthLowerDownRight": 0.3, "mouthUpperUpLeft": 0.1, "mouthUpperUpRight": 0.1, "mouthStretchLeft": 0.1, "mouthStretchRight": 0.1, "mouthSmileLeft": 0.06, "mouthSmileRight": 0.06}},
 {"expr": {"jawOpen": 0.18, "mouthStretchLeft": 0.45, "mouthStretchRight": 0.45, "mouthSmileLeft": 0.3, "mouthSmileRight": 0.3, "mouthLowerDownLeft": 0.2, "mouthLowerDownRight": 0.2, "mouthUpperUpLeft": 0.15, "mouthUpperUpRight": 0.15}},
 {"expr": {"jawOpen": 0.22, "mouthFunnel": 0.55, "mouthPucker": 0.45}},
 {"expr": {"jawOpen": 0.38, "mouthFunnel": 0.5, "mouthLowerDownLeft": 0.15, "mouthLowerDownRight": 0.15}},
 {"expr": {"jawOpen": 0.1, "mouthClose": 0.1, "mouthPucker": 0.1}},
 {"expr": {"jawOpen": 0.1, "mouthUpperUpLeft": 0.25, "mouthUpperUpRight": 0.25, "mouthClose": 0.05}},
 {"expr": {"jawOpen": 0.35, "mouthLowerDownLeft": 0.21, "mouthLowerDownRight": 0.21, "mouthUpperUpLeft": 0.07, "mouthUpperUpRight": 0.07, "mouthSmileLeft": 0.12, "mouthSmileRight": 0.12}},
 {"blink": 0.5},
 {"blink": 1}
]
EOF
NAMES="rest jaw020 jaw035 jaw050 AA EE OO OH MBP FV talk blink050 blink100"
cd /tmp
FRAMES=$R/frames.json BUILD=$BUILD sh "$HERE/render-v002.sh" $R/f5s-ref2.png "mesh=f5s&frame=ref2&preset=approved-v002" > /dev/null
FRAMES=$R/frames.json sh "$HERE/render-v002.sh" $R/pb-ref2.png "mesh=$MESH&frame=ref2&preset=$PRESET" > /dev/null
FRAMES=$R/frames.json W=532 H=768 sh "$HERE/render-v002.sh" $R/f5s-hero.png "mesh=f5s&frame=hero&preset=approved-v002" > /dev/null
FRAMES=$R/frames.json W=532 H=768 sh "$HERE/render-v002.sh" $R/pb-hero.png "mesh=$MESH&frame=hero&preset=$PRESET" > /dev/null
k=0
for n in $NAMES; do
  i=$(printf %03d $k)
  for s in f5s-ref2 pb-ref2 f5s-hero pb-hero; do mv $R/$s-$i.png $R/$s-$n.png; done
  k=$((k+1))
done
# the still (frame 0 of the page) must equal the owner pick for #5
node $HF/a4/integrate/tools/diff.mjs $PICK $R/f5s-ref2.png > $R/f5s-vs-ownerpick.json; cat $R/f5s-vs-ownerpick.json

# ---- sheets
sheet --out $S/full-3up.png --tile 916,790 --title "ref-2 framing (1832 x 1580 device px): ref 2 | #5 owner pick (approved-v002) | plan B ($MESH, $PRESET)" \
  $REF2 "ref 2 (master)" $PICK "#5 owner pick v1.png" $R/pb-ref2-rest.png "plan B"
sheet --out $S/eyes-vs-ref2.png --tile 900,340 --cols 1 --crop 540,540,900,340 --title "eyes, native device px" \
  $REF2 "ref 2" $PICK "#5 owner pick" $R/pb-ref2-rest.png "plan B"
sheet --out $S/lips-vs-ref2.png --tile 600,330 --cols 3 --crop 690,950,600,330 --title "lips, native device px" \
  $REF2 "ref 2" $PICK "#5 owner pick" $R/pb-ref2-rest.png "plan B"
sheet --out $S/hero-card.png --tile 532,768 --title "hero card 1064 x 1536 device px (DPR 2), engine defaultFraming" \
  $R/f5s-hero-rest.png "#5 approved-v002" $R/pb-hero-rest.png "plan B rest" $R/pb-hero-talk.png "plan B talk" $R/pb-hero-blink100.png "plan B blink"
FACE=596,430,790,920
set -- ; for n in rest jaw020 jaw035 jaw050 AA EE OO OH MBP FV talk; do set -- "$@" $R/pb-ref2-$n.png "plan B $n"; done
sheet --out $S/talk-strip.png --tile 380,443 --cols 6 --crop $FACE --title "plan B talk strip (driver weights; jawOpen x1.35 baked into the mesh)" "$@"
set -- ; for n in rest jaw020 jaw035 jaw050 AA EE OO OH MBP FV talk; do set -- "$@" $R/f5s-ref2-$n.png "#5 $n"; done
sheet --out $S/talk-strip-f5s.png --tile 380,443 --cols 6 --crop $FACE --title "#5 talk strip, same weights (reference)" "$@"
sheet --out $S/talk-mouth.png --tile 330,182 --cols 11 --crop 690,950,600,330 --title "mouth crops: #5 (top) vs plan B (bottom), same weights" \
  $R/f5s-ref2-rest.png "#5 rest" $R/f5s-ref2-jaw020.png "jaw .2" $R/f5s-ref2-jaw035.png "jaw .35" $R/f5s-ref2-jaw050.png "jaw .5" $R/f5s-ref2-AA.png AA $R/f5s-ref2-EE.png EE $R/f5s-ref2-OO.png OO $R/f5s-ref2-OH.png OH $R/f5s-ref2-MBP.png MBP $R/f5s-ref2-FV.png FV $R/f5s-ref2-talk.png talk \
  $R/pb-ref2-rest.png "B rest" $R/pb-ref2-jaw020.png "jaw .2" $R/pb-ref2-jaw035.png "jaw .35" $R/pb-ref2-jaw050.png "jaw .5" $R/pb-ref2-AA.png AA $R/pb-ref2-EE.png EE $R/pb-ref2-OO.png OO $R/pb-ref2-OH.png OH $R/pb-ref2-MBP.png MBP $R/pb-ref2-FV.png FV $R/pb-ref2-talk.png talk
sheet --out $S/blink.png --tile 500,582 --cols 4 --crop $FACE --title "blink: plan B rest / 0.5 / 1, #5 blink 1" \
  $R/pb-ref2-rest.png "plan B rest" $R/pb-ref2-blink050.png "plan B blink 0.5" $R/pb-ref2-blink100.png "plan B blink 1" $R/f5s-ref2-blink100.png "#5 blink 1"
echo "sheets in $S"
