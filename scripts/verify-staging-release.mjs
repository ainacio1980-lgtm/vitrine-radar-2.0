// Read-only deployment identity check. Never deploys, changes bindings, or touches D1.
const DEPLOYMENTS = Object.freeze({
  staging: "https://vitrine-radar-filter-staging.ainacio1980-financas.workers.dev",
  production: "https://vitrine-radar.ainacio1980-financas.workers.dev",
});
const SHA = /^[a-f0-9]{40}$/;

export async function verifyDeployedRelease(expectedSha, environment = "staging", fetcher = fetch) {
  if (!SHA.test(expectedSha ?? "")) throw new Error("Commit SHA GitHub invalido: exige 40 caracteres hexadecimais");
  const origin = DEPLOYMENTS[environment];
  if (!origin) throw new Error("Ambiente invalido: use staging ou production");
  const response = await fetcher(origin + "/api/health", {
    method: "GET",
    redirect: "error",
    cache: "no-store",
    headers: { "accept": "application/json", "cache-control": "no-cache" },
  });
  if (!response.ok) throw new Error("Endpoint de saude indisponivel: HTTP " + response.status);
  const body = await response.json();
  if (body?.ok !== true || body?.database !== "connected" || body?.service !== "vitrine-radar") {
    throw new Error("Saude do Worker ou conexao D1 nao comprovada");
  }
  if (body.release_sha !== expectedSha) {
    throw new Error("Versao divergente ou sem etiqueta imutavel de commit: esperado " +
      expectedSha + ", encontrado " + String(body.release_sha ?? "ausente"));
  }
  return { environment, release_sha: expectedSha, database: "connected", offers: body.offers };
}

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  verifyDeployedRelease(process.argv[2], process.argv[3] || "staging").then(result => {
    process.stdout.write("Versao confirmada no ambiente " + result.environment + ": " + result.release_sha + "\n");
  }).catch(error => {
    console.error("Publicacao NAO autorizada: " + error.message);
    process.exitCode = 1;
  });
}
