// Durable storage. The store lives in memory; after each change we save a full JSON snapshot.
// Changes that arrive while a save is running share the next save, so a burst of answers
// from a class costs a handful of writes, not one each.
//
// Backends (picked from the environment):
//   gcs    - one JSON object in a Cloud Storage bucket (production: STORAGE_BUCKET)
//   file   - a local JSON file (development: DATA_FILE)
//   memory - nothing is saved (tests)
//
// Cloud Storage writes use ifGenerationMatch, so a second instance can never silently
// overwrite newer data. Deploy with --max-instances=1 so there is only ever one writer.

const fs = require("fs");
const path = require("path");

function memoryBackend() {
  return { kind: "memory", async read() { return null; }, async write() {} };
}

function fileBackend(file) {
  return {
    kind: "file",
    async read() {
      try {
        return JSON.parse(await fs.promises.readFile(file, "utf8"));
      } catch (err) {
        if (err.code === "ENOENT") return null;
        throw err;
      }
    },
    async write(text) {
      await fs.promises.mkdir(path.dirname(path.resolve(file)), { recursive: true });
      const tmp = file + ".tmp";
      await fs.promises.writeFile(tmp, text);
      await fs.promises.rename(tmp, file);
    },
  };
}

// Talks to the Cloud Storage JSON API with fetch, using the Cloud Run service account token
// from the metadata server. No client library needed.
function gcsBackend(bucket, object) {
  let generation = "0";
  let cached = null;

  async function token() {
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
    const res = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
      headers: { "Metadata-Flavor": "Google" },
    });
    if (!res.ok) throw new Error(`metadata token request failed: ${res.status}`);
    const body = await res.json();
    cached = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
    return cached.token;
  }

  async function retry(fn) {
    let last;
    for (let i = 0; i < 5; i++) {
      try { return await fn(); } catch (err) {
        if (err.permanent) throw err;
        last = err;
        await new Promise((r) => setTimeout(r, 200 * 2 ** i));
      }
    }
    throw last;
  }

  const fail = (res, what) => {
    const err = new Error(`${what} failed: ${res.status}`);
    err.permanent = res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429;
    return err;
  };

  return {
    kind: "gcs",
    async read() {
      return retry(async () => {
        const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(object)}?alt=media`;
        const res = await fetch(url, { headers: { Authorization: "Bearer " + (await token()) } });
        if (res.status === 404) { generation = "0"; return null; }
        if (!res.ok) throw fail(res, "Cloud Storage read");
        generation = res.headers.get("x-goog-generation") || generation;
        return JSON.parse(await res.text());
      });
    },
    async write(text) {
      return retry(async () => {
        const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o` +
          `?uploadType=media&name=${encodeURIComponent(object)}&ifGenerationMatch=${generation}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: "Bearer " + (await token()), "Content-Type": "application/json" },
          body: text,
        });
        if (!res.ok) throw fail(res, "Cloud Storage write");
        generation = String((await res.json()).generation);
      });
    },
  };
}

function backendFromEnv(env = process.env) {
  if (env.STORAGE_BUCKET) return gcsBackend(env.STORAGE_BUCKET, env.STORAGE_OBJECT || "sparky-prep.json");
  if (env.DATA_FILE) return fileBackend(env.DATA_FILE);
  return memoryBackend();
}

// Group commit: resolves once everything changed before the call is saved.
function createPersistence(exportState, backend) {
  let writing = null;
  let pending = null;

  async function run() {
    await (writing ? writing.catch(() => {}) : null);
    pending = null;
    const job = backend.write(JSON.stringify(exportState()));
    writing = job;
    try { await job; } finally { if (writing === job) writing = null; }
  }

  return function commit() {
    if (backend.kind === "memory") return Promise.resolve();
    if (!pending) pending = run();
    return pending;
  };
}

module.exports = { backendFromEnv, createPersistence, fileBackend, memoryBackend };
