import { classifyCommit } from './analyzer.js';
import type { CommitInfo, CommitType } from './types.js';

const SECTION_LABELS: Array<{ type: CommitType; title: string }> = [
  { type: 'feat', title: 'Features' },
  { type: 'fix', title: 'Bug Fixes' },
  { type: 'docs', title: 'Documentation' },
  { type: 'refactor', title: 'Refactoring' },
  { type: 'test', title: 'Tests' },
  { type: 'chore', title: 'Maintenance' },
  { type: 'other', title: 'Other Changes' },
];

export function generateChangelog(
  repoName: string,
  commits: CommitInfo[],
): string {
  const today = new Date().toISOString().slice(0, 10);
  const grouped = new Map<CommitType, CommitInfo[]>();
  for (const { type } of SECTION_LABELS) {
    grouped.set(type, []);
  }

  for (const commit of commits) {
    const t = classifyCommit(commit.subject);
    grouped.get(t)?.push(commit);
  }

  const lines: string[] = [
    `# Changelog — ${repoName}`,
    '',
    `## [Unreleased] - ${today}`,
    '',
  ];

  for (const { type, title } of SECTION_LABELS) {
    const list = grouped.get(type) ?? [];
    if (list.length === 0) continue;
    lines.push(`### ${title}`);
    for (const c of list) {
      lines.push(`- ${c.subject} (\`${c.hash}\`)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
