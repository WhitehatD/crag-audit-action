#!/usr/bin/env node
'use strict';

/**
 * crag-audit-action — run crag audit and post drift report as a PR comment.
 *
 * Zero npm dependencies. Uses Node 18+ built-in fetch and fs.
 * Reads GitHub context from environment variables set by the composite action.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Environment ──────────────────────────────────────────────

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const FAIL_ON_DRIFT = process.env.INPUT_FAIL_ON_DRIFT === 'true';
const EVENT_PATH = process.env.GITHUB_EVENT_PATH;
const REPOSITORY = process.env.GITHUB_REPOSITORY; // owner/repo
const API_URL = process.env.GITHUB_API_URL || 'https://api.github.com';

const COMMENT_MARKER = '<!-- crag-audit-action -->';

// ── Helpers ──────────────────────────────────────────────────

function run(cmd, args, opts = {}) {
  try {
    return {
      ok: true,
      stdout: execFileSync(cmd, args, {
        encoding: 'utf-8',
        timeout: 60_000,
        stdio: ['pipe', 'pipe', 'pipe'],
        ...opts,
      }),
    };
  } catch (err) {
    return {
      ok: false,
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      code: err.status || 1,
    };
  }
}

function getPRNumber() {
  if (!EVENT_PATH || !fs.existsSync(EVENT_PATH)) return null;
  try {
    const event = JSON.parse(fs.readFileSync(EVENT_PATH, 'utf-8'));
    return event.pull_request?.number || event.issue?.number || null;
  } catch {
    return null;
  }
}

async function findExistingComment(prNumber) {
  const url = `${API_URL}/repos/${REPOSITORY}/issues/${prNumber}/comments?per_page=100`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) return null;
  const comments = await res.json();
  return comments.find((c) => c.body && c.body.includes(COMMENT_MARKER));
}

async function postOrUpdateComment(prNumber, body) {
  const fullBody = `${COMMENT_MARKER}\n${body}`;
  const existing = await findExistingComment(prNumber);

  if (existing) {
    // Update existing comment
    const url = `${API_URL}/repos/${REPOSITORY}/issues/comments/${existing.id}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: fullBody }),
    });
    if (!res.ok) {
      console.error(`Failed to update comment: ${res.status} ${await res.text()}`);
    } else {
      console.log(`Updated existing comment #${existing.id}`);
    }
  } else {
    // Create new comment
    const url = `${API_URL}/repos/${REPOSITORY}/issues/${prNumber}/comments`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: fullBody }),
    });
    if (!res.ok) {
      console.error(`Failed to create comment: ${res.status} ${await res.text()}`);
    } else {
      console.log('Posted new PR comment');
    }
  }
}

// ── Comment formatting ───────────────────────────────────────

function formatAllClear() {
  return [
    '## crag audit \u2014 all clear \u2705',
    '',
    'No governance drift detected. All compiled configs are in sync.',
    '',
    '---',
    '*[crag](https://github.com/WhitehatD/crag) \u2014 one governance.md, every AI tool*',
  ].join('\n');
}

function formatDriftReport(report) {
  const { summary, stale, drift, extra, missing } = report;
  const lines = [];

  lines.push('## crag audit \u2014 drift report');
  lines.push('');
  lines.push('| Axis | Issues |');
  lines.push('|---|---|');
  lines.push(`| Stale configs | ${summary.stale} file${summary.stale !== 1 ? 's' : ''} behind governance.md |`);
  lines.push(`| Gate reality | ${summary.drift} phantom gate${summary.drift !== 1 ? 's' : ''} |`);
  lines.push(`| CI extras | ${summary.extra} gate${summary.extra !== 1 ? 's' : ''} in CI but not governance |`);
  lines.push(`| Missing targets | ${summary.missing} AI tool${summary.missing !== 1 ? 's' : ''} detected without config |`);
  lines.push('');
  lines.push(`**${summary.total} issue${summary.total !== 1 ? 's' : ''} found** \u2014 fix: \`npx @whitehatd/crag compile --target all\``);
  lines.push('');

  // Details
  const details = [];

  if (stale && stale.length > 0) {
    details.push('### Stale configs');
    for (const s of stale) {
      details.push(`- \`${s.path}\` \u2014 governance.md is newer`);
    }
    details.push('');
  }

  if (drift && drift.length > 0) {
    details.push('### Gate reality');
    for (const d of drift) {
      const detail = d.detail ? ` \u2014 ${d.detail}` : '';
      details.push(`- \`${d.command}\`${detail}`);
    }
    details.push('');
  }

  if (extra && extra.length > 0) {
    details.push('### CI extras');
    for (const e of extra) {
      details.push(`- \`${e.command}\` \u2014 in CI but not in governance`);
    }
    details.push('');
  }

  if (missing && missing.length > 0) {
    details.push('### Missing targets');
    for (const m of missing) {
      details.push(`- ${m.tool} detected \u2014 \`crag compile --target ${m.target}\``);
    }
    details.push('');
  }

  if (details.length > 0) {
    lines.push('<details><summary>Details</summary>');
    lines.push('');
    lines.push(...details);
    lines.push('</details>');
    lines.push('');
  }

  lines.push('---');
  lines.push('*[crag](https://github.com/WhitehatD/crag) \u2014 one governance.md, every AI tool*');

  return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const prNumber = getPRNumber();

  // Step 1: Ensure governance.md exists
  const govPath = path.join(process.cwd(), '.claude', 'governance.md');
  if (!fs.existsSync(govPath)) {
    console.log('No governance.md found — running crag analyze...');
    const analyze = run('crag', ['analyze']);
    if (!analyze.ok) {
      console.error('crag analyze failed:');
      console.error(analyze.stderr);
      // Still try audit in case it can report something useful
    } else {
      console.log('governance.md generated');
    }
  } else {
    console.log('governance.md found');
  }

  // Step 2: Run audit
  console.log('Running crag audit...');
  const audit = run('crag', ['audit', '--json']);
  let report;
  let totalIssues = 0;

  if (audit.stdout.trim().startsWith('{')) {
    try {
      report = JSON.parse(audit.stdout.trim());
      totalIssues = report.summary ? report.summary.total : 0;
    } catch (err) {
      console.error('Failed to parse audit JSON:', err.message);
      report = null;
    }
  } else if (audit.ok) {
    // Exit 0 but no JSON — probably all clear
    totalIssues = 0;
    report = null;
  } else {
    // Audit failed with non-JSON output
    console.error('crag audit failed:');
    console.error(audit.stderr || audit.stdout);

    if (!fs.existsSync(govPath)) {
      console.error('No governance.md and audit failed — nothing to report');
      process.exit(0);
    }
  }

  // Step 3: Format comment
  let commentBody;
  if (totalIssues === 0 && !report) {
    commentBody = formatAllClear();
  } else if (totalIssues === 0 && report) {
    commentBody = formatAllClear();
  } else {
    commentBody = formatDriftReport(report);
  }

  // Step 4: Post comment (if in PR context)
  if (prNumber && GITHUB_TOKEN && REPOSITORY) {
    await postOrUpdateComment(prNumber, commentBody);
  } else {
    console.log('Not in a PR context or missing token — printing report to stdout:');
    console.log('');
    console.log(commentBody);
  }

  // Step 5: Set output summary (GitHub Actions step summary)
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    fs.appendFileSync(summaryPath, commentBody + '\n');
  }

  // Step 6: Fail if configured and drift detected
  if (FAIL_ON_DRIFT && totalIssues > 0) {
    console.log(`\nFailing: ${totalIssues} drift issue${totalIssues !== 1 ? 's' : ''} found (fail-on-drift is enabled)`);
    process.exit(1);
  }

  if (totalIssues > 0) {
    console.log(`\n${totalIssues} drift issue${totalIssues !== 1 ? 's' : ''} found (fail-on-drift is disabled — passing)`);
  } else {
    console.log('\nAll clear — no drift detected');
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
