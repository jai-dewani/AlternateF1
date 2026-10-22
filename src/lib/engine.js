// src/lib/engine.js
// Pure scoring engine: given a race classification and a points scale,
// re-scores the result after removing the specified driver.
// No side effects, no imports, importable by Node scripts and the browser.

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
 * Remove a driver from a classification and re-score.
 * Drivers ahead of the removed driver keep their position.
 * Drivers behind move up one place.
 *
 * @param {string[]} classification - Ordered list of driver IDs (1st to last).
 * @param {string} removedDriverId - The driver to remove.
 * @param {number[]} scale - Points awarded per finishing position.
 * @returns {{
 *   real: { driverId: string, position: number, points: number }[],
 *   whatIf: { driverId: string, position: number, points: number }[],
 *   removedIndex: number,
 * }}
 */
export function computeWhatIf(classification, removedDriverId, scale) {
  const real = scoreClassification(classification, scale);
  const removedIndex = classification.indexOf(removedDriverId);

  // If the removed driver isn't in this classification, whatIf == real
  if (removedIndex === -1) {
    return { real, whatIf: real.map((r) => ({ ...r })), removedIndex };
  }

  const whatIfClassification = classification.filter((id) => id !== removedDriverId);
  const whatIf = scoreClassification(whatIfClassification, scale);

  return { real, whatIf, removedIndex };
}

/**
 * Accumulate cumulative points across rounds.
 *
 * @param {Array<{ driverId: string, points: number }[]>} roundResults
 *   Array of per-round scored results (race + sprint combined if applicable).
 * @returns {Map<string, number[]>} Map from driverId to array of cumulative points, one per round.
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
 * @param {{ driverId: string, points: number }[]} sorted - Sorted by points desc.
 * @returns {{ driverId: string, points: number, position: number }[]}
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
