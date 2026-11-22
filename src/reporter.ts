import { createColorizer, type Colorizer } from './colors.js';
import type { CommitType, RecapReport } from './types.js';

function bar(
  value: number,
  max: number,
  width: number,
  colorFn: (s: string) => string,
  c: Colorizer,
): string {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const filled = Math.round(ratio * width);
  return `${colorFn('█'.repeat(filled))}${c.dim('░'.repeat(width - filled))}`;
}

export function formatTerminalRecap(
  report: RecapReport,
  useColor: boolean,
): string {
  const c = createColorizer(useColor);
  const lines: string[] = [];

  lines.push('');
  lines.push(
    `  ${c.bold(c.cyan('dev-recap'))} ${c.dim('—')} Git History & Hotspot Recap`,
  );
  lines.push(`  ${c.dim('Repository:')} ${c.bold(report.repoName)} ${c.dim(`(${report.targetDir})`)}`);
  lines.push('');

  if (report.totalCommits === 0) {
    lines.push(`  ${c.yellow('No commits found in this repository range.')}`);
    lines.push('');
    return lines.join('\n');
  }

  const peakHourStr = `${String(report.peakHour).padStart(2, '0')}:00`;
  lines.push(
    `  ${c.bold('Commits:')} ${c.cyan(String(report.totalCommits))}   ` +
      `${c.bold('Lines:')} ${c.green(`+${report.totalInsertions}`)} / ${c.red(`-${report.totalDeletions}`)}   ` +
      `${c.bold('Active Days:')} ${c.yellow(String(report.activeDays))}   ` +
      `${c.bold('Best Streak:')} ${c.magenta(`${report.longestStreakDays}d`)}`,
  );
  lines.push(
    `  ${c.bold('Peak Coding Time:')} ${c.cyan(`${report.peakWeekday} @ ${peakHourStr}`)}`,
  );
  lines.push('');

  // Weekday chart
  lines.push(`  ${c.bold('Activity by Weekday')}`);
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxDay = Math.max(1, ...weekdays.map((d) => report.weekdayCounts[d] ?? 0));
  for (const d of weekdays) {
    const count = report.weekdayCounts[d] ?? 0;
    const b = bar(count, maxDay, 22, c.cyan, c);
    lines.push(`    ${d}  ${b}  ${c.dim(String(count))}`);
  }
  lines.push('');

  // Commit types
  const typeOrder: Array<[CommitType, string, (s: string) => string]> = [
    ['feat', 'feat    ', c.green],
    ['fix', 'fix     ', c.red],
    ['docs', 'docs    ', c.blue],
    ['refactor', 'refactor', c.magenta],
    ['test', 'test    ', c.cyan],
    ['chore', 'chore   ', c.yellow],
    ['other', 'other   ', c.dim],
  ];
  const maxType = Math.max(
    1,
    ...typeOrder.map(([t]) => report.commitTypes[t] ?? 0),
  );
  lines.push(`  ${c.bold('Commit Types')}`);
  for (const [t, label, colorFn] of typeOrder) {
    const count = report.commitTypes[t] ?? 0;
    if (count === 0) continue;
    const b = bar(count, maxType, 18, colorFn, c);
    lines.push(`    ${label} ${b}  ${c.dim(String(count))}`);
  }
  lines.push('');

  // Contributors
  if (report.contributors.length > 0) {
    lines.push(`  ${c.bold('Top Contributors')}`);
    for (const contributor of report.contributors) {
      lines.push(
        `    ${c.cyan('•')} ${contributor.author.padEnd(24)} ` +
          `${c.bold(String(contributor.commits).padStart(4))} commits ${c.dim(`(${contributor.percentage}%)`)}  ` +
          `${c.green(`+${contributor.insertions}`)} ${c.red(`-${contributor.deletions}`)}`,
      );
    }
    lines.push('');
  }

  // Hotspots
  if (report.hotspots.length > 0) {
    lines.push(`  ${c.bold('File Hotspots (Most Modified)')}`);
    for (const h of report.hotspots) {
      lines.push(
        `    ${c.yellow('▲')} ${h.path.padEnd(36)} ` +
          `${c.bold(String(h.touches))} changes  ${c.green(`+${h.insertions}`)} ${c.red(`-${h.deletions}`)}`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
