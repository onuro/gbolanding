// Rule-based Turkish grapheme-to-phoneme. Turkish orthography is near-phonemic, so a letter map plus a few
// rules (ğ lengthens the previous vowel, circumflex vowels, acronyms spelled with Turkish letter names, a small
// loanword lexicon for brand words) is enough for mouth shapes. Stress: word-final by default (Turkish), with a
// short list of common exceptions.
import { syllabify, type WordPhone } from './phonemes';

const LETTER: Record<string, string> = {
  a: 'a', 'â': 'a', b: 'b', c: 'dʒ', 'ç': 'tʃ', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h', 'ı': 'ɯ', i: 'i', 'î': 'i',
  j: 'ʒ', k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', 'ö': 'ø', p: 'p', r: 'ɾ', s: 's', 'ş': 'ʃ', t: 't', u: 'u',
  'û': 'u', 'ü': 'y', v: 'v', y: 'j', z: 'z', q: 'k', w: 'v', x: 'ks',
};

/** Turkish letter names, for acronyms written in capitals (GBO -> ce be o). */
const LETTER_NAME: Record<string, string> = {
  a: 'a', b: 'be', c: 'ce', 'ç': 'çe', d: 'de', e: 'e', f: 'fe', g: 'ge', 'ğ': 'yumuşakge', h: 'he', 'ı': 'ı', i: 'i',
  j: 'je', k: 'ke', l: 'le', m: 'me', n: 'ne', o: 'o', 'ö': 'ö', p: 'pe', r: 're', s: 'se', 'ş': 'şe', t: 'te',
  u: 'u', 'ü': 'ü', v: 've', y: 'ye', z: 'ze', q: 'kü', w: 've', x: 'iks',
};

/** Loanwords / brand words as a Turkish speaker says them (respelled in Turkish orthography). */
const LEXICON: Record<string, string> = {
  vision: 'vijın', ai: 'ey ay', online: 'onlayn', web: 'veb', email: 'imeyl', whatsapp: 'vatsap',
};

/** 1-based stressed syllable for common words that are not word-final stressed. */
const STRESS: Record<string, number> = {
  merhaba: 1, nasıl: 1, şimdi: 1, sonra: 1, lütfen: 1, evet: 1, hayır: 1, ama: 1, ancak: 1, belki: 1, yarın: 1,
  bugün: 1, nerede: 1, niçin: 1, asistanıyım: 4, olabilirim: 4, yardımcı: 3,
};

export const trLower = (s: string) => s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();

/** A written word (letters, optional apostrophe before a suffix) -> phonemes with syllables and stress. */
export function trWord(raw: string): WordPhone[] {
  // proper noun + suffix (Vision'ın): the root may be a lexicon / acronym word, the suffix is plain Turkish
  const [root = '', ...suffix] = raw.split(/['’]/);
  let r = root;
  // acronym: 2-5 capitals (GBO); AI is in the lexicon
  if (/^[A-ZÇĞİÖŞÜ]{2,5}$/.test(r) && !(trLower(r) in LEXICON)) r = [...trLower(r)].map((c) => LETTER_NAME[c] ?? c).join('');
  r = trLower(r);
  if (LEXICON[r]) r = LEXICON[r]!.replace(/ /g, '');
  const lexKey = trLower(raw.replace(/['’]/g, ''));
  const w = r + suffix.map(trLower).join('');
  const ps: string[] = [];
  const long: boolean[] = [];
  for (const ch of w) {
    if (ch === 'ğ') {
      // yumuşak g: lengthens the previous vowel, no articulation of its own
      if (long.length) long[long.length - 1] = true;
      continue;
    }
    const m = LETTER[ch];
    if (!m) continue;
    if (m === 'ks') { ps.push('k', 's'); long.push(false, false); continue; }
    ps.push(m);
    long.push(false);
  }
  const { syl, count } = syllabify(ps);
  const stressed = Math.min(count, STRESS[lexKey] ?? count) - 1;
  return ps.map((p, i) => {
    const out: WordPhone = { p, syl: syl[i]! };
    if (TR_VOWELS.includes(p)) {
      out.stress = syl[i] === stressed ? 1 : 0;
      if (long[i]) out.long = true;
    }
    return out;
  });
}

const TR_VOWELS = ['a', 'e', 'i', 'ɯ', 'o', 'ø', 'u', 'y'];
