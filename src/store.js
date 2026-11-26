// Users, sessions and saved progress, all kept in memory and saved as one snapshot.
// Passwords are hashed with scrypt and a per-user salt. Session tokens are random and only
// their SHA-256 hash is stored, so a leaked snapshot can't be used to log in.

const crypto = require("crypto");

const SESSION_DAYS = 60;
const MAX_PROGRESS_BYTES = 300_000;
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

function scrypt(password, salt) {
  return new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key))));
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

function createStore() {
  let users = {};     // username -> { id, username, salt, hash, createdAt }
  let sessions = {};  // sha256(token) -> { username, expiresAt }
  let progress = {};  // username -> { data, updatedAt }
  let board = {};     // username -> { xp, streak, show }

  return {
    exportState: () => ({ v: 1, users, sessions, progress, board }),
    importState(s) {
      if (!s) return;
      users = s.users || {}; sessions = s.sessions || {}; progress = s.progress || {}; board = s.board || {};
    },

    normaliseUsername(u) { return String(u || "").trim().toLowerCase(); },
    validUsername(u) { return USERNAME_RE.test(u); },

    async createUser(username, password) {
      if (users[username]) return { error: "taken" };
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = (await scrypt(password, salt)).toString("hex");
      users[username] = { id: crypto.randomUUID(), username, salt, hash, createdAt: Date.now() };
      return { user: users[username] };
    },

    async checkPassword(username, password) {
      const u = users[username];
      // Hash anyway when the user doesn't exist, so response time doesn't reveal usernames
      const salt = u ? u.salt : "0".repeat(32);
      const key = await scrypt(password, salt);
      if (!u) return null;
      const ok = crypto.timingSafeEqual(key, Buffer.from(u.hash, "hex"));
      return ok ? u : null;
    },

    newSession(username) {
      const token = crypto.randomBytes(32).toString("base64url");
      sessions[sha256(token)] = { username, expiresAt: Date.now() + SESSION_DAYS * 864e5 };
      return token;
    },
    userForToken(token) {
      if (!token) return null;
      const s = sessions[sha256(token)];
      if (!s) return null;
      if (s.expiresAt < Date.now()) { delete sessions[sha256(token)]; return null; }
      return users[s.username] || null;
    },
    endSession(token) { if (token) delete sessions[sha256(token)]; },
    pruneSessions() {
      const now = Date.now();
      for (const [k, s] of Object.entries(sessions)) if (s.expiresAt < now) delete sessions[k];
    },

    getProgress(username) { return progress[username]?.data ?? null; },
    saveProgress(username, data) {
      const text = JSON.stringify(data);
      if (text.length > MAX_PROGRESS_BYTES) return { error: "too_big" };
      progress[username] = { data, updatedAt: Date.now() };
      const xp = Number(data?.xp) || 0;
      const streak = Number(data?.streak?.count) || 0;
      board[username] = { xp: Math.max(0, Math.min(xp, 1e7)), streak: Math.max(0, Math.min(streak, 10000)), show: !!data?.settings?.leaderboard };
      return { ok: true };
    },
    leaderboard(limit = 20) {
      return Object.entries(board)
        .filter(([, b]) => b.show)
        .sort((a, b) => b[1].xp - a[1].xp)
        .slice(0, limit)
        .map(([username, b]) => ({ username, xp: b.xp, streak: b.streak }));
    },
    count: () => Object.keys(users).length,
  };
}

module.exports = { createStore };
