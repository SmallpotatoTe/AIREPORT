import { NextResponse } from 'next/server';
import { z } from 'zod';
import { chatWithProvider } from '@/lib/llm';
import { getProvider } from '@/lib/providers';
import { rankRagDocuments } from '@/lib/rag-search';
import { listRagDocuments } from '@/lib/store';

const requestSchema = z.object({
  provider: z.enum(['deepseek', 'kimi']).default('deepseek'),
  question: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const provider = getProvider(body.provider);
    const documents = await listRagDocuments();
    const ranked = rankRagDocuments(documents, body.question);
    const context = ranked
      .map(({ document }) => `[${document.publishedAt.slice(0, 10)}｜${document.source}] ${document.title}\n${document.content}`)
      .join('\n\n');
    const instruction = context
      ? '只能依据下列知识库片段回答。不要补充片段之外的新闻、公司动态、日期、数字或案例；如果片段不足以回答，明确说“当前知识库引用不足”。每个事实后标注对应来源名称和日期。'
      : '当前没有检索到相关知识库片段。必须明确说明“当前知识库引用不足”，只能给出不带具体新闻事实的通用解释，不要虚构新闻、来源、日期或数字。';
    const prompt = `请回答用户关于 AI 行业的问题。${instruction}\n\n知识库片段：\n${context || '（无命中）'}\n\n用户问题：${body.question}`;
    const result = await chatWithProvider(provider, [
      { role: 'system', content: '你是严谨的 AI 行业研究助手。回答使用中文，严格限制在提供的知识库片段内，不编造来源，不扩写未提供的事实。' },
      { role: 'user', content: prompt },
    ]);

    return NextResponse.json({
      status: 'ok',
      answer: result.content,
      provider: result.provider,
      model: result.model,
      fallback: result.fallback,
      hits: ranked.map(({ document, score }) => ({
        id: document.id,
        title: document.title,
        source: document.source,
        url: document.url,
        publishedAt: document.publishedAt,
        score,
      })),
      hasRagContext: ranked.length > 0,
    });
  } catch (error) {
    const message = error instanceof z.ZodError ? '请输入有效问题' : error instanceof Error ? error.message : '问答失败';
    return NextResponse.json({ status: 'error', message }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
