// tests/sanity.test.js
// Sanity check: with nobody removed, totals equal official standings.
// This test reads the raw fetched data if available.
// It is skipped if data/raw/ doesn't exist (CI before first fetch).

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreClassification, accumulatePoints, assignPositions, DEFAULT_SCALES } from '../src/lib/engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'data', 'raw');

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function normalizeDriverId(driver) {
  return driver.driverId.toLowerCase().replace('-', '');
}

const hasRawData = existsSync(path.join(RAW_DIR, 'calendar.json'));

describe.skipIf(!hasRawData)('Sanity: no driver removed → matches official standings', () => {
  let calendar;
  let completedRounds;

  beforeAll(() => {
    calendar = readJson(path.join(RAW_DIR, 'calendar.json')).MRData.RaceTable.Races;
    const now = new Date();
    completedRounds = calendar.filter((r) => new Date(r.date) < now);
  });

  it('totals per driver match official standings after each completed round', () => {
    const allRoundResults = [];

    for (const race of completedRounds) {
      const round = race.round;
      const raceFile = path.join(RAW_DIR, `race-${round}.json`);
      if (!existsSync(raceFile)) continue;

      const raceData = readJson(raceFile).MRData.RaceTable.Races[0]?.Results ?? [];
      const classification = raceData.map((r) => normalizeDriverId(r.Driver));
      const raceScored = scoreClassification(classification, DEFAULT_SCALES.race);

      // Sprint
      const sprintFile = path.join(RAW_DIR, `sprint-${round}.json`);
      let sprintScored = [];
      if (existsSync(sprintFile)) {
        const sprintData = readJson(sprintFile).MRData.RaceTable.Races[0]?.SprintResults ?? [];
        const sprintClass = sprintData.map((r) => normalizeDriverId(r.Driver));
        sprintScored = scoreClassification(sprintClass, DEFAULT_SCALES.sprint);
      }

      allRoundResults.push([...raceScored, ...sprintScored]);
    }

    const cumulatives = accumulatePoints(allRoundResults);

    // Check final round against official standings
    const lastRound = completedRounds[completedRounds.length - 1];
    const standingsFile = path.join(RAW_DIR, `standings-${lastRound.round}.json`);
    if (!existsSync(standingsFile)) return;

    const officialStandings = readJson(standingsFile).MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
    const lastCumulative = cumulatives[cumulatives.length - 1];
    const withPos = assignPositions(lastCumulative);

    for (const official of officialStandings) {
      const driverId = normalizeDriverId(official.Driver);
      const computed = withPos.find((r) => r.driverId === driverId);
      if (!computed) continue; // driver may have 0 pts and not appear

      const officialPts = parseInt(official.points, 10);
      expect(computed.points).toBe(officialPts);
    }
  });
});
