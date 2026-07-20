import assert from 'node:assert/strict';
import test from 'node:test';
import { shanghaiDate, shanghaiTimestampAtHour } from '../lib/date.ts';

test('formats the calendar date in Asia/Shanghai', () => {
  assert.equal(shanghaiDate(new Date('2026-07-18T16:30:00.000Z')), '2026-07-19');
});

test('creates a Shanghai-local timestamp without shifting the report date', () => {
  assert.equal(shanghaiTimestampAtHour(8, new Date('2026-07-18T16:30:00.000Z')), '2026-07-19T00:00:00.000Z');
});
