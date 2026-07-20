import { NextResponse } from 'next/server';
import { listReports } from '@/lib/store';

export async function GET() {
  try {
    const reports = await listReports();
    return NextResponse.json({ status: 'ok', reports, report: reports[0] || null });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error instanceof Error ? error.message : '读取日报失败' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ status: 'method_not_allowed', message: '请使用 /api/collect 触发采集' }, { status: 405 });
}
