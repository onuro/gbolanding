// Compact English grapheme-to-phoneme: a small lexicon of the words the site assistant is likely to say, and
// letter rules as a fallback (digraphs, magic e, r-coloured vowels, soft c / g). Good enough for mouth shapes:
// a viseme only needs the rough class of each sound. Stress: from the lexicon (digit 1 after the vowel),
// else the first syllable.
import { isVowel, syllabify, type WordPhone } from './phonemes';

// phonemes separated by spaces, '1' marks the stressed vowel
const LEX: Record<string, string> = {
  a: 'ə', an: 'ə n', the: 'ð ə', and: 'æ1 n d', or: 'ɔ1 ɹ', of: 'ə v', to: 't u1', in: 'ɪ1 n', on: 'ɑ1 n', at: 'æ1 t',
  for: 'f ɔ1 ɹ', with: 'w ɪ1 ð', from: 'f ɹ ʌ1 m', by: 'b aɪ1', as: 'æ1 z', is: 'ɪ1 z', are: 'ɑ1 ɹ', was: 'w ʌ1 z',
  be: 'b i1', been: 'b ɪ1 n', it: 'ɪ1 t', its: 'ɪ1 t s', "it's": 'ɪ1 t s', this: 'ð ɪ1 s', that: 'ð æ1 t',
  i: 'aɪ1', "i'm": 'aɪ1 m', im: 'aɪ1 m', "i'll": 'aɪ1 l', me: 'm i1', my: 'm aɪ1', we: 'w i1', "we're": 'w ɪ1 ɹ', our: 'aʊ1 ɹ', us: 'ʌ1 s',
  you: 'j u1', "you're": 'j ɔ1 ɹ', your: 'j ɔ1 ɹ', they: 'ð eɪ1', their: 'ð ɛ1 ɹ', he: 'h i1', she: 'ʃ i1',
  hi: 'h aɪ1', hello: 'h ə l oʊ1', hey: 'h eɪ1', welcome: 'w ɛ1 l k ə m', thanks: 'θ æ1 ŋ k s', thank: 'θ æ1 ŋ k',
  please: 'p l i1 z', yes: 'j ɛ1 s', no: 'n oʊ1', sure: 'ʃ ɔ1 ɹ', okay: 'oʊ k eɪ1', great: 'g ɹ eɪ1 t', good: 'g ʊ1 d',
  how: 'h aʊ1', what: 'w ʌ1 t', when: 'w ɛ1 n', where: 'w ɛ1 ɹ', who: 'h u1', why: 'w aɪ1', which: 'w ɪ1 tʃ',
  can: 'k æ1 n', could: 'k ʊ1 d', would: 'w ʊ1 d', will: 'w ɪ1 l', should: 'ʃ ʊ1 d', do: 'd u1', does: 'd ʌ1 z',
  have: 'h æ1 v', has: 'h æ1 z', get: 'g ɛ1 t', make: 'm eɪ1 k', let: 'l ɛ1 t', "let's": 'l ɛ1 t s', tell: 't ɛ1 l',
  help: 'h ɛ1 l p', need: 'n i1 d', want: 'w ɑ1 n t', like: 'l aɪ1 k', know: 'n oʊ1', see: 's i1', talk: 't ɔ1 k',
  call: 'k ɔ1 l', book: 'b ʊ1 k', answer: 'æ1 n s ɝ', ask: 'æ1 s k', find: 'f aɪ1 n d', start: 's t ɑ1 ɹ t',
  business: 'b ɪ1 z n ə s', today: 't ə d eɪ1', tomorrow: 't ə m ɑ1 ɹ oʊ', assistant: 'ə s ɪ1 s t ə n t',
  vision: 'v ɪ1 ʒ ə n', voice: 'v ɔɪ1 s', agent: 'eɪ1 dʒ ə n t', ai: 'eɪ1 aɪ1', service: 's ɝ1 v ɪ s',
  customer: 'k ʌ1 s t ə m ɝ', customers: 'k ʌ1 s t ə m ɝ z', appointment: 'ə p ɔɪ1 n t m ə n t', time: 't aɪ1 m',
  day: 'd eɪ1', about: 'ə b aʊ1 t', more: 'm ɔ1 ɹ', just: 'dʒ ʌ1 s t', now: 'n aʊ1', all: 'ɔ1 l', any: 'ɛ1 n i',
  one: 'w ʌ1 n', two: 't u1', three: 'θ ɹ i1', here: 'h ɪ1 ɹ', there: 'ð ɛ1 ɹ', question: 'k w ɛ1 s tʃ ə n',
  questions: 'k w ɛ1 s tʃ ə n z', minute: 'm ɪ1 n ɪ t', hour: 'aʊ1 ɝ', hours: 'aʊ1 ɝ z', company: 'k ʌ1 m p ə n i',
  gbo: 'dʒ i1 b i1 oʊ1',
};

const LETTER_NAME: Record<string, string> = {
  a: 'eɪ1', b: 'b i1', c: 's i1', d: 'd i1', e: 'i1', f: 'ɛ1 f', g: 'dʒ i1', h: 'eɪ1 tʃ', i: 'aɪ1', j: 'dʒ eɪ1',
  k: 'k eɪ1', l: 'ɛ1 l', m: 'ɛ1 m', n: 'ɛ1 n', o: 'oʊ1', p: 'p i1', q: 'k j u1', r: 'ɑ1 ɹ', s: 'ɛ1 s', t: 't i1',
  u: 'j u1', v: 'v i1', w: 'd ʌ1 b ə l j u', x: 'ɛ1 k s', y: 'w aɪ1', z: 'z i1',
};

