'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DailyReport, NewsItem, SourceCollectionStatus } from '@/types/news';

type Notice = { kind: 'success' | 'error' | 'info'; text: string } | null;
type RagState = { ragCount: number; imported?: number };
type Hit = { id: string; title: string; source: string; url: string; publishedAt: string; score: number };
type DailyResponse = { status: string; reports?: DailyReport[]; report?: DailyReport | null; message?: string };
type CollectResponse = { status: string; report?: DailyReport; sources?: SourceCollectionStatus[]; message?: string };
type RagResponse = { status: string; ragCount?: number; imported?: number; message?: string };
type ChatResponse = { status: string; answer?: string; hits?: Hit[]; provider?: string; model?: string; hasRagContext?: boolean; message?: string };

function Icon({ name }: { name: 'refresh' | 'database' | 'arrow' | 'close' | 'send' | 'external' }) {
  const paths = {
    refresh: <><path d="M20 11a8.1 8.1 0 0 0-15.5-3M4 4v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 3M20 20v-4h-4"/></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    close: <><path d="m6 6 12 12"/><path d="m18 6-12 12"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    external: <><path d="M15 3h6v6"/><path d="m10 14 11-11"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

async function readJson<T extends { status?: string; message?: string }>(response: Response): Promise<T> {
  const text = await response.text();
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? '服务返回了无法解析的数据' : `服务异常（HTTP ${response.status}），请查看启动窗口日志`);
  }
  if (!response.ok || data.status === 'error') throw new Error(data.message || `请求失败（HTTP ${response.status}）`);
  return data;
}

