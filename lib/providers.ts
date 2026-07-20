import type { ProviderConfig } from '../types/llm';

export const providers: ProviderConfig[] = [
  { id: 'deepseek', name: 'DeepSeek', baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com', model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash', apiKeyEnv: 'DEEPSEEK_API_KEY' },
  { id: 'kimi', name: 'Kimi', baseUrl: process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1', model: process.env.KIMI_MODEL || 'kimi-k2-0905-preview', apiKeyEnv: 'KIMI_API_KEY' },
];

export function getProvider(providerId: string | null | undefined) {
  return providers.find((provider) => provider.id === providerId) ?? providers[0];
}
