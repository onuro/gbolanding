import {
  loadRnnoise,
  RnnoiseWorkletNode,
} from "@sapphi-red/web-noise-suppressor";
import rnnoiseWasmUrl from "@sapphi-red/web-noise-suppressor/rnnoise.wasm?url";
import rnnoiseSimdWasmUrl from "@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url";
import rnnoiseWorkletUrl from "@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url";

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

/** RNNoise is trained on 48 kHz frames and the worklet assumes that rate. */
const RNNOISE_SAMPLE_RATE = 48000;

/**
 * Runs the microphone through RNNoise and returns the cleaned track to publish.
 * Call it inside the click, so the AudioContext starts on a user gesture.
 */
export async function denoise(mic: MediaStreamTrack) {
  const ctx = new AudioContext({ sampleRate: RNNOISE_SAMPLE_RATE });
  const [wasmBinary] = await Promise.all([
    loadRnnoise({ url: rnnoiseWasmUrl, simdUrl: rnnoiseSimdWasmUrl }),
    ctx.audioWorklet.addModule(rnnoiseWorkletUrl),
  ]);
  if (ctx.state === "suspended") await ctx.resume();

  const source = ctx.createMediaStreamSource(new MediaStream([mic]));
  const node = new RnnoiseWorkletNode(ctx, { maxChannels: 1, wasmBinary });
  const destination = ctx.createMediaStreamDestination();
  source.connect(node).connect(destination);

  const track = destination.stream.getAudioTracks()[0];
  if (!track) throw new Error("rnnoise produced no track");

  return {
    track,
    stop() {
      node.destroy();
      node.disconnect();
      source.disconnect();
      // The raw mic is ours, not LiveKit's — LiveKit only stops what we publish.
      mic.stop();
      void ctx.close();
    },
  };
}
