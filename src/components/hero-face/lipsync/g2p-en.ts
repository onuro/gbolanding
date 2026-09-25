// Compact English grapheme-to-phoneme (General American) for the live agent's words. Three layers:
//  1. LEX: irregular and very frequent words (phonemes separated by spaces, '1' after the stressed vowel);
//  2. morphology: -s -es -ed -ing -er -ly -ment -ness -ful -less -able -ize -ship -ional are split off, the base
//     is looked up (LEX, else rules) and the suffix appended with the right allomorph (-ed = t / d / ɪd,
//     -s = s / z / ɪz), so "managing", "products", "automated" keep the stress and vowels of their base;
//  3. letter rules: the word is cut into units (consonant digraphs, vowel digraphs, r-coloured vowels, magic e,
//     -tion / -cial / -ture / -le endings ...), one vowel unit is stressed (suffix rules -tion -ic -ity -ate,
//     vowel hiatus, unstressed prefixes be- de- re- ex- a(CC)-, else first of two / Latin penult-antepenult),
//     then every vowel is realised: stressed = long (magic e, open syllable) or short, unstressed = reduced.
// Mouth shapes need the vowel identity, the syllable count, the labials and the stress to be right.
import { isVowel, syllabify, type WordPhone } from './phonemes';

// phonemes separated by spaces, '1' marks the stressed vowel. Only words the rules get wrong, plus the bases that
// compounds and suffixes build on (thing, time, line, data, use, change ...): "sometimes", "timeline",
// "anything", "database", "used", "changed" then come out of compound() / morph().
const LEX: Record<string, string> = {
  // function words and pronouns
  a: 'ə', an: 'ə n', the: 'ð ə', and: 'æ1 n d', or: 'ɔ1 ɹ', of: 'ə v', to: 't u1', in: 'ɪ1 n', on: 'ɑ1 n', at: 'æ1 t',
  for: 'f ɔ1 ɹ', with: 'w ɪ1 ð', from: 'f ɹ ʌ1 m', by: 'b aɪ1', as: 'æ1 z', is: 'ɪ1 z', are: 'ɑ1 ɹ', was: 'w ʌ1 z',
  were: 'w ɝ1', be: 'b i1', been: 'b ɪ1 n', it: 'ɪ1 t', its: 'ɪ1 t s', "it's": 'ɪ1 t s', this: 'ð ɪ1 s', that: 'ð æ1 t',
  these: 'ð i1 z', those: 'ð oʊ1 z', them: 'ð ɛ1 m', then: 'ð ɛ1 n', than: 'ð æ1 n', thus: 'ð ʌ1 s',
  i: 'aɪ1', "i'm": 'aɪ1 m', im: 'aɪ1 m', "i'll": 'aɪ1 l', me: 'm i1', my: 'm aɪ1', we: 'w i1', "we're": 'w ɪ1 ɹ',
  our: 'aʊ1 ɹ', us: 'ʌ1 s', you: 'j u1', "you're": 'j ɔ1 ɹ', your: 'j ɔ1 ɹ', they: 'ð eɪ1', "they're": 'ð ɛ1 ɹ',
  their: 'ð ɛ1 ɹ', he: 'h i1', she: 'ʃ i1', him: 'h ɪ1 m', her: 'h ɝ1', who: 'h u1', whom: 'h u1 m', whose: 'h u1 z',
  whole: 'h oʊ1 l', what: 'w ʌ1 t', when: 'w ɛ1 n', where: 'w ɛ1 ɹ', why: 'w aɪ1', which: 'w ɪ1 tʃ', how: 'h aʊ1',
  there: 'ð ɛ1 ɹ', here: 'h ɪ1 ɹ', into: 'ɪ1 n t u', onto: 'ɑ1 n t u', upon: 'ə p ɑ1 n', until: 'ə n t ɪ1 l',
  among: 'ə m ʌ1 ŋ', again: 'ə g ɛ1 n', against: 'ə g ɛ1 n s t', although: 'ɔ l ð oʊ1', though: 'ð oʊ1',
  without: 'w ɪ ð aʊ1 t', within: 'w ɪ ð ɪ1 n', however: 'h aʊ ɛ1 v ɝ', whatever: 'w ʌ t ɛ1 v ɝ', whenever: 'w ɛ n ɛ1 v ɝ',
  either: 'i1 ð ɝ', neither: 'n i1 ð ɝ', toward: 't ɔ1 ɹ d', instead: 'ɪ n s t ɛ1 d', together: 't ə g ɛ1 ð ɝ',
  // frequent irregular words
  can: 'k æ1 n', could: 'k ʊ1 d', would: 'w ʊ1 d', will: 'w ɪ1 l', should: 'ʃ ʊ1 d', do: 'd u1', does: 'd ʌ1 z',
  done: 'd ʌ1 n', gone: 'g ɔ1 n', none: 'n ʌ1 n', one: 'w ʌ1 n', once: 'w ʌ1 n s', two: 't u1', said: 's ɛ1 d',
  says: 's ɛ1 z', have: 'h æ1 v', has: 'h æ1 z', get: 'g ɛ1 t', give: 'g ɪ1 v', given: 'g ɪ1 v ə n', live: 'l ɪ1 v',
  begin: 'b ɪ g ɪ1 n', began: 'b ɪ g æ1 n', girl: 'g ɝ1 l', put: 'p ʊ1 t', full: 'f ʊ1 l', fully: 'f ʊ1 l i',
  lose: 'l u1 z', lead: 'l i1 d', read: 'ɹ i1 d', use: 'j u1 z', change: 'tʃ eɪ1 n dʒ', range: 'ɹ eɪ1 n dʒ',
  make: 'm eɪ1 k', let: 'l ɛ1 t', "let's": 'l ɛ1 t s', tell: 't ɛ1 l', help: 'h ɛ1 l p', need: 'n i1 d',
  want: 'w ɑ1 n t', like: 'l aɪ1 k', know: 'n oʊ1', see: 's i1', talk: 't ɔ1 k', call: 'k ɔ1 l', book: 'b ʊ1 k',
  answer: 'æ1 n s ɝ', ask: 'æ1 s k', find: 'f aɪ1 n d', start: 's t ɑ1 ɹ t', only: 'oʊ1 n l i', over: 'oʊ1 v ɝ',
  even: 'i1 v ə n', many: 'm ɛ1 n i', any: 'ɛ1 n i', every: 'ɛ1 v ɹ i', both: 'b oʊ1 θ', people: 'p i1 p ə l',
  woman: 'w ʊ1 m ə n', women: 'w ɪ1 m ɪ n', family: 'f æ1 m ə l i', water: 'w ɔ1 t ɝ', study: 's t ʌ1 d i',
  eye: 'aɪ1', friend: 'f ɹ ɛ1 n d', father: 'f ɑ1 ð ɝ', idea: 'aɪ d i1 ə', area: 'ɛ1 ɹ i ə', office: 'ɔ1 f ɪ s',
  offer: 'ɔ1 f ɝ', continue: 'k ə n t ɪ1 n j u', understand: 'ʌ n d ɝ s t æ1 n d', create: 'k ɹ i eɪ1 t',
  consider: 'k ə n s ɪ1 d ɝ', suggest: 's ə g dʒ ɛ1 s t', early: 'ɝ1 l i', recent: 'ɹ i1 s ə n t', easy: 'i1 z i',
  private: 'p ɹ aɪ1 v ə t', already: 'ɔ l ɹ ɛ1 d i', enough: 'ɪ n ʌ1 f', maybe: 'm eɪ1 b i', perhaps: 'p ɝ h æ1 p s',
  yesterday: 'j ɛ1 s t ɝ d eɪ', today: 't ə d eɪ1', tonight: 't ə n aɪ1 t', tomorrow: 't ə m ɑ1 ɹ oʊ',
  evening: 'i1 v n ɪ ŋ', hundred: 'h ʌ1 n d ɹ ə d', pretty: 'p ɹ ɪ1 t i', definite: 'd ɛ1 f ə n ə t',
  absolutely: 'æ b s ə l u1 t l i', personal: 'p ɝ1 s ə n ə l', language: 'l æ1 ŋ g w ɪ dʒ', low: 'l oʊ1',
  minute: 'm ɪ1 n ɪ t', hour: 'aʊ1 ɝ', nothing: 'n ʌ1 θ ɪ ŋ', "don't": 'd oʊ1 n t', "can't": 'k æ1 n t', "won't": 'w oʊ1 n t',
  monday: 'm ʌ1 n d eɪ', tuesday: 't u1 z d eɪ', wednesday: 'w ɛ1 n z d eɪ', thursday: 'θ ɝ1 z d eɪ',
  friday: 'f ɹ aɪ1 d eɪ', saturday: 's æ1 t ɝ d eɪ', sunday: 's ʌ1 n d eɪ',
  // parts that compounds are built from (some+thing, time+line, data+base, web+site, feed+back, chat+bot)
  some: 's ʌ1 m', thing: 'θ ɪ1 ŋ', time: 't aɪ1 m', line: 'l aɪ1 n', way: 'w eɪ1', body: 'b ɑ1 d i', day: 'd eɪ1',
  not: 'n ɑ1 t', data: 'd eɪ1 t ə', base: 'b eɪ1 s', web: 'w ɛ1 b', site: 's aɪ1 t', feed: 'f i1 d', back: 'b æ1 k',
  chat: 'tʃ æ1 t', bot: 'b ɑ1 t', work: 'w ɝ1 k', flow: 'f l oʊ1', load: 'l oʊ1 d', set: 's ɛ1 t', good: 'g ʊ1 d',
  bye: 'b aɪ1', all: 'ɔ1 l', more: 'm ɔ1 ɹ', out: 'aʊ1 t', about: 'ə b aʊ1 t', just: 'dʒ ʌ1 s t', now: 'n aʊ1',
  // greetings and replies
  hi: 'h aɪ1', hello: 'h ə l oʊ1', hey: 'h eɪ1', yeah: 'j ɛ1 ə', oh: 'oʊ1', welcome: 'w ɛ1 l k ə m',
  thanks: 'θ æ1 ŋ k s', thank: 'θ æ1 ŋ k', please: 'p l i1 z', yes: 'j ɛ1 s', no: 'n oʊ1', sure: 'ʃ ɔ1 ɹ',
  okay: 'oʊ k eɪ1', great: 'g ɹ eɪ1 t', three: 'θ ɹ i1', question: 'k w ɛ1 s tʃ ə n',
  // business vocabulary the rules get wrong
  business: 'b ɪ1 z n ə s', assistant: 'ə s ɪ1 s t ə n t', vision: 'v ɪ1 ʒ ə n', voice: 'v ɔɪ1 s',
  agent: 'eɪ1 dʒ ə n t', agency: 'eɪ1 dʒ ə n s i', service: 's ɝ1 v ɪ s', customer: 'k ʌ1 s t ə m ɝ',
  company: 'k ʌ1 m p ə n i', appointment: 'ə p ɔɪ1 n t m ə n t', program: 'p ɹ oʊ1 g ɹ æ m', process: 'p ɹ ɑ1 s ɛ s',
  demo: 'd ɛ1 m oʊ', debt: 'd ɛ1 t', relevant: 'ɹ ɛ1 l ə v ə n t', corporate: 'k ɔ1 ɹ p ɹ ə t', orient: 'ɔ1 ɹ i ɛ n t',
  transform: 't ɹ æ n s f ɔ1 ɹ m', platform: 'p l æ1 t f ɔ ɹ m', interface: 'ɪ1 n t ɝ f eɪ s', input: 'ɪ1 n p ʊ t',
  output: 'aʊ1 t p ʊ t', accurate: 'æ1 k j ɝ ə t', accuracy: 'æ1 k j ɝ ə s i', appropriate: 'ə p ɹ oʊ1 p ɹ i ə t',
  compliance: 'k ə m p l aɪ1 ə n s', privacy: 'p ɹ aɪ1 v ə s i', proposal: 'p ɹ ə p oʊ1 z ə l', scale: 's k eɪ1 l',
  revenue: 'ɹ ɛ1 v ə n u', finance: 'f aɪ1 n æ n s', insurance: 'ɪ n ʃ ʊ1 ɹ ə n s', retail: 'ɹ i1 t eɪ l',
  machine: 'm ə ʃ i1 n', generative: 'dʒ ɛ1 n ɝ ə t ɪ v', knowledge: 'n ɑ1 l ɪ dʒ', document: 'd ɑ1 k j ə m ə n t',
  strategic: 's t ɹ ə t i1 dʒ ɪ k', benefit: 'b ɛ1 n ə f ɪ t', percent: 'p ɝ s ɛ1 n t', overdue: 'oʊ v ɝ d u1',
  expert: 'ɛ1 k s p ɝ t', excellent: 'ɛ1 k s ə l ə n t', reference: 'ɹ ɛ1 f ɝ ə n s', colleague: 'k ɑ1 l i g',
  representative: 'ɹ ɛ p ɹ ɪ z ɛ1 n t ə t ɪ v', triage: 't ɹ i1 ɑ ʒ', basically: 'b eɪ1 s ɪ k l i', productivity: 'p ɹ oʊ d ʌ k t ɪ1 v ə t i', goodbye: 'g ʊ d b aɪ1',
  // names and brands
  ai: 'eɪ1 aɪ1', gbo: 'dʒ i1 b i1 oʊ1', openai: 'oʊ1 p ə n eɪ aɪ', whatsapp: 'w ɑ1 t s æ p', english: 'ɪ1 ŋ g l ɪ ʃ',
  istanbul: 'ɪ s t æ n b ʊ1 l', intelval: 'ɪ1 n t ɛ l v æ l', microsoft: 'm aɪ1 k ɹ oʊ s ɔ f t',
  salesforce: 's eɪ1 l z f ɔ ɹ s', hubspot: 'h ʌ1 b s p ɑ t', linkedin: 'l ɪ1 ŋ k t ɪ n', instagram: 'ɪ1 n s t ə g ɹ æ m',
  // more irregulars
  rough: 'ɹ ʌ1 f', tough: 't ʌ1 f', eleven: 'ɪ l ɛ1 v ə n', seventy: 's ɛ1 v ə n t i', ninety: 'n aɪ1 n t i',
  recommend: 'ɹ ɛ k ə m ɛ1 n d', comfort: 'k ʌ1 m f ɝ t', engage: 'ɪ n g eɪ1 dʒ', contact: 'k ɑ1 n t æ k t',
  invoice: 'ɪ1 n v ɔɪ s', awesome: 'ɔ1 s ə m',
};
Object.setPrototypeOf(LEX, null); // so words like "constructor" are not Object.prototype members

