export type ProviderId = 'deepseek' | 'kimi';
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type ProviderConfig = { id: ProviderId; name: string; baseUrl: string; model: string; apiKeyEnv: string };
export type ChatResult = { content: string; provider: string; model: string; fallback: boolean };
