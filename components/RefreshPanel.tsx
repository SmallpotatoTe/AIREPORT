'use client';

import { useState } from 'react';

export function RefreshPanel({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      await onRefresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="refresh-panel">
      <div>
        <p className="section-kicker">采集控制</p>
        <h3>手动刷新日报</h3>
        <p>触发采集器重新抓取新闻并生成按日期归档的日报。</p>
      </div>
      <button type="button" onClick={handleRefresh} disabled={loading}>{loading ? '刷新中...' : '刷新日报'}</button>
    </div>
  );
}
