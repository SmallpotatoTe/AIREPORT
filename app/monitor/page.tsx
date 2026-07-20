import { listReports, listRagDocuments } from '@/lib/store';
import { scheduleHint, newsSources } from '@/lib/sources';

export default async function MonitorPage() {
  const reports = await listReports();
  const ragDocuments = await listRagDocuments();

  return (
    <main className="page-shell">
      <section className="workspace-block">
        <p className="section-kicker">监控</p>
        <h1>任务日志与抓取状态</h1>
        <div className="metric-row">
          <article className="metric-card"><span>抓取源</span><strong>{newsSources.length}</strong></article>
          <article className="metric-card"><span>日报日期</span><strong>{reports.length}</strong></article>
          <article className="metric-card"><span>RAG 文档</span><strong>{ragDocuments.length}</strong></article>
          <article className="metric-card"><span>调度</span><strong>{scheduleHint}</strong></article>
        </div>
        <div className="knowledge-grid">
          {newsSources.map((source) => (
            <article key={source.id} className="knowledge-card">
              <p className="feed-label">{source.type}</p>
              <h3>{source.name}</h3>
              <p>{source.url}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
