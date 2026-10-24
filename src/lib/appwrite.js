// src/lib/appwrite.js
// Client wrapper for Appwrite Cloud with support for TablesDB and Databases.
// Includes silent anonymous guest sessions and local-storage fallback.

import { Client, TablesDB, Databases, Account, ID, Query } from 'appwrite';

const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'f1_community';
const TABLE_ID = import.meta.env.VITE_APPWRITE_TABLE_ID || import.meta.env.VITE_APPWRITE_COLLECTION_ID || 'votes';

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

// Initial baseline mock votes for realistic first impressions
const DEFAULT_POLL_COUNTS = {
  golden_ticket: {
    sainz: 42,
    alonso: 38,
    gasly: 14,
    hulkenberg: 19,
    bearman: 22,
    colapinto: 16,
  },
  robbed_award: {
    alonso: 48,
    sainz: 44,
    hulkenberg: 26,
    gasly: 18,
    bearman: 14,
  },
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
 * Cast a vote for a driver in a poll.
 * @param {string} pollId
 * @param {string} driverId
 */
export async function castVote(pollId, driverId) {
  markUserVotedLocally(pollId, driverId);

  // Update local storage instantly
  const local = getLocalVotes(pollId);
  local[driverId] = (local[driverId] || 0) + 1;
  saveLocalVotes(pollId, local);

  if (!isConfigured || (!tablesDB && !databases)) {
    return local;
  }

  try {
    // Ensure anonymous session for guest voting
    if (account) {
      try {
        await account.getSession('current');
      } catch {
        await account.createAnonymousSession();
      }
    }

    const rowData = {
      pollId,
      driverId,
      count: 1,
      timestamp: new Date().toISOString(),
    };

    // Try TablesDB createRow
    if (tablesDB) {
      try {
        await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: TABLE_ID,
          rowId: ID.unique(),
          data: rowData,
        });
        return local;
      } catch (err) {
        // Fallback to Databases
      }
    }

    // Try Databases createDocument
    if (databases) {
      await databases.createDocument(DATABASE_ID, TABLE_ID, ID.unique(), rowData);
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
