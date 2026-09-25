// Rule-based Turkish grapheme-to-phoneme. Turkish orthography is near-phonemic, so a letter map plus a few rules is
// enough for mouth shapes: ğ (lengthens the vowel before a consonant / word end, a y-glide between front vowels,
// silent between the rest), identical vowels in a row merge into one long vowel (saat, olduğu), circumflex â / û make
// a k / g before them palatal (zekâ -> zekya) and are long elsewhere, acronyms take a set reading or Turkish letter
// names (CRM -> ce re me), and a small lexicon covers loans and brand words. A suffix after an apostrophe attaches to
// the root's pronunciation (Vision'ın -> vijının, CRM'e -> ceremeye). Stress: word-final by default, with the common
// suffix exceptions (-yor, -mAktA, -DIr, -sInIz, aorist -Iz, -yIm / -yIz, future + person), a short word list,
// unstressed clitics (mı, de, ki), and a proper noun keeps its own stress under a suffix.
import { isVowel, syllabify, type WordPhone } from './phonemes';

// multi-phoneme values are space-separated; accented letters of foreign names fold to the plain vowel
const LETTER: Record<string, string> = {
  a: 'a', b: 'b', c: 'dʒ', 'ç': 'tʃ', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h', 'ı': 'ɯ', i: 'i', j: 'ʒ', k: 'k', l: 'l',
  m: 'm', n: 'n', o: 'o', 'ö': 'ø', p: 'p', r: 'ɾ', s: 's', 'ş': 'ʃ', t: 't', u: 'u', 'ü': 'y', v: 'v', y: 'j', z: 'z',
  q: 'k', w: 'v', x: 'k s', 'â': 'a', 'î': 'i', 'û': 'u', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'á': 'a', 'à': 'a',
  'ä': 'e', 'í': 'i', 'ó': 'o', 'ô': 'o', 'ú': 'u', 'ñ': 'n',
};

/** Turkish letter names, for acronyms written in capitals (CRM -> ce re me). */
const LETTER_NAME: Record<string, string> = {
  a: 'a', b: 'be', c: 'ce', 'ç': 'çe', d: 'de', e: 'e', f: 'fe', g: 'ge', 'ğ': 'yumuşak ge', h: 'he', 'ı': 'ı', i: 'i',
  j: 'je', k: 'ke', l: 'le', m: 'me', n: 'ne', o: 'o', 'ö': 'ö', p: 'pe', r: 're', s: 'se', 'ş': 'şe', t: 'te',
  u: 'u', 'ü': 'ü', v: 've', y: 'ye', z: 'ze', q: 'kü', w: 've', x: 'iks',
};

/** Capitalised words with a set reading: the brand's own "ce be o", acronyms said in English, acronyms read as a word.
 *  Other capitals are spelled with LETTER_NAME unless they alternate consonant / vowel (KOBİ, NATO: read as words). */
const ACRONYM: Record<string, string> = {
  GBO: 'ce be o', AI: 'ey ay', IT: 'ay ti', CEO: 'si i o', GPT: 'ci pi ti', LLM: 'el el em', IVR: 'ay vi ar', UX: 'yu eks',
  UI: 'yu ay', IOT: 'ay o ti', SAAS: 'sas', ISO: 'iso', AR: 'ar', GE: 'ge', ARGE: 'arge', TÜİK: 'tüik',
};

/** Loanwords / brand words as a Turkish speaker says them (respelled in Turkish orthography; a space keeps the parts
 *  from merging, â marks a palatal k / g). */
const LEXICON: Record<string, string> = {
  vision: 'vijın', ai: 'ey ay', openai: 'opın ey ay', chatgpt: 'çet ci pi ti', chatbot: 'çetbot', chat: 'çet',
  saas: 'sas', iot: 'ay o ti', online: 'onlayn', offline: 'oflayn', web: 'veb', email: 'imeyl', mail: 'meyl',
  whatsapp: 'vatsap', zoom: 'zum', google: 'gugıl', meet: 'mit', teams: 'tims', microsoft: 'maykrosoft', excel: 'eksel',
  instagram: 'instagram', youtube: 'yutub', linkedin: 'linkedin', dashboard: 'deşbord', startup: 'startap',
  feedback: 'fidbek', ağabey: 'ağbi',
};

/** Stems whose k / g is palatal although the circumflex is usually dropped in writing (zeka = zekâ). */
const HAT: Record<string, string> = {
  zeka: 'zekâ', hikaye: 'hikâye', mekan: 'mekân', dükkan: 'dükkân', rüzgar: 'rüzgâr', yegane: 'yegâne', kağıt: 'kâğıt',
  karlılık: 'kârlılık',
};
const HAT_RE = /^(zeka|hikaye|mekan(?!i)|dükkan|rüzgar|yegane|kağıt|karlılık)/;

