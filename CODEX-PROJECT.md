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
- Project-local skills or `config.toml` if they are added in the future.

There is currently no repository-level `config.toml`; do not invent one without a concrete configuration requirement.

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
Read AGENTS.md and README.md first. Inspect the repository before changing anything. Work from main on a dedicated codex/* branch. Implement the requested outcome completely, run relevant checks, preserve production behavior, and finish with the changed files, tests/checks, remaining risks, and PR/commit reference.
```

## Local preview

For the static production root:

```bash
python3 -m http.server 8000
```

Use the browser to verify all changed pages, mobile behavior, RTL rendering, links, and forms.

## Production caution

`main` is production-sensitive because GitHub Pages may deploy changes from the default publishing branch. Prefer a branch and pull request for substantive changes, and do not merge while required checks are failing.
