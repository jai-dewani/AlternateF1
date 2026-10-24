// scripts/generate-24-rounds.js
// Generates full 24-round season data with realistic racing dynamics,
// sprint weekends, full F1.5 & No Antonelli scoring, standings, and beneficiaries.

import { writeFile } from 'node:fs/promises';
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
const OUT_FILE = path.resolve(__dirname, '../public/data/season.json');

const TOP_DRIVER_IDS = [
  'verstappen', 'tsunoda', 'norris', 'piastri',
  'leclerc', 'hamilton', 'russell', 'antonelli'
];

const CALENDAR = [
  { round: 1, name: "Australian Grand Prix", country: "Australia", locality: "Melbourne", circuit: "Albert Park Circuit", date: "2026-03-15", hasSprint: false },
  { round: 2, name: "Chinese Grand Prix", country: "China", locality: "Shanghai", circuit: "Shanghai International Circuit", date: "2026-03-22", hasSprint: true },
  { round: 3, name: "Japanese Grand Prix", country: "Japan", locality: "Suzuka", circuit: "Suzuka Circuit", date: "2026-04-05", hasSprint: false },
  { round: 4, name: "Bahrain Grand Prix", country: "Bahrain", locality: "Sakhir", circuit: "Bahrain International Circuit", date: "2026-04-19", hasSprint: false },
  { round: 5, name: "Saudi Arabian Grand Prix", country: "Saudi Arabia", locality: "Jeddah", circuit: "Jeddah Corniche Circuit", date: "2026-04-26", hasSprint: false },
  { round: 6, name: "Miami Grand Prix", country: "USA", locality: "Miami", circuit: "Miami International Autodrome", date: "2026-05-03", hasSprint: true },
  { round: 7, name: "Emilia Romagna Grand Prix", country: "Italy", locality: "Imola", circuit: "Autodromo Enzo e Dino Ferrari", date: "2026-05-17", hasSprint: false },
  { round: 8, name: "Monaco Grand Prix", country: "Monaco", locality: "Monaco", circuit: "Circuit de Monaco", date: "2026-05-24", hasSprint: false },
  { round: 9, name: "Spanish Grand Prix", country: "Spain", locality: "Barcelona", circuit: "Circuit de Barcelona-Catalunya", date: "2026-05-31", hasSprint: false },
  { round: 10, name: "Canadian Grand Prix", country: "Canada", locality: "Montreal", circuit: "Circuit Gilles Villeneuve", date: "2026-06-14", hasSprint: false },
  { round: 11, name: "Austrian Grand Prix", country: "Austria", locality: "Spielberg", circuit: "Red Bull Ring", date: "2026-06-28", hasSprint: true },
  { round: 12, name: "British Grand Prix", country: "United Kingdom", locality: "Silverstone", circuit: "Silverstone Circuit", date: "2026-07-05", hasSprint: false },
  { round: 13, name: "Belgian Grand Prix", country: "Belgium", locality: "Spa", circuit: "Circuit de Spa-Francorchamps", date: "2026-07-26", hasSprint: true },
  { round: 14, name: "Hungarian Grand Prix", country: "Hungary", locality: "Budapest", circuit: "Hungaroring", date: "2026-08-02", hasSprint: false },
  { round: 15, name: "Dutch Grand Prix", country: "Netherlands", locality: "Zandvoort", circuit: "Circuit Zandvoort", date: "2026-08-30", hasSprint: false },
  { round: 16, name: "Italian Grand Prix", country: "Italy", locality: "Monza", circuit: "Autodromo Nazionale Monza", date: "2026-09-06", hasSprint: false },
  { round: 17, name: "Azerbaijan Grand Prix", country: "Azerbaijan", locality: "Baku", circuit: "Baku City Circuit", date: "2026-09-20", hasSprint: false },
  { round: 18, name: "Singapore Grand Prix", country: "Singapore", locality: "Singapore", circuit: "Marina Bay Street Circuit", date: "2026-10-04", hasSprint: false },
  { round: 19, name: "United States Grand Prix", country: "USA", locality: "Austin", circuit: "Circuit of the Americas", date: "2026-10-18", hasSprint: true },
  { round: 20, name: "Mexican Grand Prix", country: "Mexico", locality: "Mexico City", circuit: "Autódromo Hermanos Rodríguez", date: "2026-10-25", hasSprint: false },
  { round: 21, name: "Brazilian Grand Prix", country: "Brazil", locality: "São Paulo", circuit: "Autódromo José Carlos Pace", date: "2026-11-08", hasSprint: true },
  { round: 22, name: "Las Vegas Grand Prix", country: "USA", locality: "Las Vegas", circuit: "Las Vegas Strip Circuit", date: "2026-11-21", hasSprint: false },
  { round: 23, name: "Qatar Grand Prix", country: "Qatar", locality: "Lusail", circuit: "Lusail International Circuit", date: "2026-11-29", hasSprint: true },
  { round: 24, name: "Abu Dhabi Grand Prix", country: "UAE", locality: "Yas Marina", circuit: "Yas Marina Circuit", date: "2026-12-06", hasSprint: false },
];

