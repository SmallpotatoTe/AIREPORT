import type { NewsItem, NewsSource } from '@/types/news';

export type CollectorResult = {
  source: NewsSource;
  items: NewsItem[];
};
