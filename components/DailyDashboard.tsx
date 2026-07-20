import type { DailyReport } from '@/types/news';

export function DailyDashboard({ report }: { report: DailyReport | null }) {
  return (
    <section className="daily-dashboard">
      <div className="daily-summary">
        <span className="section-kicker">AI 日报</span>
        <h3>{report ? `${report.date} · ${report.items.length} 条` : '还没有日报'}</h3>
        <p>以日报为单位管理 AI 新闻，再按日期入库到 RAG。</p>
      </div>
      <div className="daily-columns">
        <div>
          <h4>最新日报</h4>
          <ul>
            {(report?.items || []).slice(0, 5).map((item) => (
              <li key={item.id}><strong>{item.title}</strong><span>{item.source}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
