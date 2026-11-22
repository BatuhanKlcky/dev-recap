import { execFileSync } from 'node:child_process';
import type { CommitInfo, FileChange } from './types.js';

const RECORD_SEP = '\x1e';
const FIELD_SEP = '\x1f';

export function isGitRepository(targetDir: string): boolean {
  try {
    const out = execFileSync(
      'git',
      ['rev-parse', '--is-inside-work-tree'],
      { cwd: targetDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    return out === 'true';
  } catch {
    return false;
  }
}

export function parseGitLog(targetDir: string, days?: number): CommitInfo[] {
  const args = [
    'log',
    `--format=${RECORD_SEP}%h${FIELD_SEP}%an${FIELD_SEP}%aI${FIELD_SEP}%s`,
    '--numstat',
  ];

  if (days !== undefined && days > 0) {
    args.push(`--since=${days}.days.ago`);
  }

  let raw: string;
  try {
    raw = execFileSync('git', args, {
      cwd: targetDir,
      encoding: 'utf8',
      maxBuffer: 25 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return [];
  }

  const commits: CommitInfo[] = [];
  const records = raw.split(RECORD_SEP).filter((r) => r.trim().length > 0);

  for (const record of records) {
    const lines = record.split(/\r?\n/);
    const header = lines[0];
    if (!header) continue;

    const parts = header.split(FIELD_SEP);
    if (parts.length < 4) continue;

    const [hash, author, isoDate, ...subjectParts] = parts;
    const subject = subjectParts.join(FIELD_SEP).trim();
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) continue;

    const files: FileChange[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split('\t');
      if (cols.length < 3) continue;
      const ins = cols[0] === '-' ? 0 : Number.parseInt(cols[0], 10) || 0;
      const del = cols[1] === '-' ? 0 : Number.parseInt(cols[1], 10) || 0;
      const filePath = cols.slice(2).join('\t');
      files.push({ path: filePath, insertions: ins, deletions: del });
    }

    commits.push({
      hash: hash.trim(),
      author: author.trim(),
      date,
      subject,
      files,
    });
  }

  return commits;
}
