/**
 * Feeds the hero orb's rim wave from whoever is talking — agent, mic, or both.
 *
 *   const meter = createOrbLevelMeter();
 *   const drop = meter.add(createLevelAnalyser(context));
 *
 * Dispatches `orb-level` (detail: 0..1) on window; StudyOrbGradient listens.
 * Decoupled through an event so any island — or plain script — can drive it.
 *
 * It owns no AudioContext. Safari allows four concurrent contexts per page and
 * an iOS call already spends three of them: the RNNoise chain, LiveKit's
 * playback graph, and the silent oscillator livekit-client keeps running on
 * iOS alone to hold the audio session open. A meter that opened a fourth graph
 * to read a level it could read from the graphs already there was the one that
 * could be done without, so callers pass in an analyser built on a context
 * that exists. See the call-context comment in VoiceButton.start.
 */

/** 512 samples of waveform is ~11 ms at 48 kHz — one rAF frame's worth. */
const FFT_SIZE = 512;

export function createLevelAnalyser(context: BaseAudioContext) {
  const analyser = context.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  return analyser;
}

export interface OrbLevelMeter {
  /** Returns a function that takes the analyser back out of the mix. */
  add(analyser: AnalyserNode): () => void;
  stop(): void;
}

export function createOrbLevelMeter(): OrbLevelMeter {
  const meters = new Map<AnalyserNode, Uint8Array<ArrayBuffer>>();
  let raf = 0;
  let stopped = false;

  const tick = () => {
    let level = 0;
    for (const [analyser, samples] of meters) {
      // Waveform RMS, not a spectrum average: speech energy sits in a handful
      // of low bins, so averaging the whole spectrum crushed it to ~0.15.
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i += 1) {
        const deviation = (samples[i] - 128) / 128;
        sum += deviation * deviation;
      }
      const rms = Math.sqrt(sum / samples.length);
      // ponytail: fixed gain + soft knee. Add auto-gain if quiet mics read flat.
      level = Math.max(level, Math.min(1, (rms * 3.6) ** 0.7));
    }
    window.dispatchEvent(new CustomEvent("orb-level", { detail: level }));
    raf = requestAnimationFrame(tick);
  };

  return {
    add(analyser) {
      if (stopped) return () => {};
      meters.set(
        analyser,
        new Uint8Array(new ArrayBuffer(analyser.fftSize)),
      );
      if (!raf) raf = requestAnimationFrame(tick);
      return () => {
        meters.delete(analyser);
      };
    },
    stop() {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(raf);
      raf = 0;
      meters.clear();
      window.dispatchEvent(new CustomEvent("orb-level", { detail: 0 }));
    },
  };
}
