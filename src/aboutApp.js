export const PLAY_STORE_PACKAGE_ID = "app.promptlab.twa";

export const PLAY_STORE_LISTING_URL =
  `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE_ID}`;

/** Published support contact; Play requires a reachable one on the listing. */
export const SUPPORT_EMAIL = "support@prompt-lab.xyz";

export const SETTINGS_SECTION_NAMES = Object.freeze([
  "Account",
  "Membership",
  "Prompt Defaults",
  "Data & Privacy",
  "Support",
  "About",
]);

export const ABOUT_WORKFLOW = Object.freeze([
  Object.freeze({
    label: "Build",
    description: "Turn an idea or file into a structured prompt.",
  }),
  Object.freeze({
    label: "Improve",
    description: "Refine clarity, detail, constraints, and output format.",
  }),
  Object.freeze({
    label: "Compare",
    description: "Check two prompt versions before choosing one.",
  }),
  Object.freeze({
    label: "Reuse",
    description: "Save templates and successful prompts in Library.",
  }),
]);
