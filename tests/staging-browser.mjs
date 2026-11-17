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
  const chosenProduct = await page.evaluate(() => {
    const item = vitrineCatalog.findOffers('celular', 8).offers[0];
    return { id: item.id, title: item.title, merchant: item.merchant };
  });
  await options.first().click();
  assert.equal(await page.locator('#vr-suggestions').getAttribute('style').then(s=>s.includes('display: none') || s.includes('display:none')), true, 'Sugestões não ocultadas após clique');
  assert.equal(await page.locator('#q').inputValue(), chosenProduct.title, 'Busca não preenchida com o título selecionado');
  assert.equal(await page.locator('#cards article.card').count(), 1, 'Uma seleção deve exibir exatamente um card');
  assert.equal(await page.locator('#cards article.card a.product-title').getAttribute('href'), '/ofertas/' + chosenProduct.id, 'Card exibido corresponde a outro ID');
  assert.equal(await page.locator('#cards article.card .merchant').innerText(), chosenProduct.merchant, 'Loja incorreta no card');
  assert.match(await page.locator('#result-count').innerText(), /^1 de \d+ ofertas$/, 'Contagem incorreta após seleção');

  // After selecting, editing the query must drop the ID lock.
  await page.locator('#q').fill('celular');
  assert.ok(await page.locator('#vr-suggestions button[role="option"]').count() > 0, 'Editar a busca deve reabrir sugestões');

  // Native keyboard activation with ArrowDown/Enter should select one offer.
  await page.locator('#q').press('ArrowDown');
  assert.equal(await page.locator('#vr-suggestions button[role="option"]').first().evaluate(el => el === document.activeElement), true, 'ArrowDown não moveu o foco');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#cards article.card').count(), 1, 'Enter selecionou mais de um card');
  assert.equal(await page.locator('#cards article.card a.product-title').getAttribute('href'), '/ofertas/' + chosenProduct.id, 'Enter perdeu o ID selecionado');

  // Reset must restore all products and clear the selected ID.
  await page.locator('#clearFilters').click();
  assert.equal(await page.locator('#q').inputValue(), '');
  assert.ok(await page.locator('#cards article.card').count() > 1, 'Limpar filtros não restaurou catálogo');

  // Space also activates a focused suggestion without duplicate events.
  await page.locator('#q').fill('celular');
  await page.locator('#q').press('ArrowDown');
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#cards article.card').count(), 1, 'Espaço deve selecionar exatamente um card');
  assert.equal(await page.locator('#cards article.card a.product-title').getAttribute('href'), '/ofertas/' + chosenProduct.id, 'Espaço perdeu o ID selecionado');
  await page.locator('#clearFilters').click();
  await page.locator('#q').fill('celular');
  await page.locator('#q').press('Escape');
  assert.equal(await page.locator('#vr-suggestions').getAttribute('style').then(s => s.includes('display: none') || s.includes('display:none')), true, 'Escape deve fechar as sugestões');
  console.log(JSON.stringify({chosen,selectedId:chosenProduct.id,keyboard:'Enter, Espaço e Escape',count:await page.locator('#result-count').innerText()}));
} finally { await browser.close(); }
