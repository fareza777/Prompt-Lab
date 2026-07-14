export const PLAY_STORE_PACKAGE_ID = "app.promptlab.twa";

export const PLAY_STORE_LISTING_URL =
  `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE_ID}`;

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
