# IA Command Center — independent visual prototype

**Status:** Prototype only. No production deployment, authenticated sessions, API access, or live telemetry.

This experiment implements a compact Arabic RTL control-center layout for the existing **Digital Insight AI** ecosystem. The canonical public site remains in `site/`, unchanged by this proposal. `prototypes/` is not part of the configured GitHub Pages build.

## Scope

- Mobile-responsive, keyboard-navigable Arabic interface.
- Verified destinations: Digital Insight AI repository and website, standalone tools directory, MagicPath IA Design Lab, and the existing Canva tool explainer.
- Client-side project filtering.
- A manual acceptance checklist, stored **only in this browser** via localStorage when allowed; manual export as JSON and clear/reset actions.
- Explicit snapshot labeling: information is dated 2026-10-11, and counts/statuses are **not live**.
- No CSS framework, analytics trackers, payment features, imported external scripts, or added third-party dependencies.

## Local preview

From the repository root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/prototypes/ia-command-center/` in a browser. Stop with Ctrl-C.

## Acceptance checks

1. At 1440px and at 375px viewport widths, no horizontal scrolling and readable RTL.
2. Tab navigation, visible keyboard focus, working skip link.
3. Filter buttons show only matching project cards and keep `aria-pressed` updated.
4. Checking a task and reloading preserves state when localStorage is available.
5. JSON export contains only task titles, IDs, completion states, and snapshot timestamps.
6. Clearing checklist removes completion flags, and private/incognito storage failure degrades gracefully.
7. All external links use `target="_blank" rel="noopener noreferrer"`.
8. No production paths in `site/`, DNS, payment resources, or secrets changed.

## Development integration

- MagicPath design concept: https://www.magicpath.ai/
- Existing Canva editable tool explainer: https://www.canva.com/
- Canonical site: https://digitalinsightai.com/
- Canonical static site source: `site/`
- Standalone modern tools app: `imim2009im-a11y/ai-tools-directory`

**Merge policy:** Keep this prototype separate pending functional tests, a visual accessibility review, and architectural approval. Do not merge it into the public site or portray it as a live multi-agent operator.
