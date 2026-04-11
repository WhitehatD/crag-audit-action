# crag-audit-action

Detect AI config drift in your repo. Posts a PR comment showing which configs have drifted from your `governance.md`.

![crag audit](https://img.shields.io/badge/crag-audit-22d3ee)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## What it does

On every pull request, this action:

1. Checks if `governance.md` exists. If not, runs `crag analyze` to generate it.
2. Runs `crag audit` to detect drift across three axes:
   - **Stale configs** — compiled AI tool configs older than governance.md
   - **Gate reality** — governance references commands that don't exist
   - **Missing targets** — AI tools detected in the repo without compiled configs
3. Posts a formatted comment on the PR with the results.
4. Optionally fails the check if drift is detected.

## Usage

### Basic

```yaml
name: Governance Audit
on: [pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
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

### Full example

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

## Inputs

| Input | Description | Default |
|---|---|---|
| `fail-on-drift` | Fail the check if drift is detected | `'false'` |
| `crag-version` | crag version to install | `'latest'` |
| `token` | GitHub token for posting PR comments | `${{ github.token }}` |

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

Comments are updated in-place on subsequent runs — no duplicates.

## Requirements

- Node.js 18+ (set up automatically by the action)
- `git` (available on all GitHub-hosted runners)

## How it works

This is a [composite action](https://docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-composite-action) with zero npm dependencies. It installs [crag](https://github.com/WhitehatD/crag) globally, runs `crag audit --json`, parses the output, and posts a PR comment using the GitHub REST API with built-in `fetch`.

## About crag

[crag](https://github.com/WhitehatD/crag) makes every AI agent obey your codebase. One `governance.md` compiled to 13 AI tool formats. Deterministic, no LLM, zero dependencies.

- [GitHub](https://github.com/WhitehatD/crag)
- [npm](https://www.npmjs.com/package/@whitehatd/crag)
- [Website](https://crag.sh)

## License

MIT — [Alexandru Cioc (WhitehatD)](https://github.com/WhitehatD)
