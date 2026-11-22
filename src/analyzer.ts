import path from 'node:path';
import type {
  CommitInfo,
  CommitType,
  ContributorStat,
  HotspotStat,
  RecapReport,
} from './types.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DISPLAY_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function classifyCommit(subject: string): CommitType {
  const lower = subject.toLowerCase().trim();
  if (/^feat(\([^)]+\))?!?:/.test(lower)) return 'feat';
  if (/^fix(\([^)]+\))?!?:/.test(lower)) return 'fix';
  if (/^docs(\([^)]+\))?!?:/.test(lower)) return 'docs';
  if (/^refactor(\([^)]+\))?!?:/.test(lower)) return 'refactor';
  if (/^test(\([^)]+\))?!?:/.test(lower)) return 'test';
  if (/^(chore|build|ci|style|perf)(\([^)]+\))?!?:/.test(lower)) return 'chore';
  return 'other';
}

function computeLongestStreak(dayKeys: Set<string>): number {
  if (dayKeys.size === 0) return 0;
  const sortedDays = Array.from(dayKeys).sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1] + 'T00:00:00Z').getTime();
    const curr = new Date(sortedDays[i] + 'T00:00:00Z').getTime();
    const diffDays = Math.round((curr - prev) / 86_400_000);
    if (diffDays === 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}

export function analyzeCommits(
  targetDir: string,
  commits: CommitInfo[],
  topN = 5,
): RecapReport {
  const resolved = path.resolve(targetDir);
  const weekdayCounts: Record<string, number> = {};
  for (const d of DISPLAY_WEEKDAYS) weekdayCounts[d] = 0;

  const hourCounts = new Array<number>(24).fill(0);
  const dayKeys = new Set<string>();

  const commitTypes: Record<CommitType, number> = {
    feat: 0,
    fix: 0,
    docs: 0,
    refactor: 0,
    test: 0,
    chore: 0,
    other: 0,
  };

  const authorMap = new Map<
    string,
    { commits: number; insertions: number; deletions: number }
  >();
  const fileMap = new Map<
    string,
    { touches: number; insertions: number; deletions: number }
  >();

  let totalInsertions = 0;
  let totalDeletions = 0;

  for (const c of commits) {
    const dayStr = c.date.toISOString().slice(0, 10);
    dayKeys.add(dayStr);

    const wd = WEEKDAYS[c.date.getDay()];
    weekdayCounts[wd] = (weekdayCounts[wd] ?? 0) + 1;
    hourCounts[c.date.getHours()]++;

    commitTypes[classifyCommit(c.subject)]++;

    let cIns = 0;
    let cDel = 0;
    for (const f of c.files) {
      cIns += f.insertions;
      cDel += f.deletions;
      const prevF = fileMap.get(f.path) ?? {
        touches: 0,
        insertions: 0,
        deletions: 0,
      };
      prevF.touches++;
      prevF.insertions += f.insertions;
      prevF.deletions += f.deletions;
      fileMap.set(f.path, prevF);
    }

    totalInsertions += cIns;
    totalDeletions += cDel;

    const prevA = authorMap.get(c.author) ?? {
      commits: 0,
      insertions: 0,
      deletions: 0,
    };
    prevA.commits++;
    prevA.insertions += cIns;
    prevA.deletions += cDel;
    authorMap.set(c.author, prevA);
  }

  let peakWeekday = 'Mon';
  let peakWeekdayCount = -1;
  for (const d of DISPLAY_WEEKDAYS) {
    if (weekdayCounts[d] > peakWeekdayCount) {
      peakWeekdayCount = weekdayCounts[d];
      peakWeekday = d;
    }
  }

  let peakHour = 0;
  let peakHourCount = -1;
  for (let h = 0; h < 24; h++) {
    if (hourCounts[h] > peakHourCount) {
      peakHourCount = hourCounts[h];
      peakHour = h;
    }
  }

  const totalCommits = commits.length;
  const contributors: ContributorStat[] = Array.from(authorMap.entries())
    .map(([author, s]) => ({
      author,
      commits: s.commits,
      insertions: s.insertions,
      deletions: s.deletions,
      percentage:
        totalCommits > 0 ? Math.round((s.commits / totalCommits) * 100) : 0,
    }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, topN);

  const hotspots: HotspotStat[] = Array.from(fileMap.entries())
    .map(([filePath, s]) => ({
      path: filePath,
      touches: s.touches,
      insertions: s.insertions,
      deletions: s.deletions,
    }))
    .sort((a, b) => b.touches - a.touches)
    .slice(0, topN);

  return {
    targetDir: resolved,
    repoName: path.basename(resolved),
    totalCommits,
    totalInsertions,
    totalDeletions,
    activeDays: dayKeys.size,
    longestStreakDays: computeLongestStreak(dayKeys),
    peakWeekday,
    peakHour,
    weekdayCounts,
    commitTypes,
    contributors,
    hotspots,
    commits,
  };
}
