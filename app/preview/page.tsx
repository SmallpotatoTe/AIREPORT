import { listReports } from '@/lib/store';

export default async function PreviewPage() {
  const reports = await listReports();
  const latest = reports[0];

  return (
    <main className="page-shell">
      <section className="workspace-block">
        <p className="section-kicker">抓取预览</p>
        <h1>RSS / Web 采集结果</h1>
        {latest ? (
          <div className="knowledge-grid">
            {latest.items.map((item) => (
              <article key={item.id} className="knowledge-card">
                <p className="feed-label">{item.source}</p>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="news-meta"><span>{new Date(item.publishedAt).toLocaleString('zh-CN')}</span><a href={item.url} target="_blank" rel="noreferrer">原文</a></div>
                <div className="news-meta"><span>{item.keywords.join(' / ')}</span></div>
              </article>
            ))}
          </div>
        ) : (
          <p>还没有日报，先去首页抓取。</p>
        )}
      </section>
    </main>
  );
}
