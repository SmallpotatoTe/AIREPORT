import type { NewsSource } from '@/types/news';

export const newsSources: NewsSource[] = [
  { id: 'openai', name: 'OpenAI', type: 'rss', url: 'https://openai.com/news/rss.xml', homepage: 'https://openai.com/news/', enabled: true, confidence: 0.99, tier: 'official', language: 'en', parser: 'rss', dailyLimit: 3 },
  { id: 'nvidia-ai', name: 'NVIDIA AI', type: 'rss', url: 'https://blogs.nvidia.com/feed/', homepage: 'https://blogs.nvidia.com/', enabled: true, confidence: 0.96, tier: 'official', language: 'en', parser: 'rss', dailyLimit: 2 },
  { id: 'microsoft-research', name: 'Microsoft Research', type: 'rss', url: 'https://www.microsoft.com/en-us/research/feed/', homepage: 'https://www.microsoft.com/en-us/research/', enabled: true, confidence: 0.96, tier: 'official', language: 'en', parser: 'rss', dailyLimit: 2 },
  { id: 'aws-ml', name: 'AWS Machine Learning', type: 'rss', url: 'https://aws.amazon.com/blogs/machine-learning/feed/', homepage: 'https://aws.amazon.com/blogs/machine-learning/', enabled: true, confidence: 0.95, tier: 'official', language: 'en', parser: 'rss', dailyLimit: 2 },
  { id: 'github-ai', name: 'GitHub AI', type: 'rss', url: 'https://github.blog/ai-and-ml/generative-ai/feed/', homepage: 'https://github.blog/ai-and-ml/generative-ai/', enabled: true, confidence: 0.94, tier: 'official', language: 'en', parser: 'rss', dailyLimit: 2 },
  { id: 'cloudflare-ai', name: 'Cloudflare AI', type: 'rss', url: 'https://blog.cloudflare.com/tag/ai/rss/', homepage: 'https://blog.cloudflare.com/tag/ai/', enabled: true, confidence: 0.93, tier: 'official', language: 'en', parser: 'rss', dailyLimit: 2 },
  { id: 'arxiv-ai', name: 'arXiv AI', type: 'rss', url: 'https://export.arxiv.org/rss/cs.AI', homepage: 'https://arxiv.org/list/cs.AI/recent', enabled: true, confidence: 0.97, tier: 'official', language: 'en', parser: 'arxiv', dailyLimit: 3 },
  { id: 'jiqizhixin', name: '机器之心', type: 'web', url: 'https://www.jiqizhixin.com/', enabled: true, confidence: 0.91, tier: 'media', language: 'zh', parser: 'web', dailyLimit: 2 },
  { id: 'ai-digest', name: 'AI 资讯速览', type: 'web', url: 'https://ai-digest.liziran.com/', enabled: true, confidence: 0.9, tier: 'media', language: 'zh', parser: 'web', dailyLimit: 2 },
  { id: 'smol-ai-news', name: 'Smol AI News', type: 'web', url: 'https://news.smol.ai/', enabled: true, confidence: 0.87, tier: 'community', language: 'en', parser: 'aggregator', dailyLimit: 1 },
  { id: 'radarai', name: 'RadarAI', type: 'web', url: 'https://radarai.top/en/updates', enabled: true, confidence: 0.86, tier: 'community', language: 'en', parser: 'aggregator', dailyLimit: 1 },
];

export const scheduleHint = '0 8 * * *';
