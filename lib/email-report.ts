import nodemailer from 'nodemailer';
import type { DailyReport } from '@/types/news';
import { appendLog, wasDailyEmailDelivered } from './store';

export type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
};

export type EmailDeliveryRecord = {
  type: 'daily_email';
  status: 'sent' | 'failed';
  reportDate: string;
  to: string;
  subject: string;
  itemCount: number;
  messageId?: string;
  error?: string;
};

export type EmailDeliveryResult = {
  status: 'sent' | 'skipped' | 'failed';
  reason?: 'not_configured' | 'empty_report' | 'already_sent' | string;
  messageId?: string;
  to?: string;
};

export type EmailDeliveryDependencies = {
  wasDelivered: (date: string, to: string) => Promise<boolean>;
  recordDelivery: (record: EmailDeliveryRecord) => Promise<unknown>;
  send: (config: EmailConfig, message: { from: string; to: string; subject: string; html: string; text: string }) => Promise<{ messageId?: string }>;
};

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value == null || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatPublishedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function resolveEmailConfig(env: Record<string, string | undefined> = process.env) {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS?.trim();
  const to = env.DAILY_EMAIL_TO?.trim();
  if (!host || !user || !pass || !to) return null;

  const port = Number(env.SMTP_PORT || 465);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;

  return {
    host,
    port,
    secure: parseBoolean(env.SMTP_SECURE, port === 465),
    user,
    pass,
    from: env.DAILY_EMAIL_FROM?.trim() || `AI 日报 <${user}>`,
    to,
  } satisfies EmailConfig;
}

function buildReportOverview(report: DailyReport) {
  const sources = new Set(report.items.map((item) => item.source));
  const categories = [...new Set(report.items.map((item) => item.category))].slice(0, 4);
  const categoryText = categories.length ? `，重点覆盖${categories.join('、')}` : '';
  return `本期收录 ${report.items.length} 条高质量 AI 动态，来自 ${sources.size} 个信源${categoryText}。`;
}

export function buildDailyEmailHtml(report: DailyReport) {
  const cards = report.items.map((item, index) => {
    const title = item.translatedTitle || item.title;
    const summary = item.translatedSummary || item.summary;
    const keywords = item.keywords.join(' · ');
    return `
      <article style="margin:0 0 18px;padding:22px;border:1px solid #dbe4f0;border-radius:16px;background:#ffffff;box-shadow:0 8px 24px rgba(15,23,42,.05)">
        <div style="margin-bottom:10px;color:#64748b;font-size:13px">${index + 1}. ${escapeHtml(item.source)} · ${escapeHtml(formatPublishedAt(item.publishedAt))} · ${escapeHtml(item.category)}</div>
        <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;line-height:1.45">${escapeHtml(title)}</h2>
        <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.8">${escapeHtml(summary)}</p>
        ${item.whyItMatters ? `<p style="margin:0 0 12px;color:#475569;font-size:14px;line-height:1.7"><strong>为什么重要：</strong>${escapeHtml(item.whyItMatters)}</p>` : ''}
        <p style="margin:0 0 14px;color:#2563eb;font-size:13px">${escapeHtml(keywords)}</p>
        <a href="${escapeHtml(item.url)}" style="color:#ffffff;background:#2563eb;padding:9px 14px;border-radius:9px;text-decoration:none;font-size:14px">查看原文</a>
      </article>`;
  }).join('');

  return `<!doctype html>
<html lang="zh-CN">
  <body style="margin:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif">
    <main style="max-width:760px;margin:0 auto;padding:32px 18px">
      <header style="margin-bottom:24px;padding:28px;border-radius:20px;background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#ffffff">
        <div style="font-size:13px;letter-spacing:.12em;opacity:.78">AI DAILY REPORT</div>
        <h1 style="margin:8px 0 10px;font-size:30px">AI 日报 · ${escapeHtml(report.date)}</h1>
        <p style="margin:0;line-height:1.7;opacity:.9">${escapeHtml(buildReportOverview(report))}</p>
      </header>
      ${cards || '<p style="padding:24px;background:#ffffff;border-radius:16px;color:#64748b">本期没有通过质量筛选的新闻。</p>'}
      <footer style="padding:12px;color:#94a3b8;text-align:center;font-size:12px">由本地 AI Agent Daily 自动采集、筛选和整理</footer>
    </main>
  </body>
</html>`;
}

export function buildDailyEmailText(report: DailyReport) {
  const lines = [`AI 日报 · ${report.date}`, buildReportOverview(report), ''];
  report.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.translatedTitle || item.title}`,
      `${item.source} · ${formatPublishedAt(item.publishedAt)} · ${item.category}`,
      item.translatedSummary || item.summary,
      `关键词：${item.keywords.join('、')}`,
      `原文：${item.url}`,
      '',
    );
  });
  return lines.join('\n');
}

const defaultDependencies: EmailDeliveryDependencies = {
  wasDelivered: wasDailyEmailDelivered,
  recordDelivery: appendLog,
  async send(config, message) {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
    return transporter.sendMail(message);
  },
};

export async function sendDailyReportEmail(
  report: DailyReport,
  options: { config?: EmailConfig | null; dependencies?: EmailDeliveryDependencies } = {},
): Promise<EmailDeliveryResult> {
  const config = options.config === undefined ? resolveEmailConfig() : options.config;
  if (!config) return { status: 'skipped', reason: 'not_configured' };
  if (report.items.length === 0) return { status: 'skipped', reason: 'empty_report', to: config.to };

  const dependencies = options.dependencies || defaultDependencies;
  if (await dependencies.wasDelivered(report.date, config.to)) {
    return { status: 'skipped', reason: 'already_sent', to: config.to };
  }

  const subject = `AI 日报｜${report.date}｜${report.items.length} 条精选动态`;
  try {
    const response = await dependencies.send(config, {
      from: config.from,
      to: config.to,
      subject,
      html: buildDailyEmailHtml(report),
      text: buildDailyEmailText(report),
    });
    const record: EmailDeliveryRecord = {
      type: 'daily_email',
      status: 'sent',
      reportDate: report.date,
      to: config.to,
      subject,
      itemCount: report.items.length,
      messageId: response.messageId,
    };
    await dependencies.recordDelivery(record);
    return { status: 'sent', messageId: response.messageId, to: config.to };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const record: EmailDeliveryRecord = {
      type: 'daily_email',
      status: 'failed',
      reportDate: report.date,
      to: config.to,
      subject,
      itemCount: report.items.length,
      error: reason,
    };
    await dependencies.recordDelivery(record);
    return { status: 'failed', reason, to: config.to };
  }
}
