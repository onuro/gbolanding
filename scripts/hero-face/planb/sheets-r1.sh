#!/bin/sh
# Plan B round 1: comparison sheets planb/sheets/r1-*.png. Renders #5 (f5s, approved-v002 as in src 03:03, a4 fixes on)
# and plan B r1 (look meshes from mesh-r1.sh: <mesh> = with the <8% retouch, <mesh0> = the sculpt's own proportions)
# with preset planb-r1, in the engine snapshot planb/lab/engine-v003, at the ref-2 framing and the hero card.
# usage: sheets-r1.sh [mesh (sfw)] [mesh0 (sfr)] [preset (planb-r1)]      env BUILD=1 rebundles first
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
PB=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planb
HF=$(dirname $PB)
REF2=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/images/10.webp
PICK=$HF/a3/OWNER-PICK-volume-v1/v1.png
MESH=${1:-sfw}; MESH0=${2:-sfr}; PRESET=${3:-planb-r1}
S=$PB/sheets; R=$S/r1-renders; mkdir -p $R
sheet() { node "$HERE/sheet-v002.mjs" "$@"; }
cp $R/../renders/frames.json $R/frames.json 2>/dev/null || true
NAMES="rest jaw020 jaw035 jaw050 AA EE OO OH MBP FV talk blink050 blink100"
cd /tmp
FRAMES=$R/frames.json BUILD=$BUILD sh "$HERE/render-r1.sh" $R/f5s-ref2.png "mesh=f5s&frame=ref2&preset=approved-v002" > /dev/null
FRAMES=$R/frames.json sh "$HERE/render-r1.sh" $R/pb-ref2.png "mesh=$MESH&frame=ref2&preset=$PRESET" > /dev/null
FRAMES=$R/frames.json W=532 H=768 sh "$HERE/render-r1.sh" $R/f5s-hero.png "mesh=f5s&frame=hero&preset=approved-v002" > /dev/null
FRAMES=$R/frames.json W=532 H=768 sh "$HERE/render-r1.sh" $R/pb-hero.png "mesh=$MESH&frame=hero&preset=$PRESET" > /dev/null
k=0
for n in $NAMES; do
  i=$(printf %03d $k)
  for s in f5s-ref2 pb-ref2 f5s-hero pb-hero; do mv $R/$s-$i.png $R/$s-$n.png; done
  k=$((k+1))
done
cat > $R/list.txt <<EOL
$R/pb0-ref2-rest.png mesh=$MESH0&frame=ref2&preset=$PRESET
$R/v002-ref2-rest.png mesh=sfb&frame=ref2&preset=planb-v002
$R/f5s-regoff.png mesh=f5s&frame=ref2&preset=approved-v002&L.volHazeKnee=1e9,1e9&L.scatterEyeClear=0,0.075,1.4
$R/pb-ref2-yawm12.png mesh=$MESH&frame=ref2&preset=$PRESET&yaw=-12
$R/pb-ref2-yaw12.png mesh=$MESH&frame=ref2&preset=$PRESET&yaw=12
$R/pb-ref2-yaw22.png mesh=$MESH&frame=ref2&preset=$PRESET&yaw=22
$R/f5s-ref2-yaw22.png mesh=f5s&frame=ref2&preset=approved-v002&yaw=22
$R/pb-ref2-pitch6.png mesh=$MESH&frame=ref2&preset=$PRESET&pitch=6
$R/pb-ref2-smile.png mesh=$MESH&frame=ref2&preset=$PRESET&expr=mouthSmileLeft:0.5,mouthSmileRight:0.5
$R/f5s-ref2-smile.png mesh=f5s&frame=ref2&preset=approved-v002&expr=mouthSmileLeft:0.5,mouthSmileRight:0.5
$R/pb-ref2-vol.png mesh=$MESH&frame=ref2&preset=$PRESET&view=vol
EOL
MULTI=$R/list.txt sh "$HERE/render-r1.sh" > /dev/null
W=532 H=768 sh "$HERE/render-r1.sh" $R/pb0-hero-rest.png "mesh=$MESH0&frame=hero&preset=$PRESET" > /dev/null
# regression: this engine snapshot still draws the owner pick byte for byte (a4's two still-affecting fixes off)
node $HF/a4/integrate/tools/diff.mjs $PICK $R/f5s-regoff.png > $R/f5s-regoff-vs-ownerpick.json; cat $R/f5s-regoff-vs-ownerpick.json

# ---- sheets
sheet --out $S/r1-full.png --tile 916,790 --cols 2 --title "ref-2 framing (1832 x 1580 device px): ref 2 | #5 (approved-v002, current engine) | plan B r1 (sculpt proportions) | plan B r1 + retouch (<8%)" \
  $REF2 "ref 2 (master)" $R/f5s-ref2-rest.png "#5 approved-v002" $R/pb0-ref2-rest.png "plan B r1 ($MESH0: sculpt's own proportions)" $R/pb-ref2-rest.png "plan B r1 + retouch ($MESH: nose -7%, lips fuller, chin -5%, cheeks fuller)"
sheet --out $S/r1-before-after.png --tile 610,700 --cols 3 --crop 460,160,1060,1215 --title "plan B: v002 (judged) -> r1 -> r1 + retouch, ref-2 framing" \
  $R/v002-ref2-rest.png "plan B v002 (judged)" $R/pb0-ref2-rest.png "plan B r1" $R/pb-ref2-rest.png "plan B r1 + retouch"
