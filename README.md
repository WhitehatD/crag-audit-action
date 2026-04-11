# crag-audit-action

Detect AI config drift on every pull request. Posts a comment showing stale configs, phantom gates, and missing targets.

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-crag--audit-blue?logo=github)](https://github.com/marketplace/actions/crag-audit)
![crag audit](https://img.shields.io/badge/crag-audit-22d3ee)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Works with any repo that has CI workflows. No config or setup required.

## Quick start

```yaml
name: Governance Audit
on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: WhitehatD/crag-audit-action@v1
```

## How it works

1. Checks for `governance.md`. If missing, runs `crag analyze` to auto-generate it from CI workflows, package.json, and stack signals.
2. Runs `crag audit --json`. Detects drift across three axes: stale configs, phantom gates, and missing targets.
3. Posts a PR comment with a formatted drift report. Comments are updated in-place on subsequent pushes (no duplicates).
4. Writes a job summary visible in the Actions tab.
5. Optionally fails the check if drift is found (`fail-on-drift: 'true'`).

## Inputs

| Input | Description | Required | Default |
|---|---|---|---|
| `fail-on-drift` | Fail the check if drift is detected | No | `'false'` |
| `crag-version` | crag version to install (e.g. `0.5.2` or `latest`) | No | `'latest'` |
| `token` | GitHub token for posting PR comments | No | `${{ github.token }}` |

## Permissions

The action requires these [GitHub token permissions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#permissions-for-the-github_token):

| Permission | Level | Reason |
|---|---|---|
| `contents` | `read` | Check out repository files |
| `pull-requests` | `write` | Post and update PR comments |

Set these at the job or workflow level:

```yaml
permissions:
  contents: read
  pull-requests: write
```

## Usage examples

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
    crag-version: '0.5.5'
```

### Trigger only on config changes

```yaml
name: Governance Audit
on:
  pull_request:
    paths:
      - 'governance.md'
      - 'CLAUDE.md'
      - 'AGENTS.md'
      - 'GEMINI.md'
      - '.cursorrules'
      - '.cursor/**'
      - '.github/copilot-instructions.md'
      - '.clinerules'
      - '.continuerules'
      - '.windsurf/**'
      - '.amazonq/**'
      - '.rules'
      - 'package.json'
      - '.github/workflows/**'

permissions:
  contents: read
  pull-requests: write

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: WhitehatD/crag-audit-action@v1
        with:
          fail-on-drift: 'true'
```

## PR comment format

When drift is detected:

> ### crag audit -- drift report
>
> | Axis | Issues |
> |---|---|
> | Stale configs | 2 files behind governance.md |
> | Gate reality | 1 phantom gate |
> | CI extras | 0 gates in CI but not governance |
> | Missing targets | 1 AI tool detected without config |
>
> **4 issues found** -- fix: `npx @whitehatd/crag compile --target all`

When everything is in sync:

> ### crag audit -- all clear
>
> No governance drift detected. All compiled configs are in sync.

The action also writes this same report to `$GITHUB_STEP_SUMMARY`, visible in the Actions tab even outside PR context.

## Badge

Add a drift status badge to your repo README:

```markdown
[![crag audit](https://img.shields.io/badge/crag-audit-22d3ee?style=flat-square&labelColor=18181b)](https://crag.sh/audit?repo=OWNER/REPO)
```

Or audit any repo online at [crag.sh/audit](https://crag.sh/audit).

## Requirements

- Node.js 18+ (set up automatically by the action via `actions/setup-node@v4`)
- `git` (available on all GitHub-hosted runners)
- Zero npm dependencies beyond crag itself

## About crag

[crag](https://github.com/WhitehatD/crag) makes every AI agent obey your codebase. One `governance.md` compiled to 13 AI tool formats (CLAUDE.md, AGENTS.md, .cursorrules, Copilot instructions, and more). Deterministic, no LLM, zero dependencies.

- [Website](https://crag.sh)
- [Web audit tool](https://crag.sh/audit)
- [Drift leaderboard](https://crag.sh/leaderboard)
- [npm](https://www.npmjs.com/package/@whitehatd/crag)
- [GitHub](https://github.com/WhitehatD/crag)

## License

MIT -- [Alexandru Cioc (WhitehatD)](https://github.com/WhitehatD)
