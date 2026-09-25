#!/bin/sh
# Plan B round 1 look iteration (engine-v003): render labelled variants and put them on one crop sheet.
# usage: variants-v002.sh <sheet.png> <crop x,y,w,h | full> <tile w,h> <cols> "label|query" "label|query" ...
#   a label starting with '@' is an existing png (label|path) placed as is (e.g. '@#5|/path/v1.png')
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
PB=/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planb
SHEET=$1; CROP=$2; TILE=$3; COLS=$4; shift 4
D=$PB/r1/var; mkdir -p $D
LIST=$D/list-$$.txt; : > $LIST
ITEMS=""
n=0
for it in "$@"; do
  lab=${it%%|*}; q=${it#*|}
  case "$lab" in
    @*) ITEMS="$ITEMS
$q	${lab#@}" ;;
    *) n=$((n+1)); f=$D/v$$-$n.png; echo "$f $q" >> $LIST; ITEMS="$ITEMS
$f	$lab" ;;
  esac
done
export HERE; MULTI=$LIST sh "$HERE/render-r1.sh" > /dev/null
ARGS=""
node -e '
const [sheet, crop, tile, cols, items] = process.argv.slice(1);
const a = ["--out", sheet, "--tile", tile, "--cols", cols];
if (crop !== "full") a.push("--crop", crop);
for (const l of items.split("\n").filter(Boolean)) { const [f, lab] = l.split("\t"); a.push(f, lab); }
require("node:child_process").execFileSync("node", [process.env.HERE + "/sheet-v002.mjs", ...a], { stdio: "inherit" });
' "$SHEET" "$CROP" "$TILE" "$COLS" "$ITEMS"
rm -f $LIST
