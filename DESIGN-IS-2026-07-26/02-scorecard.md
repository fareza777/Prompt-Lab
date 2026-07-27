# Dieter Rams scorecard

1. Good design is innovative — Score: 2/3
   Evidence: The single-canvas architecture removes five destination tabs and brings prompt execution into the same flow (`01-evidence.md#structure-and-primary-flow`).
   Justification: It refreshes a familiar prompt-builder pattern with a meaningful consolidation, but does not introduce a clearly unique interaction.

2. Good design makes a product useful — Score: 1/3
   Evidence: A usable output requires prompt generation followed by a second execution step whose input contract can require invented facts (`01-evidence.md#product-model-and-copy-mismatch`).
   Justification: The task completes, but the prompt intermediate is an unnecessary detour for the result-first audience.

3. Good design is aesthetic — Score: 1/3
   Evidence: Current tokens are coherent, but faint text fails AA and the shipped store visuals present a jarringly different design (`01-evidence.md#visual-system`).
   Justification: A visible system exists, but the live acquisition-to-product transition contains one major aesthetic break.

4. Good design makes a product understandable — Score: 0/3
   Evidence: “Buatkan” and “Hasil” produce a prompt, while the actual deliverable needs a second “Jalankan sekarang” action; save/report meanings also change by hidden content mode (`01-evidence.md#product-model-and-copy-mismatch`, `01-evidence.md#functional-honesty-and-content-identity`).
   Justification: A first-time user cannot correctly predict what the primary action creates without learning the internal prompt/output distinction.

5. Good design is unobtrusive — Score: 2/3
   Evidence: The active canvas is quiet, has no idle animation, and moves secondary tools into sheets (`01-evidence.md#visual-system`, `01-evidence.md#states-and-accessibility`).
   Justification: Chrome is visible but restrained; the quota notice, long starter list, and onboarding still compete modestly with the request.

6. Good design is honest — Score: 1/3
   Evidence: Several labels do not map 1:1 to behavior, including Save/History, Report, quota, upgrade, AI provenance, and “most common” defaults (`01-evidence.md#functional-honesty-and-content-identity`).
   Justification: There is no confirmed dark pattern, but multiple material mismatches prevent a higher score.

7. Good design is long-lasting — Score: 1/3
   Evidence: Users encounter a neon five-tab store presentation followed by a muted paper canvas, while the product promise changed within days (`01-evidence.md#repository-and-release-parity`, `01-evidence.md#visual-system`).
   Justification: The active canvas itself is restrained, but the shipped product identity is tied to two conflicting design eras.

8. Good design is thorough down to the last detail — Score: 1/3
   Evidence: Required UI states and focus mechanics exist, but first-run escape, localization, Save/History typing, Report targeting, upgrade wiring, and contrast remain rough (`01-evidence.md#states-and-accessibility`, `01-evidence.md#functional-honesty-and-content-identity`).
   Justification: More than three important edge details are unfinished despite strong state foundations.

9. Good design is environmentally friendly — Score: 1/3
   Evidence: Initial JS is about 582KiB by the build budget; idle animation is zero and reduced motion is honored (`01-evidence.md#weight-and-friction`).
   Justification: The bundle falls in the rubric’s 500KiB–2MiB band.

10. Good design is as little design as possible — Score: 1/3
    Evidence: The canvas removes the old tab bar, but retains six repeated starters, duplicated onboarding exits, a four-screen tour plus Guide, and a two-stage result model (`01-evidence.md#structure-and-primary-flow`).
    Justification: More than five elements or steps can be removed or consolidated without breaking the primary task.

Total: **11/30**
