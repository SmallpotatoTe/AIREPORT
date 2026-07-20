import type { RagDocument } from '@/types/news';

const chineseStopTerms = new Set(['今天', '哪些', '什么', '怎么', '如何', '一下', '目前', '相关', '更新', '新闻', '日报', '内容', '值得', '关注']);
const latinStopTerms = new Set(['the', 'and', 'for', 'with', 'what', 'which', 'today', 'news', 'update']);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/g, ' ').trim();
}

function queryTerms(question: string) {
  const normalized = normalize(question);
  const terms = new Set<string>();

  for (const token of normalized.match(/[a-z0-9][a-z0-9-]{1,}/g) || []) {
    if (!latinStopTerms.has(token)) terms.add(token);
  }

  for (const sequence of normalized.match(/[\u3400-\u9fff]+/g) || []) {
    for (let size = 4; size >= 2; size -= 1) {
      for (let index = 0; index <= sequence.length - size; index += 1) {
        const term = sequence.slice(index, index + size);
        if (!chineseStopTerms.has(term)) terms.add(term);
      }
    }
  }

  return [...terms];
}

function includesTerm(value: string, term: string) {
  return normalize(value).replace(/\s+/g, '').includes(term.replace(/\s+/g, ''));
}

export function rankRagDocuments(documents: RagDocument[], question: string, limit = 5) {
  const terms = queryTerms(question);
  if (terms.length === 0) return [];

  return documents
    .map((document) => {
      let score = 0;
      const matched = new Set<string>();
      for (const term of terms) {
        const keywordHit = document.keywords.some((keyword) => includesTerm(keyword, term));
        const titleHit = includesTerm(document.title, term);
        const contentHit = includesTerm(document.content, term);
        if (keywordHit || titleHit || contentHit) matched.add(term);
        if (keywordHit) score += 8;
        if (titleHit) score += 5;
        if (contentHit) score += 1;
      }
      return { document, score, matchedTerms: [...matched] };
    })
    .filter((item) => item.score >= 2 && item.matchedTerms.length > 0)
    .sort((left, right) => right.score - left.score || right.document.publishedAt.localeCompare(left.document.publishedAt))
    .slice(0, limit);
}
