# Codex local project setup

This repository is intended to be opened as a **Local Project** in the ChatGPT/Codex desktop app when Codex needs direct access to the working copy on the computer.

## Recommended project configuration

1. Clone or open the local folder for `imim2009im-a11y/digital-insight-ai`.
2. In the desktop app, open **Projects** and create or edit a local project.
3. Attach the repository folder with **Add folder**.
4. Make the repository root the **Primary folder**.
5. Start Codex chats from that project so Git operations and automatic discovery use this repository root.
6. Keep unrelated repositories in separate projects unless a task explicitly needs cross-repository work.

## Primary-folder expectations

With this repository as the primary folder, Codex should automatically discover:

- `AGENTS.md` for repository-specific operating rules.
- Git metadata for branches, diffs, commits, and pull requests.
- Project-local skills or `config.toml` if they are deliberately added in the future for a concrete requirement.

There is currently no repository-level `config.toml`; do not invent one without a concrete configuration requirement.

## Project agent operating system

For non-trivial engineering work, also read:

- `AGENT-OPERATING-SYSTEM.md`
- `codex-agents/README.md`

The repository includes ten project-specific Codex agent definitions covering project management, architecture, frontend/UX, backend/runtime, QA, security, SEO, editorial content, growth/conversion, and independent review.

Install these local agents from the repository root with:

```bash
bash scripts/install-codex-project-agents.sh
```

The installer targets `~/.codex/agents/` by default and uses a `digital-insight-ai-` filename prefix so unrelated agent files are not overwritten.

## Optional external frameworks

External frameworks are accelerators, not production dependencies. Install only from their official upstream or official marketplace and review permissions/hooks before enabling them.

### Superpowers

For Codex App or Codex CLI, use the official Codex plugin marketplace and install **Superpowers** from there. Do not clone random mirrors or copy unknown plugin bundles into the Codex configuration.

### ECC

ECC provides a guided installer for Codex. The upstream project's current guided entrypoint is:

```bash
npx ecc-universal install --guided
```

Use one ECC installation path for Codex only; do not stack native-plugin and sync/manual installation methods in the same harness.

### Agency-style roles

The upstream Agency Agents project supports Codex custom-agent TOML files, but Digital Insight AI intentionally uses the smaller original role set in `codex-agents/` rather than importing a large generic catalog.

If any external framework instruction conflicts with this repository's production rules, `AGENTS.md` and `PRODUCTION-ARCHITECTURE.md` win.

## Branching convention

For new non-trivial work:

```text
main
  └── codex/<short-task-name>
```

Start from `main`. Existing `audit/*`, `security/*`, `dependabot/*`, and older `codex/*` branches should not be reused for unrelated work.

## Suggested chat separation

Use separate chats inside the same project for distinct outcomes, for example:

- Static-site audit and fixes
- UX, accessibility, and visual design
- SEO and content quality
- Affiliate and conversion improvements
- Domain, GitHub Pages, and deployment
- Security and privacy review
- Content automation and AI integrations
- Video/content production workflows

The shared project keeps repository context available while each chat remains focused.

## First prompt for a new implementation chat

```text
Read AGENTS.md, README.md, PRODUCTION-ARCHITECTURE.md, and AGENT-OPERATING-SYSTEM.md first. Inspect the repository before changing anything. Work from main on a dedicated codex/* branch. Define the observable outcome and risks before implementation. Implement the requested outcome completely, run relevant checks, preserve production behavior, perform an independent review, and finish with the changed files, tests/checks, remaining risks, and PR/commit reference.
```

## Verification

Use the consolidated verification entrypoint for repository changes:

```bash
bash scripts/agent-verify.sh
```

Optional live production verification:

```bash
AGENT_VERIFY_PRODUCTION=1 bash scripts/agent-verify.sh
```

Optional Docker build verification:

```bash
AGENT_VERIFY_DOCKER=1 bash scripts/agent-verify.sh
```

For the static production root, a local preview can still be started with:

```bash
python3 -m http.server 8000
```

Use the browser to verify changed pages, mobile behavior, RTL rendering, links, and forms.

## Production caution

`main` is production-sensitive because GitHub Pages may deploy changes from the default publishing branch and Railway uses this repository for the primary WordPress runtime. Prefer a branch and pull request for substantive changes, and do not merge while required checks are failing.
