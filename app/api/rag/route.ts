import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listReports, listRagDocuments, addRagDocuments } from '@/lib/store';
import { toRagDocuments } from '@/lib/collector';

const requestSchema = z.object({
  date: z.string().optional(),
});

export async function GET() {
  try {
    const ragDocuments = await listRagDocuments();
    return NextResponse.json({ status: 'ok', ragCount: ragDocuments.length });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error instanceof Error ? error.message : '读取知识库失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json().catch(() => ({})));
    const reports = await listReports();
    const selected = body.date ? reports.filter((report) => report.date === body.date) : reports.slice(0, 1);
    if (selected.length === 0) return NextResponse.json({ status: 'not_found', message: '没有可入库的日报' }, { status: 404 });
    const documents = toRagDocuments(selected.flatMap((report) => report.items));
    const ragDocuments = await addRagDocuments(documents);
    return NextResponse.json({ status: 'ok', imported: documents.length, ragCount: ragDocuments.length, selectedDates: selected.map((report) => report.date) });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error instanceof Error ? error.message : '入库失败' }, { status: 400 });
  }
}