/** 1-based stressed syllable for words that are not word-final stressed (0 = unstressed). */
const STRESS: Record<string, number> = {
  merhaba: 1, nasıl: 1, şimdi: 1, sonra: 1, önce: 1, lütfen: 1, evet: 1, hayır: 1, ama: 1, ancak: 1, fakat: 1, belki: 1,
  yarın: 1, bugün: 1, nerede: 1, niçin: 1, neden: 1, hangi: 1, hangisi: 1, değil: 1, nedir: 1, yani: 1, mesela: 1,
  örneğin: 1, ayrıca: 1, aslında: 1, hemen: 1, henüz: 1, bazen: 1, çünkü: 1, eğer: 1, şöyle: 1, böyle: 1, öyle: 1,
  burada: 1, şurada: 1, orada: 1, özellikle: 2, gerçekten: 2, kesinlikle: 2, birlikte: 2, tamamen: 2, asistanıyım: 4,
  olabilirim: 4, yardımcı: 3, deneyim: 3, türkiye: 1, istanbul: 2, ankara: 1, izmir: 1, avrupa: 2, amerika: 2, vision: 1,
  google: 1, demo: 1, de: 0, da: 0, ki: 0,
};

export const trLower = (s: string) => s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
const enLower = (s: string) => s.replace(/İ/g, 'i').toLowerCase();

const TR_V = 'aeıioöuüâîû';
const CAPS_V = 'AEIİOÖUÜ';
/** own-property lookup (a word like "constructor" must not hit Object.prototype) */
const get = <T,>(o: Record<string, T>, k: string): T | undefined => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);

/** A root (the part before an apostrophe) -> Turkish orthography to read ('-' separates parts that must not merge)
 *  and, for a spelled / lexicon / named root, its own stressed syllable. */
function readRoot(root: string): { text: string; stress?: number; own: boolean } {
  const spoken = (s: string) => s.trim().replace(/\s+/g, '-');
  if (/^[A-ZÇĞİÖŞÜ]{2,5}$/.test(root)) {
    const set = get(ACRONYM, root);
    if (set) return { text: spoken(set), own: true };
    // alternating consonant / vowel reads as a word (KOBİ, NATO, VE, BİM; a 2-3 letter one must start with a
    // consonant, so API, AB stay spelled); the rest is spelled (API -> a pe i). An ASCII I in capitals is read i.
    const lc = trLower(root.replace(/I/g, 'i'));
    const alt = [...root].every((c, i) => i === 0 || CAPS_V.includes(c) !== CAPS_V.includes(root[i - 1]!));
    if (alt && (root.length >= 4 || !CAPS_V.includes(root[0]!))) return { text: lc, own: true };
    return { text: [...lc].map((c) => spoken(LETTER_NAME[c] ?? '')).join('-'), own: true };
  }
  const k1 = trLower(root), k2 = enLower(root);
  const lex = get(LEXICON, k1) ?? get(LEXICON, k2);
  if (lex) return { text: spoken(lex), stress: get(STRESS, k1) ?? get(STRESS, k2), own: true };
  // no vowel at all (crm, a single B): spell it (not a hum: hmm, mm)
  if (k1 && ![...k1].some((c) => TR_V.includes(c)) && k1.length <= 5 && !/^h*m+$/.test(k1)) {
    return { text: [...k1].map((c) => spoken(LETTER_NAME[c] ?? '')).join('-'), own: true };
  }
  return { text: k1.replace(HAT_RE, (m) => HAT[m]!), stress: get(STRESS, k1), own: false };
}

