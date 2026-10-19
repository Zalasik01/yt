import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextFreeSlot, zonedToUtc } from './schedule.js';

test('zonedToUtc converte horário de São Paulo (UTC-3)', () => {
  assert.equal(zonedToUtc(2026, 10, 20, 18, 0, 'America/Sao_Paulo').toISOString(), '2026-10-20T21:00:00.000Z');
});

test('zonedToUtc respeita horário de verão em Nova York', () => {
  assert.equal(zonedToUtc(2026, 7, 1, 9, 0, 'America/New_York').toISOString(), '2026-07-01T13:00:00.000Z');
  assert.equal(zonedToUtc(2026, 12, 1, 9, 0, 'America/New_York').toISOString(), '2026-12-01T14:00:00.000Z');
});

test('nextFreeSlot pula horários ocupados e dias fora da janela', () => {
  const window = { time_zone: 'America/Sao_Paulo', days: [1, 3, 5], times: ['18:00'] }; // seg, qua, sex
  const from = new Date('2026-10-19T12:00:00Z'); // segunda 09:00 em SP
  const first = nextFreeSlot(window, [], { from });
  assert.equal(first.toISOString(), '2026-10-19T21:00:00.000Z');
  const second = nextFreeSlot(window, [first], { from });
  assert.equal(second.toISOString(), '2026-10-21T21:00:00.000Z');
});

test('nextFreeSlot respeita a antecedência mínima', () => {
  const window = { time_zone: 'America/Sao_Paulo', days: [0, 1, 2, 3, 4, 5, 6], times: ['18:00', '09:00'] };
  const from = new Date('2026-10-19T20:30:00Z'); // 17:30 em SP
  assert.equal(nextFreeSlot(window, [], { from }).toISOString(), '2026-10-20T12:00:00.000Z');
});
