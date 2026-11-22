import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface RemoteRepoTarget {
  slug: string;
  cloneUrl: string;
  repoName: string;
}

const GITHUB_URL_RE =
  /^https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/i;
const OWNER_REPO_RE = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;

export function parseRemoteRepo(input: string): RemoteRepoTarget | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = GITHUB_URL_RE.exec(trimmed);
  if (urlMatch) {
    const [, owner, repo] = urlMatch;
    const slug = `${owner}/${repo}`;
    return {
      slug,
      cloneUrl: `https://github.com/${slug}.git`,
      repoName: repo,
    };
  }

  if (
    trimmed.startsWith('.') ||
    trimmed.startsWith('/') ||
    trimmed.includes('\\')
  ) {
    return null;
  }

  if (fs.existsSync(path.resolve(trimmed))) {
    return null;
  }

  const slugMatch = OWNER_REPO_RE.exec(trimmed);
  if (slugMatch) {
    const [, owner, repo] = slugMatch;
    const slug = `${owner}/${repo}`;
    return {
      slug,
      cloneUrl: `https://github.com/${slug}.git`,
      repoName: repo,
    };
  }

  return null;
}

export function cloneRemoteRepoHistory(cloneUrl: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-recap-remote-'));
  try {
    execFileSync(
      'git',
      ['clone', '--bare', '--filter=blob:none', '--quiet', cloneUrl, tmpDir],
      { stdio: 'pipe', timeout: 45_000 },
    );
    return tmpDir;
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    const msg =
      err instanceof Error ? err.message : 'Unknown git clone error';
    throw new Error(`Failed to clone ${cloneUrl}: ${msg}`);
  }
}
