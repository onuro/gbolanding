// Readability and on-page metadata gate for the copy in src/i18n/messages/*.ts.
//
// Turkish is NOT scored with Flesch-Kincaid. FK is a regression fitted to English
// syllable statistics; Turkish is agglutinative, so ~2.7 syllables per word is
// ordinary rather than hard and FK returns grades that mean nothing. The Turkish
// instruments are Atesman (1997) and Bezirci-Yilmaz (2010), used here.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const messagesDir = join(root, "src", "i18n", "messages");

const THRESHOLDS = {
  tr: { atesman: 70, bezirci: 8 },
  en: { fre: 65, fk: 8 },
  titleChars: [30, 60],
  descriptionChars: [120, 158],
  // Atesman is unstable on short text: a clear six-word sentence can score in
  // the thirties purely because one word is long. Anything shorter than this is
  // reported for information but never fails the build.
  minWordsToGate: 30,
};

const TURKISH_VOWELS = new Set("aeıioöuüAEIİOÖUÜ");

const read = (locale) =>
  readFileSync(join(messagesDir, `${locale}.ts`), "utf8");

/** Every double-quoted literal that reads as prose rather than a token. */
function proseStrings(source) {
  const out = [];
  for (const match of source.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
    const value = match[1];
    if (value.startsWith("@/") || value.startsWith("http")) continue;
    if (value.trim().split(/\s+/).length >= 5) out.push(value);
  }
  return out;
}