function fromLex(s: string): WordPhone[] {
  const toks = s.split(' ');
  const ps = toks.map((t) => t.replace('1', ''));
  const { syl } = syllabify(ps);
  return toks.map((t, i) => {
    const p = ps[i]!;
    const out: WordPhone = { p, syl: syl[i]! };
    if (isVowel(p)) out.stress = t.endsWith('1') ? 1 : 0;
    return out;
  });
}

// ordered longest first; [pattern, phonemes]
const RULES: [string, string[]][] = [
  ['tion', ['ʃ', 'ə', 'n']], ['sion', ['ʒ', 'ə', 'n']], ['ough', ['oʊ']], ['augh', ['ɔ']], ['igh', ['aɪ']],
  ['tch', ['tʃ']], ['dge', ['dʒ']], ['ch', ['tʃ']], ['sh', ['ʃ']], ['th', ['θ']], ['ph', ['f']], ['wh', ['w']],
  ['ck', ['k']], ['ng', ['ŋ']], ['qu', ['k', 'w']], ['kn', ['n']], ['wr', ['ɹ']],
  ['ee', ['i']], ['ea', ['i']], ['oo', ['u']], ['ou', ['aʊ']], ['ow', ['oʊ']], ['ai', ['eɪ']], ['ay', ['eɪ']],
  ['oi', ['ɔɪ']], ['oy', ['ɔɪ']], ['au', ['ɔ']], ['aw', ['ɔ']], ['ew', ['j', 'u']], ['ie', ['i']], ['ei', ['eɪ']],
  ['ar', ['ɑ', 'ɹ']], ['or', ['ɔ', 'ɹ']], ['er', ['ɝ']], ['ir', ['ɝ']], ['ur', ['ɝ']],
];
const SHORT: Record<string, string> = { a: 'æ', e: 'ɛ', i: 'ɪ', o: 'ɑ', u: 'ʌ', y: 'ɪ' };
const LONG: Record<string, string> = { a: 'eɪ', e: 'i', i: 'aɪ', o: 'oʊ', u: 'u', y: 'aɪ' };
const CONS: Record<string, string> = {
  b: 'b', d: 'd', f: 'f', h: 'h', j: 'dʒ', k: 'k', l: 'l', m: 'm', n: 'n', p: 'p', r: 'ɹ', s: 's', t: 't', v: 'v',
  w: 'w', z: 'z',
};
const isV = (c: string | undefined) => !!c && 'aeiou'.includes(c);

function byRules(w: string): WordPhone[] {
  const ps: string[] = [];
  let i = 0;
  // magic e: ...V C e at the end -> long vowel, silent e
  const magic = w.length >= 3 && w.endsWith('e') && !isV(w[w.length - 2]) && isV(w[w.length - 3]) ? w.length - 3 : -1;
  const end = w.endsWith('e') && w.length > 2 ? w.length - 1 : w.length;
  while (i < end) {
    const rule = RULES.find(([g]) => w.startsWith(g, i));
    if (rule) { ps.push(...rule[1]); i += rule[0].length; continue; }
    const c = w[i]!;
    const nx = w[i + 1];
    if (c === w[i + 1] && !isV(c)) { i++; continue; } // double consonant
    if (c in SHORT) {
      if (c === 'y' && i === 0) ps.push('j');
      else if (c === 'y' && i === end - 1) ps.push('i');
      else ps.push(i === magic ? LONG[c]! : SHORT[c]!);
    } else if (c === 'c') ps.push(nx && 'eiy'.includes(nx) ? 's' : 'k');
    else if (c === 'g') ps.push(nx && 'eiy'.includes(nx) ? 'dʒ' : 'g');
    else if (c === 'x') ps.push('k', 's');
    else if (c === 'q') ps.push('k');
    else if (CONS[c]) ps.push(CONS[c]!);
    i++;
  }
  const { syl } = syllabify(ps);
  let stressed = false;
  return ps.map((p, k) => {
    const out: WordPhone = { p, syl: syl[k]! };
    if (isVowel(p)) { out.stress = stressed ? 0 : 1; stressed = true; }
    return out;
  });
}

/** A written word (letters and apostrophes) -> phonemes with syllables and stress. */
export function enWord(raw: string): WordPhone[] {
  const lw = raw.toLowerCase().replace(/[’]/g, "'");
  if (LEX[lw]) return fromLex(LEX[lw]!);
  // acronym in capitals: letter names
  if (/^[A-Z]{2,5}$/.test(raw)) return fromLex([...lw].map((c) => LETTER_NAME[c] ?? '').filter(Boolean).join(' '));
  // possessive / contraction: base word + s
  const m = /^(.*)'(s|d|ll|re|ve)$/.exec(lw);
  if (m && m[1]) {
    const base = enWord(m[1]);
    const lastSyl = base.length ? base[base.length - 1]!.syl : 0;
    const tail: Record<string, string[]> = { s: ['z'], d: ['d'], ll: ['l'], re: ['ɹ'], ve: ['v'] };
    return [...base, ...(tail[m[2]!] ?? []).map((p) => ({ p, syl: lastSyl }))];
  }
  return byRules(lw.replace(/'/g, ''));
}
