import assert from 'node:assert/strict';
import test from 'node:test';
import { assessCandidate, dedupeCandidates, selectTopCandidates } from '../lib/news-quality.ts';
import type { NewsCandidate, NewsSource } from '../types/news.ts';

const source: NewsSource = {
  id: 'official-test',
  name: 'Official Test',
  type: 'rss',
  url: 'https://example.com/feed',
  enabled: true,
  confidence: 0.96,
  tier: 'official',
  language: 'en',
  parser: 'rss',
  dailyLimit: 4,
};

function candidate(overrides: Partial<NewsCandidate> = {}): NewsCandidate {
  return {
    source,
    title: 'New multimodal reasoning model released for AI agents',
    url: 'https://example.com/news/model-release',
    publishedAt: new Date().toISOString(),
    content: 'A new artificial intelligence model improves multimodal reasoning, tool use, coding, evaluation, and agent reliability. '.repeat(14),
    ...overrides,
  };
}

test('news quality rejects placeholder and title-only content', () => {
  assert.equal(assessCandidate(candidate({ content: 'Not much happened today' })).accepted, false);
  assert.equal(assessCandidate(candidate({ content: 'Short AI update.' })).accepted, false);
});

test('news quality accepts complete relevant official article', () => {
  const result = assessCandidate(candidate());
  assert.equal(result.accepted, true);
  assert.ok(result.score >= 65);
});

test('news quality removes canonical title duplicates', () => {
  const first = candidate();
  const duplicate = candidate({ url: 'https://another.example.com/story', title: 'New multimodal reasoning model released for AI agents!' });
  assert.equal(dedupeCandidates([first, duplicate]).length, 1);
});

test('news quality respects total and per-source limits', () => {
  const items = Array.from({ length: 8 }, (_, index) => candidate({
    title: `AI model release ${index}`,
    url: `https://example.com/news/${index}`,
    qualityScore: 90 - index,
  }));
  assert.equal(selectTopCandidates(items, 3).length, 3);
});
