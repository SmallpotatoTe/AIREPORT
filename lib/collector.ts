import type { DailyReport, NewsCandidate, NewsItem, NewsSource, RagDocument, SourceCollectionStatus, StructuredNews } from '@/types/news';
import { discoverFeedEntries, discoverWebEntries, extractArticle } from './extract';
import { assessCandidate, dedupeCandidates, selectTopCandidates } from './news-quality';
import { shanghaiDate } from './date';

const normalize = (value: string) => value.trim().toLowerCase();
const safeMessage = (error: unknown) => error instanceof Error ? error.message : '未知错误';

export function mergeExtractedCandidate(feedCandidate: NewsCandidate, extractedCandidate: NewsCandidate): NewsCandidate {
  const content = extractedCandidate.content.trim().length >= feedCandidate.content.trim().length
    ? extractedCandidate.content
    : feedCandidate.content;
  return {
    ...feedCandidate,
    ...extractedCandidate,
    title: extractedCandidate.title || feedCandidate.title,
    publishedAt: extractedCandidate.publishedAt || feedCandidate.publishedAt,
    content,
    excerpt: feedCandidate.excerpt || extractedCandidate.excerpt,
  };
}

async function fetchText(url: string, timeoutMs = 18000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/html;q=0.8, */*;q=0.5',
        'user-agent': 'AI-Daily-Research-Agent/1.0 (+local knowledge dashboard)',
      },
    });
    if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + response.statusText);
    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function collectSourceCandidates(source: NewsSource) {
  const status: SourceCollectionStatus = { sourceId: source.id, sourceName: source.name, status: 'success', discovered: 0, extracted: 0, accepted: 0 };
  if (!source.enabled) return { candidates: [] as NewsCandidate[], status };
  try {
    const indexText = await fetchText(source.url);
    const discovered = source.type === 'rss' ? discoverFeedEntries(indexText, source) : discoverWebEntries(indexText, source);
    const recent = discovered
      .filter((entry) => Date.now() - new Date(entry.publishedAt).getTime() <= 14 * 24 * 60 * 60 * 1000)
      .slice(0, Math.max(5, source.dailyLimit * 3));
    status.discovered = recent.length;

    const extracted: NewsCandidate[] = [];
    for (const entry of recent) {
      try {
        const html = await fetchText(entry.url, 15000);
        const article = extractArticle(html, entry.url, source);
        extracted.push(mergeExtractedCandidate(entry, article));
      } catch {
        if (entry.content && entry.content.length >= 560) extracted.push(entry);
      }
    }
    status.extracted = extracted.length;
    const accepted = extracted.flatMap((candidate) => {
      const assessment = assessCandidate(candidate);
      return assessment.accepted ? [{ ...candidate, qualityScore: assessment.score }] : [];
    });
    status.accepted = accepted.length;
    if (accepted.length === 0 && recent.length > 0) status.status = 'partial';
    return { candidates: accepted, status };
  } catch (error) {
    status.status = 'failed';
    status.error = safeMessage(error);
    return { candidates: [] as NewsCandidate[], status };
  }
}

function validStructured(item: StructuredNews | undefined) {
  return Boolean(item && item.url && item.originalTitle.trim() && item.translatedTitle.trim() && item.originalSummary.trim() && item.translatedSummary.trim() && item.keywords.length >= 2);
}

export async function finalizeCandidates(candidates: NewsCandidate[], structurer: (candidates: NewsCandidate[]) => Promise<StructuredNews[]>) {
  const assessed = candidates.flatMap((candidate) => {
    const result = assessCandidate(candidate);
    return result.accepted ? [{ ...candidate, qualityScore: candidate.qualityScore || result.score }] : [];
  });
  const selected = selectTopCandidates(dedupeCandidates(assessed), 12);
  if (selected.length === 0) return [] as NewsItem[];
  const structured = await structurer(selected);
  const byUrl = new Map(structured.filter(validStructured).map((item) => [item.url.replace(/\/$/, ''), item]));
  const collectedAt = new Date().toISOString();
  return selected.flatMap((candidate) => {
    const organized = byUrl.get(candidate.url.replace(/\/$/, ''));
    if (!validStructured(organized)) return [];
    const item = organized as StructuredNews;
    return [{
      id: normalize(candidate.url).replace(/[^a-z0-9\u4e00-\u9fa5]/g, '').slice(-100),
      title: item.translatedTitle,
      originalTitle: item.originalTitle,
      translatedTitle: item.translatedTitle,
      source: candidate.source.name,
      url: candidate.url,
      publishedAt: candidate.publishedAt,
      collectedAt,
      summary: item.translatedSummary,
      originalSummary: item.originalSummary,
      translatedSummary: item.translatedSummary,
      content: candidate.content,
      keywords: item.keywords.slice(0, 5),
      category: item.category,
      importance: Math.max(0, Math.min(100, Math.round(item.importance))),
      relevance: Math.max(0, Math.min(100, Math.round(item.relevance))),
      confidence: candidate.source.confidence,
      qualityScore: candidate.qualityScore || 0,
      sourceTier: candidate.source.tier,
      whyItMatters: item.whyItMatters,
    } satisfies NewsItem];
  });
}

export function buildDailyReport(items: NewsItem[], statuses: SourceCollectionStatus[] = []): DailyReport {
  return { date: shanghaiDate(), items: dedupeNews(items), collectedAt: new Date().toISOString(), sourceStatuses: statuses };
}

export function splitReports(items: NewsItem[]) {
  const groups = new Map<string, NewsItem[]>();
  for (const item of items) {
    const date = item.publishedAt.slice(0, 10) || shanghaiDate();
    groups.set(date, [...(groups.get(date) || []), item]);
  }
  return [...groups.entries()].map(([date, group]) => ({ date, items: dedupeNews(group) })).sort((left, right) => right.date.localeCompare(left.date));
}

export function toRagDocuments(items: NewsItem[]): RagDocument[] {
  return dedupeNews(items).map((item) => ({
    id: item.id,
    title: item.translatedTitle || item.title,
    content: [item.translatedSummary || item.summary, item.whyItMatters, '关键词：' + item.keywords.join('、')].filter(Boolean).join('\n'),
    source: item.source,
    url: item.url,
    publishedAt: item.publishedAt,
    keywords: item.keywords,
    importedAt: new Date().toISOString(),
  }));
}

export function dedupeNews(items: NewsItem[]) {
  const seen = new Set<string>();
  return [...items]
    .sort((left, right) => right.qualityScore - left.qualityScore || right.importance - left.importance)
    .filter((item) => {
      const key = item.url.replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
