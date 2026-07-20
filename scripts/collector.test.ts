import assert from 'node:assert/strict';
import test from 'node:test';
import { finalizeCandidates, mergeExtractedCandidate, toRagDocuments } from '../lib/collector.ts';
import type { NewsCandidate, NewsSource, StructuredNews } from '../types/news.ts';

const source: NewsSource = {
  id: 'official-test', name: 'Official Test', type: 'rss', url: 'https://example.com/feed',
  enabled: true, confidence: 0.98, tier: 'official', language: 'en', parser: 'rss', dailyLimit: 20,
};

function candidate(index: number, content = 'Artificial intelligence model release improves reasoning, agent tool use, coding benchmarks, and inference reliability. '.repeat(12)): NewsCandidate {
  return { source, title: 'AI model release ' + index, url: 'https://example.com/news/' + index, publishedAt: new Date().toISOString(), content };
}

function structured(items: NewsCandidate[]): StructuredNews[] {
  return items.map((item, index) => ({
    url: item.url, originalTitle: item.title, translatedTitle: '人工智能模型更新 ' + index,
    originalSummary: 'A concise original summary of the verified article content.',
    translatedSummary: '这是一段基于已核验原文整理的中文摘要，说明模型能力、应用价值与实际影响。',
    keywords: ['模型发布', '智能体', '推理'], category: '模型发布', importance: 88, relevance: 96,
    whyItMatters: '该更新提升了智能体在复杂任务中的可靠性。',
  }));
}

test('collector filters short candidates before structuring', async () => {
  let received = 0;
  const items = await finalizeCandidates([candidate(1, 'Short AI note.'), candidate(2)], async (accepted) => { received = accepted.length; return structured(accepted); });
  assert.equal(received, 1);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, items[0].translatedTitle);
});

test('collector keeps full RSS content when article extraction is shorter', () => {
  const feedCandidate = candidate(3, 'Artificial intelligence agent engineering details, benchmarks, deployment guidance, and architecture notes. '.repeat(14));
  const extractedCandidate = { ...feedCandidate, title: 'Article title', publishedAt: '', content: 'Short navigation fragment.' };
  const merged = mergeExtractedCandidate(feedCandidate, extractedCandidate);
  assert.equal(merged.title, 'Article title');
  assert.equal(merged.publishedAt, feedCandidate.publishedAt);
  assert.equal(merged.content, feedCandidate.content);
});

test('collector enforces daily limit and skips missing structured output', async () => {
  const candidates = Array.from({ length: 15 }, (_, index) => candidate(index));
  const items = await finalizeCandidates(candidates, async (accepted) => structured(accepted).slice(0, 11));
  assert.equal(items.length, 11);
  assert.ok(items.length <= 12);
});

test('RAG documents use the Chinese summary instead of raw article body', async () => {
  const [item] = await finalizeCandidates([candidate(1)], async (accepted) => structured(accepted));
  const [document] = toRagDocuments([item]);
  assert.match(document.content, /中文摘要/);
  assert.doesNotMatch(document.content, /Artificial intelligence model release improves/);
});