const LETTER_NAME: Record<string, string> = {
  a: 'eɪ1', b: 'b i1', c: 's i1', d: 'd i1', e: 'i1', f: 'ɛ1 f', g: 'dʒ i1', h: 'eɪ1 tʃ', i: 'aɪ1', j: 'dʒ eɪ1',
  k: 'k eɪ1', l: 'ɛ1 l', m: 'ɛ1 m', n: 'ɛ1 n', o: 'oʊ1', p: 'p i1', q: 'k j u1', r: 'ɑ1 ɹ', s: 'ɛ1 s', t: 't i1',
  u: 'j u1', v: 'v i1', w: 'd ʌ1 b ə l j u', x: 'ɛ1 k s', y: 'w aɪ1', z: 'z i1',
};

function toWord(toks: string[]): WordPhone[] {
  const ps = toks.map((t) => t.replace('1', ''));
  const { syl } = syllabify(ps);
  return toks.map((t, i) => {
    const p = ps[i]!;
    const out: WordPhone = { p, syl: syl[i]! };
    if (isVowel(p)) out.stress = t.endsWith('1') ? 1 : 0;
    return out;
  });
}

// ---- letter rules ---------------------------------------------------------------------------------------------
/** vowel unit: l letter, li letter index; st / un fixed phones when stressed / unstressed (else derived from the
 *  letter); lock = never stressed; magic = V C e; open = one consonant then a vowel, tail = the letters from that
 *  vowel on; pre = before -tion ('t') or -cial / -cious / -cient ('c'); hi = first vowel of a hiatus (media, radio,
 *  oriented), hs = a hiatus i that takes the stress (reliable, compliance); j = long u is /ju/; w = after w (want);
 *  pro = the o of pro- (product, process); rv = vowel before r + vowel (very, story), never long */
