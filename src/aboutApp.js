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
    label: "Create",
    description: "Turn an idea, photo, or file into finished work.",
  }),
  Object.freeze({
    label: "Improve",
    description: "Refine clarity, detail, structure, and tone.",
  }),
  Object.freeze({
    label: "Review",
    description: "Check facts, names, dates, and recommendations.",
  }),
  Object.freeze({
    label: "Export",
    description: "Save the result or download a polished Office file.",
  }),
]);
