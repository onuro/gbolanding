// Target presets for the identity fitter (z-score targets and weights per metric, see metrics.mjs).
import { FEM_TARGETS } from './metrics.mjs';

const T = FEM_TARGETS;
const scale = (s) => Object.fromEntries(Object.entries(T).map(([k, [t, w]]) => [k, [k === 'cranioFacial' || k === 'eyeToFace' ? t : t * s, w]]));
export const PRESETS = {
  bal: T,
  sculpt: { ...T, malarProj: [1.6, 0.8], jawRatio: [-1.1, 0.9], cheekW: [0.7, 0.4], foreheadSlope: [-0.9, 0.6], noseHump: [-0.8, 0.5] },
  soft: { ...T, malarProj: [0.6, 0.5], lowJawRatio: [-0.9, 0.6], lipH: [1.2, 0.7], noseW: [-1.0, 0.6], noseL: [-0.7, 0.5], chinH: [-0.8, 0.6] },
  strong: scale(1.3),
  // round 3+: clearer female read in the dot look (open eye area, fuller lips, small straight nose,
  // tapered jaw, high cheekbones) while keeping adult proportions (cranium / eye size vs face ~ population)
  fem2: {
    ...T, browProt: [-1.5, 1.0], eyeDeep: [-1.0, 0.8], foreheadSlope: [-1.0, 0.6], jawRatio: [-1.2, 0.9],
    lowJawRatio: [-0.9, 0.6], chinRatio: [-0.8, 0.4], chinH: [-0.6, 0.6], lipH: [1.5, 0.8], lipProj: [1.0, 0.5],
    noseW: [-1.2, 0.7], noseL: [-0.8, 0.5], noseProj: [-0.3, 0.3], noseHump: [-0.8, 0.5], malarProj: [1.3, 0.7],
    neckW: [-1.2, 0.7], canthalTilt: [0.7, 0.4], cranioFacial: [0.0, 0.8], eyeToFace: [0.2, 0.7],
  },
  fem2s: {
    ...T, browProt: [-1.4, 1.0], eyeDeep: [-0.8, 0.7], foreheadSlope: [-0.9, 0.6], jawRatio: [-1.3, 1.0],
    lowJawRatio: [-1.0, 0.6], chinRatio: [-0.6, 0.4], lipH: [1.2, 0.7], lipProj: [0.8, 0.4], noseW: [-1.0, 0.6],
    noseL: [-0.6, 0.5], noseHump: [-0.8, 0.5], malarProj: [1.8, 0.9], cheekW: [0.8, 0.5], neckW: [-1.2, 0.7],
    canthalTilt: [0.8, 0.4], cranioFacial: [-0.2, 0.8], eyeToFace: [0.1, 0.7],
  },
  fem2l: {
    ...T, browProt: [-1.3, 1.0], eyeDeep: [-1.0, 0.8], jawRatio: [-1.0, 0.8], chinRatio: [-0.7, 0.4],
    lipH: [1.9, 0.9], lipProj: [1.3, 0.6], upperLip: [1.5, 0.5], philtrum: [-0.8, 0.5], noseW: [-1.3, 0.7],
    noseL: [-0.9, 0.5], noseHump: [-0.8, 0.5], malarProj: [1.1, 0.6], neckW: [-1.1, 0.7],
    canthalTilt: [0.6, 0.4], cranioFacial: [0.0, 0.8], eyeToFace: [0.2, 0.7],
  },
  mild: scale(0.7),
};
