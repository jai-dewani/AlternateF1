// scripts/build-season.js
// Reads raw fetched data from data/raw/, executes the scoring engine,
// and outputs public/data/season.json with F1.5 and What-If modes.
// Run: node scripts/build-season.js

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeWhatIf,
  accumulatePoints,
  assignPositions,
  accumulateConstructorStandings,
  DEFAULT_SCALES,
  TOP_TEAMS,
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
  return driver.driverId.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

function normalizeConstructorId(constructor) {
  if (!constructor) return 'unknown';
  const id = constructor.constructorId.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (id.includes('red_bull') || id.includes('redbull')) return 'red_bull';
  if (id.includes('mclaren')) return 'mclaren';
  if (id.includes('ferrari')) return 'ferrari';
  if (id.includes('mercedes')) return 'mercedes';
  if (id.includes('aston')) return 'aston_martin';
  if (id.includes('alpine')) return 'alpine';
  if (id.includes('williams')) return 'williams';
  if (id.includes('haas')) return 'haas';
  if (id.includes('sauber') || id.includes('kick')) return 'sauber';
  if (id.includes('rb') || id.includes('racing_bulls') || id.includes('alphatauri')) return 'rb';
  return id;
}

function buildDriverMeta(result) {
  const driver = result.Driver;
  const constructor = result.Constructor;
  return {
    id: normalizeDriverId(driver),
    code: driver.code || driver.familyName.substring(0, 3).toUpperCase(),
    name: `${driver.givenName} ${driver.familyName}`,
    constructor: constructor?.name || 'Unknown',
    constructorId: normalizeConstructorId(constructor),
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const config = existsSync(CONFIG_FILE)
    ? await readJson(CONFIG_FILE)
    : { removedDriverId: 'antonelli' };
  const removedDriverId = config.removedDriverId || 'antonelli';

  const calendarPath = path.join(RAW_DIR, 'calendar.json');
  if (!existsSync(calendarPath)) {
    throw new Error('data/raw/calendar.json not found. Run "node scripts/fetch-results.js" first.');
  }

  const calendarData = await readJson(calendarPath);
  const detectedSeason = calendarData.MRData.RaceTable.season;
  const allRaces = calendarData.MRData.RaceTable.Races || [];

  const now = new Date();
  const completedRaces = allRaces.filter((r) => new Date(r.date) < now);

  const driversMap = new Map();
  const calendarList = allRaces.map((r) => ({
    round: parseInt(r.round, 10),
    name: r.raceName,
    country: r.Circuit.Location.country,
    locality: r.Circuit.Location.locality,
    circuit: r.Circuit.circuitName,
    date: r.date,
    hasSprint: Boolean(r.Sprint || 'Sprint' in r),
  }));

  const realRoundPointsList = [];
  const f1_5RoundPointsList = [];
  const noAntRoundPointsList = [];

  const rounds = [];
  let prevRealLeader = null;
  let prevF1_5Leader = null;
  let prevNoAntLeader = null;

  for (const race of completedRaces) {
    const round = parseInt(race.round, 10);
    const raceFile = path.join(RAW_DIR, `race-${round}.json`);
    if (!existsSync(raceFile)) continue;

    const raceData = await readJson(raceFile);
    const raceResults = raceData.MRData.RaceTable.Races[0]?.Results ?? [];
    if (raceResults.length === 0) continue;

    // Register drivers
    for (const res of raceResults) {
      const id = normalizeDriverId(res.Driver);
      if (!driversMap.has(id)) {
        driversMap.set(id, buildDriverMeta(res));
      }
    }

    const raceClassification = raceResults.map((r) => normalizeDriverId(r.Driver));

    // Sprint handling
    let hasSprint = false;
    let sprintResults = [];
    let sprintClassification = [];
    const sprintFile = path.join(RAW_DIR, `sprint-${round}.json`);
    if (existsSync(sprintFile)) {
      const sprintData = await readJson(sprintFile);
      sprintResults = sprintData.MRData.RaceTable.Races[0]?.SprintResults ?? [];
      if (sprintResults.length > 0) {
        hasSprint = true;
        for (const res of sprintResults) {
          const id = normalizeDriverId(res.Driver);
          if (!driversMap.has(id)) {
            driversMap.set(id, buildDriverMeta(res));
          }
        }
        sprintClassification = sprintResults.map((r) => normalizeDriverId(r.Driver));
      }
    }

    // 1. Real Scoring
    const realRace = computeWhatIf(raceClassification, [], DEFAULT_SCALES.race).real;
    const realSprint = hasSprint ? computeWhatIf(sprintClassification, [], DEFAULT_SCALES.sprint).real : [];

    const realRoundItems = new Map();
    for (const r of realRace) {
      if (r.points > 0) realRoundItems.set(r.driverId, (realRoundItems.get(r.driverId) || 0) + r.points);
    }
    for (const s of realSprint) {
      if (s.points > 0) realRoundItems.set(s.driverId, (realRoundItems.get(s.driverId) || 0) + s.points);
    }
    realRoundPointsList.push([...realRoundItems.entries()].map(([driverId, points]) => ({ driverId, points })));

    const realStandingsSnapshots = accumulatePoints(realRoundPointsList);
    const realStandings = assignPositions(realStandingsSnapshots[realStandingsSnapshots.length - 1]);
    const realLeader = realStandings[0]?.driverId || null;

    // 2. F1.5 Scoring (Exclude drivers of top teams)
    const topTeamDriverIds = [...driversMap.values()]
      .filter((d) => TOP_TEAMS.includes(d.constructorId))
      .map((d) => d.id);

    const f1_5Race = computeWhatIf(raceClassification, topTeamDriverIds, DEFAULT_SCALES.race).whatIf;
    const f1_5Sprint = hasSprint ? computeWhatIf(sprintClassification, topTeamDriverIds, DEFAULT_SCALES.sprint).whatIf : [];

    const f1_5RoundItems = new Map();
    for (const r of f1_5Race) {
      if (r.points > 0) f1_5RoundItems.set(r.driverId, (f1_5RoundItems.get(r.driverId) || 0) + r.points);
    }
    for (const s of f1_5Sprint) {
      if (s.points > 0) f1_5RoundItems.set(s.driverId, (f1_5RoundItems.get(s.driverId) || 0) + s.points);
    }
    f1_5RoundPointsList.push([...f1_5RoundItems.entries()].map(([driverId, points]) => ({ driverId, points })));

    const f1_5StandingsSnapshots = accumulatePoints(f1_5RoundPointsList);
    const f1_5Standings = assignPositions(f1_5StandingsSnapshots[f1_5StandingsSnapshots.length - 1]);
    const f1_5Leader = f1_5Standings[0]?.driverId || null;
    const f1_5LeaderChanged = prevF1_5Leader !== null && prevF1_5Leader !== f1_5Leader;

    const driversMetaObj = Object.fromEntries(driversMap.entries());
    const f1_5ConstructorSnapshots = accumulateConstructorStandings(f1_5RoundPointsList, driversMetaObj);
    const f1_5ConstructorStandings = f1_5ConstructorSnapshots[f1_5ConstructorSnapshots.length - 1] || [];

    // 3. No Antonelli What-If Scoring
    const noAntRace = computeWhatIf(raceClassification, removedDriverId, DEFAULT_SCALES.race).whatIf;
    const noAntSprint = hasSprint ? computeWhatIf(sprintClassification, removedDriverId, DEFAULT_SCALES.sprint).whatIf : [];

    const noAntRoundItems = new Map();
    for (const r of noAntRace) {
      if (r.points > 0) noAntRoundItems.set(r.driverId, (noAntRoundItems.get(r.driverId) || 0) + r.points);
    }
    for (const s of noAntSprint) {
      if (s.points > 0) noAntRoundItems.set(s.driverId, (noAntRoundItems.get(s.driverId) || 0) + s.points);
    }
    noAntRoundPointsList.push([...noAntRoundItems.entries()].map(([driverId, points]) => ({ driverId, points })));

    const noAntStandingsSnapshots = accumulatePoints(noAntRoundPointsList);
    const noAntStandings = assignPositions(noAntStandingsSnapshots[noAntStandingsSnapshots.length - 1]);
    const noAntLeader = noAntStandings[0]?.driverId || null;
    const noAntLeaderChanged = prevNoAntLeader !== null && prevNoAntLeader !== noAntLeader;

    rounds.push({
      round,
      name: race.raceName,
      country: race.Circuit.Location.country,
      locality: race.Circuit.Location.locality,
      circuit: race.Circuit.circuitName,
      date: race.date,
      hasSprint,
      realRace,
      realSprint,
      realStandings,
      realLeader,
      f1_5: {
        whatIfRace: f1_5Race,
        whatIfSprint: f1_5Sprint,
        whatIfStandings: f1_5Standings,
        constructorStandings: f1_5ConstructorStandings,
        whatIfLeader: f1_5Leader,
        whatIfLeaderChanged: f1_5LeaderChanged,
        prevWhatIfLeader: prevF1_5Leader,
      },
      no_antonelli: {
        whatIfRace: noAntRace,
        whatIfSprint: noAntSprint,
        whatIfStandings: noAntStandings,
        whatIfLeader: noAntLeader,
        whatIfLeaderChanged: noAntLeaderChanged,
        prevWhatIfLeader: prevNoAntLeader,
      },
    });

    prevRealLeader = realLeader;
    prevF1_5Leader = f1_5Leader;
    prevNoAntLeader = noAntLeader;
  }

  // Calculate beneficiaries
  const lastRound = rounds[rounds.length - 1];
  let beneficiariesF1_5 = [];
  let beneficiariesNoAnt = [];

  if (lastRound) {
    const finalRealMap = Object.fromEntries(lastRound.realStandings.map((s) => [s.driverId, s]));

    beneficiariesF1_5 = (lastRound.f1_5?.whatIfStandings || []).map((whatIf) => {
      const real = finalRealMap[whatIf.driverId] || { points: 0, position: 20 };
      return {
        driverId: whatIf.driverId,
        whatIfPoints: whatIf.points,
        realPoints: real.points,
        pointsGained: whatIf.points - real.points,
        whatIfPosition: whatIf.position,
        realPosition: real.position,
        positionsGained: Math.max(0, real.position - whatIf.position),
      };
    }).sort((a, b) => b.pointsGained - a.pointsGained);

    beneficiariesNoAnt = (lastRound.no_antonelli?.whatIfStandings || []).map((whatIf) => {
      const real = finalRealMap[whatIf.driverId] || { points: 0, position: 20 };
      return {
        driverId: whatIf.driverId,
        whatIfPoints: whatIf.points,
        realPoints: real.points,
        pointsGained: whatIf.points - real.points,
        whatIfPosition: whatIf.position,
        realPosition: real.position,
        positionsGained: Math.max(0, real.position - whatIf.position),
      };
    }).sort((a, b) => b.pointsGained - a.pointsGained);
  }

  const seasonOutput = {
    meta: {
      season: detectedSeason,
      generatedAt: new Date().toISOString(),
      lastRoundIncluded: rounds.length > 0 ? rounds[rounds.length - 1].round : 0,
      defaultMode: 'f1_5',
      removedDriverId,
      topTeams: TOP_TEAMS,
      totalRounds: allRaces.length,
      completedRounds: rounds.length,
    },
    calendar: calendarList,
    drivers: [...driversMap.values()],
    beneficiaries: {
      f1_5: beneficiariesF1_5,
      no_antonelli: beneficiariesNoAnt,
    },
    rounds,
  };

  await writeFile(OUT_FILE, JSON.stringify(seasonOutput, null, 2), 'utf-8');
  console.log(`\nBuild complete! Wrote verified data to ${OUT_FILE}`);
  console.log(`  Season: ${detectedSeason}`);
  console.log(`  Completed rounds processed: ${rounds.length} of ${allRaces.length}`);
  console.log(`  Drivers mapped: ${driversMap.size}`);
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