function formatDate(date: string) {
  const value = new Date(`${date}T00:00:00+08:00`);
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(value);
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '--:--' : new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function tierLabel(tier: NewsItem['sourceTier']) {
  return tier === 'official' ? '官方' : tier === 'media' ? '媒体' : '社区';
}

function statusLabel(status: SourceCollectionStatus['status']) {
  return status === 'success' ? '正常' : status === 'partial' ? '部分' : '失败';
}

export function HomeClient() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [language, setLanguage] = useState<'zh' | 'original'>('zh');
  const [notice, setNotice] = useState<Notice>(null);
  const [initializing, setInitializing] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rag, setRag] = useState<RagState>({ ragCount: 0 });
  const [provider, setProvider] = useState<'deepseek' | 'kimi'>('deepseek');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [asking, setAsking] = useState(false);

  const activeReport = useMemo(
    () => reports.find((report) => report.date === selectedDate) || reports[0] || null,
    [reports, selectedDate],
  );
  const sourceStatuses = activeReport?.sourceStatuses || [];
  const sourceHealth = sourceStatuses.filter((source) => source.status !== 'failed').length;

  useEffect(() => {
    void Promise.all([
      fetch('/api/daily', { cache: 'no-store' }).then((response) => readJson<DailyResponse>(response)),
      fetch('/api/rag', { cache: 'no-store' }).then((response) => readJson<RagResponse>(response)),
    ]).then(([daily, ragData]) => {
      const loaded = daily.reports || [];
      setReports(loaded);
      setSelectedDate(loaded[0]?.date || '');
      setRag({ ragCount: ragData.ragCount || 0 });
    }).catch((error) => {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : '初始化失败' });
    }).finally(() => setInitializing(false));
  }, []);

  useEffect(() => {
    if (!selectedItem) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setSelectedItem(null);
    document.body.classList.add('modal-open');
    window.addEventListener('keydown', close);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', close);
    };
  }, [selectedItem]);

  async function collectDaily() {
    setCollecting(true);
    setNotice({ kind: 'info', text: '正在抓取并筛选高质量新闻，整理过程可能需要几分钟…' });
    try {
      const data = await fetch('/api/collect', { method: 'POST' }).then((response) => readJson<CollectResponse>(response));
      if (!data.report) throw new Error(data.message || '本次没有生成日报');
      setReports((current) => [data.report!, ...current.filter((report) => report.date !== data.report!.date)]);
      setSelectedDate(data.report.date);
      setNotice({ kind: 'success', text: `${data.report.date} 已收录 ${data.report.items.length} 条高质量新闻` });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : '抓取失败' });
    } finally {
      setCollecting(false);
    }
  }

  async function importReport() {
    if (!activeReport) return setNotice({ kind: 'error', text: '当前没有可入库的日报' });
    setImporting(true);
    try {
      const data = await fetch('/api/rag', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date: activeReport.date }),
      }).then((response) => readJson<RagResponse>(response));
      setRag({ ragCount: data.ragCount || 0, imported: data.imported || 0 });
      setNotice({ kind: 'success', text: `${activeReport.date} 已加入知识库，共 ${data.ragCount || 0} 条文档` });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : '入库失败' });
    } finally {
      setImporting(false);
    }
  }

  async function ask() {
    if (!question.trim()) return setNotice({ kind: 'error', text: '请先输入问题' });
    setAsking(true);
    setAnswer('');
    setHits([]);
    try {
      const data = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, provider }),
      }).then((response) => readJson<ChatResponse>(response));
      setAnswer(data.answer || '模型未返回内容');
      setHits(data.hits || []);
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : '问答失败' });
    } finally {
      setAsking(false);
    }
  }

  function openItem(item: NewsItem) {
    setLanguage('zh');
    setSelectedItem(item);
  }

  return (
    <div className="app-shell" id="workspace">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark">S/</span>
          <div><strong>SIGNAL</strong><span>AI DAILY</span></div>
        </div>
        <div className="topbar-state">
          <span className={`pulse ${collecting ? 'is-working' : ''}`} />
          <span>{collecting ? '采集中' : activeReport ? `${activeReport.items.length} 条情报` : '等待采集'}</span>
          <i />
          <span>知识库 {rag.ragCount}</span>
        </div>
        <div className="topbar-actions">
          <button className="button button-ghost" onClick={() => void importReport()} disabled={importing || !activeReport}>
            <Icon name="database" />{importing ? '入库中' : '加入知识库'}
          </button>
          <button className="button button-signal" onClick={() => void collectDaily()} disabled={collecting}>
            <Icon name="refresh" />{collecting ? '正在采集' : '抓取今日新闻'}
          </button>
        </div>
      </header>

      {notice && (
        <div className={`notice notice-${notice.kind}`} role="status">
          <span>{notice.text}</span><button onClick={() => setNotice(null)} aria-label="关闭提示"><Icon name="close" /></button>
        </div>
      )}

      <nav className="date-rail" aria-label="日报日期">
        <span className="rail-label">ARCHIVE</span>
        <div className="date-list">
          {reports.map((report) => (
            <button key={report.date} className={report.date === activeReport?.date ? 'active' : ''} onClick={() => setSelectedDate(report.date)}>
              <span>{formatDate(report.date)}</span><small>{report.items.length.toString().padStart(2, '0')}</small>
            </button>
          ))}
          {!initializing && reports.length === 0 && <span className="empty-date">暂无归档</span>}
        </div>
      </nav>

      <div className="workspace-grid">
        <section className="newsroom">
          <div className="section-heading">
            <div>
              <span className="eyebrow">DAILY BRIEF · {activeReport?.date || 'NO DATA'}</span>
              <h1>{activeReport ? formatDate(activeReport.date) : '今日 AI 情报'}</h1>
            </div>
            {activeReport && (
              <div className="source-health" title={sourceStatuses.map((source) => `${source.sourceName}：${statusLabel(source.status)}`).join('\n')}>
                <span>{sourceStatuses.length ? `${sourceHealth}/${sourceStatuses.length}` : '--'}</span>
                <small>信源在线</small>
              </div>
            )}
          </div>

          {initializing ? (
            <div className="loading-stack" aria-label="正在加载日报"><i /><i /><i /></div>
          ) : activeReport?.items.length ? (
            <div className="news-feed">
              {activeReport.items.map((item, index) => (
                <article className="news-card" key={item.id} onClick={() => openItem(item)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && openItem(item)}>
                  <div className="card-index">{String(index + 1).padStart(2, '0')}</div>
                  <div className="card-content">
                    <div className="card-meta">
                      <span className={`tier tier-${item.sourceTier}`}>{tierLabel(item.sourceTier)}</span>
                      <span>{item.source}</span><i /><span>{item.category}</span><i /><time>{formatTime(item.publishedAt)}</time>
                    </div>
                    <h2>{item.translatedTitle || item.title}</h2>
                    <p>{item.translatedSummary || item.summary}</p>
                    <div className="card-footer">
                      <div className="keyword-list">{item.keywords.slice(0, 4).map((keyword) => <span key={keyword}>#{keyword}</span>)}</div>
                      <div className="quality"><span style={{ width: `${Math.max(0, Math.min(100, item.qualityScore))}%` }} /><b>{item.qualityScore}</b></div>
                    </div>
                  </div>
                  <div className="card-arrow"><Icon name="arrow" /></div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span>00</span><h2>尚无日报</h2><button className="button button-signal" onClick={() => void collectDaily()}><Icon name="refresh" />开始采集</button>
            </div>
          )}

          {!!sourceStatuses.length && (
            <details className="source-report">
              <summary>本次信源状态 <span>{sourceHealth}/{sourceStatuses.length}</span></summary>
              <div>{sourceStatuses.map((source) => (
                <article key={source.sourceId}><i className={`status-dot status-${source.status}`} /><strong>{source.sourceName}</strong><span>{source.accepted} 条入选</span><small>{source.error || statusLabel(source.status)}</small></article>
              ))}</div>
            </details>
          )}
        </section>

        <aside className="assistant-panel">
          <div className="assistant-head">
            <div><span className="eyebrow">RAG DESK</span><h2>研究助手</h2></div>
            <select value={provider} onChange={(event) => setProvider(event.target.value as 'deepseek' | 'kimi')} aria-label="选择模型">
              <option value="deepseek">DeepSeek</option><option value="kimi">Kimi</option>
            </select>
          </div>
          <div className="knowledge-state"><Icon name="database" /><div><strong>{rag.ragCount}</strong><span>已入库文档</span></div>{rag.imported !== undefined && <em>+{rag.imported}</em>}</div>
          <div className="question-box">
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="询问今天的模型发布、智能体、开源项目…" rows={5} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void ask(); }} />
            <button onClick={() => void ask()} disabled={asking} aria-label="发送问题"><Icon name="send" /></button>
            <span>Ctrl + Enter</span>
          </div>
          <div className={`answer-area ${answer ? 'has-answer' : ''}`}>
            {asking ? <div className="thinking"><i /><i /><i /><span>检索知识库并生成回答</span></div> : answer ? <p>{answer}</p> : <div className="answer-empty"><span>ASK</span><p>回答将显示在这里</p></div>}
          </div>
          {hits.length > 0 && (
            <div className="citation-list"><span>引用来源 · {hits.length}</span>{hits.map((hit, index) => (
              <a href={hit.url} target="_blank" rel="noreferrer" key={hit.id}><b>{index + 1}</b><div><strong>{hit.title}</strong><small>{hit.source} · {hit.publishedAt.slice(0, 10)}</small></div><Icon name="external" /></a>
            ))}</div>
          )}
        </aside>
      </div>

      {selectedItem && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedItem(null)}>
          <section className="news-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <header>
              <div className="modal-meta"><span className={`tier tier-${selectedItem.sourceTier}`}>{tierLabel(selectedItem.sourceTier)}</span><span>{selectedItem.source}</span><i /><span>{selectedItem.category}</span><i /><time>{formatTime(selectedItem.publishedAt)}</time></div>
              <button onClick={() => setSelectedItem(null)} aria-label="关闭详情"><Icon name="close" /></button>
            </header>
            <div className="language-tabs"><button className={language === 'zh' ? 'active' : ''} onClick={() => setLanguage('zh')}>中文</button><button className={language === 'original' ? 'active' : ''} onClick={() => setLanguage('original')}>原文</button></div>
            <div className="modal-body">
              <span className="modal-number">{selectedItem.qualityScore}</span>
              <h2 id="modal-title">{language === 'zh' ? selectedItem.translatedTitle : selectedItem.originalTitle}</h2>
              <p className="modal-summary">{language === 'zh' ? selectedItem.translatedSummary : selectedItem.originalSummary}</p>
              {selectedItem.whyItMatters && <div className="why-block"><span>WHY IT MATTERS</span><p>{selectedItem.whyItMatters}</p></div>}
              <div className="modal-keywords">{selectedItem.keywords.map((keyword) => <span key={keyword}>#{keyword}</span>)}</div>
            </div>
            <footer><div><span>发布日期</span><strong>{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(selectedItem.publishedAt))}</strong></div><a href={selectedItem.url} target="_blank" rel="noreferrer">查看原始报道 <Icon name="external" /></a></footer>
          </section>
        </div>
      )}
    </div>
  );
}
