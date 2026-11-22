#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { analyzeCommits } from './analyzer.js';
import { generateChangelog } from './changelog.js';
import { isGitRepository, parseGitLog } from './git.js';
import { cloneRemoteRepoHistory, parseRemoteRepo } from './remote.js';
import { formatTerminalRecap } from './reporter.js';
import type { CliOptions } from './types.js';

const VERSION = '1.2.0';

function printHelp(): void {
  console.log(`
dev-recap v${VERSION}
Turn your Git history into colorful terminal stats, hotspot charts, and clean CHANGELOGs.

USAGE:
  dev-recap [path | owner/repo | github-url] [options]

OPTIONS:
  --days <n>           Only analyze commits from the last <n> days
  --top <n>            Number of top contributors/hotspots to show (default: 5)
  --changelog [file]   Generate a Markdown changelog (default: prints to stdout, or writes to [file])
  --json               Output machine-readable JSON report
  --no-color           Disable ANSI colors
  -h, --help           Show this help message
  -v, --version        Show version number

EXAMPLES:
  npx dev-recap
  npx dev-recap BatuhanKlcky/dev-recap
  npx dev-recap --days 30 --top 10
  npx dev-recap --changelog CHANGELOG.md
`);
}

interface ParsedCli extends CliOptions {
  rawTarget?: string;
}

export function parseArgs(argv: string[]): ParsedCli {
  const opts: ParsedCli = {
    targetDir: process.cwd(),
    top: 5,
    json: false,
    noColor: Boolean(process.env.NO_COLOR),
    help: false,
    version: false,
  };

  let positionalSet = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg === '-v' || arg === '--version') {
      opts.version = true;
    } else if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--no-color') {
      opts.noColor = true;
    } else if (arg === '--days') {
      const next = argv[i + 1];
      const parsed = Number(next);
      if (!next || Number.isNaN(parsed) || parsed <= 0) {
        throw new Error('--days requires a positive number');
      }
      opts.days = parsed;
      i++;
    } else if (arg === '--top') {
      const next = argv[i + 1];
      const parsed = Number(next);
      if (!next || Number.isNaN(parsed) || parsed <= 0) {
        throw new Error('--top requires a positive number');
      }
      opts.top = parsed;
      i++;
    } else if (arg === '--changelog') {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        opts.changelog = next;
        i++;
      } else {
        opts.changelog = '';
      }
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!positionalSet) {
      opts.rawTarget = arg;
      opts.targetDir = path.resolve(arg);
      positionalSet = true;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return opts;
}

function main(): void {
  let opts: ParsedCli;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (opts.version) {
    console.log(VERSION);
    process.exit(0);
  }

  const remoteTarget = opts.rawTarget
    ? parseRemoteRepo(opts.rawTarget)
    : null;

  let repoDir = opts.targetDir;
  let tmpDir: string | null = null;

  if (remoteTarget) {
    try {
      tmpDir = cloneRemoteRepoHistory(remoteTarget.cloneUrl);
      repoDir = tmpDir;
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  } else {
    if (!fs.existsSync(repoDir) || !fs.statSync(repoDir).isDirectory()) {
      console.error(`Error: Directory does not exist: ${repoDir}`);
      process.exit(1);
    }

    if (!isGitRepository(repoDir)) {
      console.error(`Error: Not a git repository: ${repoDir}`);
      process.exit(1);
    }
  }

  try {
    const commits = parseGitLog(repoDir, opts.days);
    const report = analyzeCommits(repoDir, commits, opts.top);

    if (remoteTarget) {
      report.targetDir = `https://github.com/${remoteTarget.slug}`;
      report.repoName = remoteTarget.repoName;
    }

    if (opts.changelog !== undefined) {
      const md = generateChangelog(report.repoName, report.commits);
      if (opts.changelog.length > 0) {
        const outPath = path.resolve(process.cwd(), opts.changelog);
        fs.writeFileSync(outPath, md, 'utf8');
        console.log(`Changelog written to ${outPath}`);
      } else {
        console.log(md);
      }
      return;
    }

    if (opts.json) {
      const { commits: _omit, ...summary } = report;
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    const useColor = !opts.noColor && Boolean(process.stdout.isTTY);
    console.log(formatTerminalRecap(report, useColor));
  } finally {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

main();