sheet --out $S/r1-eyes.png --tile 900,340 --cols 1 --crop 540,540,900,340 --title "eyes, native device px" \
  $REF2 "ref 2" $R/f5s-ref2-rest.png "#5" $R/v002-ref2-rest.png "plan B v002 (judged)" $R/pb-ref2-rest.png "plan B r1 + retouch"
sheet --out $S/r1-lips.png --tile 600,330 --cols 2 --crop 690,950,600,330 --title "lips, native device px" \
  $REF2 "ref 2" $R/f5s-ref2-rest.png "#5" $R/v002-ref2-rest.png "plan B v002 (judged)" $R/pb-ref2-rest.png "plan B r1 + retouch"
sheet --out $S/r1-hero-card.png --tile 532,768 --title "hero card 1064 x 1536 device px (DPR 2), engine defaultFraming" \
  $R/f5s-hero-rest.png "#5 approved-v002" $R/pb0-hero-rest.png "plan B r1" $R/pb-hero-rest.png "plan B r1 + retouch" $R/pb-hero-talk.png "retouch, talk" $R/pb-hero-blink100.png "retouch, blink"
FACE=596,430,790,920
set -- ; for n in rest jaw020 jaw035 jaw050 AA EE OO OH MBP FV talk; do set -- "$@" $R/pb-ref2-$n.png "plan B $n"; done
sheet --out $S/r1-talk-strip.png --tile 380,443 --cols 6 --crop $FACE --title "plan B r1 talk strip (driver weights; jawOpen x1.35 + 0.3 upper-lip lift baked in)" "$@"
set -- ; for n in rest jaw020 jaw035 jaw050 AA EE OO OH MBP FV talk; do set -- "$@" $R/f5s-ref2-$n.png "#5 $n"; done
sheet --out $S/r1-talk-strip-f5s.png --tile 380,443 --cols 6 --crop $FACE --title "#5 talk strip, same weights (reference)" "$@"
sheet --out $S/r1-talk-mouth.png --tile 330,182 --cols 11 --crop 690,950,600,330 --title "mouth crops: #5 (top) vs plan B r1 (bottom), same weights" \
  $R/f5s-ref2-rest.png "#5 rest" $R/f5s-ref2-jaw020.png "jaw .2" $R/f5s-ref2-jaw035.png "jaw .35" $R/f5s-ref2-jaw050.png "jaw .5" $R/f5s-ref2-AA.png AA $R/f5s-ref2-EE.png EE $R/f5s-ref2-OO.png OO $R/f5s-ref2-OH.png OH $R/f5s-ref2-MBP.png MBP $R/f5s-ref2-FV.png FV $R/f5s-ref2-talk.png talk \
  $R/pb-ref2-rest.png "B rest" $R/pb-ref2-jaw020.png "jaw .2" $R/pb-ref2-jaw035.png "jaw .35" $R/pb-ref2-jaw050.png "jaw .5" $R/pb-ref2-AA.png AA $R/pb-ref2-EE.png EE $R/pb-ref2-OO.png OO $R/pb-ref2-OH.png OH $R/pb-ref2-MBP.png MBP $R/pb-ref2-FV.png FV $R/pb-ref2-talk.png talk
sheet --out $S/r1-blink.png --tile 500,582 --cols 4 --crop $FACE --title "blink: plan B r1 rest / 0.5 / 1, #5 blink 1" \
  $R/pb-ref2-rest.png "plan B rest" $R/pb-ref2-blink050.png "plan B blink 0.5" $R/pb-ref2-blink100.png "plan B blink 1" $R/f5s-ref2-blink100.png "#5 blink 1"
sheet --out $S/r1-pose.png --tile 458,527 --cols 4 --crop 460,160,1060,1215 --title "plan B r1 + retouch: yaw -12 / 12 / 22, pitch 6, smile 0.5 (#5 yaw 22, smile 0.5 for reference)" \
  $R/pb-ref2-yawm12.png "yaw -12" $R/pb-ref2-yaw12.png "yaw 12" $R/pb-ref2-yaw22.png "yaw 22" $R/f5s-ref2-yaw22.png "#5 yaw 22" \
  $R/pb-ref2-pitch6.png "pitch 6" $R/pb-ref2-smile.png "smile .5" $R/f5s-ref2-smile.png "#5 smile .5" $R/pb-ref2-vol.png "volume (view=vol)"
node -e '
const sharp = require(process.argv[1]);
(async () => {
  const [out, ...fs] = process.argv.slice(2);
  const tiles = await Promise.all(fs.map((f) => sharp(f).resize(180, 260).png().toBuffer()));
  const W = tiles.length * 188;
  await sharp({ create: { width: W, height: 268, channels: 3, background: "#1c1c1c" } }).composite(tiles.map((t, i) => ({ input: t, left: 4 + i * 188, top: 4 }))).png().toFile(out);
  console.log(out);
})();
' "/Users/onuroztaskiran/FE Apps/tt6/gbolanding/node_modules/sharp" $S/r1-thumbs.png $R/f5s-hero-rest.png $R/pb0-hero-rest.png $R/pb-hero-rest.png
echo "sheets in $S (r1-*)"
