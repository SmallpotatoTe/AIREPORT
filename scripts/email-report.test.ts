import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDailyEmailHtml,
  resolveEmailConfig,
  sendDailyReportEmail,
  type EmailDeliveryDependencies,
} from '../lib/email-report';
import type { DailyReport, NewsItem } from '../types/news';

function createItem(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: 'news-1',
    title: '智能体获得新的工具调用能力',
    originalTitle: 'Agents gain new tool-use capabilities',
    translatedTitle: '智能体获得新的工具调用能力',
    source: 'Microsoft Research',
    url: 'https://example.com/agents?ref=daily&lang=zh',
    publishedAt: '2026-07-20T00:30:00.000Z',
    collectedAt: '2026-07-20T01:00:00.000Z',
    summary: '研究团队提出一种更可靠的工具调用方法，并公布了评测结果。',
    originalSummary: 'The team introduced a more reliable tool-use method and published evaluation results.',
    translatedSummary: '研究团队提出一种更可靠的工具调用方法，并公布了评测结果。',
    content: 'Full article content.',
    keywords: ['智能体', '工具调用', '评测'],
    category: '智能体',
    importance: 91,
    relevance: 96,
    confidence: 0.94,
    qualityScore: 93,
    sourceTier: 'official',
    whyItMatters: '工具调用可靠性直接影响智能体在企业流程中的落地。',
    ...overrides,
  };
}

function createReport(): DailyReport {
  return {
    date: '2026-07-20',
    collectedAt: '2026-07-20T01:00:00.000Z',
    items: [createItem()],
  };
}

test('HTML 日报包含日期、中文摘要、关键词和原文链接', () => {
  const html = buildDailyEmailHtml(createReport());

  assert.match(html, /2026-07-20/);
  assert.match(html, /智能体获得新的工具调用能力/);
  assert.match(html, /更可靠的工具调用方法/);
  assert.match(html, /智能体 · 工具调用 · 评测/);
  assert.match(html, /https:\/\/example\.com\/agents\?ref=daily&amp;lang=zh/);
});

test('SMTP 配置不完整时返回未配置', () => {
  assert.equal(resolveEmailConfig({ SMTP_HOST: 'smtp.qq.com' }), null);
});

test('同一日期和收件人只发送一次', async () => {
  let sendCount = 0;
  const records: Array<Record<string, unknown>> = [];
  const dependencies: EmailDeliveryDependencies = {
    wasDelivered: async () => true,
    recordDelivery: async (record) => { records.push(record); },
    send: async () => {
      sendCount += 1;
      return { messageId: 'message-1' };
    },
  };

  const result = await sendDailyReportEmail(createReport(), {
    config: {
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      user: 'sender@example.com',
      pass: 'secret',
      from: 'AI 日报 <sender@example.com>',
      to: 'reader@example.com',
    },
    dependencies,
  });

  assert.equal(result.status, 'skipped');
  assert.equal(result.reason, 'already_sent');
  assert.equal(sendCount, 0);
  assert.equal(records.length, 0);
});

test('SMTP 失败会记录失败状态而不抛出异常', async () => {
  const records: Array<Record<string, unknown>> = [];
  const result = await sendDailyReportEmail(createReport(), {
    config: {
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      user: 'sender@example.com',
      pass: 'secret',
      from: 'AI 日报 <sender@example.com>',
      to: 'reader@example.com',
    },
    dependencies: {
      wasDelivered: async () => false,
      recordDelivery: async (record) => { records.push(record); },
      send: async () => { throw new Error('SMTP unavailable'); },
    },
  });

  assert.equal(result.status, 'failed');
  assert.match(result.reason || '', /SMTP unavailable/);
  assert.equal(records.length, 1);
  assert.equal(records[0]?.status, 'failed');
});
