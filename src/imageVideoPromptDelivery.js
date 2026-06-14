/**
 * Image & video generation prompt frameworks for PromptLab builder/optimizer.
 */

export function detectImageVideoIntent(payload = {}) {
  const text = `${payload.narrative || ""} ${payload.category || ""} ${payload.outputType || ""}`.toLowerCase();
  const isImageCategory = /image\s*ai/i.test(payload.category || "");
  const isVideoCategory = /video\s*ai/i.test(payload.category || "");
  const isImageOutput = /image\s*prompt/i.test(payload.outputType || "");
  const isVideoOutput = /video\s*prompt/i.test(payload.outputType || "");

  const asksVideo =
    isVideoCategory ||
    isVideoOutput ||
    /\b(video prompt|text[\s-]?to[\s-]?video|t2v|generate video|ai video|runway|kling|sora|pika|haiper|luma dream|veo|minimax video|hailuo|seedance|wan\s*2|cinema(?:tic)? shot|b[\s-]?roll)\b/i.test(
      text
    );
  const asksImage =
    (isImageCategory || isImageOutput || /\b(image prompt|text[\s-]?to[\s-]?image|t2i|midjourney|dall[\s-]?e|flux|stable diffusion|sdxl|ideogram|leonardo|firefly)\b/i.test(text)) &&
    !asksVideo;

  return { asksImage, asksVideo };
}

export function isGrokTarget(modelTarget) {
  return /\bgrok\b/i.test(String(modelTarget || ""));
}

function section(title, lines) {
  return [`<${title}>`, ...lines.map((line) => `  ${line}`), `</${title}>`].join("\n");
}

export function buildImagePromptInstruction(langCode = "id") {
  const id = langCode === "id";
  return section("image_generation_prompt", [
    "Deliverable: ONE copy-paste-ready image generation prompt (not a chat reply).",
    id
      ? "Gunakan formula 6-bagian: Subject | Action/Pose | Environment | Lighting | Style & Medium | Composition & Camera."
      : "Use the 6-part formula: Subject | Action/Pose | Environment | Lighting | Style & Medium | Composition & Camera.",
    id
      ? "Sertakan blok terpisah: Main prompt, Negative prompt, Aspect ratio, Model tuning (Midjourney / DALL·E / Flux / SDXL)."
      : "Include separate blocks: Main prompt, Negative prompt, Aspect ratio, Model tuning (Midjourney / DALL·E / Flux / SDXL).",
    id
      ? "Negative prompt wajib: artifact, blur, watermark, extra limbs, distorted text, low-res."
      : "Negative prompt must block: artifacts, blur, watermark, extra limbs, distorted text, low-res.",
    id
      ? "Tambahkan 2 varian (safe + bold) jika relevan."
      : "Add 2 variants (safe + bold) when useful.",
  ]);
}

export function buildVideoPromptInstruction(langCode = "id") {
  const id = langCode === "id";
  return section("video_generation_prompt", [
    "Deliverable: ONE copy-paste-ready text-to-video prompt with a shot list.",
    id
      ? "WAJIB cantumkan: Total durasi (detik), FPS feel (24/30/60), Aspect ratio (9:16 / 16:9 / 1:1), dan jumlah scene."
      : "MUST specify: Total duration (seconds), FPS feel (24/30/60), Aspect ratio (9:16 / 16:9 / 1:1), and scene count.",
    id
      ? "Kerangka per scene (timestamp): Hook (0–3s) | Setup | Action peak | Payoff | Outro/CTA."
      : "Per-scene frame (timestamp): Hook (0–3s) | Setup | Action peak | Payoff | Outro/CTA.",
    id
      ? "Tiap scene: subject, action, camera move (dolly/pan/orbit/handheld/static), lens (wide/macro/tele), lighting, mood, motion speed, background, audio/SFX cue (opsional)."
      : "Each scene: subject, action, camera move (dolly/pan/orbit/handheld/static), lens, lighting, mood, motion speed, background, optional audio/SFX cue.",
    id
      ? "Sertakan: Negative prompt video, continuity notes (karakter/props konsisten), target platform (TikTok/Reels/YouTube/ads)."
      : "Include: Video negative prompt, continuity notes (character/props), target platform (TikTok/Reels/YouTube/ads).",
    id
      ? "Sebutkan model target jika user menyebut (Runway Gen-3/4, Kling, Sora, Pika, MiniMax/Hailuo, Luma, Veo)."
      : "Name target model when user mentions it (Runway Gen-3/4, Kling, Sora, Pika, MiniMax/Hailuo, Luma, Veo).",
  ]);
}

export function buildGrokVideoFrameworkInstruction(langCode = "id") {
  const id = langCode === "id";
  return section("grok_video_director_layer", [
    id
      ? "Layer khusus Grok/xAI video: tulis prompt seperti sutradara yang paham tempo viral X/Twitter & short-form."
      : "Grok/xAI video layer: write like a director who understands X/Twitter viral tempo & short-form hooks.",
    id
      ? "Hook 0–2 detik: kontras visual atau statement yang memaksa scroll-stop; hindari generic establishing shot."
      : "0–2s hook: visual contrast or scroll-stopping statement; avoid generic establishing shots.",
    id
      ? "Pacing: cut rhythm tiap 1.5–3 detik untuk vertical; satu ide visual per beat."
      : "Pacing: cut every 1.5–3s for vertical; one visual idea per beat.",
    id
      ? "Motion language: sebutkan arah kamera, kecepatan, dan cause→effect (apa yang memicu gerakan)."
      : "Motion language: specify camera direction, speed, and cause→effect (what triggers motion).",
    id
      ? "Tambahkan 'viral variant' + 'brand-safe variant' bila konteks marketing."
      : "Add 'viral variant' + 'brand-safe variant' for marketing contexts.",
    id
      ? "CTA visual di 2 detik terakhir (teks overlay / gesture / product hero) — jangan hanya voiceover generik."
      : "Visual CTA in final 2 seconds (overlay text / gesture / product hero) — not generic voiceover only.",
  ]);
}

/**
 * @param {object} payload
 * @returns {string}
 */
export function buildImageVideoPromptAddon(payload = {}) {
  const { asksImage, asksVideo } = detectImageVideoIntent(payload);
  if (!asksImage && !asksVideo) return "";

  const langCode = payload.outputLanguage || "id";
  const blocks = [];
  if (asksImage) blocks.push(buildImagePromptInstruction(langCode));
  if (asksVideo) {
    blocks.push(buildVideoPromptInstruction(langCode));
    if (isGrokTarget(payload.modelTarget || payload.targetModel)) {
      blocks.push(buildGrokVideoFrameworkInstruction(langCode));
    }
  }
  return blocks.join("\n");
}
