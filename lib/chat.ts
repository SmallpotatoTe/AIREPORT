import { z } from 'zod';
import { chatWithProvider } from './llm';
import { getProvider } from './providers';

const requestSchema = z.object({
  provider: z.enum(['deepseek', 'kimi']).default('deepseek'),
  prompt: z.string().min(1),
});

export async function generateAnswer(prompt: string, providerId: 'deepseek' | 'kimi') {
  const provider = getProvider(providerId);
  return chatWithProvider(provider, [
    { role: 'system', content: '你是一个帮助用户理解 AI Agent 的专业助手。' },
    { role: 'user', content: prompt },
  ]);
}

export async function parseChatRequest(request: Request) {
  const body = await request.json();
  return requestSchema.parse(body);
}
