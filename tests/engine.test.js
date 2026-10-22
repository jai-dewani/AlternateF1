// tests/engine.test.js
import { describe, it, expect } from 'vitest';
import {
  scoreClassification,
  computeWhatIf,
  accumulatePoints,
  assignPositions,
  DEFAULT_SCALES,
} from '../src/lib/engine.js';

const RACE = DEFAULT_SCALES.race;
const SPRINT = DEFAULT_SCALES.sprint;

describe('scoreClassification', () => {
  it('awards points by position', () => {
    const drivers = ['HAM', 'VER', 'LEC'];
    const result = scoreClassification(drivers, RACE);
    expect(result[0]).toEqual({ driverId: 'HAM', position: 1, points: 25 });
    expect(result[1]).toEqual({ driverId: 'VER', position: 2, points: 18 });
    expect(result[2]).toEqual({ driverId: 'LEC', position: 3, points: 15 });
  });

  it('awards 0 points outside top 10', () => {
    const drivers = Array.from({ length: 12 }, (_, i) => `D${i + 1}`);
    const result = scoreClassification(drivers, RACE);
    expect(result[10].points).toBe(0);
    expect(result[11].points).toBe(0);
  });
});

describe('computeWhatIf – Antonelli finishes 1st', () => {
  const classification = ['antonelli', 'VER', 'LEC', 'HAM', 'NOR', 'PIA', 'RUS', 'ALO', 'SAI', 'OCO', 'STR'];

  it('removes antonelli and moves everyone up', () => {
    const { whatIf } = computeWhatIf(classification, 'antonelli', RACE);
    expect(whatIf[0]).toEqual({ driverId: 'VER', position: 1, points: 25 });
    expect(whatIf[1]).toEqual({ driverId: 'LEC', position: 2, points: 18 });
    expect(whatIf[9]).toEqual({ driverId: 'STR', position: 10, points: 1 });
  });

  it('real result is unchanged', () => {
    const { real } = computeWhatIf(classification, 'antonelli', RACE);
    expect(real[0]).toEqual({ driverId: 'antonelli', position: 1, points: 25 });
  });

  it('antonelli is not in whatIf', () => {
    const { whatIf } = computeWhatIf(classification, 'antonelli', RACE);
    expect(whatIf.find((r) => r.driverId === 'antonelli')).toBeUndefined();
  });
});

describe('computeWhatIf – Antonelli finishes in the middle (P6)', () => {
  const classification = ['VER', 'LEC', 'HAM', 'NOR', 'PIA', 'antonelli', 'RUS', 'ALO', 'SAI', 'OCO', 'STR'];

  it('drivers ahead unchanged', () => {
    const { whatIf, real } = computeWhatIf(classification, 'antonelli', RACE);
    // VER stays P1 in both
    expect(whatIf[0]).toEqual({ driverId: 'VER', position: 1, points: 25 });
    expect(real[0]).toEqual({ driverId: 'VER', position: 1, points: 25 });
  });

  it('drivers behind move up one place and gain points', () => {
    const { whatIf, real } = computeWhatIf(classification, 'antonelli', RACE);
    // RUS was real P7 (6 pts), now P6 (8 pts)
    const rusReal = real.find((r) => r.driverId === 'RUS');
    const rusWhatIf = whatIf.find((r) => r.driverId === 'RUS');
    expect(rusReal?.points).toBe(6);
    expect(rusWhatIf?.points).toBe(8);
    expect(rusWhatIf?.position).toBe(6);
  });

  it('STR gains points by entering top 10', () => {
    const { whatIf, real } = computeWhatIf(classification, 'antonelli', RACE);
    // STR was P11 (0 pts), now P10 (1 pt)
    const strReal = real.find((r) => r.driverId === 'STR');
    const strWhatIf = whatIf.find((r) => r.driverId === 'STR');
    expect(strReal?.points).toBe(0);
    expect(strWhatIf?.points).toBe(1);
  });
});

