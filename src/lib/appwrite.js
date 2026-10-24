// src/lib/appwrite.js
// Client wrapper for Appwrite Cloud with automatic local-storage fallback.
// If VITE_APPWRITE_PROJECT_ID is provided, it syncs with Appwrite.
// Otherwise, it works offline in demo/localStorage mode.

import { Client, Databases, Account, ID, Query } from 'appwrite';

const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'f1_community';
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID || 'votes';

export const isConfigured = Boolean(PROJECT_ID);

let client = null;
let databases = null;
let account = null;

if (isConfigured) {
  try {
    client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
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
    tsunoda: 9,
  },
  robbed_award: {
    alonso: 48,
    sainz: 44,
    hulkenberg: 26,
    gasly: 18,
    albon: 12,
  },
};

function getLocalVotes(pollId) {
  try {
    const raw = localStorage.getItem(`f1_poll_${pollId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
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
 * @param {string} pollId ('golden_ticket' | 'robbed_award')
 * @returns {Promise<Record<string, number>>}
 */
export async function getPollVotes(pollId) {
  if (!isConfigured || !databases) {
    return getLocalVotes(pollId);
  }

  try {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal('pollId', pollId),
      Query.limit(100),
    ]);

    const counts = {};
    for (const doc of res.documents) {
      counts[doc.driverId] = (counts[doc.driverId] || 0) + (doc.count || 1);
    }

    // Merge with baseline for display richness
    const baseline = DEFAULT_POLL_COUNTS[pollId] || {};
    for (const [k, v] of Object.entries(baseline)) {
      counts[k] = (counts[k] || 0) + v;
    }

    return counts;
  } catch (err) {
    console.warn('[Appwrite] Fetch error, using local fallback:', err);
    return getLocalVotes(pollId);
  }
}

/**
 * Cast a vote for a driver in a poll.
 * @param {string} pollId
 * @param {string} driverId
 */
export async function castVote(pollId, driverId) {
  markUserVotedLocally(pollId, driverId);

  // Update local storage
  const local = getLocalVotes(pollId);
  local[driverId] = (local[driverId] || 0) + 1;
  saveLocalVotes(pollId, local);

  if (!isConfigured || !databases) {
    return local;
  }

  try {
    // Ensure anonymous session
    if (account) {
      try {
        await account.getSession('current');
      } catch {
        await account.createAnonymousSession();
      }
    }

    await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
      pollId,
      driverId,
      count: 1,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Appwrite] Remote vote sync error (saved locally):', err);
  }

  return local;
}

/**
 * Subscribe to realtime poll updates.
 */
export function subscribeToPoll(pollId, onUpdate) {
  if (!isConfigured || !client) return () => {};

  try {
    const channel = `databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents`;
    return client.subscribe(channel, (response) => {
      if (response.payload?.pollId === pollId) {
        getPollVotes(pollId).then(onUpdate);
      }
    });
  } catch (err) {
    return () => {};
  }
}
