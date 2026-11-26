// Sparky Prep server. No npm dependencies: Node's http module serves the site and a small
// JSON API for accounts and saved progress. Run with `npm start` (http://localhost:8080).

const http = require("http");
const fs = require("fs");
const path = require("path");
const { createStore } = require("./src/store");
const { backendFromEnv, createPersistence } = require("./src/persist");

const PORT = Number(process.env.PORT) || 8080;
const PUBLIC = path.join(__dirname, "public");
const COOKIE = "sp_session";
const PROD = process.env.NODE_ENV === "production";

const store = createStore();
const backend = backendFromEnv();
const commit = createPersistence(() => store.exportState(), backend);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; " +
    " img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

// ---- rate limiting: failed logins per IP and per username -------------------------------
const attempts = new Map(); // key -> { n, until }
function limited(key) {
  const a = attempts.get(key);
  return a && a.n >= 8 && a.until > Date.now();
}
function noteFail(key) {
  const a = attempts.get(key);
  const fresh = !a || a.until < Date.now();
  attempts.set(key, { n: fresh ? 1 : a.n + 1, until: Date.now() + 15 * 60_000 });
}
const signups = new Map(); // ip -> { n, until }
function signupLimited(ip) {
  const s = signups.get(ip);
  if (!s || s.until < Date.now()) { signups.set(ip, { n: 1, until: Date.now() + 60 * 60_000 }); return false; }
  s.n += 1;
  return s.n > 15;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
  for (const [k, v] of signups) if (v.until < now) signups.delete(k);
  store.pruneSessions();
}, 10 * 60_000).unref();

// ---- helpers ---------------------------------------------------------------------------
function send(res, status, body, headers = {}) {
  const isObj = typeof body === "object" && !Buffer.isBuffer(body);
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    ...(isObj ? { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } : {}),
    ...headers,
  });
  res.end(isObj ? JSON.stringify(body) : body);
}

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function sessionCookie(token, maxAgeDays) {
  const secure = PROD ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.round(maxAgeDays * 86400)}${secure}`;
}

function clientIp(req) {
  return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "?";
}

function readJson(req, limit = 400_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error("too big"), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch { reject(Object.assign(new Error("bad json"), { status: 400 })); }
    });
    req.on("error", reject);
  });
}

// Writes must come from our own pages: JSON content type plus a matching Origin when present.
function sameOrigin(req) {
  if (!(req.headers["content-type"] || "").startsWith("application/json")) return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

// ---- API -------------------------------------------------------------------------------
async function api(req, res, url) {
  const token = cookies(req)[COOKIE];
  const user = store.userForToken(token);
  const route = `${req.method} ${url.pathname}`;

  if (req.method !== "GET" && !sameOrigin(req)) return send(res, 403, { error: "bad_origin" });

  if (route === "GET /api/me") {
    if (!user) return send(res, 200, { user: null });
    return send(res, 200, { user: { username: user.username, createdAt: user.createdAt }, progress: store.getProgress(user.username) });
  }

  if (route === "POST /api/signup") {
    const ip = clientIp(req);
    if (signupLimited(ip)) return send(res, 429, { error: "slow_down", message: "Too many new accounts from here. Try again later." });
    const body = await readJson(req);
    const username = store.normaliseUsername(body.username);
    const password = String(body.password || "");
    if (!store.validUsername(username))
      return send(res, 400, { error: "username", message: "Usernames are 3–20 characters: letters, numbers, dots or underscores." });
    if (password.length < 6 || password.length > 200)
      return send(res, 400, { error: "password", message: "Use a password of at least 6 characters." });
    if (password.toLowerCase() === username)
      return send(res, 400, { error: "password", message: "Your password can't be the same as your username." });
    const result = await store.createUser(username, password);
    if (result.error === "taken") return send(res, 409, { error: "taken", message: "That username is taken. Try another." });
    if (body.progress && typeof body.progress === "object") store.saveProgress(username, body.progress);
    const t = store.newSession(username);
    await commit();
    return send(res, 201, { user: { username } }, { "Set-Cookie": sessionCookie(t, 60) });
  }

  if (route === "POST /api/login") {
    const body = await readJson(req);
    const username = store.normaliseUsername(body.username);
    const ip = clientIp(req);
    if (limited("ip:" + ip) || limited("u:" + username))
      return send(res, 429, { error: "slow_down", message: "Too many tries. Wait 15 minutes and try again." });
    const u = await store.checkPassword(username, String(body.password || ""));
    if (!u) {
      noteFail("ip:" + ip); noteFail("u:" + username);
      return send(res, 401, { error: "wrong", message: "That username and password don't match." });
    }
    attempts.delete("u:" + username);
    const t = store.newSession(u.username);
    await commit();
    return send(res, 200, { user: { username: u.username }, progress: store.getProgress(u.username) }, { "Set-Cookie": sessionCookie(t, 60) });
  }

  if (route === "POST /api/logout") {
    store.endSession(token);
    await commit();
    return send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
  }

  if (route === "PUT /api/progress") {
    if (!user) return send(res, 401, { error: "signed_out" });
    const body = await readJson(req);
    if (!body.progress || typeof body.progress !== "object") return send(res, 400, { error: "bad_progress" });
    const r = store.saveProgress(user.username, body.progress);
    if (r.error) return send(res, 413, { error: r.error });
    await commit();
    return send(res, 200, { ok: true });
  }

  if (route === "GET /api/leaderboard") {
    return send(res, 200, { board: store.leaderboard(20) });
  }

  return send(res, 404, { error: "not_found" });
}

// ---- static files ----------------------------------------------------------------------
function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) return send(res, 403, "Forbidden");
  fs.stat(file, (err, st) => {
    // Unknown paths fall back to the app shell so links like /maths work on refresh
    if ((err || !st.isFile()) && path.extname(p)) return send(res, 404, "Not found");
    const target = !err && st.isFile() ? file : path.join(PUBLIC, "index.html");
    const ext = path.extname(target);
    const cache = ext === ".html" ? "no-cache" : "public, max-age=3600";
    fs.readFile(target, (e, data) => {
      if (e) return send(res, 404, "Not found");
      send(res, 200, data, { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": cache });
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (url.pathname === "/healthz") return send(res, 200, { ok: true });
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
    serveStatic(req, res, url);
  } catch (err) {
    if (err.status) return send(res, err.status, { error: err.message });
    console.error(err);
    send(res, 500, { error: "server_error" });
  }
});

(async () => {
  store.importState(await backend.read());
  server.listen(PORT, () => console.log(`Sparky Prep on http://localhost:${PORT} (storage: ${backend.kind}, users: ${store.count()})`));
})().catch((err) => {
  console.error("Could not load saved data", err);
  process.exit(1);
});
