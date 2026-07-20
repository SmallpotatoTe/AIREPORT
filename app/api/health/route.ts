import { NextResponse } from 'next/server';
import { listReports, listRagDocuments } from '@/lib/store';

export async function GET() {
  const reports = await listReports();
  const ragDocuments = await listRagDocuments();
  return NextResponse.json({
    status: 'ok',
    app: 'ai-agent-daily',
    reports: reports.length,
    ragDocuments: ragDocuments.length,
  });
}
