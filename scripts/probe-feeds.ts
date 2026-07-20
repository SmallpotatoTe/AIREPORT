import type { NewsSource } from '../types/news';
import { newsSources } from '../lib/sources';

async function probeSource(source: NewsSource) {
  try {
    const response = await fetch(source.url, { headers: { accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5' } });
    const text = await response.text();
    const looksLikeFeed = /<rss\b|<feed\b/i.test(text);
    const itemCount = (text.match(/<item[\s\S]*?<\/item>/gi) ?? text.match(/<entry[\s\S]*?<\/entry>/gi) ?? []).length;
    return { id: source.id, name: source.name, ok: response.ok && looksLikeFeed, status: response.status, itemCount, sample: text.slice(0, 120).replace(/\s+/g, ' ') };
  } catch (error) {
    return { id: source.id, name: source.name, ok: false, error: error instanceof Error ? error.message : 'unknown' };
  }
}

async function main() {
  const results = [] as Array<Awaited<ReturnType<typeof probeSource>>>;
  for (const source of newsSources.filter((s) => s.type === 'rss')) {
    results.push(await probeSource(source));
  }
  console.log(JSON.stringify(results, null, 2));
}

main();