const DRIVERS = [
  { id: "norris",     code: "NOR", name: "Lando Norris",       constructor: "McLaren",       constructorId: "mclaren" },
  { id: "piastri",    code: "PIA", name: "Oscar Piastri",       constructor: "McLaren",       constructorId: "mclaren" },
  { id: "russell",    code: "RUS", name: "George Russell",       constructor: "Mercedes",      constructorId: "mercedes" },
  { id: "antonelli",  code: "ANT", name: "Kimi Antonelli",      constructor: "Mercedes",      constructorId: "mercedes" },
  { id: "leclerc",    code: "LEC", name: "Charles Leclerc",     constructor: "Ferrari",       constructorId: "ferrari" },
  { id: "hamilton",   "code": "HAM", name: "Lewis Hamilton",      constructor: "Ferrari",       constructorId: "ferrari" },
  { id: "verstappen", code: "VER", name: "Max Verstappen",      constructor: "Red Bull",      constructorId: "red_bull" },
  { id: "tsunoda",    code: "TSU", name: "Yuki Tsunoda",        constructor: "Red Bull",      constructorId: "red_bull" },
  { id: "alonso",     code: "ALO", name: "Fernando Alonso",     constructor: "Aston Martin",  constructorId: "aston_martin" },
  { id: "stroll",     code: "STR", name: "Lance Stroll",        constructor: "Aston Martin",  constructorId: "aston_martin" },
  { id: "gasly",      code: "GAS", name: "Pierre Gasly",        constructor: "Alpine",        constructorId: "alpine" },
  { id: "doohan",     code: "DOO", name: "Jack Doohan",         constructor: "Alpine",        constructorId: "alpine" },
  { id: "sainz",      code: "SAI", name: "Carlos Sainz",        constructor: "Williams",      constructorId: "williams" },
  { id: "colapinto",  code: "COL", name: "Franco Colapinto",    constructor: "Williams",      constructorId: "williams" },
  { id: "lawson",     code: "LAW", name: "Liam Lawson",         constructor: "Racing Bulls",  constructorId: "rb" },
  { id: "hadjar",     code: "HAD", name: "Isack Hadjar",        constructor: "Racing Bulls",  constructorId: "rb" },
  { id: "hulkenberg", code: "HUL", name: "Nico Hülkenberg",    constructor: "Sauber",        constructorId: "sauber" },
  { id: "bortoleto",  code: "BOR", name: "Gabriel Bortoleto",   constructor: "Sauber",        constructorId: "sauber" },
  { id: "ocon",       code: "OCO", name: "Esteban Ocon",        constructor: "Haas",          constructorId: "haas" },
  { id: "bearman",    code: "BEA", name: "Oliver Bearman",      constructor: "Haas",          constructorId: "haas" }
];

const DRIVERS_MAP = Object.fromEntries(DRIVERS.map(d => [d.id, d]));

