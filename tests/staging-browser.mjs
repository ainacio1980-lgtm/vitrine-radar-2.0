import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const url = 'https://vitrine-radar-filter-staging.ainacio1980-financas.workers.dev/';
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage();
  await page.goto(url, {waitUntil:'domcontentloaded', timeout:30000});
  await page.locator('#q').waitFor({timeout:15000});
  await page.waitForFunction(() => window.vitrineCatalog?.ready !== undefined || document.querySelector('#cards')?.children.length > 0, {timeout:15000}).catch(()=>{});
  // Validate the live browser functions, not just the module's Node.js tests.
  const matches = await page.evaluate(() => {
    const query = productSearchTerms('Poco X8 Pro 8 GB/256 GB preto');
    const matchesProduct = title => query.prefixes.every(token =>
      (' ' + normalizeProductSearch(title) + ' ').includes(token));
    return {
      exact: matchesProduct('POCO X8 PRO 8GB 256GB PRETO'),
      otherModel: matchesProduct('Poco X80 Pro 8GB 256GB preto'),
      otherMemory: matchesProduct('Poco X8 Pro 12GB 256GB preto'),
      otherStorage: matchesProduct('Poco X8 Pro 8GB 128GB preto'),
      otherColor: matchesProduct('Poco X8 Pro 8GB 256GB branco'),
    };
  });
  assert.deepEqual(matches, {
    exact: true, otherModel: false, otherMemory: false,
    otherStorage: false, otherColor: false,
  }, 'Filtro de especificações em homologação difere do código validado');

  await page.locator('#q').fill('celular');
  const options = page.locator('#vr-suggestions button[role="option"]');
  await options.first().waitFor({state:'visible',timeout:15000});
  const chosen = await options.first().innerText();
  await options.first().click();
  assert.equal(await page.locator('#vr-suggestions').getAttribute('style').then(s=>s.includes('display: none') || s.includes('display:none')), true, 'Sugestões não ocultadas após clique');
  assert.ok((await page.locator('#q').inputValue()).length > 3, 'Busca não preenchida');
  const count = await page.locator('#result-count').innerText();
  console.log(JSON.stringify({chosen,count,search:await page.locator('#q').inputValue()}));
} finally { await browser.close(); }
