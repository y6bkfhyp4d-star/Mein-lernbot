# GENESIS X 1.0 — isolated single-case UI, non-publishable

Date: 2026-11-22. Research-only draft stacked on PR #47; **not a main-app feature**.

## Prototype

- `eval/genesis-x-task-demo.html` is a stand-alone research page (not registered in `index.html` or `sw.js`).
- `eval/genesis-x-task-ui.js` contains a small form with two explicit bounded numeric inputs, x and b. It constructs one-case `numeric`/`logic` preview tasks from a **fixed synthetic training/validation fixture** and calls only `window.NERYXGenesisXWorkerClient.preview(task)`.
- The output intentionally contains **no numeric result, model candidate, rule prediction, decision, truth or raw report**. Success shows only “Interne Ausführung geprüft (1 Fall). Keine unabhängigen Referenzdaten ... keine Antwort freigegeben”.
- Missing Worker, unexpected metadata, invalid numeric input or missing dependencies fail closed. The page does not use localStorage, write the user's knowledge base, import third-party code or call a paid API.
- Only fixed synthetic training data is used here. This is a **limited demonstration of checking a candidate**, not an open-ended natural-language task solver, nor evidence that the research result is correct.

## QA

`eval/genesis-x-task-ui-browser-smoke.mjs` runs in real Chromium and Linux WebKit. It exercises a valid task, native invalid-form rejection, broken Worker loading, fail-closed report, main-thread global separation, and zero localStorage writes.

The CI runs the full NERYX and GENESIS X corpus, the two browsers, and a protected-file check. It does not run the page on a real iPhone or provide a Vercel Preview. Production `app.js`, `index.html`, `sw.js`, Frozen, and `main` stay unchanged.

**Do not merge or deploy to production without user approval and explicit independent test results.**

## Verified results (2026-11-22)

[GitHub Actions run 45012975719](https://github.com/y6bkfhyp4d-star/Mein-lernbot/actions/runs/45012975719): **four jobs passed**. The complete existing NERYX/GENESIS X Node suite passed **595/595**, protected production/Frozen-file check passed, and both **Chromium** and **Linux WebKit** emitted `GENESIS_X_ONE_CASE_UI_OK` after verifying:

- A bounded task produces only a `review_required` text status, **not** a candidate output or a publishable answer.
- Browser-native invalid-field constraints prevent submission.
- Missing Worker script returns `blocked` and **no result released**.
- No main-window research engine globals, **zero** `localStorage` records, and only the two explicitly allowed page scripts.

**Release still blocked:** this verifies a stand-alone research form only; no main chat integration, real iPhone Safari certification, or independently validated answer quality.
