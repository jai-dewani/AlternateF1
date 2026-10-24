// src/lib/engine.js
// Pure scoring engine: given a race classification and a points scale,
// re-scores the result after removing the specified driver(s) or top teams.
// No side effects, no imports, importable by Node scripts and the browser.

export const TOP_TEAMS = ['red_bull', 'mclaren', 'ferrari', 'mercedes'];

/**
 * Points scales.
 * @type {{ race: number[], sprint: number[] }}
 */
export const DEFAULT_SCALES = {
  race: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  sprint: [8, 7, 6, 5, 4, 3, 2, 1],
};

/**
 * Score a classification with a given points scale.
 * Positions are 1-indexed. Only positions within the scale length score.
 *
 * @param {string[]} classification - Ordered list of driver IDs (1st to last).
 * @param {number[]} scale - Points awarded per finishing position.
 * @returns {{ driverId: string, position: number, points: number }[]}
 */
export function scoreClassification(classification, scale) {
  return classification.map((driverId, idx) => ({
    driverId,
    position: idx + 1,
    points: idx < scale.length ? scale[idx] : 0,
  }));
}

/**
 * Remove one or more drivers from a classification and re-score.
 * Drivers ahead of the removed driver(s) keep their position relative to those remaining.
 * Drivers behind move up by the count of removed drivers ahead of them.
 *
 * @param {string[]} classification - Ordered list of driver IDs (1st to last).
 * @param {string|string[]|Set<string>} removedDrivers - Driver ID or IDs to remove.
 * @param {number[]} scale - Points awarded per finishing position.
 * @returns {{
 *   real: { driverId: string, position: number, points: number }[],
 *   whatIf: { driverId: string, position: number, points: number }[],
 *   removedIndex: number,
 *   removedCount: number,
 * }}
 */
export function computeWhatIf(classification, removedDrivers, scale) {
  const real = scoreClassification(classification, scale);
  const removedSet = new Set(
    Array.isArray(removedDrivers)
      ? removedDrivers
      : removedDrivers instanceof Set
        ? Array.from(removedDrivers)
        : [removedDrivers]
  );

  const whatIfClassification = classification.filter((id) => !removedSet.has(id));
  const whatIf = scoreClassification(whatIfClassification, scale);

  const firstRemoved = typeof removedDrivers === 'string' ? removedDrivers : [...removedSet][0];
  const removedIndex = classification.indexOf(firstRemoved);

  return {
    real,
    whatIf,
    removedIndex,
    removedCount: classification.length - whatIfClassification.length,
  };
}

/**
 * Accumulate cumulative driver points across rounds.
 *
 * @param {Array<{ driverId: string, points: number }[]>} roundResults
 *   Array of per-round scored results (race + sprint combined if applicable).
 * @returns {Array<{ driverId: string, points: number }[]>} Array of cumulative points, one per round.
 */
export function accumulatePoints(roundResults) {
  const totals = new Map(); // driverId -> running total

  return roundResults.map((results) => {
    for (const { driverId, points } of results) {
      totals.set(driverId, (totals.get(driverId) ?? 0) + points);
    }
    // Return a snapshot of all totals sorted by points desc
    return [...totals.entries()]
      .map(([driverId, points]) => ({ driverId, points }))
      .sort((a, b) => b.points - a.points || a.driverId.localeCompare(b.driverId));
  });
}

/**
 * Assign positions to a sorted standings snapshot.
 * Ties get the same position (same points = same position).
 *
 * @param {Array<object>} sorted - Sorted by points desc.
 * @returns {Array<object>} Same objects with `position` property added.
 */
export function assignPositions(sorted) {
  let pos = 1;
  return sorted.map((entry, idx) => {
    if (idx > 0 && sorted[idx - 1].points > entry.points) {
      pos = idx + 1;
    }
    return { ...entry, position: pos };
  });
}

/**
 * Accumulate cumulative constructor points across rounds.
 *
 * @param {Array<{ driverId: string, points: number }[]>} roundResults
 * @param {Record<string, { constructorId: string, constructor?: string }>} driversMap
 * @returns {Array<Array<{ constructorId: string, points: number, position: number }>>}
 */
export function accumulateConstructorStandings(roundResults, driversMap) {
  const totals = new Map(); // constructorId -> running total

  return roundResults.map((results) => {
    for (const { driverId, points } of results) {
      const constructorId = driversMap[driverId]?.constructorId || 'unknown';
      if (constructorId === 'unknown' || TOP_TEAMS.includes(constructorId)) continue;
      totals.set(constructorId, (totals.get(constructorId) ?? 0) + points);
    }

    const sorted = [...totals.entries()]
      .map(([constructorId, points]) => ({ constructorId, points }))
      .sort((a, b) => b.points - a.points || a.constructorId.localeCompare(b.constructorId));

    return assignPositions(sorted);
  });
}
