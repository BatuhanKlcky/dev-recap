#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { analyzeCommits } from './analyzer.js';
import { generateChangelog } from './changelog.js';
import { isGitRepository, parseGitLog } from './git.js';
import { formatTerminalRecap } from './reporter.js';
import type { CliOptions } from './types.js';

const VERSION = '1.0.0';

function printHelp(): void {
  console.log(`
dev-recap v${VERSION}
Turn your Git history into colorful terminal stats, hotspot charts, and clean CHANGELOGs.

USAGE:
  dev-recap [path] [options]

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
  npx dev-recap --days 30 --top 10
  npx dev-recap --changelog CHANGELOG.md
`);
}

export function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
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
      opts.targetDir = path.resolve(arg);
      positionalSet = true;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return opts;
}

function main(): void {
  let opts: CliOptions;
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

  if (
    !fs.existsSync(opts.targetDir) ||
    !fs.statSync(opts.targetDir).isDirectory()
  ) {
    console.error(`Error: Directory does not exist: ${opts.targetDir}`);
    process.exit(1);
  }

  if (!isGitRepository(opts.targetDir)) {
    console.error(`Error: Not a git repository: ${opts.targetDir}`);
    process.exit(1);
  }

  const commits = parseGitLog(opts.targetDir, opts.days);
  const report = analyzeCommits(opts.targetDir, commits, opts.top);

  if (opts.changelog !== undefined) {
    const md = generateChangelog(report.repoName, report.commits);
    if (opts.changelog.length > 0) {
      const outPath = path.resolve(opts.targetDir, opts.changelog);
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
}

main();