/** Reads `key: "value"` from inside a named block, tolerating a wrapped line. */
function field(source, block, key) {
  const start = source.indexOf(`${block}: {`);
  if (start === -1) return undefined;
  const window = source.slice(start, start + 1200);
  const match = window.match(new RegExp(`${key}:\\s*\\n?\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  return match?.[1];
}

// Turkish orthography is phonemic, so the syllable count is exactly the vowel
// count -- no dictionary and no heuristic. English has no such property.
const turkishSyllables = (word) =>
  [...word].filter((c) => TURKISH_VOWELS.has(c)).length;

function englishSyllables(word) {
  const w = word.toLowerCase();
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 0;
  if (w.endsWith("e") && !/(le|ee)$/.test(w) && n > 1) n -= 1;
  return Math.max(n, 1);
}

function sentences(text) {
  // Turkish writes thousands as 10.000 -- splitting on that period would invent
  // sentences and flatter every score.
  return text
    .replace(/(?<=\d)[.,](?=\d)/g, "")
    .split(/[.!?…]+/)
    .filter((part) => part.trim().length > 0);
}

const words = (text) =>
  text.match(/[0-9A-Za-zÇçĞğİıÖöŞşÜü'’]+/g) ?? [];

function turkishScores(text) {
  const ss = sentences(text);
  const ws = words(text);
  if (!ss.length || !ws.length) return null;
  const syllables = ws.reduce((sum, w) => sum + turkishSyllables(w), 0);
  const wordsPerSentence = ws.length / ss.length;

  const atesman =
    198.825 - 40.175 * (syllables / ws.length) - 2.61 * wordsPerSentence;

  const buckets = { 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const w of ws) {
    const n = turkishSyllables(w);
    if (n >= 6) buckets[6] += 1;
    else if (n >= 3) buckets[n] += 1;
  }
  const perSentence = (n) => buckets[n] / ss.length;
  const weighted =
    perSentence(3) * 0.84 +
    perSentence(4) * 1.5 +
    perSentence(5) * 3.5 +
    perSentence(6) * 26.25;
  const bezirci = Math.sqrt(wordsPerSentence * weighted);

  return {
    atesman,
    bezirci,
    wordsPerSentence,
    syllablesPerWord: syllables / ws.length,
    words: ws.length,
    sentences: ss.length,
  };
}

function englishScores(text) {
  const ss = sentences(text);
  const ws = words(text);
  if (!ss.length || !ws.length) return null;
  const syllables = ws.reduce((sum, w) => sum + englishSyllables(w), 0);
  const wps = ws.length / ss.length;
  const spw = syllables / ws.length;
  return {
    fre: 206.835 - 1.015 * wps - 84.6 * spw,
    fk: 0.39 * wps + 11.8 * spw - 15.59,
    wordsPerSentence: wps,
    words: ws.length,
    sentences: ss.length,
  };
}

const band = (s) =>
  s >= 90 ? "very easy" : s >= 70 ? "easy" : s >= 50 ? "medium" : s >= 30 ? "difficult" : "very difficult";

const failures = [];
const fail = (message) => failures.push(message);

console.log("Content audit\n=============\n");

// ---- Turkish readability -----------------------------------------------------
const trSource = read("tr");
const trStrings = proseStrings(trSource);
const tr = turkishScores(trStrings.join(" "));

console.log("Turkish (Atesman 1997 / Bezirci-Yilmaz 2010; syllables = vowel count, exact)");
console.log(`  strings ${trStrings.length} | words ${tr.words} | sentences ${tr.sentences}`);
console.log(`  words/sentence     ${tr.wordsPerSentence.toFixed(1)}`);
console.log(`  syllables/word     ${tr.syllablesPerWord.toFixed(2)}`);
console.log(`  Atesman            ${tr.atesman.toFixed(1)}  (${band(tr.atesman)}, need >= ${THRESHOLDS.tr.atesman})`);
console.log(`  Bezirci-Yilmaz     ${tr.bezirci.toFixed(1)}  (grade, need <= ${THRESHOLDS.tr.bezirci})`);

if (tr.atesman < THRESHOLDS.tr.atesman)
  fail(`TR Atesman ${tr.atesman.toFixed(1)} is below ${THRESHOLDS.tr.atesman}`);
if (tr.bezirci > THRESHOLDS.tr.bezirci)
  fail(`TR Bezirci-Yilmaz ${tr.bezirci.toFixed(1)} is above ${THRESHOLDS.tr.bezirci}`);

const trRanked = trStrings
  .map((s) => ({ s, score: turkishScores(s)?.atesman ?? 100, n: words(s).length }))
  .sort((a, b) => a.score - b.score);

const gateable = trRanked.filter((r) => r.n >= THRESHOLDS.minWordsToGate);
for (const r of gateable.filter((r) => r.score < THRESHOLDS.tr.atesman)) {
  fail(`TR string below ${THRESHOLDS.tr.atesman} (${r.score.toFixed(1)}): ${r.s.slice(0, 70)}...`);
}

console.log("\n  hardest strings (advisory -- short text scores unreliably):");
for (const r of trRanked.slice(0, 5)) {
  console.log(`   [${r.score.toFixed(1).padStart(6)}] (${r.n}w) ${r.s.slice(0, 78)}`);
}

// ---- English readability -----------------------------------------------------
const enSource = read("en");
const enStrings = proseStrings(enSource);
const en = englishScores(enStrings.join(" "));

console.log("\nEnglish (Flesch Reading Ease / Flesch-Kincaid; syllables heuristic, approximate)");
console.log(`  strings ${enStrings.length} | words ${en.words} | sentences ${en.sentences}`);
console.log(`  words/sentence     ${en.wordsPerSentence.toFixed(1)}`);
console.log(`  Reading Ease       ${en.fre.toFixed(1)}  (need >= ${THRESHOLDS.en.fre})`);
console.log(`  FK grade           ${en.fk.toFixed(1)}  (need <= ${THRESHOLDS.en.fk})`);

if (en.fre < THRESHOLDS.en.fre)
  fail(`EN Reading Ease ${en.fre.toFixed(1)} is below ${THRESHOLDS.en.fre}`);
if (en.fk > THRESHOLDS.en.fk)
  fail(`EN FK grade ${en.fk.toFixed(1)} is above ${THRESHOLDS.en.fk}`);

// ---- Metadata ----------------------------------------------------------------
const pages = [
  { id: "en /", title: field(enSource, "metadata", "title"), description: field(enSource, "metadata", "description") },
  { id: "en /about", title: field(enSource, "about", "metaTitle"), description: field(enSource, "about", "metaDescription") },
  { id: "tr /tr", title: field(trSource, "metadata", "title"), description: field(trSource, "metadata", "description") },
  { id: "tr /tr/about", title: field(trSource, "about", "metaTitle"), description: field(trSource, "about", "metaDescription") },
];

console.log("\nMetadata");
const [tMin, tMax] = THRESHOLDS.titleChars;
const [dMin, dMax] = THRESHOLDS.descriptionChars;

for (const page of pages) {
  if (!page.title || !page.description) {
    fail(`${page.id}: could not read title/description`);
    continue;
  }
  const tOk = page.title.length >= tMin && page.title.length <= tMax;
  const dOk = page.description.length >= dMin && page.description.length <= dMax;
  console.log(
    `  ${page.id.padEnd(12)} title ${String(page.title.length).padStart(3)} ${tOk ? "ok " : "BAD"}   description ${String(page.description.length).padStart(3)} ${dOk ? "ok" : "BAD"}`,
  );
  if (!tOk) fail(`${page.id}: title is ${page.title.length} chars, want ${tMin}-${tMax}`);
  if (!dOk) fail(`${page.id}: description is ${page.description.length} chars, want ${dMin}-${dMax}`);
}

for (const key of ["title", "description"]) {
  const seen = new Map();
  for (const page of pages) {
    const value = page[key];
    if (!value) continue;
    if (seen.has(value)) fail(`${page.id} shares its ${key} with ${seen.get(value)}`);
    else seen.set(value, page.id);
  }
}

// ---- Brand token -------------------------------------------------------------
const solidToken = /gbovision/i;
const tokenPages = pages.filter((p) => p.description && solidToken.test(p.description));
console.log(`\nBrand token "gbovision" in readable metadata: ${tokenPages.length}/${pages.length} pages`);
if (tokenPages.length === 0)
  fail('the solid spelling "gbovision" appears in no page description');

// ---- Result ------------------------------------------------------------------
if (failures.length) {
  console.error(`\nFAILED (${failures.length})`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nPASSED");
