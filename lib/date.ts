const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';

function shanghaiParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return { year: value('year'), month: value('month'), day: value('day') };
}

export function shanghaiDate(date = new Date()) {
  const { year, month, day } = shanghaiParts(date);
  return `${year}-${month}-${day}`;
}

export function shanghaiTimestampAtHour(hour: number, date = new Date()) {
  const { year, month, day } = shanghaiParts(date);
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), hour - 8)).toISOString();
}