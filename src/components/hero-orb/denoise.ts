import rnnoiseWasmUrl from "@sapphi-red/web-noise-suppressor/rnnoise.wasm?url";
import rnnoiseSimdWasmUrl from "@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url";
import rnnoiseWorkletUrl from "@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url";

import { createLevelAnalyser } from "./orb-level";

/**
 * The browser's own WebRTC chain, all three parts on. RNNoise runs after it and
 * removes the steady-state noise the browser leaves behind: fans, traffic, a
 * cafe. Mono, because the agent only listens to one channel.
 */
export const MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
};

/**
 * RNNoise is trained on 48 kHz frames and the worklet assumes that rate, so the
 * context the whole call shares has to be opened at it. It is the native rate
 * on an iPhone anyway, so nothing is resampled.
 */
export const RNNOISE_SAMPLE_RATE = 48000;

/**
 * Runs the microphone through RNNoise and returns the cleaned track to publish,
 * plus an analyser sitting on the cleaned signal so the orb answers speech
 * rather than the room noise this is here to remove.
 *
 * The context belongs to the caller — see VoiceButton.start, which opens one
 * for the whole call and hands the same one to LiveKit.
 */
export async function denoise(mic: MediaStreamTrack, context: AudioContext) {
  // Imported here, not at the top: the package subclasses AudioWorkletNode at
  // module scope, so a static import throws while Astro renders the island on
  // the server and every page answers 500. It also keeps the wasm loader out of
  // the first client bundle — nothing needs it until the visitor clicks.
  const { loadRnnoise, RnnoiseWorkletNode } = await import(
    "@sapphi-red/web-noise-suppressor"
  );

  const [wasmBinary] = await Promise.all([
    loadRnnoise({ url: rnnoiseWasmUrl, simdUrl: rnnoiseSimdWasmUrl }),
    context.audioWorklet.addModule(rnnoiseWorkletUrl),
  ]);

  const source = context.createMediaStreamSource(new MediaStream([mic]));
  const node = new RnnoiseWorkletNode(context, { maxChannels: 1, wasmBinary });
  const destination = context.createMediaStreamDestination();
  source.connect(node).connect(destination);

  const track = destination.stream.getAudioTracks()[0];
  if (!track) throw new Error("rnnoise produced no track");

  const analyser = createLevelAnalyser(context);
  node.connect(analyser);

  return {
    track,
    analyser,
    stop() {
      node.destroy();
      node.disconnect();
      source.disconnect();
      analyser.disconnect();
      // The raw mic is ours, not LiveKit's — LiveKit only stops what we publish.
      mic.stop();
    },
  };
}
