import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function workflow(filename) {
  return readFileSync(new URL('../.github/workflows/' + filename, import.meta.url), 'utf8');
}

test('agente opera sobre main e abre PR sem publicar', () => {
  const yaml = workflow('agent.yml');
  assert.doesNotMatch(yaml, /fix\/filtro-sugestoes/);
  assert.match(yaml, /gh pr create --base main --head/);
  assert.match(yaml, /gh pr list --base main --state open/);
  assert.match(yaml, /python3 scripts\/agent_propose\.py/);
  assert.match(yaml, /ref: main/);
  assert.match(yaml, /GEMINI_API_KEY/);
  assert.doesNotMatch(yaml, /wrangler deploy|cf deploy|curl.*-X POST.*workers\/scripts/);
});

test('monitoramento horario apenas consulta ambos os ambientes', () => {
  const yaml = workflow('monitor.yml');
  assert.match(yaml, /cron: '17 \* \* \* \*'/);
  assert.match(yaml, /vitrine-radar\.ainacio1980-financas\.workers\.dev\/api\/health/);
  assert.match(yaml, /vitrine-radar-filter-staging\.ainacio1980-financas\.workers\.dev\/api\/health/);
  assert.doesNotMatch(yaml, /playwright|npm install|wrangler deploy/);
});

test('testes completos seguem automatizados e verificacao avulsa nao duplica', () => {
  const full = workflow('validate.yml');
  const manual = workflow('verify.yml');
  assert.match(full, /branches: \[main\]/);
  assert.match(full, /mcr\.microsoft\.com\/playwright:v1\.64\.1-noble/);
  assert.match(full, /npm install --no-save playwright@1\.64\.1/);
  assert.match(full, /node tests\/staging-browser\.mjs/);
  assert.match(manual, /workflow_dispatch/);
  assert.doesNotMatch(manual, /schedule:|fix\/filtro-sugestoes/);
  assert.match(manual, /ref: main/);
});

test('incidentes de monitoramento sao registrados e fechados com verificacoes reais', () => {
  const yaml = workflow('monitor.yml');
  assert.match(yaml, /issues: write/);
  assert.match(yaml, /branches: \[main\]/);
  assert.match(yaml, /if: failure\(\)/);
  assert.match(yaml, /if: success\(\)/);
  assert.match(yaml, /gh issue create --title/);
  assert.match(yaml, /gh issue close "\$existing"/);
  assert.match(yaml, /gh issue list --state open/);
  assert.match(yaml, /\[Vitrine Radar\] Incidente de monitoramento/);
  assert.match(yaml, /GITHUB_STEP_SUMMARY/);
  assert.doesNotMatch(yaml, /gh issue create[\s\S]*?gh issue create/);
});

test('o agente agenda inferencia local gratuita mesmo sem chave Gemini', () => {
  const yaml=workflow('agent.yml');
  const python=readFileSync(new URL('../scripts/agent_propose.py',import.meta.url),'utf8');
  assert.match(yaml, /cron: '17 \*\/6 \* \* \*'/);
  assert.match(yaml, /backend=ollama/);
  assert.match(yaml, /docker run -d --name vr-ollama/);
  assert.match(yaml, /ollama pull qwen2\.5-coder:1\.5b/);
  assert.match(yaml, /AI_BACKEND:/);
  assert.match(yaml, /npm run verify/);
  assert.match(yaml, /gh pr create --base main/);
  assert.match(python, /127\.0\.0\.1:11434\/api\/generate/);
  assert.match(python, /qwen2\.5-coder:1\.5b/);
  assert.doesNotMatch(yaml, /wrangler deploy|auto-merge|gh pr merge/);
});
