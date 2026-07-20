import assert from 'node:assert/strict';
import test from 'node:test';
import { discoverFeedEntries, discoverWebEntries, extractArticle } from '../lib/extract.ts';
import type { NewsSource } from '../types/news.ts';

const source: NewsSource = {
  id: 'test',
  name: 'Test Source',
  type: 'rss',
  url: 'https://example.com/feed.xml',
  enabled: true,
  confidence: 0.95,
  tier: 'official',
  language: 'en',
  parser: 'rss',
  dailyLimit: 3,
};

test('extract discovers RSS entries with real links and dates', () => {
  const xml = `<?xml version=1.0?><rss><channel><item><title>Model release</title><link>https://example.com/news/model</link><pubDate>Sun, 19 Jul 2026 02:00:00 GMT</pubDate><description>Release notes</description></item></channel></rss>`;
  const entries = discoverFeedEntries(xml, source);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].url, 'https://example.com/news/model');
  assert.equal(entries[0].title, 'Model release');
});

test('extract prefers full RSS content over a short description', () => {
  const full = 'Artificial intelligence release notes explain model architecture, tool use, evaluation, deployment, and safety improvements. '.repeat(8);
  const xml = `<rss><channel><item><title>Complete model release</title><link>https://example.com/news/full</link><pubDate>Sun, 19 Jul 2026 02:00:00 GMT</pubDate><description>Short teaser.</description><content:encoded><![CDATA[<p>${full}</p>]]></content:encoded></item></channel></rss>`;
  const [entry] = discoverFeedEntries(xml, source);
  assert.ok(entry.content.length > 560);
  assert.match(entry.content, /model architecture/);
});

test('extract reads JSON-LD article body before navigation text', () => {
  const body = 'Artificial intelligence model release details and benchmark results. '.repeat(12);
  const html = `<html><head><script type=application/ld+json>${JSON.stringify({ '@type': 'NewsArticle', headline: 'New AI model', datePublished: '2026-07-19T02:00:00Z', articleBody: body })}</script></head><body><nav>Sign in Subscribe</nav><article><p>Short fallback.</p></article></body></html>`;
  const article = extractArticle(html, 'https://example.com/news/model', source);
  assert.equal(article.title, 'New AI model');
  assert.equal(article.content, body.trim());
  assert.equal(article.publishedAt, '2026-07-19T02:00:00.000Z');
});

test('extract reads meaningful article paragraphs', () => {
  const paragraphs = Array.from({ length: 8 }, (_, index) => `<p>Paragraph ${index} explains an artificial intelligence research result, its model architecture, benchmark evaluation, and practical impact for developers.</p>`).join('');
  const html = `<html><head><title>AI research update</title></head><body><header>Menu</header><main><article>${paragraphs}</article></main><footer>Privacy</footer></body></html>`;
  const article = extractArticle(html, 'https://example.com/research', source);
  assert.match(article.content, /model architecture/);
  assert.doesNotMatch(article.content, /Privacy/);
});

test('extract leaves missing article dates empty for feed fallback', () => {
  const html = `<html><head><title>AI research update</title></head><body><article><p>${'Artificial intelligence research details, benchmarks, deployment findings, and model safety results. '.repeat(8)}</p></article></body></html>`;
  const article = extractArticle(html, 'https://example.com/research', source);
  assert.equal(article.publishedAt, '');
});

test('extract aggregator only discovers substantial article links', () => {
  const html = `<main><a href=/>Home</a><a href=/issues/2026-07-19><h2>Daily AI engineering roundup: model releases and agent research</h2><p>A complete issue covering model launches, open-source agents, and research papers.</p></a><a href=/login>Sign in</a></main>`;
  const entries = discoverWebEntries(html, source, 'https://news.example.com');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].url, 'https://news.example.com/issues/2026-07-19');
});
