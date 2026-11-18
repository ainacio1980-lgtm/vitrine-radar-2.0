import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyDeployedRelease } from "../scripts/verify-staging-release.mjs";

const sha = "0123456789abcdef0123456789abcdef01234567";
const response = (release_sha = sha, ok = true) => ({
  ok: true, status: 200,
  json: async () => ({ ok, service: "vitrine-radar", database: "connected", offers: 80, release_sha }),
});

test("homologacao confirma SHA exato e D1 sem mutacao", async () => {
  let url;
  let opts;
  const result = await verifyDeployedRelease(sha, "staging", async (u, o) => {
    url = u; opts = o; return response();
  });
  assert.equal(url, "https://vitrine-radar-filter-staging.ainacio1980-financas.workers.dev/api/health");
  assert.equal(opts.method, "GET");
  assert.equal(opts.redirect, "error");
  assert.equal(result.release_sha, sha);
  assert.equal(result.database, "connected");
});

test("recusa SHA do commit divergente", async () => {
  await assert.rejects(verifyDeployedRelease(sha, "staging", async () => response("f".repeat(40))), /Versao divergente/);
});

test("recusa staging sem identidade de commit", async () => {
  await assert.rejects(verifyDeployedRelease(sha, "staging", async () => response(null)), /Versao divergente/);
});

test("recusa GitHub SHA invalido sem acessar rede", async () => {
  await assert.rejects(verifyDeployedRelease("main", "staging", async () => { throw new Error("rede nao deveria ser usada"); }), /GitHub invalido|Commit SHA GitHub invalido/);
});

test("recusa ambiente fora da lista permitida", async () => {
  await assert.rejects(verifyDeployedRelease(sha, "attacker", async () => response()), /Ambiente invalido/);
});

test("recusa falha de saude mesmo com SHA correto", async () => {
  await assert.rejects(verifyDeployedRelease(sha, "staging", async () => response(sha, false)), /Saude do Worker/);
  await assert.rejects(verifyDeployedRelease(sha, "staging", async () => ({ok:false,status:503})), /HTTP 503/);
});

test("producao tem host proprio e exige o mesmo SHA", async () => {
  let url;
  await verifyDeployedRelease(sha, "production", async u => { url=u; return response(); });
  assert.equal(url, "https://vitrine-radar.ainacio1980-financas.workers.dev/api/health");
});

test("Worker expõe RELEASE_SHA validada somente em /api/health", () => {
  const source = readFileSync(new URL("../src/worker.mjs", import.meta.url), "utf8");
  assert.match(source, /release_sha: releaseSha/);
  assert.match(source, /\^\[0-9a-f\]\{40\}\$/);
});
