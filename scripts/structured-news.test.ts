import assert from 'node:assert/strict';
import test from 'node:test';
import { parseStructuredNews } from '../lib/news-structurer.ts';
import { normalizeNewsItem } from '../lib/store.ts';

test('structured news parser accepts strict bilingual JSON', () => {
  const parsed = parseStructuredNews(JSON.stringify({ items: [{
    url: 'https://example.com/article',
    originalTitle: 'New reasoning model',
    translatedTitle: '新推理模型发布',
    originalSummary: 'The model improves tool use and coding reliability.',
    translatedSummary: '该模型提升了工具调用与代码任务的可靠性。',
    keywords: ['推理模型', '工具调用', '代码生成'],
    category: '模型发布', importance: 90, relevance: 98,
    whyItMatters: '它提升了智能体处理复杂任务的稳定性。',
  }] }));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].translatedTitle, '新推理模型发布');
});

test('structured news parser rejects incomplete or untranslated JSON', () => {
  assert.equal(parseStructuredNews('{"items":[{"url":"https://example.com"}]}').length, 0);
  assert.equal(parseStructuredNews(JSON.stringify({ items: [{
    url: 'https://example.com/article', originalTitle: 'English title', translatedTitle: 'English title',
    originalSummary: 'English summary', translatedSummary: 'English summary', keywords: ['AI', 'model'],
    category: '模型发布', importance: 80, relevance: 90, whyItMatters: 'Important',
  }] })).length, 0);
});

test('structured news parser accepts Chinese originals without forced rewriting', () => {
  const parsed = parseStructuredNews(JSON.stringify({ items: [{
    url: 'https://example.com/chinese-article',
    originalTitle: '国产多模态模型发布新版本',
    translatedTitle: '国产多模态模型发布新版本',
    originalSummary: '团队发布了新的多模态模型版本，重点提升图像理解、工具调用和复杂任务处理能力。',
    translatedSummary: '团队发布了新的多模态模型版本，重点提升图像理解、工具调用和复杂任务处理能力。',
    keywords: ['多模态模型', '工具调用', '图像理解'],
    category: '模型发布', importance: 86, relevance: 94,
    whyItMatters: '该版本扩展了国产模型在真实业务中的应用边界。',
  }] }));
  assert.equal(parsed.length, 1);
});

test('store migration drops fabricated fallback news and fills bilingual fields', () => {
  assert.equal(normalizeNewsItem({ title: 'arXiv cs.AI 今日 AI 动态：日报与 RAG 进入产品化阶段', url: 'https://export.arxiv.org/rss/cs.AI' }), null);
  const item = normalizeNewsItem({
    id: 'legacy', title: '真实中文新闻', source: '机器之心', url: 'https://example.com/real',
    publishedAt: '2026-07-19T08:00:00.000Z', summary: '真实摘要内容，介绍人工智能模型的新进展。',
    content: '真实摘要内容，介绍人工智能模型的新进展。', keywords: ['人工智能'], relevance: 90, confidence: 0.9,
  });
  assert.equal(item?.translatedTitle, '真实中文新闻');
  assert.equal(item?.translatedSummary, item?.summary);
});

test('store migration drops legacy title-only aggregator entries', () => {
  assert.equal(normalizeNewsItem({
    id: 'legacy-smol', title: 'Jun 16 GLM 5.2 查看详情', source: 'Smol AI 新闻',
    url: 'https://news.smol.ai/issues/example', publishedAt: '2026-07-19T08:00:00.000Z',
    summary: 'Jun 16 GLM 5.2 查看详情', content: 'Jun 16 GLM 5.2 查看详情', keywords: ['AI'],
  }), null);
});