interface VU { v: true; l: string; li: number; st?: string[]; un?: string[]; lock?: boolean; magic?: boolean;
  open?: boolean; tail?: string; pre?: 't' | 'c'; hi?: boolean; hs?: boolean; j?: boolean; w?: boolean; pro?: boolean; rv?: boolean }
interface CU { v: false; p: string[] }
type Unit = VU | CU;

const VL = (c?: string) => !!c && 'aeiou'.includes(c);
const SHORT: Record<string, string> = { a: 'æ', e: 'ɛ', i: 'ɪ', o: 'ɑ', u: 'ʌ', y: 'ɪ' };
const LONG: Record<string, string> = { a: 'eɪ', e: 'i', i: 'aɪ', o: 'oʊ', u: 'u', y: 'aɪ' };
const RED: Record<string, string> = { a: 'ə', e: 'ɪ', i: 'ɪ', o: 'ə', u: 'ə', y: 'ɪ' };
const CONS: Record<string, string> = {
  b: 'b', d: 'd', f: 'f', j: 'dʒ', k: 'k', l: 'l', m: 'm', n: 'n', p: 'p', r: 'ɹ', s: 's', t: 't', v: 'v', w: 'w', z: 'z',
};
// after these a long u is plain /u/ (new, rule, student); elsewhere /ju/ (music, cute, huge, unique)
const U_PLAIN = new Set(['t', 'd', 'n', 'l', 's', 'z', 'ɹ', 'θ', 'ʃ', 'ʒ', 'tʃ', 'dʒ', 'j']);
// unstressed magic-e endings that reduce (service, office, engine, active, manage, mobile, surface, purpose)
const UNMAGIC: Record<string, string> = { ice: 'ɪ', ine: 'ɪ', ive: 'ɪ', age: 'ɪ', ite: 'ə', ile: 'ə', ace: 'ə', ase: 'ə', ose: 'ə' };
// onsets before "ow" / "own" that give /oʊ/ (know, show, grow, low, own, known) rather than /aʊ/ (how, now, town)
const OW_O = new Set(['', 'kn', 'sh', 'gr', 'bl', 'fl', 'thr', 'sn', 'sl', 'gl', 'l', 'r', 't', 'm', 's', 'st', 'b']);
const OWN_O = new Set(['', 'kn', 'sh', 'gr', 'bl', 'fl', 'thr']);

