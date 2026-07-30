/**
 * Generate a small, original 30-second instrumental bed for the Remotion promo.
 * No third-party music or licensing dependency.
 */
import {mkdir, writeFile} from "node:fs/promises";
import {join} from "node:path";

const sampleRate = 22050;
const seconds = 30;
const channels = 2;
const frames = sampleRate * seconds;
const pcm = Buffer.alloc(frames * channels * 2);
const output = join(process.cwd(), "playstore", "assets", "promo", "soundtrack.wav");

const chords = [
  [130.81, 164.81, 196.0, 246.94],
  [110.0, 130.81, 164.81, 196.0],
  [87.31, 130.81, 174.61, 220.0],
  [98.0, 123.47, 146.83, 196.0],
];

const smoothPulse = (phase) => {
  const beat = phase % 0.5;
  return Math.exp(-beat * 18) * Math.sin(2 * Math.PI * 62 * phase);
};

for (let i = 0; i < frames; i += 1) {
  const time = i / sampleRate;
  const chord = chords[Math.floor(time / 3.75) % chords.length];
  const local = time % 3.75;
  const chordFade = Math.min(1, local / 0.35, (3.75 - local) / 0.45);
  const masterFade = Math.min(1, time / 1.2, (seconds - time) / 1.8);
  let pad = 0;
  for (let n = 0; n < chord.length; n += 1) {
    const frequency = chord[n];
    pad +=
      Math.sin(2 * Math.PI * frequency * time + n * 0.37) * 0.12 +
      Math.sin(2 * Math.PI * frequency * 2 * time + n * 0.21) * 0.025;
  }
  const beat = smoothPulse(time) * 0.12;
  const shimmer =
    Math.sin(2 * Math.PI * chord[3] * 2 * time) *
    (0.018 + 0.012 * Math.sin((2 * Math.PI * time) / 7.5));
  const mono = (pad * chordFade + beat + shimmer) * masterFade;
  const left = Math.max(-1, Math.min(1, mono * 0.82));
  const right = Math.max(-1, Math.min(1, (mono - beat * 0.08) * 0.82));
  pcm.writeInt16LE(Math.round(left * 32767), (i * channels + 0) * 2);
  pcm.writeInt16LE(Math.round(right * 32767), (i * channels + 1) * 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(channels, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * channels * 2, 28);
header.writeUInt16LE(channels * 2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);

await mkdir(join(process.cwd(), "playstore", "assets", "promo"), {recursive: true});
await writeFile(output, Buffer.concat([header, pcm]));
console.log(`wrote ${output}`);
