import { z } from 'zod';
import type { NewsCandidate, StructuredNews } from '@/types/news';
import { chatWithProvider } from './llm';
import { getProvider } from './providers';

const chinesePattern = /[\u3400-\u9fff]/;
const categorySchema = z.enum(['模型发布', '智能体', '开源项目', '研究论文', '产品更新', '算力芯片', '行业政策', '产业动态', '其他']);
const structuredSchema = z.object({
  items: z.array(z.object({
    url: z.string().url(),
    originalTitle: z.string().min(4),
    translatedTitle: z.string().min(4),
    originalSummary: z.string().min(20),
    translatedSummary: z.string().min(20),
    keywords: z.array(z.string().min(1)).min(2).max(5),
    category: categorySchema,
    importance: z.number().min(0).max(100),
    relevance: z.number().min(0).max(100),
    whyItMatters: z.string().min(8),
  })).max(12),
});

function jsonText(value: string) {
  const fenced = value.match(/\x60\x60\x60(?:json)?\s*([\s\S]*?)\x60\x60\x60/i)?.[1];
  if (fenced) return fenced.trim();
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  return start >= 0 && end > start ? value.slice(start, end + 1) : value;
}

export function parseStructuredNews(value: string): StructuredNews[] {
  try {
    const parsed = structuredSchema.parse(JSON.parse(jsonText(value)));
    return parsed.items.filter((item) => {
      const translatedIsChinese = chinesePattern.test(item.translatedTitle) && chinesePattern.test(item.translatedSummary);
      const originalIsChinese = chinesePattern.test(item.originalTitle) && chinesePattern.test(item.originalSummary);
      const englishWasTranslated = item.translatedTitle.trim() !== item.originalTitle.trim() && item.translatedSummary.trim() !== item.originalSummary.trim();
      return translatedIsChinese && (originalIsChinese || englishWasTranslated);
    });
  } catch {
    return [];
  }
}

export async function structureNewsCandidates(candidates: NewsCandidate[]) {
  if (candidates.length === 0) return [];
  const provider = getProvider('deepseek');
  const payload = candidates.map((candidate) => ({
    url: candidate.url,
    source: candidate.source.name,
    publishedAt: candidate.publishedAt,
    title: candidate.title,
    content: candidate.content.slice(0, 6000),
  }));
  const prompt = [
    '你是严谨的 AI 新闻编辑。只根据给定的已抓取原文整理新闻，不补充不存在的事实。',
    '返回且只返回 JSON 对象：{ "items": [...] }。每项字段必须为：url、originalTitle、translatedTitle、originalSummary、translatedSummary、keywords、category、importance、relevance、whyItMatters。',
    'translatedTitle、translatedSummary、keywords、whyItMatters 必须是自然、完整、简洁的中文；专有名词可保留英文。',
    'originalSummary 保持原文语言，80-180 个词或 120-260 个中文字符；translatedSummary 为 100-220 个中文字符，去掉宣传语和废话。',
    'keywords 只给 3-5 个中文关键词；category 只能是：模型发布、智能体、开源项目、研究论文、产品更新、算力芯片、行业政策、产业动态、其他。',
    'importance 与 relevance 为 0-100 数字。若内容不是具体 AI 新闻、正文不足或无法核验，则不要将该条放入 items。',
    JSON.stringify(payload),
  ].join('\n\n');
  const result = await chatWithProvider(provider, [
    { role: 'system', content: '你只输出可解析 JSON，不使用 Markdown。' },
    { role: 'user', content: prompt },
  ], { json: true });
  if (result.fallback) return [];
  return parseStructuredNews(result.content);
}