function scan(w: string): Unit[] {
  const u: Unit[] = [];
  const n = w.length;
  const hasV = (s: string) => /[aeiouy]/.test(s);
  // silent final e (not in ee / ie / ue ..., and only when another vowel comes before it)
  const eSil = n >= 3 && w[n - 1] === 'e' && !VL(w[n - 2]) && hasV(w.slice(0, n - 2)) ? n - 1 : -1;
  const vAt = (k: number) => VL(w[k]) || (w[k] === 'y' && k > 0 && !VL(w[k + 1]));
  const end = (k: number) => k >= n || k === eSil;
  const prevC = () => { const x = u[u.length - 1]; return x && !x.v ? x.p[x.p.length - 1] : undefined; };
  const V = (l: string, li: number, o: Partial<VU> = {}) => { u.push({ v: true, l, li, ...o }); };
  const F = (li: number, st: string[], un = st, o: Partial<VU> = {}) => V(w[li]!, li, { st, un, ...o });
  const C = (...p: string[]) => { u.push({ v: false, p }); };
  const jU = () => { const p = prevC(); return p === undefined ? u.length === 0 : !U_PLAIN.has(p); };
  const ju = () => (jU() ? ['j', 'u'] : ['u']);
  const markPre = (t: 't' | 'c') => { for (let k = u.length - 1; k >= 0; k--) { const x = u[k]!; if (x.v) { x.pre = t; return; } } };
  const first = (k: number) => !hasV(w.slice(0, k));

  function vowel(i: number): number {
    const c = w[i]!, r = w.slice(i), a1 = w[i + 1], a2 = w[i + 2], pv = w[i - 1];
    if (r.startsWith('eigh')) { F(i, ['eɪ']); return 4; }
    if (r.startsWith('igh')) { F(i, ['aɪ']); return 3; }
    if (r.startsWith('augh')) { F(i, ['ɔ']); return 4; }
    if (r.startsWith('ough')) { F(i, [r.startsWith('ought') ? 'ɔ' : pv === 'r' ? 'u' : 'oʊ']); return 4; }
    if (r.startsWith('ould')) { F(i, ['ʊ']); return 3; }
    if (r.startsWith('our') && !vAt(i + 3)) {
      if (r.startsWith('ourn')) F(i, ['ɝ']);
      else if ('cts'.includes(w[i + 3] ?? '-') || (end(i + 3) && 'yfp'.includes(pv ?? '-'))) F(i, ['ɔ', 'ɹ'], ['ɝ']);
      else F(i, ['aʊ', 'ɝ'], ['ɝ']);
      return 3;
    }
    if (r.startsWith('ear')) { F(i, !end(i + 3) && !vAt(i + 3) && w[i + 3] !== 'r' ? ['ɝ'] : ['ɪ', 'ɹ']); return 3; }
    if (r.startsWith('eer')) { F(i, ['ɪ', 'ɹ']); return 3; }
    if (r.startsWith('air') || r.startsWith('eir')) { F(i, ['ɛ', 'ɹ']); return 3; }
    if (r.startsWith('oar') || r.startsWith('oor')) { F(i, ['ɔ', 'ɹ']); return 3; }
    if (a1 === 'r' && eSil === i + 2) { // are ire ore ere ure at the end
      if (c === 'a') F(i, ['ɛ', 'ɹ']);
      else if (c === 'i' || c === 'y') F(i, ['aɪ', 'ɝ']);
      else if (c === 'o') F(i, ['ɔ', 'ɹ']);
      else if (c === 'e') F(i, ['ɪ', 'ɹ']);
      else { const p = prevC(); const j = p && !U_PLAIN.has(p) ? ['j'] : []; F(i, [...j, 'ʊ', 'ɹ'], [...j, 'ɝ']); }
      return 3;
    }
    if (a1 === 'r') { // r-coloured before a consonant / the end, plain vowel + r before a vowel
      const rr = a2 === 'r';
      if (rr || (vAt(i + 2) && i + 2 !== eSil)) {
        if (c === 'u') { if (rr) { F(i, ['ɝ']); return 3; } const j = jU() ? ['j'] : []; F(i, [...j, 'ʊ'], [...j, 'ə']); return 1; }
        if (c === 'o' && rr && prevC() === 'w') { F(i, ['ɝ']); return 3; }
        const st = c === 'a' ? 'ɛ' : c === 'o' ? (rr ? 'ɑ' : 'ɔ') : c === 'i' || c === 'y' ? (rr ? 'ɪ' : 'aɪ')
          : (w[i + 2] === 'i' && VL(w[i + 3])) || (w[i + 2] === 'o' && end(i + 3)) ? 'ɪ' : 'ɛ';
        F(i, [st], [c === 'i' || c === 'y' ? 'ɪ' : 'ə'], { rv: true });
        if (rr) { C('ɹ'); return 3; }
        return 1;
      }
      const afterW = prevC() === 'w';
      if (c === 'a') F(i, [afterW ? 'ɔ' : 'ɑ', 'ɹ'], ['ɝ']);
      else if (c === 'o' && !(afterW && !end(i + 2))) F(i, ['ɔ', 'ɹ'], ['ɝ']);
      else F(i, ['ɝ']);
      return 2;
    }
    const d = c + (a1 ?? '');
    if (d === 'ee') { F(i, ['i']); return 2; }
    if (d === 'ea') {
      if (end(i + 2)) { F(i, ['i'], ['i'], { hi: true }); F(i + 1, ['ə'], ['ə'], { lock: true }); return 2; }
      if (/^ea(d$|dy|di|lth|th$|nt|sur|ther|v[yi]|pon|lous)/.test(r)) { F(i, ['ɛ']); return 2; }
      if (/^eali[tsz]/.test(r)) { F(i, ['i'], ['i'], { hi: true }); return 1; }
      F(i, ['i']); return 2;
    }
    if (d === 'oo') { F(i, r.startsWith('ook') || (r.startsWith('ood') && /(g|w|st|h)$/.test(w.slice(0, i))) ? ['ʊ'] : ['u']); return 2; }
    if (d === 'ou') {
      if (/^ous($|ly|ness)/.test(r) && !first(i)) F(i, ['ə'], ['ə'], { lock: true });
      else if (/^ou(ble|ple|ntr|ng|sin)/.test(r)) F(i, ['ʌ'], ['ə']);
      else if (r.startsWith('oup') || pv === 'y') F(i, ['u']);
      else F(i, ['aʊ']);
      return 2;
    }
    if (d === 'ow') {
      let k = i; while (k > 0 && !VL(w[k - 1]) && w[k - 1] !== 'y') k--;
      const on = w.slice(k, i), poly = !first(k);
      if (r.startsWith('ower')) F(i, [/^(l|sl|gr|bl|m|kn|thr|gl|sn|r|ll|rr)$/.test(on) ? 'oʊ' : 'aʊ']);
      else if (end(i + 2) || (w[i + 2] === 's' && end(i + 3))) F(i, [poly ? (w.startsWith('all') ? 'aʊ' : 'oʊ') : OW_O.has(on) ? 'oʊ' : 'aʊ']);
      else if (w[i + 2] === 'n') F(i, [OWN_O.has(on) ? 'oʊ' : 'aʊ']);
      else F(i, [r.startsWith('owth') ? 'oʊ' : 'aʊ']);
      return 2;
    }
    if (d === 'ai' || d === 'ay') { F(i, ['eɪ'], r === 'ain' ? ['ə'] : ['eɪ']); return 2; }
    if (d === 'ei') { F(i, /^ei(v|pt|z)/.test(r) ? ['i'] : ['eɪ']); return 2; }
    if (d === 'ey') {
      if (vAt(i + 2) || VL(a2)) { F(i, ['i']); return 1; } // beyond: the y is a consonant
      F(i, end(i + 2) && first(i) ? ['eɪ'] : ['i']); return 2;
    }
    if (d === 'oi' || d === 'oy') { F(i, ['ɔɪ']); return 2; }
    if ((d === 'au' || d === 'aw') && !(a1 === 'w' && VL(a2) && a2 !== 'e')) { F(i, ['ɔ']); return 2; }
    if (d === 'ew') { F(i, ju()); return 2; }
    if (d === 'ie') {
      if (r.startsWith('iew')) { F(i, ['j', 'u']); return 3; }
      if (end(i + 2)) { F(i, [first(i) ? 'aɪ' : 'i']); return 2; }
      if (/^ie(nt|nc|t)/.test(r)) { F(i, ['aɪ'], [first(i) ? 'aɪ' : 'i'], { hi: true }); return 1; }
      if (/^ier$/.test(r)) { F(i, ['i']); return 1; }
      F(i, ['i']); return 2;
    }
    if (d === 'oa') { F(i, ['oʊ']); return 2; }
    if (d === 'oe') { if (end(i + 2)) { F(i, ['oʊ']); return 2; } F(i, ['oʊ'], ['oʊ'], { hi: true }); return 1; }
    if (d === 'ue') {
      if (end(i + 2)) {
        const p = prevC();
        const j = (p !== undefined && !U_PLAIN.has(p)) || ((p === 'l' || p === 'n') && VL(w[i - 2]));
        F(i, j ? ['j', 'u'] : ['u']); return 2;
      }
      V('u', i, { hi: true, j: jU() }); return 1;
    }
    if (d === 'ui') { F(i, [pv === 'b' ? 'ɪ' : 'u']); return 2; }
    if (d === 'eu') { const j = jU() ? ['j'] : []; if (a2 === 'r' && VL(w[i + 3])) { F(i, [...j, 'ʊ'], [...j, 'ə']); return 2; } F(i, [...j, 'u']); return 2; }
    if (d === 'ua' || d === 'uo') { V('u', i, { hi: true, j: jU() || ('ln'.includes(pv ?? '-') && (VL(w[i - 2]) || w[i - 2] === pv)) }); return 1; }
    if (c === 'i' && a1 === 'o' && a2 === 'n' && 'ln'.includes(pv ?? '-') && i >= 2 && hasV(w.slice(0, i - 1))) {
      C('j'); F(i + 1, ['ə'], ['ə'], { lock: true }); return 2; // million, opinion, union
    }
    if (c === 'i' && (a1 === 'a' || a1 === 'o' || a1 === 'u')) { const hs = /^ia(b|nc|nt)/.test(r) && pv !== 'r'; F(i, ['aɪ'], [first(i) || hs ? 'aɪ' : 'i'], { hi: !hs, hs }); return 1; }
    if (d === 'eo') { F(i, ['i'], ['i'], { hi: true }); return 1; }
    if (d === 'ae') { F(i, ['i']); return 2; }
    if (d === 'uy' || (d === 'ye' && end(i + 2))) { F(i, ['aɪ']); return 2; }
    // single vowels
    if (c === 'a') {
      if (/^all($|[^aeiouy])/.test(r)) { F(i, ['ɔ']); return 1; }
      if (r.startsWith('alk')) { F(i, ['ɔ']); return 2; }
      if (i === 0 && /^al(s|t|m|w|r)/.test(r)) { F(i, ['ɔ']); return 1; }
      if (/^ange($|r|l)/.test(r) || r === 'aste') { F(i, ['eɪ'], ['ɪ']); return 1; }
      if (/^abl[ey]$/.test(r)) { F(i, first(i) ? ['eɪ'] : ['ə'], ['ə'], { lock: !first(i) }); return 1; }
      if (end(i + 1)) { F(i, ['ɑ'], ['ə']); return 1; }
    }
    if (c === 'e' && end(i + 1)) { F(i, ['i']); return 1; }
    if (c === 'i') {
      if (/^i[nl]d(er)?$/.test(r) || r === 'ign') { F(i, ['aɪ']); return 1; }
      if (r === 'ique' || end(i + 1)) { F(i, ['i']); return 1; }
      if (/^ibl[ey]$/.test(r) && !first(i)) { F(i, ['ə'], ['ə'], { lock: true }); return 1; }
      if (r === 'ive' && pv === 'g') { F(i, ['ɪ']); return 1; } // forgive
    }
    if (c === 'o') {
      if (end(i + 1)) { F(i, ['oʊ']); return 1; }
      if (/^o(ld|lt)/.test(r) || r === 'oll' || (r.startsWith('ost') && 'mphg'.includes(pv ?? '-'))) { F(i, ['oʊ']); return 1; }
      if (r.startsWith('other') || /^on(th|ey|day|k)/.test(r) || (pv === 'w' && r.startsWith('on'))) { F(i, ['ʌ'], ['ə']); return 1; }
      if (/^ove(r|n|$)/.test(r)) { F(i, [pv === 'r' || pv === 'm' ? 'u' : 'ʌ'], ['ə']); return 1; }
      if (r === 'ome' && 'cs'.includes(pv ?? '-')) { F(i, ['ʌ'], ['ə']); return 1; }
    }
    if (c === 'u') {
      if (/^u(ll|sh)/.test(r) && 'pbf'.includes(pv ?? '-')) { F(i, ['ʊ'], ['ə']); return 1; }
      if (end(i + 1)) { F(i, ju()); return 1; }
    }
    if (c === 'y' && end(i + 1)) {
      F(i, first(i) || /(ify|ply)$/.test(w) ? ['aɪ'] : ['i']); return 1;
    }
    if (w.slice(i + 1) === 'gue') { F(i, [LONG[c]!]); return 1; }
    // plain single vowel: magic e, open syllable (one consonant unit before the next vowel) and its tail
    let k = i + 1, cnt = 0;
    while (k < n && !vAt(k)) {
      if (/^(th|sh|ch|ph|wh|gh|ck|qu)/.test(w.slice(k))) { cnt++; k += 2; }
      else if ('bcdfgkpt'.includes(w[k]!) && (w[k + 1] === 'r' || (w[k + 1] === 'l' && k + 2 === eSil))) { cnt++; k += 2; }
      else if (w[k] === 'x' || w[k] === w[k + 1]) { cnt += 2; k += w[k] === 'x' ? 1 : 2; }
      else { cnt++; k++; }
    }
    const magic = k === eSil && k === i + 2 && !'wxy'.includes(w[i + 1] ?? '-');
    const open = !magic && k < n && cnt <= 1 && (k !== eSil || k === i + 3); // title, noble: C + syllabic le
    V(c, i, { magic, open, tail: w.slice(k === eSil ? k - 1 : k), j: c === 'u' ? jU() : undefined, w: prevC() === 'w',
      pro: c === 'o' && i === 2 && w.startsWith('pr') });
    return 1;
  }

  function cons(i: number): number {
    const c = w[i]!, r = w.slice(i), a1 = w[i + 1], a2 = w[i + 2], pv = w[i - 1];
    switch (c) {
      case 'b': if (a1 === 'b') { C('b'); return 2; } if ((pv === 'm' && end(i + 1)) || a1 === 't') return 1; C('b'); return 1;
      case 'c':
        if (a1 === 'h') {
          const k = pv === 's' || 'rlnt'.includes(a2 ?? '-') || (i === 0 && /^ch(ara|em|ao|or|ron|ris)/.test(w))
            || (/(te|me|psy)$/.test(w.slice(0, i)) && (VL(a2) || end(i + 2))) || (/ar$/.test(w.slice(0, i)) && VL(a2));
          C(k ? 'k' : 'tʃ'); return 2;
        }
        if (a1 === 'k') { C('k'); return 2; }
        if (a1 === 'c') { C(...('eiy'.includes(a2 ?? '-') ? ['k', 's'] : ['k'])); return 2; }
        if (a1 === 'i' && a2 === 'a' && w[i + 3] === 't') { C('ʃ'); F(i + 1, ['i'], ['i'], { hi: true }); return 2; } // appreciate
        if (a1 === 'i' && 'aou'.includes(a2 ?? '-') && i > 0) {
          markPre('c'); C('ʃ');
          if (a2 === 'a') { F(i + 2, ['ə'], ['ə'], { lock: true }); return 3; }
          return 2;
        }
        if (a1 === 'i' && a2 === 'e' && w[i + 3] === 'n') { markPre('c'); C('ʃ'); F(i + 2, ['ə'], ['ə'], { lock: true }); return 3; }
        if (a1 === 'e' && 'ao'.includes(a2 ?? '-') && i > 0) { C('ʃ'); return 2; }
        if (pv === 'x' && 'eiy'.includes(a1 ?? '-')) return 1;
        C('eiy'.includes(a1 ?? '-') ? 's' : 'k'); return 1;
      case 'd':
        if (a1 === 'g' && 'eiy'.includes(a2 ?? '-')) { C('dʒ'); return 2; }
        if (a1 === 'd') { C('d'); return 2; }
        if (a1 === 'u' && i > 0 && (/^du(al|le|ate|cat)/.test(r) || (r === 'dure'))) { C('dʒ'); return 1; }
        C('d'); return 1;
      case 'g': {
        if (prevC() === 'ŋ') {
          if (a1 === 'u' && VL(a2)) { C('g', 'w'); return 2; }
          if ('lrwaou'.includes(a1 ?? '-')) C('g');
          return 1;
        }
        if (a1 === 'h') { if (i === 0) C('g'); return 2; }
        if (a1 === 'n' && (end(i + 2) || i === 0)) { C('n'); return 2; }
        if (a1 === 'g') { C('g'); return 2; }
        if (a1 === 'u' && VL(a2)) {
          if (a2 === 'e' && end(i + 3) && VL(pv)) { C('g'); return 3; } // league, colleague
          C('g'); return i === 0 ? 2 : 1; // guess, guide / argue, regular
        }
        if (a1 === 'i' && /^gi(o[nu]|a)/.test(r)) { C('dʒ'); if (r.startsWith('gion')) { F(i + 2, ['ə'], ['ə'], { lock: true }); return 3; } return 2; } // region, religious
        if ((r === 'get' && i > 0) || /^gi(v|ft|g)/.test(r)) { C('g'); return 1; } // target, forget, forgive, gift
        if (r.startsWith('geous')) { C('dʒ'); return 2; }
        C('eiy'.includes(a1 ?? '-') ? 'dʒ' : 'g'); return 1;
      }
      case 'h': if (VL(a1) && pv !== 'x') C('h'); return 1;
      case 'k': if (i === 0 && a1 === 'n') return 1; C('k'); return a1 === 'k' ? 2 : 1;
      case 'l':
        if (a1 === 'l') { C('l'); return 2; }
        if (eSil === i + 1 && i > 0 && !VL(pv) && pv !== 'l') { F(i + 1, ['ə'], ['ə'], { lock: true }); C('l'); return 2; } // simple, table
        C('l'); return 1;
      case 'm': C('m'); return a1 === 'm' || (a1 === 'n' && end(i + 2)) ? 2 : 1;
      case 'n':
        if (a1 === 'n') { C('n'); return 2; }
        if (a1 === 'g') { C('eiy'.includes(a2 ?? '-') ? 'n' : 'ŋ'); return 1; }
        if ('kqx'.includes(a1 ?? '-') || (a1 === 'c' && (a2 === 't' || i + 2 >= n))) { C('ŋ'); return 1; }
        C('n'); return 1;
      case 'p':
        if (a1 === 'h') { C('f'); return 2; }
        if (i === 0 && 'sn'.includes(a1 ?? '-')) return 1;
        C('p'); return a1 === 'p' ? 2 : 1;
      case 'q':
        if (a1 === 'u') { if (a2 === 'e' && end(i + 3)) { C('k'); return 3; } C('k', 'w'); return 2; }
        C('k'); return 1;
      case 'r': C('ɹ'); return a1 === 'h' || a1 === 'r' ? 2 : 1;
      case 's': {
        if (a1 === 'h') { C('ʃ'); return 2; }
        if (a1 === 'c' && a2 === 'h') { C('s', 'k'); return 3; }
        if (a1 === 'c' && a2 === 'i' && 'ao'.includes(w[i + 3] ?? '-')) { C('ʃ'); return 3; }
        if (a1 === 'c' && 'eiy'.includes(a2 ?? '-')) { C('s'); return 2; }
        const ss = a1 === 's' ? 1 : 0;
        if (w.startsWith('ion', i + 1 + ss)) { // -sion / -ssion
          markPre('t'); C(!ss && (VL(pv) || pv === 'r') ? 'ʒ' : 'ʃ'); F(i + 2 + ss, ['ə'], ['ə'], { lock: true }); return 3 + ss;
        }
        if (ss && /^ssu(e|re|r?a)/.test(r)) { C('ʃ'); return 2; }
        if (ss) { C('s'); return 2; }
        if (VL(pv) && (/^su(al|re$|ra)/.test(r) || (a1 === 'i' && a2 === 'a'))) { C('ʒ'); return a1 === 'i' ? 2 : 1; }
        if (a1 === 'm' && end(i + 2)) { C('z'); F(i, ['ə'], ['ə'], { lock: true }); return 1; } // -ism
        if (a1 === 't' && ((a2 === 'e' && w[i + 3] === 'n' && end(i + 4)) || (a2 === 'l' && eSil === i + 3))) { C('s'); return 2; }
        if (eSil === i + 1 && VL(pv)) { C(/(^|[^aeiou])as$|ous$|eas$|oos$/.test(w.slice(0, i + 1)) ? 's' : 'z'); return 1; }
        if (VL(pv) && vAt(i + 1) && i + 1 !== eSil && r !== 'sis') { C('z'); return 1; }
        C('s'); return 1;
      }
      case 't':
        if (a1 === 'h') { C((VL(pv) || pv === 'r') && (r.startsWith('ther') || eSil === i + 2) ? 'ð' : 'θ'); return 2; }
        if (a1 === 'c' && a2 === 'h') { C('tʃ'); return 3; }
        if (a1 === 'i') {
          const a3 = w[i + 3];
          if (a2 === 'o' && a3 === 'n') { markPre('t'); C(pv === 's' ? 'tʃ' : 'ʃ'); F(i + 2, ['ə'], ['ə'], { lock: true }); return 3; }
          if ((a2 === 'a' && (a3 === 'l' || a3 === 'n')) || (a2 === 'e' && a3 === 'n')) {
            markPre('c'); C(pv === 's' ? 'tʃ' : 'ʃ'); F(i + 2, ['ə'], ['ə'], { lock: true }); return 3;
          }
          if (a2 === 'o' && a3 === 'u') { markPre('c'); C('ʃ'); return 2; }
          if ((a2 === 'a' && a3 === 't') || (a2 === 'o' && end(i + 3))) { C('ʃ'); F(i + 1, ['i'], ['i'], { hi: true }); return 2; }
        }
        if (a1 === 'u' && i > 0 && (/^tu(a|ou)/.test(r) || (a2 === 'r' && (eSil === i + 3 || /^tur(al|y|ies)/.test(r))))) { C('tʃ'); return 1; }
        C('t'); return a1 === 't' ? 2 : 1;
      case 'w': if (a1 === 'h' || a1 === 'r') { C(a1 === 'h' ? 'w' : 'ɹ'); return 2; } C('w'); return 1;
      case 'x':
        if (i === 0) { C('z'); return 1; }
        if (i === 1 && pv === 'e' && (vAt(2) || (a1 === 'h' && VL(a2))) && eSil !== 2) { C('g', 'z'); return 1; }
        if (/^x(i(ou|a)|u(al|r))/.test(r)) { C('k', 'ʃ'); return a1 === 'i' ? 2 : 1; }
        C('k', 's'); return 1;
      case 'y': C('j'); return 1;
      case 'z': C('z'); return a1 === 'z' ? 2 : 1;
      default: if (CONS[c]) C(CONS[c]!); return a1 === c ? 2 : 1;
    }
  }

  let i = 0;
  while (i < n) {
    if (i === eSil) { i++; continue; }
    const c = w[i]!;
    const yv = c === 'y' && i > 0 && (!VL(w[i + 1]) || (w[i + 1] === 'e' && i + 2 === n) || (!hasV(w.slice(0, i)) && !VL(w[i - 1])));
    i += VL(c) || yv ? vowel(i) : cons(i);
  }
  return u;
}

