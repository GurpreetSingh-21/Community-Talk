// backend/utils/presence.js
// In-memory presence tracker (per Node process).
// ⚠️ If you scale to multiple Node instances, back this with Redis or Mongo.

const socketsByUser = new Map();       // userId -> Set<socketId>
const communitiesByUser = new Map();   // userId -> Set<communityId>
const lastSeen = new Map();            // userId -> Date

/**
 * Register a new socket connection.
 * Optionally associate the user with communities.
 */
function connect(userId, socketId, communities = []) {
  if (!userId) return;

  // Track sockets
  const sockSet = socketsByUser.get(userId) || new Set();
  sockSet.add(socketId);
  socketsByUser.set(userId, sockSet);

  // Track communities (optional initial list)
  if (communities.length) {
    const commSet = communitiesByUser.get(userId) || new Set();
    for (const cid of communities) commSet.add(String(cid));
    communitiesByUser.set(userId, commSet);
  }

  // User is online → clear last seen
  lastSeen.delete(userId);
}

/**
 * Remove a socket connection.
 */
function disconnect(userId, socketId) {
  if (!userId) return;

  const sockSet = socketsByUser.get(userId);
  if (sockSet) {
    sockSet.delete(socketId);
    if (sockSet.size === 0) {
      socketsByUser.delete(userId);
      communitiesByUser.delete(userId);
      lastSeen.set(userId, new Date()); // record last seen
    }
  }
}

/**
 * Join a specific community (called when user opens or joins a community).
 */
function joinCommunity(userId, communityId) {
  if (!userId || !communityId) return;
  const commSet = communitiesByUser.get(userId) || new Set();
  commSet.add(String(communityId));
  communitiesByUser.set(userId, commSet);
}

/**
 * Leave a specific community.
 */
function leaveCommunity(userId, communityId) {
  if (!userId || !communityId) return;
  const commSet = communitiesByUser.get(userId);
  if (!commSet) return;
  commSet.delete(String(communityId));
  if (commSet.size === 0) {
    communitiesByUser.delete(userId);
  }
}

/**
 * Check if a user is online globally.
 */
function isOnline(userId) {
  return socketsByUser.has(userId);
}

/**
 * Check if user is online in a given community.
 */
function isOnlineInCommunity(userId, communityId) {
  const commSet = communitiesByUser.get(userId);
  return commSet ? commSet.has(String(communityId)) : false;
}

/**
 * Get all online userIds (global).
 */
function listOnlineUsers() {
  return Array.from(socketsByUser.keys());
}

/**
 * Get all online members of a given community.
 */
function listOnlineInCommunity(communityId) {
  const online = [];
  for (const [uid, commSet] of communitiesByUser.entries()) {
    if (commSet.has(String(communityId))) {
      online.push(uid);
    }
  }
  return online;
}

/**
 * Get last seen timestamp (null if currently online).
 */
function getLastSeen(userId) {
  return isOnline(userId) ? null : lastSeen.get(userId) || null;
}

function getAllOnline() {
  return listOnlineUsers();
}

module.exports = {
  connect,
  disconnect,
  joinCommunity,
  leaveCommunity,
  isOnline,
  isOnlineInCommunity,
  listOnlineUsers,
  listOnlineInCommunity,
  getLastSeen,
  getAllOnline, // 👈 add this
};