describe('computeWhatIf – Antonelli outside the points (P15)', () => {
  const topTen = ['VER', 'LEC', 'HAM', 'NOR', 'PIA', 'RUS', 'ALO', 'SAI', 'OCO', 'STR'];
  const classification = [...topTen, 'BOT', 'GAS', 'ZHO', 'MAG', 'antonelli', 'HUL', 'TSU'];

  it('nobody in top 10 changes points', () => {
    const { whatIf, real } = computeWhatIf(classification, 'antonelli', RACE);
    for (const driver of topTen) {
      const r = real.find((x) => x.driverId === driver);
      const w = whatIf.find((x) => x.driverId === driver);
      expect(w?.points).toBe(r?.points);
    }
  });

  it('HUL moves up one but still outside points', () => {
    const { whatIf } = computeWhatIf(classification, 'antonelli', RACE);
    const hul = whatIf.find((r) => r.driverId === 'HUL');
    expect(hul?.points).toBe(0);
    expect(hul?.position).toBe(15);
  });
});

describe('computeWhatIf – Antonelli did not finish (not in classification)', () => {
  const classification = ['VER', 'LEC', 'HAM', 'NOR', 'PIA', 'RUS', 'ALO', 'SAI', 'OCO', 'STR'];

  it('whatIf equals real when driver not present', () => {
    const { real, whatIf, removedIndex } = computeWhatIf(classification, 'antonelli', RACE);
    expect(removedIndex).toBe(-1);
    expect(whatIf).toEqual(real);
  });
});

describe('computeWhatIf – Sprint scale', () => {
  // 9 drivers: antonelli P1, VER P2 … SAI P9
  // Sprint scale awards points P1-P8 only
  // Real: SAI is index 8 (P9) → 0 pts
  // WhatIf (antonelli removed): SAI becomes index 7 (P8) → 1 pt
  const classification = ['antonelli', 'VER', 'LEC', 'HAM', 'NOR', 'PIA', 'RUS', 'ALO', 'SAI'];

  it('uses sprint scale correctly for top positions', () => {
    // classification (antonelli removed): [VER, LEC, HAM, NOR, PIA, RUS, ALO, SAI]
    // Indices:                              0    1    2    3    4    5    6    7
    const { whatIf } = computeWhatIf(classification, 'antonelli', SPRINT);
    expect(whatIf[0]).toEqual({ driverId: 'VER', position: 1, points: 8 });
    // RUS is index 5 → P6 → 3 pts
    expect(whatIf[5]).toEqual({ driverId: 'RUS', position: 6, points: 3 });
    // ALO is index 6 → P7 → 2 pts
    expect(whatIf[6]).toEqual({ driverId: 'ALO', position: 7, points: 2 });
  });

  it('SAI moves from P9 (0 pts) to P8 (1 pt) when antonelli removed', () => {
    const { whatIf, real } = computeWhatIf(classification, 'antonelli', SPRINT);
    const saiReal = real.find((r) => r.driverId === 'SAI');
    const saiWhatIf = whatIf.find((r) => r.driverId === 'SAI');
    // Real: SAI is P9, outside sprint top-8 → 0 pts
    expect(saiReal?.position).toBe(9);
    expect(saiReal?.points).toBe(0);
    // WhatIf: SAI moves up to P8 → 1 pt
    expect(saiWhatIf?.position).toBe(8);
    expect(saiWhatIf?.points).toBe(1);
  });
});

describe('accumulatePoints', () => {
  it('accumulates correctly over two rounds', () => {
    const round1 = [
      { driverId: 'VER', points: 25 },
      { driverId: 'LEC', points: 18 },
    ];
    const round2 = [
      { driverId: 'LEC', points: 25 },
      { driverId: 'VER', points: 18 },
    ];
    const result = accumulatePoints([round1, round2]);
    expect(result[0].find((r) => r.driverId === 'VER')?.points).toBe(25);
    expect(result[0].find((r) => r.driverId === 'LEC')?.points).toBe(18);
    expect(result[1].find((r) => r.driverId === 'LEC')?.points).toBe(43);
    expect(result[1].find((r) => r.driverId === 'VER')?.points).toBe(43);
  });
});

describe('assignPositions', () => {
  it('assigns positions with ties', () => {
    const sorted = [
      { driverId: 'VER', points: 100 },
      { driverId: 'LEC', points: 80 },
      { driverId: 'HAM', points: 80 },
    ];
    const result = assignPositions(sorted);
    expect(result[0].position).toBe(1);
    expect(result[1].position).toBe(2);
    expect(result[2].position).toBe(2);
  });
});
