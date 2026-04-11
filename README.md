# crag-audit-action

Detect AI config drift on every pull request. Posts a comment showing stale configs, phantom gates, and missing targets.

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-crag--audit-blue?logo=github)](https://github.com/marketplace/actions/crag-audit)
![crag audit](https://img.shields.io/badge/crag-audit-22d3ee)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Works with any repo that has CI workflows — no config or setup required.**

## Usage

### Basic (zero config)

```yaml
name: Governance Audit
on: [pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: WhitehatD/crag-audit-action@v1
```

### Fail on drift

```yaml
      - uses: WhitehatD/crag-audit-action@v1
        with:
          fail-on-drift: 'true'
```

### Pin crag version

```yaml
      - uses: WhitehatD/crag-audit-action@v1
        with:
          crag-version: '0.5.2'
```

### Full example (trigger only on config changes)

```yaml
name: Governance Audit
on:
  pull_request:
    paths:
      - '.claude/governance.md'
      - '.cursor/**'
      - '.github/copilot-instructions.md'
      - 'AGENTS.md'
      - 'CLAUDE.md'
      - 'GEMINI.md'
      - '.clinerules'
      - '.continuerules'
      - '.windsurf/**'
      - '.amazonq/**'
      - '.rules'
      - 'package.json'
      - '.github/workflows/**'

jobs:
  audit:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: WhitehatD/crag-audit-action@v1
        with:
          fail-on-drift: 'true'
          crag-version: 'latest'
```

## How it works

1. **Checks for governance.md.** If your repo doesn't have one yet, runs `crag analyze` to auto-generate it from your CI workflows, package.json, and stack signals.
2. **Runs `crag audit --json`.** Detects drift across three axes: stale configs (compiled files older than governance), phantom gates (commands that don't exist), and missing targets (AI tools detected without compiled configs).
3. **Posts a PR comment** with a formatted drift report table. Comments are updated in-place on subsequent pushes — no duplicates.
4. **Optionally fails the check** if any drift is found (`fail-on-drift: 'true'`), preventing merges until configs are in sync.

No pre-existing configuration is needed. The action works on any repo with CI workflows — it derives governance from your existing project structure.

## Inputs

| Input | Description | Default |
|---|---|---|
| `fail-on-drift` | Fail the check if drift is detected | `'false'` |
| `crag-version` | crag version to install | `'latest'` |
| `token` | GitHub token for posting PR comments | `${{ github.token }}` |

## Outputs

The action writes a job summary (visible in the Actions tab) and posts a PR comment. Additionally:

| Output | Description |
|---|---|
| Step summary | Markdown drift report written to `$GITHUB_STEP_SUMMARY` |
| PR comment | Posted/updated comment with `<!-- crag-audit-action -->` marker |
| Exit code | `0` if clean or `fail-on-drift` is false; `1` if drift found and `fail-on-drift` is true |

## PR comment

When drift is detected:

> ### crag audit — drift report
>
> | Axis | Issues |
> |---|---|
> | Stale configs | 2 files behind governance.md |
> | Gate reality | 1 phantom gate |
> | CI extras | 0 gates in CI but not governance |
> | Missing targets | 1 AI tool detected without config |
>
> **4 issues found** — fix: `npx @whitehatd/crag compile --target all`

When everything is in sync:

> ### crag audit — all clear
>
> No governance drift detected. All compiled configs are in sync.

## Requirements

- Node.js 18+ (set up automatically by the action)
- `git` (available on all GitHub-hosted runners)

## About crag

[crag](https://github.com/WhitehatD/crag) makes every AI agent obey your codebase. One `governance.md` compiled to 13 AI tool formats. Deterministic, no LLM, zero dependencies.

- [Website](https://crag.sh)
- [GitHub](https://github.com/WhitehatD/crag)
- [npm](https://www.npmjs.com/package/@whitehatd/crag)
- [Audit your repo online](https://crag.sh/audit)

## License

MIT — [Alexandru Cioc (WhitehatD)](https://github.com/WhitehatD)
