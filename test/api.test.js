// End-to-end checks of the account API against a real server on a random port.
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const PORT = 18000 + Math.floor(Math.random() * 1000);
const base = `http://127.0.0.1:${PORT}`;
const dataFile = path.join(os.tmpdir(), `sp-test-${PORT}.json`);
let proc;

before(async () => {
  proc = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: { ...process.env, PORT: String(PORT), DATA_FILE: dataFile, NODE_ENV: "test" },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base + "/healthz")).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
});
after(() => { proc.kill(); fs.rmSync(dataFile, { force: true }); });

const json = (method, url, body, cookie) =>
  fetch(base + url, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

test("sign up, save progress, log out, log back in", async () => {
  let r = await json("POST", "/api/signup", { username: "Test.User", password: "volts123" });
  assert.equal(r.status, 201);
  const cookie = r.headers.get("set-cookie").split(";")[0];
  assert.match(cookie, /^sp_session=/);

  r = await json("PUT", "/api/progress", { progress: { xp: 120, settings: { leaderboard: true } } }, cookie);
  assert.equal(r.status, 200);

  r = await fetch(base + "/api/me", { headers: { Cookie: cookie } });
  const me = await r.json();
  assert.equal(me.user.username, "test.user");
  assert.equal(me.progress.xp, 120);

  r = await json("POST", "/api/logout", {}, cookie);
  assert.equal(r.status, 200);
  r = await fetch(base + "/api/me", { headers: { Cookie: cookie } });
  assert.equal((await r.json()).user, null);

  r = await json("POST", "/api/login", { username: "TEST.USER", password: "volts123" });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).progress.xp, 120);

});

test("wrong password, duplicate and invalid usernames are refused", async () => {
  await json("POST", "/api/signup", { username: "amp_hour", password: "secret1" });
  assert.equal((await json("POST", "/api/login", { username: "amp_hour", password: "nope123" })).status, 401);
  assert.equal((await json("POST", "/api/signup", { username: "amp_hour", password: "secret1" })).status, 409);
  assert.equal((await json("POST", "/api/signup", { username: "a", password: "secret1" })).status, 400);
  assert.equal((await json("POST", "/api/signup", { username: "has space", password: "secret1" })).status, 400);
  assert.equal((await json("POST", "/api/signup", { username: "shorty", password: "123" })).status, 400);
});

test("progress needs a session and writes need JSON from our origin", async () => {
  assert.equal((await json("PUT", "/api/progress", { progress: {} })).status, 401);
  const r = await fetch(base + "/api/login", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.example" }, body: "{}" });
  assert.equal(r.status, 403);
  const form = await fetch(base + "/api/login", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" });
  assert.equal(form.status, 403);
});

test("repeated wrong passwords get rate limited", async () => {
  await json("POST", "/api/signup", { username: "ohm_law", password: "secret1" });
  let last;
  for (let i = 0; i < 10; i++) last = await json("POST", "/api/login", { username: "ohm_law", password: "wrong" + i });
  assert.equal(last.status, 429);
});

test("progress survives a restart via the data file", async () => {
  const saved = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  assert.ok(saved.users["test.user"]);
  assert.ok(!JSON.stringify(saved).includes("volts123"), "password must not be stored in plain text");
});
