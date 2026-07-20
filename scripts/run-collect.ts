import { loadEnvConfig } from '@next/env';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

loadEnvConfig(process.cwd());

async function main() {
  const [{ runCollectionPipeline }, { sendDailyReportEmail }] = await Promise.all([
    import('../lib/pipeline'),
    import('../lib/email-report'),
  ]);
  const collection = await runCollectionPipeline();
  const email = await sendDailyReportEmail(collection.report);
  const output = {
    collected: collection.items.length,
    sources: collection.sources.length,
    latest: collection.items.slice(0, 10),
    reportDate: collection.report.date,
    email,
    at: new Date().toISOString(),
  };
  const outputPath = path.join(process.cwd(), 'data', 'last-collect.json');
  await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
