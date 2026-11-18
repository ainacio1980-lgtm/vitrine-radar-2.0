#!/usr/bin/env node
// Usage: node scripts/prepare-partner-feed.mjs export.json candidates.csv [existing-links.json]
// All files are local. No HTTP requests, no database writes and no publication.
import { readFile, writeFile } from "node:fs/promises";
import { preparePartnerExport } from "../src/partner_feed.mjs";

async function main() {
  const [input, output, existingFile] = process.argv.slice(2);
  if (!input || !output || input === output || !output.endsWith(".csv")) {
    throw new Error("Uso: node scripts/prepare-partner-feed.mjs export.json candidatos.csv [existing-links.json]");
  }
  const data = JSON.parse(await readFile(input, "utf8"));
  const existingUrls = existingFile ? JSON.parse(await readFile(existingFile, "utf8")) : [];
  if (!Array.isArray(existingUrls) || !existingUrls.every(item => typeof item === "string")) {
    throw new Error("O arquivo de links existentes deve ser um array JSON de URLs.");
  }
  const result = preparePartnerExport(data, { existingUrls });
  await writeFile(output, result.csv, { encoding: "utf8", flag: "w", mode: 0o600 });
  const reportPath = output.replace(/\.csv$/, ".report.json");
  await writeFile(reportPath, JSON.stringify(result.report, null, 2) + "\n", { encoding: "utf8", flag: "w", mode: 0o600 });
  console.log(JSON.stringify({
    csv: output, report: reportPath, received: result.report.received,
    accepted: result.report.accepted, rejected: result.report.rejected,
    duplicates: result.report.duplicates, published: 0,
  }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
