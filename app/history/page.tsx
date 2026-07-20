import { listReports } from '@/lib/store';

export default async function HistoryPage() {
  const reports = await listReports();

  return (
    <main className="page-shell">
      <section className="workspace-block">
        <p className="section-kicker">历史日报</p>
        <h1>日报回看</h1>
        <div className="knowledge-grid">
          {reports.length === 0 ? <p>还没有日报。</p> : reports.map((report) => (
            <article key={report.date} className="knowledge-card">
              <p className="feed-label">{report.date}</p>
              <h3>{report.items.length} 条新闻</h3>
              <p>{report.items.slice(0, 3).map((item) => item.title).join('；')}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