// Seeded deterministic permutations for realistic racing results across rounds
const RACE_PATTERNS = [
  // R1: Aus
  ['verstappen', 'norris', 'antonelli', 'piastri', 'russell', 'leclerc', 'hamilton', 'alonso', 'sainz', 'gasly', 'stroll', 'hulkenberg', 'bearman', 'colapinto', 'ocon', 'doohan', 'lawson', 'bortoleto', 'hadjar', 'tsunoda'],
  // R2: China
  ['norris', 'russell', 'antonelli', 'piastri', 'verstappen', 'leclerc', 'hamilton', 'alonso', 'sainz', 'gasly', 'hulkenberg', 'bearman', 'colapinto', 'stroll', 'ocon', 'lawson', 'doohan', 'bortoleto', 'hadjar', 'tsunoda'],
  // R3: Japan
  ['verstappen', 'antonelli', 'russell', 'norris', 'piastri', 'hamilton', 'leclerc', 'alonso', 'sainz', 'gasly', 'bearman', 'hulkenberg', 'colapinto', 'stroll', 'ocon', 'lawson', 'doohan', 'bortoleto', 'hadjar', 'tsunoda'],
  // R4: Bahrain
  ['russell', 'norris', 'piastri', 'antonelli', 'verstappen', 'leclerc', 'hamilton', 'alonso', 'sainz', 'gasly', 'stroll', 'bearman', 'hulkenberg', 'colapinto', 'ocon', 'lawson', 'doohan', 'bortoleto', 'hadjar', 'tsunoda'],
  // R5: Saudi
  ['antonelli', 'russell', 'norris', 'hamilton', 'piastri', 'leclerc', 'verstappen', 'alonso', 'sainz', 'gasly', 'hulkenberg', 'stroll', 'bearman', 'colapinto', 'ocon', 'lawson', 'doohan', 'bortoleto', 'hadjar', 'tsunoda'],
  // R6: Miami
  ['norris', 'verstappen', 'leclerc', 'piastri', 'antonelli', 'russell', 'hamilton', 'sainz', 'alonso', 'hulkenberg', 'gasly', 'bearman', 'colapinto', 'stroll', 'ocon', 'tsunoda', 'lawson', 'doohan', 'hadjar', 'bortoleto'],
  // R7: Imola
  ['verstappen', 'norris', 'leclerc', 'piastri', 'hamilton', 'russell', 'antonelli', 'alonso', 'sainz', 'gasly', 'bearman', 'hulkenberg', 'colapinto', 'ocon', 'stroll', 'lawson', 'tsunoda', 'doohan', 'hadjar', 'bortoleto'],
  // R8: Monaco (Midfield qualifying heroics)
  ['leclerc', 'piastri', 'sainz', 'norris', 'verstappen', 'russell', 'alonso', 'antonelli', 'gasly', 'hulkenberg', 'hamilton', 'bearman', 'colapinto', 'stroll', 'ocon', 'tsunoda', 'lawson', 'bortoleto', 'hadjar', 'doohan'],
  // R9: Spain
  ['verstappen', 'norris', 'russell', 'piastri', 'antonelli', 'hamilton', 'leclerc', 'sainz', 'alonso', 'gasly', 'hulkenberg', 'bearman', 'stroll', 'colapinto', 'ocon', 'tsunoda', 'lawson', 'doohan', 'hadjar', 'bortoleto'],
  // R10: Canada
  ['norris', 'russell', 'verstappen', 'hamilton', 'piastri', 'antonelli', 'leclerc', 'alonso', 'sainz', 'hulkenberg', 'bearman', 'gasly', 'stroll', 'colapinto', 'ocon', 'tsunoda', 'lawson', 'doohan', 'hadjar', 'bortoleto'],
  // R11: Austria
  ['verstappen', 'norris', 'russell', 'piastri', 'antonelli', 'leclerc', 'hamilton', 'sainz', 'hulkenberg', 'gasly', 'alonso', 'bearman', 'colapinto', 'stroll', 'ocon', 'tsunoda', 'lawson', 'hadjar', 'doohan', 'bortoleto'],
  // R12: Great Britain
  ['hamilton', 'norris', 'russell', 'piastri', 'verstappen', 'antonelli', 'leclerc', 'sainz', 'hulkenberg', 'alonso', 'gasly', 'bearman', 'colapinto', 'stroll', 'ocon', 'lawson', 'tsunoda', 'doohan', 'hadjar', 'bortoleto'],
  // R13: Belgium (Rain race)
  ['piastri', 'norris', 'sainz', 'russell', 'verstappen', 'hamilton', 'leclerc', 'gasly', 'alonso', 'antonelli', 'hulkenberg', 'bearman', 'colapinto', 'ocon', 'stroll', 'lawson', 'tsunoda', 'doohan', 'bortoleto', 'hadjar'],
  // R14: Hungary
  ['piastri', 'norris', 'hamilton', 'leclerc', 'verstappen', 'russell', 'antonelli', 'alonso', 'sainz', 'gasly', 'hulkenberg', 'bearman', 'colapinto', 'stroll', 'ocon', 'tsunoda', 'lawson', 'doohan', 'hadjar', 'bortoleto'],
  // R15: Netherlands
  ['norris', 'verstappen', 'piastri', 'russell', 'leclerc', 'antonelli', 'hamilton', 'gasly', 'sainz', 'alonso', 'hulkenberg', 'bearman', 'colapinto', 'stroll', 'ocon', 'tsunoda', 'lawson', 'doohan', 'bortoleto', 'hadjar'],
  // R16: Italy (Monza slipstream)
  ['leclerc', 'piastri', 'norris', 'sainz', 'hamilton', 'russell', 'verstappen', 'hulkenberg', 'alonso', 'antonelli', 'colapinto', 'bearman', 'gasly', 'stroll', 'ocon', 'lawson', 'tsunoda', 'doohan', 'hadjar', 'bortoleto'],
  // R17: Azerbaijan (Baku street race)
  ['piastri', 'leclerc', 'russell', 'norris', 'verstappen', 'alonso', 'sainz', 'colapinto', 'bearman', 'hulkenberg', 'antonelli', 'hamilton', 'gasly', 'stroll', 'ocon', 'tsunoda', 'lawson', 'doohan', 'hadjar', 'bortoleto'],
  // R18: Singapore
  ['norris', 'verstappen', 'piastri', 'russell', 'leclerc', 'hamilton', 'sainz', 'alonso', 'hulkenberg', 'gasly', 'bearman', 'colapinto', 'antonelli', 'stroll', 'ocon', 'tsunoda', 'lawson', 'doohan', 'hadjar', 'bortoleto'],
  // R19: USA (Austin)
  ['leclerc', 'sainz', 'verstappen', 'norris', 'piastri', 'russell', 'gasly', 'hulkenberg', 'alonso', 'antonelli', 'bearman', 'colapinto', 'hamilton', 'stroll', 'ocon', 'tsunoda', 'lawson', 'doohan', 'hadjar', 'bortoleto'],
  // R20: Mexico
  ['sainz', 'norris', 'leclerc', 'verstappen', 'hamilton', 'russell', 'piastri', 'hulkenberg', 'gasly', 'alonso', 'bearman', 'colapinto', 'stroll', 'antonelli', 'ocon', 'tsunoda', 'lawson', 'doohan', 'hadjar', 'bortoleto'],
  // R21: Brazil (Interlagos wet masterclass)
  ['verstappen', 'gasly', 'ocon', 'russell', 'leclerc', 'norris', 'piastri', 'hamilton', 'alonso', 'bearman', 'sainz', 'colapinto', 'hulkenberg', 'stroll', 'antonelli', 'tsunoda', 'lawson', 'doohan', 'hadjar', 'bortoleto'],
  // R22: Las Vegas
  ['russell', 'hamilton', 'sainz', 'leclerc', 'verstappen', 'norris', 'piastri', 'hulkenberg', 'alonso', 'gasly', 'bearman', 'colapinto', 'stroll', 'antonelli', 'ocon', 'tsunoda', 'lawson', 'doohan', 'hadjar', 'bortoleto'],
  // R23: Qatar
  ['verstappen', 'leclerc', 'piastri', 'norris', 'russell', 'hamilton', 'sainz', 'gasly', 'alonso', 'hulkenberg', 'bearman', 'colapinto', 'stroll', 'antonelli', 'ocon', 'tsunoda', 'lawson', 'doohan', 'hadjar', 'bortoleto'],
  // R24: Abu Dhabi Finale
  ['norris', 'sainz', 'leclerc', 'hamilton', 'russell', 'verstappen', 'piastri', 'gasly', 'alonso', 'hulkenberg', 'bearman', 'colapinto', 'stroll', 'antonelli', 'ocon', 'tsunoda', 'lawson', 'doohan', 'hadjar', 'bortoleto'],
];

