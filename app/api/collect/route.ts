import { NextResponse } from 'next/server';
import { runCollectionPipeline } from '@/lib/pipeline';

async function collect() {
  try {
    const result = await runCollectionPipeline();
    return NextResponse.json({
      status: 'ok',
      report: result.report,
      items: result.items,
      sources: result.statuses,
      message: result.items.length > 0 ? '今日新闻采集完成' : '本次没有符合质量门槛的新闻',
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : '采集失败',
    }, { status: 500 });
  }
}

export const GET = collect;
export const POST = collect;
