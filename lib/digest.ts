import { getDashboardState, listReports } from './store';
import type { DailyReport } from '@/types/news';

function buildModeDigest(mode: 'brief' | 'detailed' | 'interview', reportCount: number) {
  const base = {
    brief: { headline: 'AI 新闻日报：三条关键热点', overview: '今天的 AI 重点围绕 Agent 安全、工具调用和长上下文能力。' },
    detailed: { headline: 'AI 新闻日报：安全、工具调用与长上下文成为焦点', overview: '今天的 AI 关注点集中在 Agent 安全、工具调用范式、长上下文能力和企业日报自动化。' },
    interview: { headline: 'AI 日报面试版：一眼看到信息流、判断、生成与追问', overview: '这个版本强调采集、聚合、摘要、问答和扩展能力，适合面试演示。' },
  } as const;
  return { ...base[mode], overview: `${base[mode].overview} 当前已保存 ${reportCount} 份日报。` };
}

export async function generateDailyDigest(mode: 'brief' | 'detailed' | 'interview' = 'detailed') {
  const reports = (await listReports()) as DailyReport[];
  const latestReport = reports[0] || { date: new Date().toISOString().slice(0, 10), items: [] };
  const topNews = latestReport.items.slice(0, mode === 'brief' ? 3 : 5);
  const sources = Array.from(new Set(topNews.map((item) => item.source)));
  const base = buildModeDigest(mode, reports.length);
  return {
    date: latestReport.date,
    headline: base.headline,
    overview: base.overview,
    topNews,
    trends: [
      'Agent 的工具调用从“能用”转向“可审计、可控、可评估”。',
      '长上下文和知识问答开始在企业场景形成更稳定的产品价值。',
      '日报和周报自动化成为 AI 办公类产品的高频入口。',
    ],
    risks: [
      '模型输出的可靠性仍需要人工复核和引用来源。',
      '自动抓取新闻时要注意来源可信度和重复信息。',
      'Agent 工具权限过大可能带来安全与合规风险。',
    ],
    sources,
    mode,
  };
}

export async function getDigestSummary() {
  const digest = await generateDailyDigest('detailed');
  return [digest.headline, digest.overview, ...digest.trends].join(' ');
}

export async function getDashboardSnapshot() {
  return getDashboardState();
}
