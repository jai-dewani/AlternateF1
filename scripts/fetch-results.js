// scripts/fetch-results.js
// Fetches official calendar, race results, and sprint results from the Jolpica F1 API.
// Results are cached in data/raw/ as JSON files for inspection and verification.
// Run: node scripts/fetch-results.js

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'data', 'raw');
const BASE_URL = 'https://api.jolpi.ca/ergast/f1';
const SEASON = process.env.F1_SEASON || 'current';
const DELAY_MS = 350; // Respect rate limits

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  console.log(`  GET ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AlternateF1/1.0 (https://github.com/jai-dewani/AlternateF1)' }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

async function cachedFetch(cacheFile, url) {
  const fullPath = path.join(RAW_DIR, cacheFile);
  if (existsSync(fullPath)) {
    console.log(`  [CACHE HIT] ${cacheFile}`);
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
  return {
    season: data.MRData.RaceTable.season,
    races: data.MRData.RaceTable.Races || []
  };
}

async function fetchRaceResults(seasonYear, round) {
  try {
    const data = await cachedFetch(
      `race-${round}.json`,
      `${BASE_URL}/${seasonYear}/${round}/results.json`
    );
    const races = data.MRData?.RaceTable?.Races;
    if (!races || races.length === 0) return null;
    return races[0].Results || [];
  } catch (err) {
    console.warn(`  Warning fetching round ${round}: ${err.message}`);
    return null;
  }
}

async function fetchSprintResults(seasonYear, round) {
  try {
    const data = await cachedFetch(
      `sprint-${round}.json`,
      `${BASE_URL}/${seasonYear}/${round}/sprint.json`
    );
    const races = data.MRData?.RaceTable?.Races;
    if (!races || races.length === 0) return null;
    return races[0].SprintResults || [];
  } catch (err) {
    if (err.message.includes('404')) return null;
    return null;
  }
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });

  console.log(`\n========================================`);
  console.log(`Fetching F1 Season (${SEASON}) from Jolpica API`);
  console.log(`========================================\n`);

  // 1. Fetch Calendar
  const { season: detectedSeason, races: calendar } = await fetchCalendar();
  console.log(`Detected Season: ${detectedSeason} (${calendar.length} scheduled rounds)\n`);

  // Determine completed rounds strictly by past date
  const now = new Date();
  const completedRaces = calendar.filter((race) => new Date(race.date) < now);
  console.log(`${completedRaces.length} of ${calendar.length} rounds have already taken place.\n`);

  // 2. Fetch Race Results for completed rounds
  console.log(`Fetching results for ${completedRaces.length} completed rounds...`);
  for (const race of completedRaces) {
    const round = race.round;
    const results = await fetchRaceResults(detectedSeason, round);
    if (!results || results.length === 0) {
      console.log(`  Round ${round} (${race.raceName}): No official results yet.`);
    } else {
      console.log(`  Round ${round} (${race.raceName}): ${results.length} drivers classified.`);
    }

    // 3. Fetch Sprint Results if applicable
    const isSprintWeekend = 'Sprint' in race || race.Sprint;
    if (isSprintWeekend) {
      const sprintResults = await fetchSprintResults(detectedSeason, round);
      if (sprintResults && sprintResults.length > 0) {
        console.log(`    └ Sprint: ${sprintResults.length} drivers classified.`);
      }
    }
  }

  console.log(`\nFetch complete! Raw verified JSON cached in data/raw/\n`);
}

main().catch((err) => {
  console.error('Fetch failed:', err);
  process.exit(1);
});
