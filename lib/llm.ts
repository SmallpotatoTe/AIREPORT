import OpenAI from 'openai';
import type { ChatMessage, ProviderConfig } from '../types/llm';

export async function chatWithProvider(provider: ProviderConfig, messages: ChatMessage[], options: { json?: boolean } = {}) {
  const apiKey = process.env[provider.apiKeyEnv];
  if (!apiKey) {
    return { content: `缺少 ${provider.apiKeyEnv}。当前为本地兜底结果：请先配置环境变量后再调用 ${provider.name}。`, provider: provider.name, model: provider.model, fallback: true };
  }

  const client = new OpenAI({ baseURL: provider.baseUrl, apiKey });
  const completion = await client.chat.completions.create({
    model: provider.model,
    messages,
    ...(options.json ? { response_format: { type: 'json_object' as const }, temperature: 0.1 } : {}),
  });
  return { content: completion.choices[0]?.message?.content ?? '', provider: provider.name, model: provider.model, fallback: false };
}
