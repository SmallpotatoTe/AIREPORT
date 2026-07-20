import { buildDailyReport, collectSourceCandidates, finalizeCandidates } from './collector';
import { structureNewsCandidates } from './news-structurer';
import { newsSources } from './sources';
import { appendLog, appendReport } from './store';

export async function runCollectionPipeline() {
  const batches = await Promise.all(newsSources.filter((source) => source.enabled).map((source) => collectSourceCandidates(source)));
  const candidates = batches.flatMap((batch) => batch.candidates);
  const items = await finalizeCandidates(candidates, structureNewsCandidates);
  const statuses = batches.map((batch) => batch.status);
  const report = buildDailyReport(items, statuses);

  await appendReport(report);
  await appendLog({
    type: 'collect_run',
    date: report.date,
    items: report.items.length,
    candidates: candidates.length,
    sources: statuses,
  });

  return {
    sources: newsSources,
    statuses,
    items: report.items,
    report,
    grouped: { [report.date]: report.items },
    reports: [report],
  };
}