/** A written word (letters, optional apostrophe before a suffix) -> phonemes with syllables and stress. */
export function trWord(raw: string): WordPhone[] {
  // proper noun + suffix (Vision'ın): the root may be a lexicon / acronym word, the suffix is plain Turkish
  const [root = '', ...rest] = raw.split(/['’]/);
  const r = readRoot(root);
  let sfx = rest.map(trLower).join('');
  // a vowel-final reading before a vowel suffix takes the buffer y (CRM'e -> ce re me ye)
  if (sfx && r.text && TR_V.includes(r.text.slice(-1)) && TR_V.includes(sfx[0]!)) sfx = 'y' + sfx;
  const w = r.text + sfx;
  const rootEnd = r.text.length;

  const ps: string[] = [];
  const long: boolean[] = [];
  let joinable = false; // the previous phoneme may merge with an identical next vowel (no '-' in between)
  let rootVowels = 0;
  for (let k = 0; k < w.length; k++) {
    if (k === rootEnd) rootVowels = ps.filter(isVowel).length;
    const ch = w[k]!;
    if (ch === '-') { joinable = false; continue; }
    const last = ps.length - 1;
    if (ch === 'ğ') {
      // yumuşak g: no articulation of its own. Between a front vowel and e / i it is a y-glide (değil, istediğiniz);
      // elsewhere it lengthens the vowel before it, and an identical vowel after it merges in (ağaç, olduğu)
      if (last < 0 || !isVowel(ps[last]!)) continue;
      const next = LETTER[w[k + 1] ?? ''];
      if ('eiøy'.includes(ps[last]!) && (next === 'e' || next === 'i')) { ps.push('j'); long.push(false); joinable = false; }
      else long[last] = true;
      continue;
    }
    const m = LETTER[ch];
    if (!m) continue;
    if (joinable && m === ps[last] && isVowel(m)) { long[last] = true; continue; } // saat, tabii, kooperatif
    if (ch === 'â' || ch === 'û') {
      // palatal k / g before â, û (zekâ, kâr, rüzgâr): a y-glide into the vowel; after l nothing; else a long vowel
      const prev = w[k - 1];
      if (prev === 'k' || prev === 'g') { ps.push('j', m); long.push(false, false); }
      else { ps.push(m); long.push(prev !== 'l'); }
      joinable = true;
      continue;
    }
    for (const p of m.split(' ')) { ps.push(p); long.push(ch === 'î'); }
    joinable = true;
  }
  if (rootEnd >= w.length) rootVowels = ps.filter(isVowel).length;

  const { syl, count } = syllabify(ps);
  const stressed = stressOf(raw, ps, syl, count, r, sfx ? rootVowels : 0) - 1;
  return ps.map((p, i) => {
    const out: WordPhone = { p, syl: syl[i]! };
    if (isVowel(p)) {
      out.stress = syl[i] === stressed ? 1 : 0;
      if (long[i]) out.long = true;
    }
    return out;
  });
}

/** 1-based stressed syllable (0 = none). */
function stressOf(raw: string, ps: string[], syl: number[], count: number, r: { stress?: number; own: boolean }, rootVowels: number): number {
  const key = trLower(raw.replace(/['’]/g, ''));
  const fixed = get(STRESS, key);
  if (fixed !== undefined) return Math.min(count, fixed);
  // proper noun + suffix: the root keeps its stress (Vision'ın -> VI-jı-nın, GBO'nun -> ce-be-O-nun)
  if (rootVowels) return Math.min(count, r.stress ?? (r.own ? rootVowels : count));
  // question / focus clitics carry no stress (mı, misiniz, mıdır)
  if (/^m[ıiuü](y[ıiuü]m|s[ıiuü]n|y[ıiuü]z|s[ıiuü]n[ıiuü]z|d[ıiuü]r|yd[ıiuü]|ym[ıiuü]ş)?$/.test(key)) return 0;
  // one char per phoneme (tʃ, dʒ fold to one letter) so the suffix patterns can index back into ps
  const s = ps.map((p) => (p === 'tʃ' ? 'ç' : p === 'dʒ' ? 'c' : p)).join('');
  const V = '[aeiɯoøuy]', H = '[iɯuy]'; // any vowel, a high vowel
  const sylAt = (i: number) => syl[i]! + 1;
  // -Iyor: the vowel before it (ge-liş-ti-Rİ-yo-ruz); a negative -mI- moves it one back (is-TE-mi-yo-rum)
  let yor = -1;
  for (const m of s.matchAll(new RegExp(V + 'joɾ', 'g'))) yor = m.index!;
  if (yor >= 0) {
    const neg = yor >= 2 && s[yor - 1] === 'm' && 'iɯuy'.includes(s[yor]!);
    return Math.max(1, sylAt(yor) - (neg ? 1 : 0));
  }
  // -mAktA + person / -DIr: the mak (ça-lış-MAK-ta-yız, ge-rek-MEK-te-dir)
  const mak = new RegExp('m[ae]kt[ae](d' + H + 'ɾ|j' + H + '[mz]|s' + H + 'n(' + H + 'z)?|l[ae]ɾ)?$').exec(s);
  if (mak) return sylAt(mak.index + 1);
  if (count >= 3) {
    if (new RegExp('s' + H + 'n' + H + 'z$').test(s)) return count - 2; // is-TER-si-niz, -a-bi-LİR-si-niz
    if (new RegExp('[aeiɯuy]ɾ' + H + 'z$').test(s)) return count - 1; // aorist + -Iz: ge-liş-ti-re-bi-Lİ-riz
    if (new RegExp(V + 'j' + H + '[mz]$').test(s)) return count - 1; // -yIm / -yIz: a-sis-ta-NI-yım, gön-de-re-CE-ğim
    if (new RegExp('ca' + H + '[mz]$').test(s)) return count - 1; // future + -Im / -Iz: ya-pa-CA-ğız
    // copula -dIr (not the causative -lAndIr); -tIr is left alone, it is as often the aorist (ü-re-TİR)
    if (new RegExp('d' + H + 'ɾ$').test(s) && !new RegExp('l[ae]nd' + H + 'ɾ$').test(s)) return count - 1;
  }
  return count;
}