const SPRINT_PATTERNS = {
  2:  ['antonelli', 'norris', 'russell', 'piastri', 'verstappen', 'leclerc', 'hamilton', 'alonso', 'sainz', 'gasly', 'hulkenberg'],
  6:  ['verstappen', 'norris', 'piastri', 'leclerc', 'russell', 'sainz', 'hamilton', 'alonso', 'hulkenberg', 'gasly'],
  11: ['verstappen', 'piastri', 'norris', 'russell', 'sainz', 'hamilton', 'leclerc', 'hulkenberg', 'alonso', 'gasly'],
  13: ['norris', 'piastri', 'sainz', 'verstappen', 'russell', 'hamilton', 'leclerc', 'alonso', 'gasly', 'hulkenberg'],
  19: ['verstappen', 'sainz', 'norris', 'leclerc', 'russell', 'piastri', 'hulkenberg', 'gasly', 'alonso', 'bearman'],
  21: ['norris', 'piastri', 'verstappen', 'leclerc', 'sainz', 'russell', 'gasly', 'alonso', 'hulkenberg', 'bearman'],
  23: ['piastri', 'norris', 'verstappen', 'russell', 'leclerc', 'hamilton', 'sainz', 'alonso', 'gasly', 'hulkenberg'],
};

function main() {
  const realRoundPointsList = [];
  const f1_5RoundPointsList = [];
  const noAntRoundPointsList = [];

  const rounds = [];

  let prevRealLeader = null;
  let prevF1_5Leader = null;
  let prevNoAntLeader = null;

  for (let i = 0; i < CALENDAR.length; i++) {
    const cal = CALENDAR[i];
    const roundNum = cal.round;
    const raceClassification = RACE_PATTERNS[i] || RACE_PATTERNS[0];
    const sprintClassification = cal.hasSprint ? (SPRINT_PATTERNS[roundNum] || []) : [];

    // Real scoring
    const realRace = computeWhatIf(raceClassification, [], DEFAULT_SCALES.race).real;
    const realSprint = cal.hasSprint ? computeWhatIf(sprintClassification, [], DEFAULT_SCALES.sprint).real : [];

    // Combine race + sprint points for this round
    const realRoundDriverPoints = new Map();
    for (const r of realRace) {
      if (r.points > 0) realRoundDriverPoints.set(r.driverId, (realRoundDriverPoints.get(r.driverId) || 0) + r.points);
    }
    for (const s of realSprint) {
      if (s.points > 0) realRoundDriverPoints.set(s.driverId, (realRoundDriverPoints.get(s.driverId) || 0) + s.points);
    }
    const realRoundItems = [...realRoundDriverPoints.entries()].map(([driverId, points]) => ({ driverId, points }));
    realRoundPointsList.push(realRoundItems);

    // Cumulative Real Standings
    const realStandingsSnapshots = accumulatePoints(realRoundPointsList);
    const realStandings = assignPositions(realStandingsSnapshots[realStandingsSnapshots.length - 1]);
    const realLeader = realStandings[0]?.driverId || null;

    // F1.5 Scoring (exclude top teams)
    const f1_5WhatIfResult = computeWhatIf(raceClassification, TOP_DRIVER_IDS, DEFAULT_SCALES.race);
    const f1_5Race = f1_5WhatIfResult.whatIf;
    const f1_5Sprint = cal.hasSprint ? computeWhatIf(sprintClassification, TOP_DRIVER_IDS, DEFAULT_SCALES.sprint).whatIf : [];

    const f1_5RoundDriverPoints = new Map();
    for (const r of f1_5Race) {
      if (r.points > 0) f1_5RoundDriverPoints.set(r.driverId, (f1_5RoundDriverPoints.get(r.driverId) || 0) + r.points);
    }
    for (const s of f1_5Sprint) {
      if (s.points > 0) f1_5RoundDriverPoints.set(s.driverId, (f1_5RoundDriverPoints.get(s.driverId) || 0) + s.points);
    }
    const f1_5RoundItems = [...f1_5RoundDriverPoints.entries()].map(([driverId, points]) => ({ driverId, points }));
    f1_5RoundPointsList.push(f1_5RoundItems);

    const f1_5StandingsSnapshots = accumulatePoints(f1_5RoundPointsList);
    const f1_5Standings = assignPositions(f1_5StandingsSnapshots[f1_5StandingsSnapshots.length - 1]);
    const f1_5Leader = f1_5Standings[0]?.driverId || null;
    const f1_5LeaderChanged = prevF1_5Leader !== null && prevF1_5Leader !== f1_5Leader;

    // F1.5 Constructor Standings
    const f1_5ConstructorSnapshots = accumulateConstructorStandings(f1_5RoundPointsList, DRIVERS_MAP);
    const f1_5ConstructorStandings = f1_5ConstructorSnapshots[f1_5ConstructorSnapshots.length - 1];

    // No Antonelli Scoring
    const noAntWhatIfResult = computeWhatIf(raceClassification, 'antonelli', DEFAULT_SCALES.race);
    const noAntRace = noAntWhatIfResult.whatIf;
    const noAntSprint = cal.hasSprint ? computeWhatIf(sprintClassification, 'antonelli', DEFAULT_SCALES.sprint).whatIf : [];

    const noAntRoundDriverPoints = new Map();
    for (const r of noAntRace) {
      if (r.points > 0) noAntRoundDriverPoints.set(r.driverId, (noAntRoundDriverPoints.get(r.driverId) || 0) + r.points);
    }
    for (const s of noAntSprint) {
      if (s.points > 0) noAntRoundDriverPoints.set(s.driverId, (noAntRoundDriverPoints.get(s.driverId) || 0) + s.points);
    }
    const noAntRoundItems = [...noAntRoundDriverPoints.entries()].map(([driverId, points]) => ({ driverId, points }));
    noAntRoundPointsList.push(noAntRoundItems);

    const noAntStandingsSnapshots = accumulatePoints(noAntRoundPointsList);
    const noAntStandings = assignPositions(noAntStandingsSnapshots[noAntStandingsSnapshots.length - 1]);
    const noAntLeader = noAntStandings[0]?.driverId || null;
    const noAntLeaderChanged = prevNoAntLeader !== null && prevNoAntLeader !== noAntLeader;

    rounds.push({
      round: cal.round,
      name: cal.name,
      country: cal.country,
      locality: cal.locality,
      circuit: cal.circuit,
      date: cal.date,
      hasSprint: cal.hasSprint,
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
      }
    });

    prevRealLeader = realLeader;
    prevF1_5Leader = f1_5Leader;
    prevNoAntLeader = noAntLeader;
  }

  // Calculate full season beneficiaries
  const finalRealStandingsMap = Object.fromEntries(
    rounds[rounds.length - 1].realStandings.map(s => [s.driverId, s])
  );
  const finalF1_5StandingsMap = Object.fromEntries(
    rounds[rounds.length - 1].f1_5.whatIfStandings.map(s => [s.driverId, s])
  );
  const finalNoAntStandingsMap = Object.fromEntries(
    rounds[rounds.length - 1].no_antonelli.whatIfStandings.map(s => [s.driverId, s])
  );

  const beneficiariesF1_5 = Object.keys(finalF1_5StandingsMap).map(driverId => {
    const whatIf = finalF1_5StandingsMap[driverId];
    const real = finalRealStandingsMap[driverId] || { points: 0, position: 20 };
    return {
      driverId,
      whatIfPoints: whatIf.points,
      realPoints: real.points,
      pointsGained: whatIf.points - real.points,
      whatIfPosition: whatIf.position,
      realPosition: real.position,
      positionsGained: Math.max(0, real.position - whatIf.position)
    };
  }).sort((a, b) => b.pointsGained - a.pointsGained);

  const beneficiariesNoAnt = Object.keys(finalNoAntStandingsMap).map(driverId => {
    const whatIf = finalNoAntStandingsMap[driverId];
    const real = finalRealStandingsMap[driverId] || { points: 0, position: 20 };
    return {
      driverId,
      whatIfPoints: whatIf.points,
      realPoints: real.points,
      pointsGained: whatIf.points - real.points,
      whatIfPosition: whatIf.position,
      realPosition: real.position,
      positionsGained: Math.max(0, real.position - whatIf.position)
    };
  }).sort((a, b) => b.pointsGained - a.pointsGained);

  const seasonData = {
    meta: {
      season: "2026",
      generatedAt: new Date().toISOString(),
      lastRoundIncluded: 24,
      defaultMode: "f1_5",
      removedDriverId: "antonelli",
      topTeams: TOP_TEAMS,
      totalRounds: 24,
      completedRounds: 24,
    },
    calendar: CALENDAR,
    drivers: DRIVERS,
    beneficiaries: {
      f1_5: beneficiariesF1_5,
      no_antonelli: beneficiariesNoAnt
    },
    rounds
  };

  return seasonData;
}

const data = main();
await writeFile(OUT_FILE, JSON.stringify(data, null, 2), 'utf-8');
console.log(`Successfully generated full 24-round season data in ${OUT_FILE}!`);
