import {
  ArrowUpRight,
  Blocks,
  GitCompareArrows,
  Library,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";

import { ABOUT_WORKFLOW, PLAY_STORE_LISTING_URL } from "./aboutApp.js";

const workflowIcons = [Blocks, Sparkles, GitCompareArrows, Library];

export function AboutPanel() {
  return (
    <section
      className="v2-about"
      role="tabpanel"
      id="settings-panel-about"
      aria-labelledby="about-promptlab-title"
    >
      <div className="v2-about-identity">
        <div className="v2-about-icon-wrap">
          <img
            className="v2-about-icon"
            src="/icons/icon-512.png"
            alt="PromptLab app icon"
            width="132"
            height="132"
          />
          <span className="v2-about-icon-orbit" aria-hidden="true" />
        </div>

        <div className="v2-about-intro">
          <span className="v2-about-kicker">About PromptLab</span>
          <h2 id="about-promptlab-title">Better prompts start with better structure.</h2>
          <p>
            PromptLab turns rough ideas, screenshots, images, and supported files into
            prompts you can improve, compare, save, and reuse.
          </p>
        </div>
      </div>

      <div className="v2-about-body">
        <div className="v2-about-workflow" aria-labelledby="about-workflow-title">
          <div className="v2-about-section-head">
            <span>From idea to reusable system</span>
            <h3 id="about-workflow-title">One focused workflow.</h3>
          </div>
          <ol>
            {ABOUT_WORKFLOW.map(({ label, description }, index) => {
              const Icon = workflowIcons[index];
              return (
                <li key={label}>
                  <span className="v2-about-step-icon" aria-hidden="true">
                    <Icon size={18} strokeWidth={1.8} />
                  </span>
                  <span className="v2-about-step-number">0{index + 1}</span>
                  <div>
                    <strong>{label}</strong>
                    <p>{description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <aside className="v2-about-rate" aria-labelledby="about-rate-title">
          <div className="v2-about-rate-mark" aria-hidden="true">
            <Star size={22} fill="currentColor" />
          </div>
          <div>
            <span className="v2-about-kicker">Built for better work</span>
            <h3 id="about-rate-title">Enjoying PromptLab?</h3>
            <p>A quick Google Play review helps more people discover better prompt workflows.</p>
          </div>
          <a
            className="v2-about-rate-action"
            href={PLAY_STORE_LISTING_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Rate Prompt Lab on Google Play, opens in a new tab"
          >
            <span>Rate Prompt Lab</span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </aside>
      </div>

      <nav className="v2-about-trust" aria-label="PromptLab policies and support">
        <a href="/privacy">
          <ShieldCheck size={17} aria-hidden="true" />
          <span>Privacy Policy</span>
        </a>
        <a href="/privacy/delete-account">
          <Trash2 size={17} aria-hidden="true" />
          <span>Delete Account</span>
        </a>
        <a href="mailto:support@prompt-lab.xyz">
          <Mail size={17} aria-hidden="true" />
          <span>Contact Support</span>
        </a>
      </nav>
    </section>
  );
}