// unstressed prefixes: the stress falls on the syllable after them (before, design, discuss, example, arrange,
// about, support, occur, effect, collect, prefer)
const PREFIX = /^(be|de(?!n)|re(?!g)|dis|ex)[^aeiou]|^ex[aeiouh]|^es[tcp]|^equi|^en[jsahr]|^a(pp|cc|tt|ss|ll|ff|rr|nn|dd|gg|mm)|^a([^aeiouy]|[bcdfgkpt][lr])(ou|ow|ai|ay|ee|ea|oi|o(?!r)|ar)|^su(pp|cc|gg)|^o(cc|ff|pp)|^e(ff|ss|cc)|^co(ll|rr|nn)|^pre(?<c>[^aeiouys])(?!\k<c>)|^dire(?=c)|^for(?=g[eio]|bid)/;
// Latinate verb prefixes before a final magic-e / -ure syllable: include, produce, compute, secure, inspire
const PREFIX2 = /^(in|im|em|com|con|pro|se|sub|trans|ad|ob|per|ac)/;
const LONG_P = new Set(['i', 'u', 'eɪ', 'aɪ', 'oʊ', 'aʊ', 'ɔɪ', 'ɔ', 'ɑ', 'ɝ', 'ɪ ɹ', 'ɛ ɹ', 'ʊ ɹ']);

