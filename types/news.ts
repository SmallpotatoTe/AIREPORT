export type SourceTier = 'official' | 'media' | 'community';
export type SourceLanguage = 'zh' | 'en' | 'mixed';
export type SourceParser = 'rss' | 'web' | 'arxiv' | 'aggregator';
export type NewsCategory = '模型发布' | '智能体' | '开源项目' | '研究论文' | '产品更新' | '算力芯片' | '行业政策' | '产业动态' | '其他';

export type NewsItem = {
  id: string;
  title: string;
  originalTitle: string;
  translatedTitle: string;
  source: string;
  url: string;
  publishedAt: string;
  collectedAt: string;
  summary: string;
  originalSummary: string;
  translatedSummary: string;
  content: string;
  keywords: string[];
  category: NewsCategory;
  importance: number;
  relevance: number;
  confidence: number;
  qualityScore: number;
  sourceTier: SourceTier;
  whyItMatters: string;
};

export type NewsSource = {
  id: string;
  name: string;
  type: 'rss' | 'web' | 'manual';
  url: string;
  enabled: boolean;
  confidence: number;
  tier: SourceTier;
  language: SourceLanguage;
  parser: SourceParser;
  dailyLimit: number;
  homepage?: string;
};

export type NewsCandidate = {
  source: NewsSource;
  title: string;
  url: string;
  publishedAt: string;
  content: string;
  excerpt?: string;
  qualityScore?: number;
};

export type SourceCollectionStatus = {
  sourceId: string;
  sourceName: string;
  status: 'success' | 'partial' | 'failed';
  discovered: number;
  extracted: number;
  accepted: number;
  error?: string;
};

export type StructuredNews = {
  url: string;
  originalTitle: string;
  translatedTitle: string;
  originalSummary: string;
  translatedSummary: string;
  keywords: string[];
  category: NewsCategory;
  importance: number;
  relevance: number;
  whyItMatters: string;
};

export type DailyReport = {
  date: string;
  items: NewsItem[];
  collectedAt?: string;
  sourceStatuses?: SourceCollectionStatus[];
};

export type RagDocument = {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  publishedAt: string;
  keywords: string[];
  importedAt: string;
};
