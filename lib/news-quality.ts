import type { NewsCandidate, SourceTier } from '@/types/news';

const junkPatterns = [
  /not much happened today/i,
  /see all issues/i,
  /sign in|log in|subscribe now|privacy policy|terms of service/i,
  /cookie preferences|accept cookies/i,
  /点击订阅|登录后查看|隐私政策|用户协议/,
];

const aiTerms = [
  'artificial intelligence', 'machine learning', 'deep learning', 'large language model',
  'language model', 'multimodal', 'reasoning model', 'generative ai', 'neural network',
  'agent', 'openai', 'anthropic', 'deepmind', 'gemini', 'claude', 'deepseek', 'kimi',
  'qwen', 'llama', 'hugging face', 'transformer', 'diffusion', 'inference', 'benchmark',
  '人工智能', '机器学习', '深度学习', '大模型', '语言模型', '多模态', '推理模型',
  '生成式', '智能体', '神经网络', '模型训练', '模型推理', '开源模型', '算力', '芯片',
];

const impactTerms = [
  'release', 'launch', 'introduce', 'open source', 'research', 'benchmark', 'upgrade',
  'funding', 'acquire', 'regulation', 'policy', 'security', '突破', '发布', '上线', '开源',
  '研究', '基准', '融资', '收购', '监管', '政策', '安全', '更新',
];

function normalizedText(value: string) {
  return value.toLowerCase().replace(/https?:\/\/\S+/g, ' ').replace(/[^a-z0-9\u3400-\u9fff]+/g, ' ').trim();
}

function containsAny(value: string, terms: string[]) {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function sourceAuthority(tier: SourceTier) {
  return tier === 'official' ? 25 : tier === 'media' ? 20 : 14;
}

export function canonicalTitle(title: string) {
  return normalizedText(title)
    .replace(/\b(the|a|an|new|today|official)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function assessCandidate(candidate: NewsCandidate, now = new Date()) {
  const combined = `${candidate.title}\n${candidate.content}`.trim();
  const ageHours = Math.max(0, (now.getTime() - new Date(candidate.publishedAt).getTime()) / 36e5);
  const minimumLength = /[\u3400-\u9fff]/.test(candidate.content) ? 260 : 560;

  if (!candidate.title.trim() || !/^https?:\/\//i.test(candidate.url)) return { accepted: false, score: 0, reason: 'invalid-metadata' };
  if (junkPatterns.some((pattern) => pattern.test(combined))) return { accepted: false, score: 0, reason: 'junk-content' };
  if (candidate.content.trim().length < minimumLength) return { accepted: false, score: 0, reason: 'content-too-short' };
  if (!containsAny(combined, aiTerms)) return { accepted: false, score: 0, reason: 'not-ai-related' };
  if (!Number.isFinite(ageHours) || ageHours > 24 * 14) return { accepted: false, score: 0, reason: 'outside-time-window' };

  const authority = sourceAuthority(candidate.source.tier);
  const relevance = Math.min(20, 10 + aiTerms.filter((term) => combined.toLowerCase().includes(term)).length * 2);
  const freshness = ageHours <= 36 ? 15 : ageHours <= 96 ? 12 : ageHours <= 168 ? 9 : 6;
  const completeness = Math.min(15, 8 + Math.floor(candidate.content.length / 500));
  const impact = containsAny(combined, impactTerms) ? 15 : 8;
  const novelty = 8;
  const marketingPenalty = /limited time|buy now|register now|立即购买|限时优惠|报名参会/i.test(combined) ? 14 : 0;
  const score = Math.max(0, Math.min(100, authority + relevance + freshness + completeness + impact + novelty - marketingPenalty));

  return { accepted: score >= 65, score, reason: score >= 65 ? 'accepted' : 'low-score' };
}

export function dedupeCandidates(candidates: NewsCandidate[]) {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  return [...candidates]
    .sort((left, right) => (right.qualityScore || 0) - (left.qualityScore || 0))
    .filter((candidate) => {
      const normalizedUrl = candidate.url.replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();
      const title = canonicalTitle(candidate.title);
      if (seenUrls.has(normalizedUrl) || seenTitles.has(title)) return false;
      seenUrls.add(normalizedUrl);
      seenTitles.add(title);
      return true;
    });
}

export function selectTopCandidates(candidates: NewsCandidate[], totalLimit = 12) {
  const sourceCounts = new Map<string, number>();
  const selected: NewsCandidate[] = [];
  for (const candidate of dedupeCandidates(candidates)) {
    if (selected.length >= totalLimit) break;
    const count = sourceCounts.get(candidate.source.id) || 0;
    if (count >= candidate.source.dailyLimit) continue;
    sourceCounts.set(candidate.source.id, count + 1);
    selected.push(candidate);
  }
  return selected;
}
