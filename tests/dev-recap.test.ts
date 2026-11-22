import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { analyzeCommits, classifyCommit } from '../src/analyzer.js';
import { generateChangelog } from '../src/changelog.js';
import { parseGitLog } from '../src/git.js';

function createTempGitRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-recap-test-'));
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Test Dev'], {
    cwd: dir,
    stdio: 'ignore',
  });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], {
    cwd: dir,
    stdio: 'ignore',
  });

  fs.writeFileSync(path.join(dir, 'index.ts'), 'export const a = 1;\n');
  execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'feat: initial setup'], {
    cwd: dir,
    stdio: 'ignore',
  });

  fs.writeFileSync(
    path.join(dir, 'index.ts'),
    'export const a = 2;\nexport const b = 3;\n',
  );
  execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'fix: handle edge case'], {
    cwd: dir,
    stdio: 'ignore',
  });

  fs.writeFileSync(path.join(dir, 'README.md'), '# Demo\n');
  execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'docs: add README'], {
    cwd: dir,
    stdio: 'ignore',
  });

  return dir;
}

describe('dev-recap analyzer & CLI', () => {
  it('classifies conventional commit subjects accurately', () => {
    assert.equal(classifyCommit('feat(cli): add json flag'), 'feat');
    assert.equal(classifyCommit('fix: resolve crash'), 'fix');
    assert.equal(classifyCommit('docs: update readme'), 'docs');
    assert.equal(classifyCommit('chore: bump deps'), 'chore');
    assert.equal(classifyCommit('Update something'), 'other');
  });

  it('parses git log, computes contributors and file hotspots', () => {
    const dir = createTempGitRepo();
    try {
      const commits = parseGitLog(dir);
      assert.equal(commits.length, 3);

      const report = analyzeCommits(dir, commits, 5);
      assert.equal(report.totalCommits, 3);
      assert.equal(report.contributors.length, 1);
      assert.equal(report.contributors[0]?.author, 'Test Dev');
      assert.equal(report.hotspots[0]?.path, 'index.ts');
      assert.equal(report.hotspots[0]?.touches, 2);
      assert.equal(report.commitTypes.feat, 1);
      assert.equal(report.commitTypes.fix, 1);
      assert.equal(report.commitTypes.docs, 1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('generates grouped markdown changelog', () => {
    const dir = createTempGitRepo();
    try {
      const commits = parseGitLog(dir);
      const md = generateChangelog('demo-repo', commits);
      assert.ok(md.includes('### Features'));
      assert.ok(md.includes('### Bug Fixes'));
      assert.ok(md.includes('### Documentation'));
      assert.ok(md.includes('feat: initial setup'));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('outputs valid JSON via CLI', () => {
    const dir = createTempGitRepo();
    const cliPath = path.resolve(process.cwd(), 'dist', 'src', 'cli.js');
    try {
      const out = execFileSync(process.execPath, [cliPath, dir, '--json'], {
        encoding: 'utf8',
      });
      const parsed = JSON.parse(out) as { totalCommits: number; hotspots: unknown[] };
      assert.equal(parsed.totalCommits, 3);
      assert.ok(parsed.hotspots.length >= 1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
