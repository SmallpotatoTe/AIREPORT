import { NextResponse } from 'next/server';
import { listReports } from '@/lib/store';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const itemId = url.searchParams.get('id');
    if (!date) return NextResponse.json({ status: 'bad_request', message: '缺少日期' }, { status: 400 });
    const reports = await listReports();
    const report = reports.find((entry) => entry.date === date);
    if (!report) return NextResponse.json({ status: 'not_found', message: '日报不存在' }, { status: 404 });
    const item = itemId ? report.items.find((entry) => entry.id === itemId) : null;
    if (itemId && !item) return NextResponse.json({ status: 'not_found', message: '新闻不存在' }, { status: 404 });
    return NextResponse.json({ status: 'ok', report, item });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error instanceof Error ? error.message : '读取详情失败' }, { status: 500 });
  }
}
