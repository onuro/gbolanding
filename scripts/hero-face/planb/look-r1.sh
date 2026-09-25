#!/bin/sh
# Plan B round 1 iteration helper: render stills (engine-v003 snapshot) and put face / eyes / mouth crops of each on
# sheets next to #5 (approved-v002 as in src 03:03).
#   sh look-r1.sh <outprefix> "label|query" ...        -> <outprefix>-face.png, -eyes.png, -mouth.png
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
PB=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planb
OUTP=$1; shift
D=$PB/r1/var; mkdir -p $D
LIST=$D/list-$$.txt; : > $LIST
F5=$PB/r1/reg/f5s-v003.png
set -- "#5|@$F5" "$@"
FILES=""; n=0
for it in "$@"; do
  lab=${it%%|*}; q=${it#*|}
  case "$q" in
    @*) f=${q#@} ;;
    *) n=$((n+1)); f=$D/l$$-$n.png; echo "$f $q" >> $LIST ;;
  esac
  FILES="$FILES
$f	$lab"
done
[ -s $LIST ] && MULTI=$LIST sh "$HERE/render-r1.sh" > /dev/null
rm -f $LIST
node -e '
const [outp, items] = process.argv.slice(1);
const it = items.split("\n").filter(Boolean).map((l) => l.split("\t"));
const run = (suffix, crop, tile, cols) => {
  const a = ["--out", outp + "-" + suffix + ".png", "--tile", tile, "--cols", String(cols), "--crop", crop];
  for (const [f, l] of it) a.push(f, l);
  require("node:child_process").execFileSync("node", [process.env.HERE + "/sheet-v002.mjs", ...a], { stdio: "inherit" });
};
const n = it.length;
run("face", "596,380,790,1000", "395,500", Math.min(n, 4));
run("eyes", "560,560,860,300", "860,300", 1);
run("mouth", "740,930,500,300", "500,300", Math.min(n, 3));
' "$OUTP" "$FILES"