function isLong(x: VU): boolean {
  if (x.rv) return false;
  if (x.st) return LONG_P.has(x.st.filter((p) => p !== 'j').slice(0, 2).join(' ')) || LONG_P.has(x.st.find((p) => p !== 'j')!);
  return !!x.magic || (x.l === 'u' && !!x.open && /^(er|e$|or)/.test(x.tail ?? ''));
}

function pickStress(w: string, u: Unit[], cand: number[], verb: boolean): number {
  const k = cand.length;
  if (k <= 1) return cand[0] ?? -1;
  const U = (j: number) => u[cand[j]!] as VU;
  if (/(ique|eer|oon|ette|esque|ese)$/.test(w)) return cand[k - 1]!;
  const ic = /ic(s|al)?$/.exec(w);
  if (ic) { const j = cand.findIndex((c) => (u[c] as VU).li === ic.index); if (j > 0) return cand[j - 1]!; }
  if (k >= 3 && /([ie]ty|logy|graphy|nomy|metry|(?<![ct]i)[ae]ncy|ify)$/.test(w)) return cand[k - 3]!;
  const pre = cand.filter((c) => (u[c] as VU).pre);
  if (pre.length) return pre[pre.length - 1]!;
  if (/(ify|ply)$/.test(w)) return k === 2 ? cand[1]! : cand[k - 3]!;
  const hs = cand.findIndex((c) => (u[c] as VU).hs);
  if (hs >= 0) return cand[hs]!;
  if (/osis$/.test(w)) return cand[k - 2]!; // diagnosis
  for (let j = k - 1; j > 0; j--) if (U(j).hi) return cand[j - 1]!;
  if (/ator$/.test(w)) return k >= 4 ? cand[k - 4]! : cand[k - 2]!;
  if (k >= 3 && /(ate|[iy][sz]e)$/.test(w)) return cand[k - 3]!;
  if (PREFIX.test(w)) return cand[1]!;
  if (k === 2) {
    // final long syllable after a Latinate prefix (include, provide, secure, improve, align, alive); inflected
    // verbs (consulting, selected) stress the root after any such prefix
    const last = U(1), ending = w.slice(last.li, last.li + 2) + 'e';
    const fin = (last.magic && !UNMAGIC[ending]) || /^a[^aeiouy][aeiouy][^aeiouy]e$/.test(w)
      || (isLong(last) && /([aiou]re|ove|olve|ign|ain|ease|eive|[eiou]r[mntv]e?)$/.test(w));
    if (fin && (PREFIX2.test(w) || /^(a[^aeiouy]|en(?!g))/.test(w))) return cand[1]!;
    if (verb && (PREFIX2.test(w) || /^en(?!t|er|gin|vy)/.test(w))) return cand[1]!;
    return cand[0]!;
  }
  // Latin rule: a heavy penult (long, or closed) takes the stress, else the antepenult; -er -ar -ry lean back
  const pen = U(k - 2);
  const heavy = isLong(pen) || (!pen.st && !pen.open);
  if (/(er|ar|ry)$/.test(w) && !isLong(pen)) return cand[k - 3]!;
  return heavy ? cand[k - 2]! : cand[k - 3]!;
}

