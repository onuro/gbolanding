/**
 * Feeds the hero orb's rim wave from whoever is talking — agent, mic, or both.
 *
 *   connectOrbLevel(agentTrack, micTrack);
 *
 * Dispatches `orb-level` (detail: 0..1) on window; StudyOrbGradient listens.
 * Decoupled through an event so any island — or plain script — can drive it.
 */
export function connectOrbLevel(
  ...sources: (HTMLMediaElement | MediaStreamTrack)[]
) {
  const context = new AudioContext();
  // Created after `await room.connect(...)`, so the gesture may already be
  // spent and the context born suspended — a suspended context meters silence.
  void context.resume();
  const meters = sources.map((source) => {
    const node =
      source instanceof MediaStreamTrack
        ? context.createMediaStreamSource(new MediaStream([source]))
        : context.createMediaElementSource(source);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    node.connect(analyser);
    // Media elements still need a path to the speakers; raw tracks do not.
    if (!(source instanceof MediaStreamTrack)) analyser.connect(context.destination);
    return { analyser, samples: new Uint8Array(analyser.fftSize) };
  });

  let raf = 0;
  const tick = () => {
    let level = 0;
    for (const meter of meters) {
      // Waveform RMS, not a spectrum average: speech energy sits in a handful
      // of low bins, so averaging the whole spectrum crushed it to ~0.15.
      meter.analyser.getByteTimeDomainData(meter.samples);
      let sum = 0;
      for (let i = 0; i < meter.samples.length; i += 1) {
        const deviation = (meter.samples[i] - 128) / 128;
        sum += deviation * deviation;
      }
      const rms = Math.sqrt(sum / meter.samples.length);
      // ponytail: fixed gain + soft knee. Add auto-gain if quiet mics read flat.
      level = Math.max(level, Math.min(1, (rms * 3.6) ** 0.7));
    }
    window.dispatchEvent(new CustomEvent("orb-level", { detail: level }));
    raf = requestAnimationFrame(tick);
  };
  tick();

  return () => {
    cancelAnimationFrame(raf);
    void context.close();
  };
}
