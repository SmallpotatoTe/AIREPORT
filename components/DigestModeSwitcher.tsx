'use client';

import { useState } from 'react';

export function DigestModeSwitcher() {
  const [mode, setMode] = useState('detailed');

  return (
    <div className="mode-switcher">
      <div>
        <p className="section-kicker">日报模式</p>
        <h3>抓取 / 入库 / 问答</h3>
        <p>当前项目已经切换为日报库闭环，不再强调聊天式摘要。</p>
      </div>
      <div className="mode-buttons">
        <button type="button" disabled={mode === 'collect'} onClick={() => setMode('collect')}>采集视图</button>
        <button type="button" disabled={mode === 'rag'} onClick={() => setMode('rag')}>RAG 视图</button>
      </div>
    </div>
  );
}
