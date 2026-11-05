// src/lib/appwrite.js
// Client wrapper for Appwrite Cloud with support for TablesDB and Databases.
// Includes silent anonymous guest sessions and local-storage fallback.

import { Client, TablesDB, Databases, Account, ID, Query } from 'appwrite';

const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'f1_community';
const TABLE_ID = import.meta.env.VITE_APPWRITE_TABLE_ID || import.meta.env.VITE_APPWRITE_COLLECTION_ID || 'votes';
const PREDICTIONS_TABLE_ID = import.meta.env.VITE_APPWRITE_PREDICTIONS_TABLE_ID ||
  import.meta.env.VITE_APPWRITE_PREDICTIONS_COLLECTION_ID || 'predictions';

export const isConfigured = Boolean(PROJECT_ID);

let client = null;
let tablesDB = null;
let databases = null;
let account = null;

if (isConfigured) {
  try {
    client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
    tablesDB = new TablesDB(client);
    databases = new Databases(client);
    account = new Account(client);
  } catch (err) {
    console.warn('[Appwrite] Initialization warning:', err);
  }
}

// Baseline poll counts (empty by default; populated by real Appwrite votes)
const DEFAULT_POLL_COUNTS = {
  golden_ticket: {},
  robbed_award: {},
};

function getLocalVotes(pollId) {
  try {
    const raw = localStorage.getItem(`f1_poll_${pollId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { ...DEFAULT_POLL_COUNTS[pollId] } || {};
}

function saveLocalVotes(pollId, counts) {
  try {
    localStorage.setItem(`f1_poll_${pollId}`, JSON.stringify(counts));
  } catch (e) {}
}

export function hasUserVotedLocally(pollId) {
  try {
    return localStorage.getItem(`f1_voted_${pollId}`) || null;
  } catch (e) {
    return null;
  }
}

export function markUserVotedLocally(pollId, driverId) {
  try {
    localStorage.setItem(`f1_voted_${pollId}`, driverId);
  } catch (e) {}
}

export function getUserVoteDocId(pollId) {
  try {
    return localStorage.getItem(`f1_doc_${pollId}`) || null;
  } catch (e) {
    return null;
  }
}

export function setUserVoteDocId(pollId, docId) {
  try {
    if (docId) {
      localStorage.setItem(`f1_doc_${pollId}`, docId);
    } else {
      localStorage.removeItem(`f1_doc_${pollId}`);
    }
  } catch (e) {}
}

/**
 * Fetch total votes per driver for a given poll.
 * Tries TablesDB first, falls back to Databases, then localStorage.
 * @param {string} pollId ('golden_ticket' | 'robbed_award')
 * @returns {Promise<Record<string, number>>}
 */
export async function getPollVotes(pollId) {
  if (!isConfigured || (!tablesDB && !databases)) {
    return getLocalVotes(pollId);
  }

  const queries = [Query.equal('pollId', pollId), Query.limit(100)];

  // Try TablesDB listRows
  if (tablesDB) {
    try {
      const res = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries,
      });

      const counts = {};
      for (const row of res.rows || []) {
        counts[row.driverId] = (counts[row.driverId] || 0) + (row.count || 1);
      }

      const baseline = DEFAULT_POLL_COUNTS[pollId] || {};
      for (const [k, v] of Object.entries(baseline)) {
        counts[k] = (counts[k] || 0) + v;
      }
      return counts;
    } catch (err) {
      // If table doesn't exist yet or tablesDB failed, try databases.listDocuments below
    }
  }

  // Fallback to Databases listDocuments
  if (databases) {
    try {
      const res = await databases.listDocuments(DATABASE_ID, TABLE_ID, queries);
      const counts = {};
      for (const doc of res.documents || []) {
        counts[doc.driverId] = (counts[doc.driverId] || 0) + (doc.count || 1);
      }
      const baseline = DEFAULT_POLL_COUNTS[pollId] || {};
      for (const [k, v] of Object.entries(baseline)) {
        counts[k] = (counts[k] || 0) + v;
      }
      return counts;
    } catch (err) {
      // Use local fallback
    }
  }

  return getLocalVotes(pollId);
}

/**
 * Cast or change a vote for a driver in a poll.
 * @param {string} pollId
 * @param {string} newDriverId
 * @param {string|null} oldDriverId
 */
export async function castVote(pollId, newDriverId, oldDriverId = null) {
  markUserVotedLocally(pollId, newDriverId);

  // Update local storage instantly
  const local = getLocalVotes(pollId);
  if (oldDriverId && oldDriverId !== newDriverId) {
    local[oldDriverId] = Math.max(0, (local[oldDriverId] || 1) - 1);
  }
  local[newDriverId] = (local[newDriverId] || 0) + 1;
  saveLocalVotes(pollId, local);

  if (!isConfigured || (!tablesDB && !databases)) {
    return local;
  }

  try {
    const rowData = {
      pollId,
      driverId: newDriverId,
      count: 1,
      timestamp: new Date().toISOString(),
    };

    const prevDocId = getUserVoteDocId(pollId);

    // If changing vote and previous document ID is known, attempt to update it
    if (prevDocId && databases) {
      try {
        await databases.updateDocument(DATABASE_ID, TABLE_ID, prevDocId, rowData);
        return local;
      } catch (err) {
        // If update fails (e.g. document deleted or no Update permission), fall through to createDocument
      }
    }

    // Try TablesDB createRow
    if (tablesDB) {
      try {
        const res = await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: TABLE_ID,
          rowId: ID.unique(),
          data: rowData,
        });
        if (res?.$id) setUserVoteDocId(pollId, res.$id);
        return local;
      } catch (err) {
        // fallback to Databases
      }
    }

    // Try Databases createDocument
    if (databases) {
      const doc = await databases.createDocument(DATABASE_ID, TABLE_ID, ID.unique(), rowData);
      if (doc?.$id) {
        setUserVoteDocId(pollId, doc.$id);
      }
    }
  } catch (err) {
    console.warn('[Appwrite] Remote vote sync error (vote saved locally):', err);
  }

  return local;
}

/**
 * Subscribe to realtime poll updates via WebSockets.
 */
export function subscribeToPoll(pollId, onUpdate) {
  if (!isConfigured || !client) return () => {};

  try {
    // Listen to both tables and collections channels
    const channel1 = `databases.${DATABASE_ID}.tables.${TABLE_ID}.rows`;
    const channel2 = `databases.${DATABASE_ID}.collections.${TABLE_ID}.documents`;

    return client.subscribe([channel1, channel2], (response) => {
      if (response.payload?.pollId === pollId) {
        getPollVotes(pollId).then(onUpdate);
      }
    });
  } catch (err) {
    return () => {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Podium Predictions Module
// ─────────────────────────────────────────────────────────────────────────────

function getOrCreateUserId() {
  try {
    let id = localStorage.getItem('f1_user_anon_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('f1_user_anon_id', id);
    }
    return id;
  } catch (e) {
    return 'anon_guest';
  }
}

const DEFAULT_PREDICTIONS = {
  p1: {},
  p2: {},
  p3: {},
};

function getLocalPredictionsTally(round) {
  try {
    const raw = localStorage.getItem(`f1_community_preds_${round}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { p1: {}, p2: {}, p3: {} };
}

function saveLocalPredictionsTally(round, data) {
  try {
    localStorage.setItem(`f1_community_preds_${round}`, JSON.stringify(data));
  } catch (e) {}
}

export function getUserPrediction(round) {
  try {
    const raw = localStorage.getItem(`f1_my_pred_round_${round}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function setUserPrediction(round, prediction) {
  try {
    if (prediction) {
      localStorage.setItem(`f1_my_pred_round_${round}`, JSON.stringify(prediction));
    } else {
      localStorage.removeItem(`f1_my_pred_round_${round}`);
    }
  } catch (e) {}
}

export function getUserPredictionDocId(round) {
  try {
    return localStorage.getItem(`f1_pred_doc_round_${round}`) || null;
  } catch (e) {
    return null;
  }
}

export function setUserPredictionDocId(round, docId) {
  try {
    if (docId) {
      localStorage.setItem(`f1_pred_doc_round_${round}`, docId);
    } else {
      localStorage.removeItem(`f1_pred_doc_round_${round}`);
    }
  } catch (e) {}
}

/**
 * Fetch aggregated community podium predictions for a round.
 * @param {number} round
 * @returns {Promise<{ total: number, p1: Record<string, number>, p2: Record<string, number>, p3: Record<string, number> }>}
 */
export async function getCommunityPredictions(round) {
  const roundNum = Number(round);
  const fallback = getLocalPredictionsTally(roundNum);

  if (!isConfigured || (!tablesDB && !databases)) {
    const total = Object.values(fallback.p1 || {}).reduce((a, b) => a + b, 0);
    return { ...fallback, total: total || 0 };
  }

  const queries = [Query.equal('round', roundNum), Query.limit(100)];
  let items = [];

  if (tablesDB) {
    try {
      const res = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: PREDICTIONS_TABLE_ID,
        queries,
      });
      items = res.rows || [];
    } catch (e) {
      // fallback to databases
    }
  }

  if (items.length === 0 && databases) {
    try {
      const res = await databases.listDocuments(DATABASE_ID, PREDICTIONS_TABLE_ID, queries);
      items = res.documents || [];
    } catch (e) {
      // fallback
    }
  }

  if (items.length > 0) {
    const counts = { p1: {}, p2: {}, p3: {} };
    for (const item of items) {
      if (item.p1) counts.p1[item.p1] = (counts.p1[item.p1] || 0) + 1;
      if (item.p2) counts.p2[item.p2] = (counts.p2[item.p2] || 0) + 1;
      if (item.p3) counts.p3[item.p3] = (counts.p3[item.p3] || 0) + 1;
    }
    const total = items.length;
    saveLocalPredictionsTally(roundNum, counts);
    return { ...counts, total };
  }

  const total = Object.values(fallback.p1 || {}).reduce((a, b) => a + b, 0);
  return { ...fallback, total: total || 0 };
}

/**
 * Save or update the user's podium prediction for a round.
 * @param {number} round
 * @param {{ p1: string, p2: string, p3: string }} prediction
 */
export async function saveUserPrediction(round, { p1, p2, p3 }) {
  const roundNum = Number(round);
  const userId = getOrCreateUserId();
  const timestamp = new Date().toISOString();

  const prev = getUserPrediction(roundNum);
  const predictionRecord = { p1, p2, p3, lockedAt: timestamp };
  setUserPrediction(roundNum, predictionRecord);

  // Update local tally immediately for instantaneous UI responsiveness
  const localTally = getLocalPredictionsTally(roundNum);
  if (prev) {
    if (prev.p1 && localTally.p1[prev.p1]) localTally.p1[prev.p1] = Math.max(0, localTally.p1[prev.p1] - 1);
    if (prev.p2 && localTally.p2[prev.p2]) localTally.p2[prev.p2] = Math.max(0, localTally.p2[prev.p2] - 1);
    if (prev.p3 && localTally.p3[prev.p3]) localTally.p3[prev.p3] = Math.max(0, localTally.p3[prev.p3] - 1);
  }
  localTally.p1[p1] = (localTally.p1[p1] || 0) + 1;
  localTally.p2[p2] = (localTally.p2[p2] || 0) + 1;
  localTally.p3[p3] = (localTally.p3[p3] || 0) + 1;
  saveLocalPredictionsTally(roundNum, localTally);

  if (!isConfigured || (!tablesDB && !databases)) {
    return predictionRecord;
  }

  const docId = getUserPredictionDocId(roundNum);
  const rowData = {
    round: roundNum,
    userId,
    p1,
    p2,
    p3,
    timestamp,
  };

  try {
    if (docId && databases) {
      try {
        await databases.updateDocument(DATABASE_ID, PREDICTIONS_TABLE_ID, docId, rowData);
        return predictionRecord;
      } catch (err) {
        // if update failed, fallback to create
      }
    }

    if (tablesDB) {
      try {
        const res = await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: PREDICTIONS_TABLE_ID,
          rowId: ID.unique(),
          data: rowData,
        });
        if (res?.$id) setUserPredictionDocId(roundNum, res.$id);
        return predictionRecord;
      } catch (e) {
        // fallback to databases
      }
    }

    if (databases) {
      const doc = await databases.createDocument(DATABASE_ID, PREDICTIONS_TABLE_ID, ID.unique(), rowData);
      if (doc?.$id) {
        setUserPredictionDocId(roundNum, doc.$id);
      }
    }
  } catch (err) {
    console.warn('[Appwrite] Remote prediction sync error (saved locally):', err);
  }

  return predictionRecord;
}

/**
 * Subscribe to realtime prediction updates for a round.
 */
export function subscribeToPredictions(round, onUpdate) {
  if (!isConfigured || !client) return () => {};

  try {
    const roundNum = Number(round);
    const channel1 = `databases.${DATABASE_ID}.tables.${PREDICTIONS_TABLE_ID}.rows`;
    const channel2 = `databases.${DATABASE_ID}.collections.${PREDICTIONS_TABLE_ID}.documents`;

    return client.subscribe([channel1, channel2], (response) => {
      if (Number(response.payload?.round) === roundNum) {
        getCommunityPredictions(roundNum).then(onUpdate);
      }
    });
  } catch (err) {
    return () => {};
  }
}
