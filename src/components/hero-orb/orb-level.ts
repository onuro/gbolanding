/**
 * Feeds the hero orb's rim wave from whoever is talking — agent, mic, or both.
 *
 *   const meter = createOrbLevelMeter();
 *   meter.add(micTrack);
 *   meter.add(agentTrack);
 *
 * Dispatches `orb-level` (detail: 0..1) on window; StudyOrbGradient listens.
 * Decoupled through an event so any island — or plain script — can drive it.
 *
 * Tracks join an existing graph rather than rebuilding it. Tearing down an
 * AudioContext that holds a live microphone and opening a replacement in the
 * same tick kills the media process on iOS, and the agent's track arrives
 * mid-call — the browser would take the page down the moment it started
 * speaking.
 */
export interface OrbLevelMeter {
  add(track: MediaStreamTrack): void;
  stop(): void;
}

export function createOrbLevelMeter(): OrbLevelMeter {
  const context = new AudioContext();
  // Created after `await room.connect(...)`, so the gesture may already be
  // spent and the context born suspended — a suspended context meters silence.
  void context.resume();

  const meters: {
    analyser: AnalyserNode;
    samples: Uint8Array<ArrayBuffer>;
  }[] = [];
  let raf = 0;
  let stopped = false;

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

  return {
    add(track) {
      if (stopped) return;
      const node = context.createMediaStreamSource(new MediaStream([track]));
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      node.connect(analyser);
      meters.push({
        analyser,
        samples: new Uint8Array(new ArrayBuffer(analyser.fftSize)),
      });
      if (!raf) tick();
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      raf = 0;
      meters.length = 0;
      void context.close();
    },
  };
}
