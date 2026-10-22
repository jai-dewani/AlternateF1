// scripts/build-season.js
// Reads raw fetched data from data/raw/, runs the scoring engine,
// and writes public/data/season.json.
// Run: node scripts/build-season.js

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeWhatIf,
  accumulatePoints,
  assignPositions,
  DEFAULT_SCALES,
} from '../src/lib/engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'data', 'raw');
const OUT_DIR = path.join(ROOT, 'public', 'data');
const OUT_FILE = path.join(OUT_DIR, 'season.json');
const CONFIG_FILE = path.join(ROOT, 'config', 'scoring.json');

async function readJson(file) {
  const text = await readFile(file, 'utf-8');
  return JSON.parse(text);
}

function normalizeDriverId(driver) {
  return driver.driverId.toLowerCase().replace('-', '');
}

function buildDriverMeta(result) {
  return {
    id: normalizeDriverId(result.Driver),
    code: result.Driver.code,
    name: `${result.Driver.givenName} ${result.Driver.familyName}`,
    constructor: result.Constructor?.name ?? 'Unknown',
    constructorId: result.Constructor?.constructorId ?? 'unknown',
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const config = await readJson(CONFIG_FILE);
  const { removedDriverId, racePoints, sprintPoints } = config;

  // Load calendar
  const calendarData = await readJson(path.join(RAW_DIR, 'calendar.json'));
  const allRaces = calendarData.MRData.RaceTable.Races;
  const now = new Date();
  const completedRaces = allRaces.filter((r) => new Date(r.date) < now);

  // Collect all drivers seen
  const driversMap = new Map(); // id -> meta

  // Process each round
  const realRoundResults = [];     // for accumulation
  const whatIfRoundResults = [];   // for accumulation

  const rounds = [];

  for (const race of completedRaces) {
    const round = parseInt(race.round, 10);

    // Load race results
    const raceFile = path.join(RAW_DIR, `race-${round}.json`);
    if (!existsSync(raceFile)) {
      console.log(`  Round ${round}: no race results cached, skipping`);
      continue;
    }

    const raceData = await readJson(raceFile);
    const raceResults = raceData.MRData.RaceTable.Races[0]?.Results ?? [];

    if (raceResults.length === 0) {
      console.log(`  Round ${round}: empty race results, skipping`);
      continue;
    }

    // Update driver registry
    for (const result of raceResults) {
      const id = normalizeDriverId(result.Driver);
      if (!driversMap.has(id)) {
        driversMap.set(id, buildDriverMeta(result));
      }
    }

    const raceClassification = raceResults.map((r) => normalizeDriverId(r.Driver));
    const { real: realRace, whatIf: whatIfRace } = computeWhatIf(
      raceClassification,
      removedDriverId,
      racePoints
    );

    // Sprint
    let realSprint = [];
    let whatIfSprint = [];
    let hasSprint = false;

    const sprintFile = path.join(RAW_DIR, `sprint-${round}.json`);
    if (existsSync(sprintFile)) {
      const sprintData = await readJson(sprintFile);
      const sprintResults = sprintData.MRData.RaceTable.Races[0]?.SprintResults ?? [];

      if (sprintResults.length > 0) {
        hasSprint = true;

        for (const result of sprintResults) {
          const id = normalizeDriverId(result.Driver);
          if (!driversMap.has(id)) {
            driversMap.set(id, buildDriverMeta(result));
          }
        }

        const sprintClassification = sprintResults.map((r) => normalizeDriverId(r.Driver));
        const sprintComputed = computeWhatIf(sprintClassification, removedDriverId, sprintPoints);
        realSprint = sprintComputed.real;
        whatIfSprint = sprintComputed.whatIf;
      }
    }

    // Combined real and what-if results for this round (race + sprint)
    const combinedReal = [...realRace, ...realSprint];
    const combinedWhatIf = [...whatIfRace, ...whatIfSprint];

    realRoundResults.push(combinedReal);
    whatIfRoundResults.push(combinedWhatIf);

    rounds.push({
      round,
      name: race.raceName,
      country: race.Circuit.Location.country,
      locality: race.Circuit.Location.locality,
      circuit: race.Circuit.circuitName,
      date: race.date,
      hasSprint,
      realRace,
      whatIfRace,
      realSprint: hasSprint ? realSprint : [],
      whatIfSprint: hasSprint ? whatIfSprint : [],
    });
  }

  // Compute cumulative standings after each round
  const realCumulatives = accumulatePoints(realRoundResults);
  const whatIfCumulatives = accumulatePoints(whatIfRoundResults);

  // Attach standings to rounds and compute lead changes
  let prevRealLeader = null;
  let prevWhatIfLeader = null;

  for (let i = 0; i < rounds.length; i++) {
    const realStandings = assignPositions(realCumulatives[i]);
    const whatIfStandings = assignPositions(whatIfCumulatives[i]);

    const realLeader = realStandings[0]?.driverId ?? null;
    const whatIfLeader = whatIfStandings[0]?.driverId ?? null;

    rounds[i].realStandings = realStandings;
    rounds[i].whatIfStandings = whatIfStandings;
    rounds[i].realLeader = realLeader;
    rounds[i].whatIfLeader = whatIfLeader;
    rounds[i].realLeaderChanged = realLeader !== prevRealLeader && prevRealLeader !== null;
    rounds[i].whatIfLeaderChanged = whatIfLeader !== prevWhatIfLeader && prevWhatIfLeader !== null;
    rounds[i].prevRealLeader = prevRealLeader;
    rounds[i].prevWhatIfLeader = prevWhatIfLeader;

    prevRealLeader = realLeader;
    prevWhatIfLeader = whatIfLeader;
  }

  // Compute biggest beneficiaries
  const lastRound = rounds[rounds.length - 1];
  const beneficiaries = [];

  if (lastRound) {
    for (const whatIfEntry of lastRound.whatIfStandings) {
      const { driverId, points: whatIfPoints, position: whatIfPosition } = whatIfEntry;
      if (driverId === removedDriverId) continue;

      const realEntry = lastRound.realStandings.find((r) => r.driverId === driverId);
      const realPoints = realEntry?.points ?? 0;
      const realPosition = realEntry?.position ?? 99;

      beneficiaries.push({
        driverId,
        whatIfPoints,
        realPoints,
        pointsGained: whatIfPoints - realPoints,
        whatIfPosition,
        realPosition,
        positionsGained: realPosition - whatIfPosition,
      });
    }

    beneficiaries.sort((a, b) => b.pointsGained - a.pointsGained);
  }

  // Build final output
  const season = {
    meta: {
      season: '2026',
      generatedAt: new Date().toISOString(),
      lastRoundIncluded: rounds.length > 0 ? rounds[rounds.length - 1].round : 0,
      removedDriverId,
      totalRounds: allRaces.length,
      completedRounds: completedRaces.length,
    },
    drivers: [...driversMap.values()],
    beneficiaries,
    rounds,
  };

  await writeFile(OUT_FILE, JSON.stringify(season, null, 2), 'utf-8');
  console.log(`\nWrote ${OUT_FILE}`);
  console.log(`  ${rounds.length} rounds included`);
  console.log(`  ${driversMap.size} drivers`);
  console.log(`  Top beneficiary: ${beneficiaries[0]?.driverId ?? 'n/a'} (+${beneficiaries[0]?.pointsGained ?? 0} pts)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
