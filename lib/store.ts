import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DailyReport, NewsItem, RagDocument } from '@/types/news';

type StoreShape = { reports: DailyReport[]; ragDocuments: RagDocument[]; logs: unknown[] };
type CacheShape = { at: string | null; items: unknown[] };

const dataDir = path.join(process.cwd(), 'data');
const storePath = path.join(dataDir, 'store.json');
const cachePath = path.join(dataDir, 'collect-cache.json');
const emptyStore: StoreShape = { reports: [], ragDocuments: [], logs: [] };
const emptyCache: CacheShape = { at: null, items: [] };
const fakePatterns = [
  /今日 AI 动态[：:]/,
  /日报内容可直接进入 RAG 库/,
  /not much happened today/i,
  /查看详情$/,
  /show details$/i,
];

function looksLikeLegacyNoise(item: Partial<NewsItem>) {
  const title = String(item.translatedTitle || item.title || '').trim();
  const summary = String(item.translatedSummary || item.summary || '').trim();
  const hasStructuredFields = Boolean(item.originalTitle && item.translatedTitle && item.translatedSummary && item.category && item.qualityScore);
  const titleOnly = title.length > 0 && title.toLowerCase() === summary.toLowerCase();
  const tooShort = summary.replace(/\s+/g, '').length < (/[\u3400-\u9fff]/.test(summary) ? 16 : 70);
  return !hasStructuredFields && (titleOnly || tooShort);
}

export function normalizeNewsItem(value: unknown): NewsItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<NewsItem>;
  if (!item.title || !item.url || fakePatterns.some((pattern) => pattern.test(String(item.title) + String(item.summary || ''))) || looksLikeLegacyNoise(item)) return null;
  const translatedTitle = item.translatedTitle || item.title;
  const translatedSummary = item.translatedSummary || item.summary || '';
  return {
    id: item.id || item.url.replace(/[^a-z0-9]/gi, '').slice(-80),
    title: translatedTitle,
    originalTitle: item.originalTitle || item.title,
    translatedTitle,
    source: item.source || '未知来源',
    url: item.url,
    publishedAt: item.publishedAt || new Date().toISOString(),
    collectedAt: item.collectedAt || item.publishedAt || new Date().toISOString(),
    summary: translatedSummary,
    originalSummary: item.originalSummary || item.summary || '',
    translatedSummary,
    content: item.content || item.summary || '',
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    category: item.category || '其他',
    importance: item.importance ?? item.relevance ?? 50,
    relevance: item.relevance ?? 50,
    confidence: item.confidence ?? 0.7,
    qualityScore: item.qualityScore ?? item.relevance ?? 50,
    sourceTier: item.sourceTier || 'media',
    whyItMatters: item.whyItMatters || '',
  };
}

function normalizeStore(value: unknown): StoreShape {
  const raw = value && typeof value === 'object' ? value as Partial<StoreShape> : {};
  const reports = (raw.reports || []).map((report) => ({
    ...report,
    items: (report.items || []).map(normalizeNewsItem).filter((item): item is NewsItem => Boolean(item)),
  })).filter((report) => report.items.length > 0);
  const validIds = new Set(reports.flatMap((report) => report.items.map((item) => item.id)));
  return {
    reports,
    ragDocuments: (raw.ragDocuments || []).filter((document) => validIds.has(document.id) && !fakePatterns.some((pattern) => pattern.test(document.title + document.content))),
    logs: Array.isArray(raw.logs) ? raw.logs : [],
  };
}

async function ensureFile(filePath: string, fallback: StoreShape | CacheShape) {
  await mkdir(dataDir, { recursive: true });
  try { await readFile(filePath, 'utf8'); } catch { await writeFile(filePath, JSON.stringify(fallback, null, 2), 'utf8'); }
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  await ensureFile(filePath, fallback as StoreShape | CacheShape);
  try { return JSON.parse(await readFile(filePath, 'utf8')) as T; } catch { return fallback; }
}

async function atomicWrite(filePath: string, value: unknown) {
  const tempPath = filePath + '.tmp';
  await writeFile(tempPath, JSON.stringify(value, null, 2), 'utf8');
  await rename(tempPath, filePath);
}

export async function readStore() {
  const normalized = normalizeStore(await readJson(storePath, emptyStore));
  return normalized;
}
export async function writeStore(store: Partial<StoreShape>) { await atomicWrite(storePath, normalizeStore({ ...emptyStore, ...store })); }
export async function readCache() { return readJson(cachePath, emptyCache); }
export async function writeCache(cache: CacheShape) { await atomicWrite(cachePath, cache); }

export async function appendReport(report: DailyReport) {
  const store = await readStore();
  store.reports = [report, ...store.reports.filter((entry) => entry.date !== report.date)].slice(0, 60);
  await writeStore(store);
  return report;
}
export async function listReports() { return (await readStore()).reports; }
export async function listRagDocuments() { return (await readStore()).ragDocuments; }
export async function addRagDocuments(documents: RagDocument[]) {
  const store = await readStore();
  const map = new Map(store.ragDocuments.map((document) => [document.id, document]));
  for (const document of documents) map.set(document.id, document);
  store.ragDocuments = [...map.values()].slice(0, 500);
  await writeStore(store);
  return store.ragDocuments;
}
export async function appendLog(entry: Record<string, unknown>) {
  const store = await readStore();
  store.logs = [{ ...entry, at: new Date().toISOString() }, ...store.logs].slice(0, 100);
  await writeStore(store);
  return store.logs;
}
export async function wasDailyEmailDelivered(reportDate: string, to: string) {
  const normalizedRecipient = to.trim().toLowerCase();
  const store = await readStore();
  return store.logs.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const record = entry as Record<string, unknown>;
    return record.type === 'daily_email'
      && record.status === 'sent'
      && record.reportDate === reportDate
      && String(record.to || '').trim().toLowerCase() === normalizedRecipient;
  });
}
export async function getDashboardState() { return readStore(); }
