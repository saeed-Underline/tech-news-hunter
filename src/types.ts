export type Rank = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';

export interface Article {
  id: string;
  title: string;
  url: string;
  host: string;
  sourceId: string;
  sourceName: string;
  author: string;
  summary: string;
  publishedAt: string;
  points: number;
  comments: number;
  commentsUrl: string;
  topics: string[];
  score: number;
  rank: Rank;
}

export interface DayFile {
  date: string;
  generatedAt: string;
  count: number;
  sourceReport?: Record<string, { ok: boolean; fetched: number; error: string | null }>;
  articles: Article[];
}

export interface ArchivedArticle {
  date: string;
  id: string;
  title: string;
  url: string;
  sourceId: string;
  topics: string[];
  score: number;
  rank: Rank;
  publishedAt: string;
}

export interface ArchiveFile {
  month: string;
  updatedAt: string;
  days: number;
  articles: ArchivedArticle[];
}

export interface IndexDay {
  date: string;
  file: string;
  count: number;
  topScore: number;
  topRank: Rank;
  bytes: number;
  sources: Record<string, number>;
}

export interface IndexArchive {
  month: string;
  file: string;
  days: number;
  count: number;
  bytes: number;
}

export interface NewsIndex {
  generatedAt: string;
  latest: string | null;
  sources: Record<string, { name: string; weight: number }>;
  retention: {
    dailyRetentionDays: number;
    archiveRetentionMonths: number;
    maxArticlesPerDay: number;
    archiveTopPerDay: number;
    maxDataBytes: number;
  };
  stats: {
    daysTracked: number;
    monthsArchived: number;
    articlesLive: number;
    articlesArchived: number;
    bytes: number;
    bytesLimit: number;
  };
  days: IndexDay[];
  archives: IndexArchive[];
}
