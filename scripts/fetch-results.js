// scripts/fetch-results.js
// Fetches calendar, race results, and sprint results from the Jolpica F1 API.
// Results are cached to data/raw/ as JSON files.
// Run: node scripts/fetch-results.js

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'data', 'raw');
const BASE_URL = 'https://api.jolpi.ca/ergast/f1';
const SEASON = '2026';
const DELAY_MS = 300; // be polite with rate limits

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  console.log(`  GET ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

async function cachedFetch(cacheFile, url) {
  const fullPath = path.join(RAW_DIR, cacheFile);
  if (existsSync(fullPath)) {
    console.log(`  CACHE HIT ${cacheFile}`);
    const text = await readFile(fullPath, 'utf-8');
    return JSON.parse(text);
  }
  await sleep(DELAY_MS);
  const data = await fetchJson(url);
  await writeFile(fullPath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

async function fetchCalendar() {
  const data = await cachedFetch('calendar.json', `${BASE_URL}/${SEASON}.json?limit=100`);
  return data.MRData.RaceTable.Races;
}

async function fetchRaceResults(round) {
  const data = await cachedFetch(
    `race-${round}.json`,
    `${BASE_URL}/${SEASON}/${round}/results.json`
  );
  const races = data.MRData.RaceTable.Races;
  if (!races || races.length === 0) return null;
  return races[0].Results || [];
}

async function fetchSprintResults(round) {
  try {
    const data = await cachedFetch(
      `sprint-${round}.json`,
      `${BASE_URL}/${SEASON}/${round}/sprint.json`
    );
    const races = data.MRData.RaceTable.Races;
    if (!races || races.length === 0) return null;
    return races[0].SprintResults || [];
  } catch (e) {
    // Sprint endpoint returns 404 or empty for non-sprint rounds
    if (e.message.includes('HTTP 404') || e.message.includes('HTTP 4')) {
      return null;
    }
    throw e;
  }
}

async function fetchDriverStandings(round) {
  const data = await cachedFetch(
    `standings-${round}.json`,
    `${BASE_URL}/${SEASON}/${round}/driverStandings.json`
  );
  const lists = data.MRData.StandingsTable?.StandingsLists;
  if (!lists || lists.length === 0) return [];
  return lists[0].DriverStandings || [];
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });

  console.log(`\nFetching ${SEASON} F1 season from Jolpica API…`);

  // 1. Calendar
  console.log('\n[1/3] Calendar');
  const calendar = await fetchCalendar();
  console.log(`  Found ${calendar.length} rounds`);

  // Determine which rounds have already happened (have a date in the past)
  const now = new Date();
  const completedRounds = calendar.filter((race) => {
    const raceDate = new Date(race.date);
    return raceDate < now;
  });

  console.log(`  ${completedRounds.length} completed rounds`);

  // 2. Race results
  console.log('\n[2/3] Race results');
  for (const race of completedRounds) {
    const round = race.round;
    const results = await fetchRaceResults(round);
    if (!results) {
      console.log(`  Round ${round}: no results yet`);
    } else {
      console.log(`  Round ${round} (${race.raceName}): ${results.length} drivers`);
    }
  }

  // 3. Sprint results
  console.log('\n[3/3] Sprint results');
  for (const race of completedRounds) {
    const round = race.round;
    const hasSprint = 'Sprint' in race || race.Sprint;
    if (hasSprint) {
      const results = await fetchSprintResults(round);
      if (!results) {
        console.log(`  Round ${round}: sprint listed but no results yet`);
      } else {
        console.log(`  Round ${round}: ${results.length} sprint drivers`);
      }
    } else {
      // Try anyway — sometimes the calendar doesn't flag it correctly
      // but we skip cache-file creation to avoid polluting with empty files
    }
  }

  // 4. Driver standings (for validation)
  console.log('\n[4/4] Driver standings (for validation)');
  for (const race of completedRounds) {
    const round = race.round;
    const standings = await fetchDriverStandings(round);
    console.log(`  Round ${round}: ${standings.length} drivers in standings`);
  }

  console.log('\nFetch complete. Raw data in data/raw/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
