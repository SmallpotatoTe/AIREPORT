export function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function hashKey(value: string) {
  return normalizeText(value).replace(/[^a-z0-9\u4e00-\u9fa5]/g, '').slice(0, 64);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
