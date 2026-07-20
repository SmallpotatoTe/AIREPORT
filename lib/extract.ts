import type { NewsCandidate, NewsSource } from '@/types/news';

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    const key = entity.toLowerCase();
    if (entities[key]) return entities[key];
    if (key.startsWith('#x')) return String.fromCodePoint(Number.parseInt(key.slice(2), 16));
    if (key.startsWith('#')) return String.fromCodePoint(Number.parseInt(key.slice(1), 10));
    return ' ';
  });
}

function clean(value: string) {
  return decode(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchFirst(value: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }
  return '';
}

function isoDate(value?: string) {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function optionalIsoDate(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function fullUrl(value: string, baseUrl: string) {
  try {
    const url = new URL(decode(value.trim()), baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return null;
  }
}

function jsonLdArticle(html: string) {
  for (const block of html.matchAll(/<script[^>]+type\s*=\s*(?:["']application\/ld\+json["']|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(block[1].trim());
      const nodes = Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed];
      for (const node of nodes) {
        const type = Array.isArray(node?.['@type']) ? node['@type'].join(' ') : String(node?.['@type'] || '');
        if (!/Article|NewsArticle|BlogPosting|ScholarlyArticle/i.test(type) && !node?.articleBody) continue;
        const content = clean(String(node.articleBody || node.text || node.description || ''));
        if (content) return { title: clean(String(node.headline || node.name || '')), content, publishedAt: optionalIsoDate(node.datePublished || node.dateCreated) };
      }
    } catch {
      continue;
    }
  }
  return null;
}

function paragraphs(fragment: string) {
  return [...fragment.matchAll(/<(?:p|li)[^>]*>([\s\S]*?)<\/(?:p|li)>/gi)]
    .map((match) => clean(match[1]))
    .filter((text) => text.length >= 55)
    .filter((text) => !/^(sign in|subscribe|share|read more|cookie|privacy|登录|订阅|分享)/i.test(text))
    .join('\n\n')
    .trim();
}

export function extractArticle(html: string, url: string, source: NewsSource): NewsCandidate {
  const structured = jsonLdArticle(html);
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || '';
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '';
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;
  const title = structured?.title || matchFirst(html, [/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i, /<title\b[^>]*>([\s\S]*?)<\/title>/i]);
  const dateText = matchFirst(html, [/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)/i, /<time[^>]+datetime=["']([^"']+)/i]);
  return { source, title, url, publishedAt: structured?.publishedAt || optionalIsoDate(dateText), content: structured?.content || paragraphs(article || main || body) };
}

export function discoverFeedEntries(xml: string, source: NewsSource) {
  return [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].flatMap(([, , block]) => {
    const title = matchFirst(block, [/<title\b[^>]*>([\s\S]*?)<\/title>/i]);
    const atomLink = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
    const rssLink = matchFirst(block, [/<link\b[^>]*>([\s\S]*?)<\/link>/i, /<guid\b[^>]*>([\s\S]*?)<\/guid>/i]);
    const url = fullUrl(atomLink || rssLink, source.homepage || source.url);
    if (!title || !url) return [];
    const publishedAt = isoDate(matchFirst(block, [/<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i, /<published\b[^>]*>([\s\S]*?)<\/published>/i, /<updated\b[^>]*>([\s\S]*?)<\/updated>/i, /<dc:date\b[^>]*>([\s\S]*?)<\/dc:date>/i]));
    const contentCandidates = [
      matchFirst(block, [/<content:encoded\b[^>]*>([\s\S]*?)<\/content:encoded>/i]),
      matchFirst(block, [/<content\b[^>]*>([\s\S]*?)<\/content>/i]),
      matchFirst(block, [/<description\b[^>]*>([\s\S]*?)<\/description>/i]),
      matchFirst(block, [/<summary\b[^>]*>([\s\S]*?)<\/summary>/i]),
    ];
    const excerpt = contentCandidates.sort((left, right) => right.length - left.length)[0] || '';
    return [{ source, title, url, publishedAt, content: excerpt, excerpt }];
  });
}

export function discoverWebEntries(html: string, source: NewsSource, baseUrl = source.url) {
  const entries: NewsCandidate[] = [];
  for (const match of html.matchAll(/<a\b([^>]*href\s*=\s*(?:["']([^"']+)["']|([^\s>]+))[^>]*)>([\s\S]*?)<\/a>/gi)) {
    const url = fullUrl(match[2] || match[3], baseUrl);
    const text = clean(match[4]);
    if (!url || text.length < 24 || text.length > 240) continue;
    if (/^(home|sign in|subscribe|read more|view all|登录|订阅|更多)$/i.test(text)) continue;
    const origin = new URL(baseUrl).origin;
    if (new URL(url).origin !== origin && source.parser !== 'aggregator') continue;
    entries.push({ source, title: text, url, publishedAt: new Date().toISOString(), content: '' });
  }
  const seen = new Set<string>();
  return entries.filter((entry) => !seen.has(entry.url) && seen.add(entry.url)).slice(0, 10);
}