function realize(w: string, u: Unit[], s: number, s2: number): string[] {
  const vs = u.map((x, k) => (x.v ? k : -1)).filter((k) => k >= 0);
  const ju = (x: VU) => (x.j ? ['j', 'u'] : ['u']);
  const long = (x: VU) => (x.l === 'u' ? ju(x) : [LONG[x.l]!]);
  const short = (x: VU) => [x.w && x.l === 'a' ? 'ɑ' : SHORT[x.l]!];
  const out: string[] = [];
  u.forEach((x, k) => {
    if (!x.v) { out.push(...x.p); return; }
    const l = x.l, pos = vs.indexOf(k), nx = u[vs[pos + 1] ?? -1] as VU | undefined;
    let ph: string[];
    if (k === s || k === s2) {
      if (x.st) ph = x.st;
      else if (x.magic) ph = long(x);
      else if (x.pro && k === s) ph = ['ɑ'];
      else if (x.pre) ph = x.open && !'iy'.includes(l) && (l !== 'e' || x.pre === 't') ? long(x) : short(x);
      else if (!x.open) ph = short(x);
      else if (l === 'u') ph = ju(x);
      else if (nx?.hi) ph = nx.l === 'u' || 'iy'.includes(l) ? short(x) : long(x);
      else if (x.tail === 'is' && w.endsWith('sis')) ph = long(x); // basis, crisis
      else if (vs.length - pos - 1 >= 2 || w.startsWith('th', x.li + 1)) ph = short(x); // family, general; gather, other
      else {
        const t = x.tail ?? '';
        const lo = l === 'a' ? !/^(i[cdtls]|ish|age|ue|e[lt]|ance|ace|in|ad|ot|ow|it)/.test(t)
          : l === 'e' ? /^(al|ent|o$|a$|ale|ai|us$|i[aou])/.test(t)
          : l === 'o' ? !/^(y|el|et|ic|id|it|ish|ise|ive|ey|er|ern|in$|od|ess|ect|uct|em)/.test(t)
          : /^(al|ent|ant|on$|or|le|ate|em|ot|us|a$|o$|ce$|de$)/.test(t);
        ph = lo ? long(x) : short(x);
      }
    } else if (x.un) ph = x.un;
    else if (l === 'a' && w.slice(x.li) === 'ator') ph = ['eɪ']; // operator, creator
    else if (!x.open && !x.magic && pos === vs.length - 1 && l !== 'u' && /^(ct|pt|ft|mp|x|ss)s?$/.test(w.slice(x.li + 1)))
      ph = short(x); // contract, concept, complex, process: the full vowel survives
    else if (x.magic) { const m = UNMAGIC[w.slice(x.li, x.li + 2) + 'e']; ph = m ? [m] : long(x); }
    else if (x.hi) ph = l === 'u' ? ju(x) : l === 'o' ? ['oʊ'] : ['i'];
    else if (l === 'u') ph = x.open && x.j ? (x.li === 0 ? ['j', 'u'] : ['j', 'ə']) : ['ə'];
    else if (l === 'a' && x.li === 0 && !x.open && !x.magic && !/^a(d|(.)\2)/.test(w)) ph = ['æ']; // activity, ambition
    else if (x.open && pos === 0 && (l === 'y' || (l === 'i' && x.li === 0 && w[1] === 'd'))) ph = ['aɪ']; // idea, identity, dynamic
    else if (l === 'e' && /^e[nlm]([^aeiouy]|$)/.test(w.slice(x.li))) ph = ['ə'];
    else ph = [RED[l]!];
    let marked = k !== s; // the secondary keeps its vowel but no stress mark
    for (const p of ph) { if (!marked && isVowel(p)) { out.push(p + '1'); marked = true; } else out.push(p); }
  });
  return out;
}

function rules(w: string, verb = false): string[] {
  const u = scan(w);
  let cand = u.map((x, k) => (x.v && !x.lock ? k : -1)).filter((k) => k >= 0);
  if (!cand.length) cand = u.map((x, k) => (x.v ? k : -1)).filter((k) => k >= 0);
  const s = pickStress(w, u, cand, verb);
  // secondary stress two or more syllables before a late primary keeps its full vowel (possibility, education)
  const vs = u.map((x, k) => (x.v ? k : -1)).filter((k) => k >= 0), p = vs.indexOf(s);
  const sec = p >= 3 && /^(comm|coll|cons|re|de|a|e|i)/.test(w) ? 1 : 0;
  return realize(w, u, s, p - sec >= 2 && !(u[vs[sec]!] as VU).lock ? vs[sec]! : -1);
}

// ---- morphology -----------------------------------------------------------------------------------------------
const SIB = new Set(['s', 'z', 'ʃ', 'ʒ', 'tʃ', 'dʒ']);
const VOICELESS = new Set(['p', 't', 'k', 'f', 'θ']);
const last = (t: string[]) => (t[t.length - 1] ?? '').replace('1', '');
const sfx = (t: string[]) => (SIB.has(last(t)) ? ['ɪ', 'z'] : VOICELESS.has(last(t)) ? ['s'] : ['z']);
const edSfx = (t: string[]) => ('td'.includes(last(t)) ? ['ɪ', 'd'] : VOICELESS.has(last(t)) || SIB.has(last(t)) && !'zʒdʒ'.includes(last(t)) ? ['t'] : ['d']);

/** Was an e dropped before -ed / -ing / -er? (making, based, automated, provided, analyzing, scheduling) */
function restoreE(s0: string): boolean {
  const s = s0.replace(/qu/g, 'q');
  const c = s[s.length - 1]!, p = s[s.length - 2] ?? '', pp = s[s.length - 3] ?? '';
  const mono = !/[aeiouy]/.test(s.slice(0, -2));
  const single = VL(p) && !VL(pp) && pp !== 'y' || (p === 'y' && !VL(pp));
  if ('cvzu'.includes(c)) return true;
  if (c === 'g') return VL(p) || p === 'r';
  if (c === 's') return !s.endsWith('ss') && (!s.endsWith('us') || mono || s.endsWith('ous'));
  if (!single) return false;
  if (mono) return !'wxyh'.includes(c);
  if (c === 'r') return p !== 'e' && !/(or)$/.test(s) || /(stor|scor|plor|gnor)$/.test(s);
  if (c === 'l') return p === 'u' || p === 'i';
  if (c === 't') return p === 'a' || p === 'u' || (p === 'e' && 'lp'.includes(pp));
  if (c === 'd' || c === 'k' || c === 'b') return true;
  if (c === 'm') return p === 'o' || p === 'u';
  if (c === 'n') return p === 'i';
  return false;
}

function pickBase(s: string): string {
  if (LEX[s + 'e']) return s + 'e';
  if (LEX[s]) return s;
  const c = s[s.length - 1]!;
  if (s.length >= 3 && c === s[s.length - 2] && !'slfz'.includes(c) && !VL(c)) return s.slice(0, -1); // stopp-ed
  return restoreE(s) ? s + 'e' : s;
}

const hasVowel = (s: string) => /[aeiouy]/.test(s);

