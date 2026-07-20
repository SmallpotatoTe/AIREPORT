import assert from 'node:assert/strict';
import test from 'node:test';
import { rankRagDocuments } from '../lib/rag-search.ts';
import type { RagDocument } from '../types/news.ts';

const documents: RagDocument[] = [
  {
    id: 'agent-safety',
    title: '智能体工具调用新增安全评测框架',
    content: '研究团队发布了面向智能体工具调用、权限边界和审计流程的安全评测方法。',
    source: '研究机构',
    url: 'https://example.com/agent-safety',
    publishedAt: '2026-07-19T08:00:00.000Z',
    keywords: ['智能体', '工具调用', '安全评测'],
    importedAt: '2026-07-19T09:00:00.000Z',
  },
  {
    id: 'chip',
    title: '新一代推理芯片发布',
    content: '该芯片降低大模型推理成本。',
    source: '芯片厂商',
    url: 'https://example.com/chip',
    publishedAt: '2026-07-19T07:00:00.000Z',
    keywords: ['推理芯片', '算力'],
    importedAt: '2026-07-19T09:00:00.000Z',
  },
];

test('RAG search matches Chinese phrases without whitespace tokenization', () => {
  const ranked = rankRagDocuments(documents, '今天有哪些智能体安全和工具调用更新？');
  assert.equal(ranked[0]?.document.id, 'agent-safety');
  assert.ok((ranked[0]?.score || 0) > 0);
});

test('RAG search returns no citations for unrelated questions', () => {
  const ranked = rankRagDocuments(documents, '量子引力有哪些实验进展？');
  assert.equal(ranked.length, 0);
});
