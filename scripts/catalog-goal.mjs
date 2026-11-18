// Meta de produtos aferida somente pelo catalogo publico, sem consulta privada ou writes.
import { checkCatalog } from './check-public-catalog.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

export const GOAL = 500;
export const START = '<!-- VR_CATALOG_GOAL_START -->';
export const END = '<!-- VR_CATALOG_GOAL_END -->';

export async function catalogGoal(origin, fetcher=fetch) {
  const result = await checkCatalog(origin, fetcher);
  return {
    published: result.offers,
    target: GOAL,
    remaining: Math.max(0, GOAL - result.offers),
    percent: Math.min(100, Math.round(1000 * result.offers / GOAL) / 10),
  };
}

export function updateIssueBody(body, metrics) {
  if (typeof body !== 'string') throw new Error('Issue body deve ser texto');
  if (!Number.isSafeInteger(metrics?.published) || metrics.published < 0 ||
      metrics.target !== GOAL || metrics.remaining !== Math.max(0, GOAL - metrics.published)) {
    throw new Error('Resumo de catalogo inconsistente');
  }
  const start = body.indexOf(START), end = body.indexOf(END);
  if ((start === -1) !== (end === -1) || (start !== -1 && end < start)) {
    throw new Error('Marcadores do relatorio alterados; nenhuma edicao');
  }
  const content = [
    START,
    '### Andamento verificado automaticamente (catálogo público)',
    '**Publicadas:** ' + metrics.published + ' / ' + GOAL +
      ' | **Faltam:** ' + metrics.remaining + ' | **Progresso:** ' + metrics.percent + '%',
    'Fonte: API pública de ofertas. Produtos pendentes ou pausados não contam. ' +
      'Este número não garante estoque, comissão ou preço atual.',
    END
  ].join('\n');
  if (start === -1) return body.trimEnd() + '\n\n' + content + '\n';
  const existing = body.slice(start, end + END.length);
  // Evitar edicoes e notificacoes no GitHub quando a meta permanece identica.
  if (existing === content) return body;
  return body.slice(0, start) + content + body.slice(end + END.length);
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  if (process.argv[2] === '--snapshot') {
    const origin = process.argv[3] || 'https://vitrine-radar.ainacio1980-financas.workers.dev';
    const goal = await catalogGoal(origin);
    console.log(JSON.stringify(goal));
  } else if (process.argv[2] === '--update-issue' && process.argv.length === 6) {
    const input = readFileSync(process.argv[3], 'utf8');
    const goal = JSON.parse(readFileSync(process.argv[4], 'utf8'));
    writeFileSync(process.argv[5], updateIssueBody(input, goal));
  } else {
    throw new Error('Uso: --snapshot [origin] ou --update-issue input snapshot output');
  }
}
