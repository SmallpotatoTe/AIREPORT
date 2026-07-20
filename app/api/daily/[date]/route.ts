import { NextResponse } from 'next/server';
import { listReports } from '@/lib/store';

export async function GET(request: Request) {
  try {
    const match = request.url.match(/\/api\/daily\/([^/?#]+)/);
    const date = match?.[1];
    if (!date) return NextResponse.json({ status: 'bad_request', message: '缺少日报日期' }, { status: 400 });
    const reports = await listReports();
    const report = reports.find((entry) => entry.date === decodeURIComponent(date));
    if (!report) return NextResponse.json({ status: 'not_found', message: '未找到该日期日报' }, { status: 404 });
    return NextResponse.json({ status: 'ok', report });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error instanceof Error ? error.message : '读取日报失败' }, { status: 500 });
  }
}
