import { runCollectionPipeline } from '../lib/pipeline';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const result = await runCollectionPipeline();
  const outputPath = path.join(process.cwd(), 'data', 'last-collect.json');
  await writeFile(outputPath, JSON.stringify({ collected: result.items.length, sources: result.sources.length, latest: result.items.slice(0, 10), at: new Date().toISOString() }, null, 2), 'utf8');
  console.log(JSON.stringify({ reportDate: result.report.date, items: result.report.items.length, groupedDates: Object.keys(result.grouped) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
