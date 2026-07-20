'use client';

import { useState } from 'react';

export function QaPanel() {
  const [question, setQuestion] = useState('今天 AI 新闻里有哪些值得关注的 Agent 安全或工具调用更新？');
  const [answer, setAnswer] = useState('点击生成后会基于日报库回答。');
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setAnswer('生成中...');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: 'deepseek', question }),
      });
      const data = await response.json();
      setAnswer(data.answer || data.error || '未获取到回答');
    } catch {
      setAnswer('请求失败，请检查后端或环境变量配置。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="qa">
      <div>
        <span className="badge">大模型问答</span>
        <h2>问答工作台</h2>
        <p>支持基于已入库日报的检索增强问答。</p>
        <textarea rows={8} value={question} onChange={(e) => setQuestion(e.target.value)} />
        <button type="button" onClick={handleGenerate} disabled={loading}>{loading ? '生成中...' : '基于 RAG 回答'}</button>
      </div>
      <div className="answer-card">
        <h3>回答结果</h3>
        <p>{answer}</p>
      </div>
    </section>
  );
}
