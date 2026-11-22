export interface FileChange {
  path: string;
  insertions: number;
  deletions: number;
}

export interface CommitInfo {
  hash: string;
  author: string;
  date: Date;
  subject: string;
  files: FileChange[];
}

export interface ContributorStat {
  author: string;
  commits: number;
  insertions: number;
  deletions: number;
  percentage: number;
}

export interface HotspotStat {
  path: string;
  touches: number;
  insertions: number;
  deletions: number;
}

export type CommitType =
  | 'feat'
  | 'fix'
  | 'docs'
  | 'refactor'
  | 'test'
  | 'chore'
  | 'other';

export interface RecapReport {
  targetDir: string;
  repoName: string;
  totalCommits: number;
  totalInsertions: number;
  totalDeletions: number;
  activeDays: number;
  longestStreakDays: number;
  peakWeekday: string;
  peakHour: number;
  weekdayCounts: Record<string, number>;
  commitTypes: Record<CommitType, number>;
  contributors: ContributorStat[];
  hotspots: HotspotStat[];
  commits: CommitInfo[];
}

export interface CliOptions {
  targetDir: string;
  days?: number;
  top: number;
  changelog?: string;
  json: boolean;
  noColor: boolean;
  help: boolean;
  version: boolean;
}