function morph(w: string, d: number): string[] | undefined {
  const n = w.length;
  const D = (s: string) => derive(s, d + 1);
  // plural / 3rd person
  if (n > 4 && w.endsWith('ies')) { const t = D(w.slice(0, -3) + 'y'); return [...t, 'z']; }
  if (n > 4 && /(ss|zz|x|ch|sh|us)es$/.test(w)) { const t = D(w.slice(0, -2)); return [...t, 'ɪ', 'z']; }
  if (n > 3 && w.endsWith('s') && !/(ss|us|is|ys)$/.test(w) && (!w.endsWith('as') || LEX[w.slice(0, -1)])) {
    const t = D(w.slice(0, -1)); return [...t, ...sfx(t)];
  }
  // past
  if (n > 4 && w.endsWith('ied')) { const t = D(w.slice(0, -3) + 'y'); return [...t, 'd']; }
  if (n >= 4 && w.endsWith('ed') && !w.endsWith('eed') && hasVowel(w.slice(0, -2))) {
    const t = derive(pickBase(w.slice(0, -2)), d + 1, true); return [...t, ...edSfx(t)];
  }
  if (n >= 5 && w.endsWith('ing') && hasVowel(w.slice(0, -3))) { const t = derive(pickBase(w.slice(0, -3)), d + 1, true); return [...t, 'ɪ', 'ŋ']; }
  // agent / comparative -er on a known base (developer, user, manager, faster)
  if (n >= 5 && (w.endsWith('er') || w.endsWith('or')) && !(w.endsWith('ower') && !hasVowel(w.slice(0, -5)))) { // flower / lower: the rules' onset test decides
    const s = w.slice(0, -2);
    const b = w.endsWith('ier') ? s.slice(0, -1) + 'y' : pickBase(s);
    if (LEX[b] || (w.endsWith('or') ? false : (b !== s && hasVowel(s.slice(0, -1)) && (b === s.slice(0, -1) || /[cdgktsz]$/.test(s)))) || (w.endsWith('ator') && b !== s) || w.endsWith('ower')) return [...derive(b, d + 1, true), 'ɝ'];
  }
  if (n >= 5 && w.endsWith('ly') && !/(pply|^reply|^comply|^imply|tiply)$/.test(w)) {
    const s = w.slice(0, -2);
    if (s.endsWith('i') && s.length >= 4) { const t = D(s.slice(0, -1) + 'y'); return [...t.slice(0, -1), 'ə', 'l', 'i']; }
    if (s.endsWith('ical') && LEX[s.slice(0, -2)]) return [...D(s.slice(0, -2)), 'l', 'i'];
    if (s.endsWith('l')) return [...D(s), 'i'];
    if (s.endsWith('b')) { const t = D(s + 'le'); return [...t.slice(0, -2), 'l', 'i']; }
    if (s.endsWith('ate')) return [...D(s).map((p) => (p === 'eɪ' ? 'ə' : p)), 'l', 'i']; // immediately, accurately
    if (hasVowel(s) && s.length >= 3) return [...D(s), 'l', 'i'];
  }
  const tail: [string, string[], number][] = [
    ['ment', ['m', 'ə', 'n', 't'], 4], ['ness', ['n', 'ə', 's'], 3], ['ful', ['f', 'ə', 'l'], 3], ['less', ['l', 'ə', 's'], 3],
    ['ship', ['ʃ', 'ɪ', 'p'], 4],
  ];
  for (const [x, ps, min] of tail) {
    if (!w.endsWith(x)) continue;
    let s = w.slice(0, -x.length);
    if (s.endsWith('i') && x !== 'ment') s = s.slice(0, -1) + 'y';
    if (hasVowel(s) && (s.length >= min || LEX[s]) && (x !== 'ment' || LEX[s] || /[^aiou]$/.test(s))) return [...derive(s, d + 1, x === 'ment'), ...ps];
  }
  for (const x of ['able', 'ible']) {
    if (!w.endsWith(x)) continue;
    const s = w.slice(0, -4), b = LEX[s] ? s : LEX[s + 'e'] ? s + 'e' : s.endsWith('i') && LEX[s.slice(0, -1) + 'y'] ? s.slice(0, -1) + 'y' : '';
    if (b) return [...D(b), 'ə', 'b', 'ə', 'l'];
  }
  if (/[iy][sz]e$/.test(w)) {
    const s = w.slice(0, -3);
    const b = s.length >= 4 && !VL(s[s.length - 1]) ? [s, s + 'e', s + 'y'].find((x) => LEX[x]) : undefined;
    if (b) return [...D(b), 'aɪ', 'z'];
  }
  if (w.endsWith('ional')) return [...D(w.slice(0, -2)), 'ə', 'l'];
  if (w.endsWith('ist') && (LEX[w.slice(0, -3)] || w.endsWith('ionist'))) return [...D(w.slice(0, -3)), 'ɪ', 's', 't'];
  return undefined;
}

const unstress = (t: string[]) => t.map((p) => p.replace('1', ''));

/** two known words (sometimes, anything, timeline, workflow, database): stress on the first, the second keeps
 *  its full vowels unstressed; 2-letter first parts only for no / up / on */
const HEADS = new Set(['line', 'work', 'flow', 'load', 'base', 'board', 'site', 'book', 'phone', 'place', 'ware', 'point',
  'back', 'side', 'room', 'mail', 'shop', 'page', 'care', 'time', 'code', 'desk', 'stone']);

function compound(w: string): string[] | undefined {
  const self = /^(.+?)(self|selves)$/.exec(w);
  if (self && LEX[self[1]!]) return [...unstress(LEX[self[1]!]!.split(' ')), 's', 'ɛ1', 'l', ...(self[2] === 'self' ? ['f'] : ['v', 'z'])];
  for (let j = 2; j <= w.length - 2; j++) {
    const a = w.slice(0, j), b = w.slice(j);
    if (!LEX[a] || a === 'for' || (j === 2 && !['no', 'up', 'on'].includes(a)) || (w.length - j < 3 && b !== 'up')) continue; // not for+get
    const bs = b === 'up' ? ['ʌ1', 'p'] : LEX[b] ? LEX[b]!.split(' ') : b.length > 3 && b.endsWith('s') && LEX[b.slice(0, -1)] ? [...LEX[b.slice(0, -1)]!.split(' '), 'z'] : undefined;
    if (bs) { const as = LEX[a]!.split(' '); return [...as, ...unstress(bs).slice(last(as) === bs[0] ? 1 : 0)]; } // can+not: one n
  }
  for (const h of HEADS) {
    const a = w.slice(0, -h.length);
    if (w.endsWith(h) && a.length >= 4 && hasVowel(a)) return [...derive(a, 2), ...unstress(rules(h))];
  }
  return undefined;
}

function derive(w: string, d = 0, verb = false): string[] {
  const lex = LEX[w];
  if (lex) return lex.split(' ');
  const cp = compound(w);
  if (cp) return cp;
  if (d < 3) { const m = morph(w, d); if (m) return m; }
  return rules(w, verb);
}

/** A written word (letters and apostrophes) -> phonemes with syllables and stress. */
export function enWord(raw: string): WordPhone[] {
  const lw = raw.toLowerCase().replace(/[’]/g, "'").normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
  if (LEX[lw]) return toWord(LEX[lw]!.split(' '));
  // acronym in capitals: letter names
  if (/^[A-Z]{2,5}$/.test(raw)) return toWord([...lw].map((c) => LETTER_NAME[c] ?? '').filter(Boolean).join(' ').split(' '));
  // negative contraction: did + n't, are + n't
  const nt = /^(.+)n't$/.exec(lw);
  if (nt) { const t = derive(nt[1]!); return toWord([...t, ...(isVowel(last(t)) ? [] : ['ə']), 'n', 't']); }
  // possessive / contraction: base word + s (voicing follows the base), d, ll, re, ve
  const m = /^(.*)['’](s|d|ll|re|ve)$/i.exec(raw);
  if (m && m[1]) {
    const base = enWord(m[1]);
    const t = base.map((x) => x.p + (x.stress ? '1' : ''));
    const tl: Record<string, string[]> = { s: sfx(t), d: ['d'], ll: ['l'], re: ['ɹ'], ve: ['v'] };
    return toWord([...t, ...tl[m[2]!.toLowerCase()]!]);
  }
  const t = derive(lw.replace(/[^a-z]/g, ''));
  if (!t.some((p) => p.endsWith('1'))) { const k = t.findIndex((p) => isVowel(p) && p !== 'ə'); const j = k >= 0 ? k : t.findIndex(isVowel); if (j >= 0) t[j] += '1'; }
  return toWord(t);
}
