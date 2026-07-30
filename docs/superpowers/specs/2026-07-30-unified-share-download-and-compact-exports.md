# Unified Share, PDF, and Compact Word Export

## Problem

The Android save sheet exposes two controls that both operate on the same Word file while using technical copy about silent downloads. Templates declare PDF as an output, but the result toolbar does not expose a real PDF exporter. Word reports with field photographs can also reach several megabytes because JPEG photographs are re-encoded as PNG.

## Approved experience

- Use the same export language and behavior for every template.
- Replace technical Android wording with: “Silakan bagikan atau unduh laporan siap pakai.”
- A template that declares `pdf` exposes “Bagikan / Ekspor PDF”.
- A template that declares `docx` exposes “Unduh Word”.
- The Android save sheet names the format it currently holds and offers clear share and download actions for that format.
- Spreadsheet, presentation, diagram, and copy-only templates retain only the formats declared by their template contract.

## PDF

Add a server-side PDF exporter so the PDF action produces a real PDF rather than renaming or sharing a Word document. It consumes the same normalized title, finished Markdown content, language, plan, and optional attachment photographs as the Word exporter. It renders headings, paragraphs, lists, simple tables, footer/page numbers, and a documentation section.

## Image policy

Photographs embedded in Word and PDF are auto-rotated, resized without enlargement to a maximum 1600-pixel long edge, and encoded as JPEG at quality 76 with metadata removed. Alpha-channel images may use PNG only when transparency is materially required. The exporter keeps the smaller of the prepared representation and a safe compatible input where practical.

The goal is not a hard byte guarantee because photo count and visual complexity vary. The regression fixture must demonstrate a material reduction versus PNG and keep a multi-photo sample comfortably below the former 2.8 MB report.

## Compatibility and failure behavior

- PDF export is included wherever Word export is available; it is not a new paid gate.
- PDF and Word accept up to eight photos, matching the existing attachment limit.
- An unreadable photo is skipped without failing the document.
- Exported filenames continue to derive from the report topic.
- Indonesian and English labels are both updated.

## Verification

- Contract tests cover every template’s declared actions and localized labels.
- Export tests inspect the PDF signature/text primitives and DOCX media types.
- A realistic noisy-photo fixture checks output size reduction.
- The production build and the repository test suite are run after targeted tests.
- Generated Word and PDF samples are rendered and visually inspected when the workspace rendering tools are available.
