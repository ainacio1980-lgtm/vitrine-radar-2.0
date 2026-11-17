export function adminPage(csrf) {
  // Session tokens in the database are UUIDs. Keep legacy rows from injecting markup.
  const csrfValue = /^[a-f0-9-]{36}$/i.test(csrf) ? csrf : "";
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="csrf-token" content="${csrfValue}">
  <title>Administração | Vitrine Radar</title>
  <style>
    :root { color-scheme: dark; font: 16px/1.5 Inter, system-ui, sans-serif; color: #eaf0f8; background: #0b1220; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    main { width: min(1120px, 100% - 32px); margin: 0 auto; padding: 24px 0 42px; }
    header, .toolbar, .form-actions, .pagination { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    header, .toolbar { justify-content: space-between; }
    h1, h2, p { margin: 0; }
    h1 { font-size: clamp(1.65rem, 4vw, 2.35rem); line-height: 1.2; }
    h2 { font-size: 1.18rem; }
    .brand, .muted { color: #afbdd1; }
    .brand { margin-bottom: 6px; }
    a { color: #8dceff; }
    button, input, select, textarea { min-height: 44px; font: inherit; color: inherit; border: 1px solid #425471; border-radius: 8px; }
    button { cursor: pointer; padding: 8px 13px; background: #213653; }
    button.primary { background: #2359c7; border-color: #3b71df; }
    button:disabled { opacity: .55; cursor: default; }
    :focus-visible { outline: 3px solid #94d0ff; outline-offset: 2px; }
    input, select, textarea { padding: 8px 10px; background: #0e1a2d; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-top: 22px; }
    .card { border: 1px solid #2b3d58; border-radius: 14px; background: #152339; padding: 16px; }
    section.card { margin-top: 16px; }
    .summary strong { display: block; font-size: 1.45rem; }
    .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; border: 0; padding: 0; margin: 14px 0; }
    .fields label { display: grid; gap: 5px; }
    .fields input, .fields textarea { width: 100%; }
    .wide { grid-column: 1 / -1; }
    .table { overflow: auto; margin-top: 12px; }
    table { border-collapse: collapse; width: 100%; text-align: left; }
    th, td { padding: 9px 8px; border-bottom: 1px solid #2b3d58; vertical-align: middle; }
    td small { display: block; color: #afbdd1; }
    td:last-child { white-space: nowrap; }
    .pagination, .metrics { margin-top: 12px; }
    .metrics { display: flex; flex-wrap: wrap; gap: 18px; }
    .marketplaces { margin-top: 8px; }
    .feedback { color: #b9edcb; }
    .feedback[data-error="true"] { color: #ffb7b7; }
    @media (max-width: 560px) { .fields { grid-template-columns: 1fr; } main { width: calc(100% - 20px); } .card { padding: 12px; } }
  </style>
</head>
<body>
<main>
  <header>
    <div><p class="brand">Vitrine Radar</p><h1>Painel administrativo</h1></div>
    <nav class="toolbar" aria-label="Conta"><a href="/">Ver vitrine</a><button id="logout" type="button">Sair</button></nav>
  </header>
  <p id="account-message" class="feedback" role="status"></p>

  <div class="summary" aria-label="Resumo do catálogo">
    <div class="card">Total de ofertas<strong id="total">—</strong></div>
    <div class="card">Pendentes<strong id="pending">—</strong></div>
    <div class="card">Aprovadas<strong id="approved">—</strong></div>
    <div class="card">Suspensas<strong id="paused">—</strong></div>
    <div class="card">Faltam para 500<strong id="remaining">—</strong></div>
    <div class="card">Pendentes sem foto<strong id="pending-without-photo">—</strong></div>
  </div>
  <section class="card" aria-label="Meta de 500 produtos publicados">
    <h2>Meta: 500 produtos publicados</h2>
    <progress id="goal-progress" value="0" max="500" style="width:100%;height:18px"></progress>
    <p id="goal-progress-label" class="muted" role="status">Calculando progresso...</p>
  </section>

  <section class="card" aria-labelledby="new-title">
    <h2 id="new-title">Cadastrar oferta</h2>
    <p class="muted">A oferta fica pendente até você aprová-la para a vitrine.</p>
    <form id="new-offer">
      <fieldset class="fields" id="offer-fields">
        <label>Produto<input id="title" maxlength="160" required></label>
        <label>Categoria<input id="category" maxlength="80" required></label>
        <label>Loja<input id="merchant" maxlength="80" required></label>
        <label>Preço em reais<input id="price" inputmode="decimal" maxlength="22" placeholder="129,90" required></label>
        <label class="wide">Link da oferta<input id="url" type="url" maxlength="2048" placeholder="https://" required></label>
        <label class="wide">Foto real (URL HTTPS da loja)<input id="image-url" type="url" maxlength="2048" placeholder="https://a-static.mlcdn.com.br/..."></label>
        <small class="wide muted">A foto oficial é necessária para publicar; ao editar uma oferta pendente, acrescente a foto aqui.</small>
      </fieldset>
      <div class="form-actions"><button id="save-offer" class="primary" type="submit">Salvar como pendente</button><button id="cancel-edit" type="button" hidden>Cancelar edição</button><p id="form-message" class="feedback" role="status"></p></div>
    </form>
  </section>


  <section class="card" aria-labelledby="links-title">
    <h2 id="links-title">Links de afiliado para revisão</h2>
    <p class="muted">Guarde aqui os links oficiais gerados na sua conta. O link fica privado até receber produto, preço conferido e aprovação no catálogo. Não use links comuns de produtos, pois podem não gerar comissão.</p>
    <form id="link-form">
      <fieldset class="fields" id="link-fields">
        <label>Plataforma <select id="link-marketplace" required><option value="Magalu">Magalu</option><option value="Mercado Livre">Mercado Livre</option><option value="Shopee">Shopee</option><option value="Amazon">Amazon</option></select></label>
        <label class="wide">Link gerado pela conta de afiliado <input id="affiliate-url" type="url" maxlength="2048" placeholder="https://" required></label>
      </fieldset>
      <div class="form-actions"><button id="link-add" type="submit" class="primary">Guardar link privado</button><p id="link-message" class="feedback" role="status"></p></div>
    </form>
    <div class="table"><table><thead><tr><th>Loja</th><th>Link salvo</th><th>Situação</th><th>Ação</th></tr></thead><tbody id="link-inbox"><tr><td colspan="4">Carregando⬦</td></tr></tbody></table></div>
  </section>
  <section class="card" aria-labelledby="shopee-title">
    <h2 id="shopee-title">Integração Shopee · links de afiliado</h2>
    <p class="muted">O cadastro está aceito. Abra o <a href="https://affiliate.shopee.com.br/" rel="noopener noreferrer" target="_blank">Portal de Afiliados Shopee</a>, gere seu link de compartilhamento em Vitrine do Afiliado e cole-o abaixo. Não insira senha ou códigos neste campo.</p>
    <p class="muted">Para concluir: no aplicativo Shopee, abra <strong>Eu  →  Programa de Criadores e Afiliados  →  Conta  →  Vitrine do Afiliado</strong>. Adicione os produtos e toque em <strong>Compartilhar</strong>. Cole aqui o link copiado da sua própria conta. <a href="https://help.shopee.com.br/portal/10/article/124390-O-que-%C3%A9-a-Vitrine-do-Afiliado" target="_blank" rel="noopener noreferrer">Instruções oficiais Shopee</a>.</p>
    <p id="shopee-state" class="muted" role="status">Consultando situação...</p>
    <form id="shopee-form">
      <fieldset class="fields" id="shopee-fields">
        <label class="wide">Link de afiliado Shopee (categoria, produto ou vitrine) <input id="shopee-url" type="url" maxlength="2048" autocomplete="off" placeholder="https://s.shopee.com.br/..." required></label>
        <label class="wide" style="display:flex;align-items:center;gap:8px"><input id="shopee-verified" type="checkbox" style="min-height:20px;width:20px" required> Confirmo que gerei este link na minha conta oficial de afiliado.</label>
      </fieldset>
      <div class="form-actions"><button id="shopee-save" type="submit" class="primary">Ativar link Shopee</button><p id="shopee-message" class="feedback" role="status"></p></div>
    </form>
  </section>
  <section class="card" aria-labelledby="import-title">
    <h2 id="import-title">Importar ofertas por CSV</h2>
    <p class="muted">Cole dados do Excel ou selecione um arquivo CSV de até 50 produtos. Separador: ponto e vírgula. Colunas: titulo;categoria;loja;preco;url;foto. Foto é opcional na importação, mas obrigatória para publicar. Todas as ofertas entram como pendentes.</p>
    <form id="import-form">
      <fieldset class="fields" id="import-fields">
        <label class="wide">Arquivo CSV (opcional)<input id="import-file" type="file" accept=".csv,text/csv"></label>
        <label class="wide">Dados CSV<textarea id="import-text" rows="5" placeholder="titulo;categoria;loja;preco;url;foto"></textarea></label>
      </fieldset>
      <div class="form-actions"><button id="import-submit" class="primary" type="submit">Importar para revisão</button><p class="feedback" role="status" id="import-message"></p></div>
    </form>
  </section>

  <section class="card" aria-labelledby="photo-import-title">
    <h2 id="photo-import-title">Completar fotos de ofertas pendentes</h2>
    <p class="muted">Baixe o CSV das ofertas sem foto, preencha a coluna foto com a URL HTTPS da imagem oficial correspondente e envie o arquivo. O painel processa lotes de até 50, sem mudar preços, links ou publicar automaticamente.</p>
    <p><a href="/api/admin/photos/missing.csv" download>Baixar CSV de ofertas pendentes sem foto</a></p>
    <form id="photo-import-form">
      <fieldset class="fields" id="photo-import-fields">
        <label class="wide">Arquivo CSV preenchido<input id="photo-import-file" type="file" accept=".csv,text/csv"></label>
        <label class="wide">Ou colar CSV (colunas id;foto)<textarea id="photo-import-text" rows="4" placeholder="id;foto"></textarea></label>
      </fieldset>
      <div class="form-actions">
        <button type="submit" class="primary" id="photo-import-submit">Validar e cadastrar fotos</button>
        <p class="feedback" id="photo-import-message" role="status"></p>
      </div>
    </form>
  </section>

  <section class="card" aria-labelledby="catalog-title">
    <div class="toolbar">
      <h2 id="catalog-title">Catálogo</h2><a href="/api/admin/export">Exportar catálogo CSV</a>
      <label>Status <select id="status-filter"><option value="">Todos</option><option value="pending">Pendentes</option><option value="approved">Aprovadas</option><option value="paused">Suspensas</option></select></label>
    </div>
    <p id="catalog-message" class="feedback" role="status"></p>
    <div class="table">
      <table><thead><tr><th scope="col">Produto</th><th scope="col">Loja</th><th scope="col">Preço</th><th scope="col">Status</th><th scope="col">Ação</th></tr></thead><tbody id="catalog"><tr><td colspan="5">Carregando ofertas⬦</td></tr></tbody></table>
    </div>
    <div class="pagination"><button id="previous" type="button" disabled>Anterior</button><span id="page">Página 1</span><button id="next" type="button" disabled>Próxima</button></div>
  </section>

  <section class="card" aria-labelledby="ops-title">
    <h2 id="ops-title">Operação</h2>
    <div class="metrics"><span>Cliques <strong id="clicks">—</strong></span><span>Importações <strong id="imports">—</strong></span><span>Automações <strong id="jobs">—</strong></span></div>
    <p class="marketplaces muted">Marketplaces aguardando conexão: Amazon, Mercado Livre, Shopee e Magalu.</p>
  </section>


  <section class="card">
    <h2>Integrações de afiliados</h2>
    <p class="muted">Acompanhe as inscrições e abra os portais oficiais. As contas ainda não estão conectadas.</p>
    <div class="table"><table><thead><tr><th>Plataforma</th><th>Situação</th><th>Conexão</th><th>Cadastro</th></tr></thead><tbody id="marketplaces"><tr><td colspan="4">Carregando⬦</td></tr></tbody></table></div>
  </section>
  <section class="card">
    <h2>Engajamento de afiliados · últimos 14 dias</h2>
    <p id="analytics-message" class="muted">Carregando desempenho real⬦</p>
    <div class="table"><table><thead><tr><th>Dia</th><th>Cliques em produtos</th><th>Visitas à loja</th><th>Compartilhamentos</th></tr></thead><tbody id="analytics"><tr><td colspan="4">Carregando⬦</td></tr></tbody></table></div>
  </section>
  <section class="card" aria-labelledby="divulgacao">
    <h2 id="divulgacao">Visitas da divulgação · últimos 14 dias</h2>
    <p class="muted">Aberturas da vitrine pelos links da campanha. Visitas repetidas entram na contagem.</p>
    <div class="table"><table><thead><tr><th scope="col">Canal</th><th scope="col">Visitas</th></tr></thead><tbody id="launch-visits"><tr><td colspan="2">Carregando⬦</td></tr></tbody></table></div>
  </section>
  <section class="card" aria-labelledby="top-offers-title"><h2 id="top-offers-title">Interesse por produto · últimos 14 dias</h2><p class="muted">Visualizações da página individual e cliques para visitar lojas parceiras. Não representam vendas ou conversões.</p><div class="table"><table><thead><tr><th>Produto</th><th>Visualizações da página</th><th>Cliques para a loja</th></tr></thead><tbody id="top-offers"><tr><td colspan="3">Carregando⬦</td></tr></tbody></table></div></section>
  <section class="card" aria-labelledby="reviews-title">
    <h2 id="reviews-title">Fila de verificação de ofertas</h2>
    <p class="muted">Conferir preço, estoque e atribuição de comissão nas lojas oficiais. Observações privadas não aprovam ofertas automaticamente.</p>
    <p id="reviews-message" class="muted" role="status" aria-live="polite">Carregando revisões⬦</p>
    <div class="table"><table><thead><tr><th>Produto</th><th>Pendência</th><th>Último problema</th><th>Ações</th></tr></thead><tbody id="reviews"><tr><td colspan="4">Carregando⬦</td></tr></tbody></table></div>
  </section>
  <section class="card" aria-labelledby="diagnostics-title">
    <h2 id="diagnostics-title">Preparação para monetização</h2>
    <p class="muted">Este resumo separa cadastro aprovado, importação de produtos e recebimento de comissões. São etapas distintas.</p>
    <div id="diagnostics" role="status" aria-live="polite" class="diagnostics">Carregando situação do projeto⬦</div>
  </section>
  <section class="card" aria-labelledby="views-title">
    <h2 id="views-title">Páginas visualizadas · últimos 14 dias</h2>
    <p class="muted" id="pageviews-message">Contagem agregada de carregamentos de páginas, sem cookies e sem identificar visitantes. Não corresponde a pessoas únicas.</p>
    <div class="table"><table><thead><tr><th>Página</th><th>Visualizações</th><th>Compartilhamentos</th></tr></thead><tbody id="pageviews"><tr><td colspan="3">Carregando⬦</td></tr></tbody></table></div>
  </section>
  <section class="card" aria-labelledby="audit-title">
    <h2 id="audit-title">Histórico de alterações</h2>
    <p class="muted">Últimas 20 alterações administrativas registradas.</p>
    <div class="table"><table><thead><tr><th>Data</th><th>Alteração</th><th>Oferta</th></tr></thead><tbody id="audit"><tr><td colspan="3">Carregando histórico⬦</td></tr></tbody></table></div>
  </section>
</main>
<script>
  const byId = id => document.getElementById(id);
  const csrf = document.querySelector('meta[name="csrf-token"]').content;
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const statusLabels = { pending: 'Pendente', approved: 'Aprovada', paused: 'Suspensa' };
  let currentPage = 1;
  let requestNumber = 0;

  let editingOffer = null;

  function resetEditor() {
    editingOffer = null;
    byId('new-offer').reset();
    byId('new-title').textContent = 'Cadastrar oferta';
    byId('save-offer').textContent = 'Salvar como pendente';
    byId('cancel-edit').hidden = true;
  }

  function beginEdit(offer) {
    editingOffer = {
      title: offer.title, category: offer.category, merchant: offer.merchant,
      price_cents: offer.price_cents, url: offer.url, image_url: offer.image_url || null, status: offer.status, id: offer.id
    };
    for (const key of ['title', 'category', 'merchant', 'url']) byId(key).value = offer[key];
    byId('price').value = (offer.price_cents / 100).toFixed(2).replace('.', ',');
    byId('image-url').value = offer.image_url || '';
    byId('new-title').textContent = 'Editar oferta #' + offer.id;
    byId('save-offer').textContent = 'Salvar alterações e enviar para aprovação';
    byId('cancel-edit').hidden = false;
    feedback('form-message', 'Alterações voltam para pendente antes de aparecer na vitrine.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    byId('title').focus();
  }



  async function refreshLinkInbox() {
    const root = byId('link-inbox');
    root.replaceChildren();
    try {
      const data = await api('/api/admin/link-inbox');
      if (!data.links.length) {
        const row = root.insertRow();
        row.insertCell().colSpan = 4;
        row.cells[0].textContent = 'Nenhum link de afiliado cadastrado.';
        return;
      }
      for (const item of data.links) {
        const row = root.insertRow();
        row.insertCell().textContent = item.marketplace;
        const cell = row.insertCell();
        const a = document.createElement('a');
        a.href = item.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer sponsored';
        a.textContent = item.url.length > 56 ? item.url.slice(0,53)+'⬦' : item.url;
        cell.append(a);
        row.insertCell().textContent = item.status === 'used' ? 'Encaminhado ao catálogo' : 'Aguardando dados e aprovação';
        const actions = row.insertCell();
        if (item.status === 'pending') {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = 'Preparar oferta';
          b.addEventListener('click', () => {
            resetEditor();
            byId('merchant').value = item.marketplace;
            byId('url').value = item.url;
            byId('title').focus();
            byId('new-offer').scrollIntoView({ behavior:'smooth' });
            feedback('form-message', 'Complete produto, categoria e preço verificado. A oferta entrará como pendente.');
          });
          actions.append(b);
        }
      }
    } catch (e) {
      const row = root.insertRow();
      row.insertCell().colSpan = 4;
      row.cells[0].textContent = 'Não foi possível carregar links.';
    }
  }
  byId('link-form').addEventListener('submit', async event => {
    event.preventDefault();
    byId('link-fields').disabled = true;
    byId('link-add').disabled = true;
    try {
      await api('/api/admin/link-inbox', 'POST', {
        marketplace: byId('link-marketplace').value,
        url: byId('affiliate-url').value
      });
      byId('affiliate-url').value = '';
      feedback('link-message', 'Link guardado. Confira os dados do produto antes de publicar.');
      await refreshLinkInbox();
    } catch (e) {
      feedback('link-message', e.message, true);
    } finally {
      byId('link-fields').disabled = false;
      byId('link-add').disabled = false;
    }
  });

  async function refreshShopeeStore(){
    try{
      const data=await api('/api/admin/shopee-store');
      const active=data.store?.status==='active';
      byId('shopee-state').textContent=active
        ? 'Link Shopee ativo, com registro de cliques. Pagamentos e comissões dependem da Shopee.'
        : 'Cadastro aceito, aguardando o link exclusivo. A ativação do ShopeePay ainda precisa ser confirmada.';
      if(active&&data.store.affiliate_url)byId('shopee-url').value=data.store.affiliate_url;
    }catch(e){byId('shopee-state').textContent='Falha ao consultar: '+e.message;}
  }
  byId('shopee-form').addEventListener('submit',async(event)=>{
    event.preventDefault();
    byId('shopee-fields').disabled=true;byId('shopee-save').disabled=true;
    try{
      await api('/api/admin/shopee-store','POST',{url:byId('shopee-url').value,confirmed_from_official_portal:byId('shopee-verified').checked});
      feedback('shopee-message','Vitrine Shopee conectada. Cliques agora podem ser rastreados.');
      await refreshShopeeStore();
    }catch(e){feedback('shopee-message',e.message,true);}
    finally{byId('shopee-fields').disabled=false;byId('shopee-save').disabled=false;}
  });
  refreshShopeeStore();
  async function refreshExtra() {
    try {
      const [markets, analytics] = await Promise.all([
        api('/api/admin/marketplaces'), api('/api/admin/analytics')
      ]);
      const marketRoot = byId('marketplaces');
      marketRoot.replaceChildren();
      for (const item of markets.marketplaces) {
        const tr = marketRoot.insertRow();
        tr.insertCell().textContent = item.marketplace;
        tr.insertCell().textContent = ({
          not_applied: 'Cadastro não iniciado',
          pending: 'Aguardando aprovação',
          approved: 'Cadastro aprovado',
          rejected: 'Não aprovado'
        })[item.approval_status] || item.approval_status;
        tr.insertCell().textContent = item.enabled === 1 ? 'Conectada' : 'Não conectada';
        const cell = tr.insertCell();
        if (item.program_url && item.program_url.startsWith('https://')) {
          const a = document.createElement('a');
          a.href = item.program_url;
          a.textContent = 'Portal oficial';
          a.rel = 'noopener noreferrer';
          a.target = '_blank';
          cell.append(a);
        } else cell.textContent = 'Indisponível';
      }
      const root = byId('analytics');
      root.replaceChildren();
      const days = new Map(analytics.days.map(item => [item.day, item.clicks]));
      const store = new Map((analytics.storeDays || []).map(item => [item.day, item]));
      let total = 0, visits = 0, shares = 0;
      for (let offset = 13; offset >= 0; offset--) {
        const day = new Date();
        const date = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() - offset)).toISOString().slice(0, 10);
        const value = days.get(date) || 0;
        total += value;
        const entry = store.get(date) || { visits: 0, shares: 0 };
        visits += Number(entry.visits || 0);
        shares += Number(entry.shares || 0);
        const row = root.insertRow();
        row.insertCell().textContent = date.slice(8) + '/' + date.slice(5, 7);
        row.insertCell().textContent = value;
        row.insertCell().textContent = entry.visits || 0;
        row.insertCell().textContent = entry.shares || 0;
      }
      byId('analytics-message').textContent = total + ' cliques em produtos, ' + visits + ' visitas à loja e ' + shares + ' ações de compartilhamento. Esses indicadores não são vendas ou comissões.';
      const visitRows = byId('launch-visits');
      const byChannel = new Map(analytics.launchVisits.map(visit => [visit.channel, visit.visits]));
      visitRows.replaceChildren();
      for (const [channel, label] of [['instagram', 'Instagram'], ['whatsapp', 'WhatsApp']]) {
        const row = visitRows.insertRow();
        row.insertCell().textContent = label;
        row.insertCell().textContent = byChannel.get(channel) ?? 0;
      }
      const topRoot=byId('top-offers');topRoot.replaceChildren();for(const offer of (analytics.topOffers||[])){const row=topRoot.insertRow(),cell=row.insertCell(),link=document.createElement('a');link.href='/ofertas/'+offer.id;link.textContent=offer.title;link.target='_blank';link.rel='noopener noreferrer';cell.append(link);row.insertCell().textContent=offer.views;row.insertCell().textContent=offer.clicks;}if(!(analytics.topOffers||[]).length){const row=topRoot.insertRow(),cell=row.insertCell();cell.colSpan=3;cell.textContent='Nenhuma oferta aprovada.';}
    } catch (error) {
      byId('analytics-message').textContent = 'Não foi possível carregar as integrações ou estatísticas.';
      const visitRows = byId('launch-visits');
      visitRows.replaceChildren();
      const message = visitRows.insertRow().insertCell();
      message.colSpan = 2;
      message.textContent = 'Não foi possível carregar as visitas.';
    }
  }



  async function refreshReviews() {
    const table=byId('reviews'),message=byId('reviews-message');
    table.replaceChildren();
    try {
      const data=await api('/api/admin/reviews');
      const items=data.reviews||[];
      message.textContent=items.length+' verificações pendentes. Notas não significam validação.';
      if(!items.length){const row=table.insertRow();const cell=row.insertCell();cell.colSpan=4;cell.textContent='Nenhuma revisão pendente.';return;}
      for(const item of items){
        const row=table.insertRow(),product=row.insertCell(),link=document.createElement('a');
        link.href='/ofertas/'+encodeURIComponent(item.offer_id);
        link.target='_blank';link.rel='noopener noreferrer';link.textContent=item.title;
        product.append(link);
        const label=document.createElement('small');
        label.textContent=item.merchant+' · '+currency.format(item.price_cents/100)+' (valor cadastrado)';
        product.append(label);
        row.insertCell().textContent=item.reason;
        const issue=row.insertCell();
        issue.textContent=item.latest_issue||'Sem teste externo conclusivo registrado.';
        if(item.last_note){const prev=document.createElement('small');prev.textContent='Nota interna: '+item.last_note;issue.append(prev);}
        const actions=row.insertCell();
        let url;
        try{url=new URL(item.url);}catch{}
        if(url&&url.protocol==='https:'&&!url.username&&!url.password){
          const check=document.createElement('a');check.href=url.href;check.target='_blank';check.rel='noopener noreferrer';
          check.textContent='Abrir na loja';actions.append(check,document.createTextNode(' '));
        }
        const button=document.createElement('button');button.type='button';button.textContent='Anotar';
        button.addEventListener('click',async()=>{
          const note=window.prompt('Observação interna (15 a 700 caracteres). Não marca a oferta como verificada:',item.last_note||'');
          if(note===null)return;
          if(note.trim().length<15||note.trim().length>700){message.textContent='A observação deve ter entre 15 e 700 caracteres.';return;}
          button.disabled=true;
          try{
            await api('/api/admin/reviews/'+item.review_id+'/note','POST',{note:note.trim()});
            await refreshReviews();await refreshAudit();
            byId('reviews-message').textContent='Observação registrada. A revisão continua pendente.';
          }catch(e){message.textContent='Falha ao salvar: '+e.message;button.disabled=false;}
        });
        actions.append(button);
      }
    }catch(e){message.textContent='Não foi possível carregar as revisões.';const row=table.insertRow();const cell=row.insertCell();cell.colSpan=4;cell.textContent='Revise a conexão e tente recarregar o painel.';}
  }

  async function refreshDiagnostics() {
    const root = byId('diagnostics');
    try {
      const data = await api('/api/admin/diagnostics');
      const checks = [
        data.approved_programs + ' programas de afiliados aprovados / ' + data.total_programs + ' cadastrados',
        data.active_syncs === 0 ? 'Feeds automáticos: desativados até autorização e integração oficial' : 'Feeds automáticos configurados: ' + data.active_syncs,
        data.approved_offers + ' ofertas publicadas e ' + data.pending_offers + ' aguardando revisão',
        data.pending_reviews + ' verificações de preço, estoque e comissão aguardando conclusão',
        data.amazon_status === 'pending' ? 'Amazon: aprovação definitiva pendente; meta inicial de ' + (data.amazon_target || 3) + ' vendas qualificadas em 180 dias (consulte o portal)' : 'Amazon: situação do programa ' + (data.amazon_status || 'não informada'),
        data.indexnow && data.indexnow.response_status === 429 ? 'IndexNow: limite de notificações atingido (HTTP 429); nova tentativa espaçada configurada' : (data.indexnow ? 'IndexNow: último retorno HTTP ' + data.indexnow.response_status : 'IndexNow: nenhuma notificação registrada'),
        data.store_url ? 'Loja Magalu pública cadastrada' : 'Loja Magalu pública ainda não vinculada',
        (data.shopee_payout === 'activation_required' || String(data.shopee_payout || '').includes('not_confirmed')) ? 'Shopee: ativação da conta de recebimentos ainda pendente de comprovação' : 'Shopee: situação do recebimento ' + (data.shopee_payout || 'não informada'),
        'Ofertas sem revisão por ' + data.stale_days + ' dias serão pausadas na manutenção diária',
        data.last_job ? ('Última manutenção: ' + ({
          completed: 'concluída', running: 'em execução', failed: 'falhou', queued: 'agendada'
        })[data.last_job.status] + ' (' + (data.last_job.finished_at || data.last_job.created_at) + ' UTC)') : 'Manutenção diária: aguardando a primeira execução'
      ];
      const list = document.createElement('ul');
      for (const value of checks) {
        const li = document.createElement('li');
        li.textContent = value;
        list.append(li);
      }
      root.replaceChildren(list);
    } catch (error) {
      root.textContent = 'Diagnóstico indisponível no momento.';
    }
  }

  async function refreshPageViews() {
    try {
      const data = await api('/api/admin/pageviews');
      const root = byId('pageviews');
      root.replaceChildren();
      const label = path => ({
        '/': 'Página inicial',
        '/sobre': 'Transparência',
        '/guia-de-compras': 'Calculadora de preços'
      })[path] || (path.startsWith('/ofertas/') ? 'Oferta #'+path.slice(9) : 'Guia: '+path.replace('/guias/', '').replaceAll('-', ' '));
      let sum = 0, sharesTotal = 0;
      const shares = new Map((data.shares || []).map(item => [item.path, item.shares]));
      const sorted = data.pages.slice().sort((a,b)=>b.views-a.views);
      for (const item of sorted) {
        const row = root.insertRow();
        row.insertCell().textContent = label(item.path);
        row.insertCell().textContent = item.views;
        const shared = shares.get(item.path) || 0;
        row.insertCell().textContent = shared;
        sum += item.views;
        sharesTotal += shared;
      }
      if (!sorted.length) {
        const row = root.insertRow();
        row.insertCell().colSpan = 3;
        row.cells[0].textContent = 'Nenhuma visualização registrada no período.';
      }
      byId('pageviews-message').textContent = sum + ' carregamentos e ' + sharesTotal + ' compartilhamentos de guias registrados nos últimos 14 dias. Dados agregados, sem cookies; não representam usuários únicos.';
    } catch (e) {
      byId('pageviews-message').textContent = 'Não foi possível consultar visualizações agora.';
    }
  }

  async function refreshAudit() {
    try {
      const data = await api('/api/admin/audit');
      const root = byId('audit');
      root.replaceChildren();
      for (const item of data.events) {
        const row = root.insertRow();
        const timestamp = item.created_at.endsWith('Z') ? item.created_at : item.created_at.replace(' ', 'T') + 'Z';
        row.insertCell().textContent = new Date(timestamp).toLocaleString('pt-BR');
        row.insertCell().textContent = ({
          offer_created: 'Oferta cadastrada',
          offer_updated: 'Oferta editada',
          offer_status_changed: 'Status alterado',
          offer_bulk_import: 'Importação CSV'
        })[item.event_type] || item.event_type;
        row.insertCell().textContent = item.offer_id == null ? '—' : '#' + item.offer_id;
      }
      if (!data.events.length) {
        const cell = root.insertRow().insertCell();
        cell.colSpan = 3;
        cell.textContent = 'Nenhuma alteração registrada.';
      }
    } catch {
      byId('audit').replaceChildren();
      const cell = byId('audit').insertRow().insertCell();
      cell.colSpan = 3;
      cell.textContent = 'Não foi possível carregar o histórico.';
    }
  }


  function feedback(id, message = '', isError = false) {
    const node = byId(id);
    node.textContent = message;
    node.dataset.error = String(isError);
  }

  async function api(path, method = 'GET', data) {
    const options = { method, cache: 'no-store' };
    if (data !== undefined) {
      options.headers = { 'content-type': 'application/json', 'x-csrf-token': csrf };
      options.body = JSON.stringify(data);
    }
    const response = await fetch(path, options);
    if (response.status === 401) {
      location.assign('/admin/login');
      throw new Error('A sessão expirou. Entre novamente.');
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
    return payload;
  }

  function priceInCents(value) {
    let amount = value.trim();
    if (/^\\d{1,3}(?:\\.\\d{3})+,\\d{1,2}$/.test(amount)) amount = amount.replaceAll('.', '');
    if (!/^\\d+(?:[.,]\\d{1,2})?$/.test(amount)) throw new Error('Informe um preço válido, como 129,90.');
    const [whole, fraction = ''] = amount.split(/[.,]/);
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(cents)) throw new Error('O preço informado excede o limite.');
    return cents;
  }

  function offerRow(offer) {
    const row = document.createElement('tr');
    const title = row.insertCell();
    title.textContent = offer.title;
    const category = document.createElement('small');
    category.textContent = offer.category;
    title.append(category);
    const merchant = row.insertCell();
    merchant.textContent = offer.merchant;
    let destination;
    try { destination = new URL(offer.url); } catch {}
    if (destination?.protocol === 'https:' && !destination.username && !destination.password && destination.hostname.includes('.')) {
      const link = document.createElement('a');
      link.href = destination.href;
      link.textContent = 'Conferir link';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const details = document.createElement('small');
      details.append(link);
      merchant.append(details);
    }
    row.insertCell().textContent = currency.format(offer.price_cents / 100);
    row.insertCell().textContent = statusLabels[offer.status] || offer.status;
    const action = document.createElement('button');
    action.type = 'button';
    const next = offer.status === 'approved' ? 'paused' : 'approved';
    action.textContent = next === 'paused' ? 'Suspender' : 'Aprovar e publicar';
    action.addEventListener('click', async () => {
      const prompt = (next === 'paused' ? 'Suspender a oferta ' : 'Publicar na vitrine a oferta ') + offer.title + '?';
      if (!window.confirm(prompt)) return;
      action.disabled = true;
      feedback('catalog-message');
      try {
        await api('/api/admin/offers/' + offer.id + '/status', 'PATCH', { status: next, previous_status: offer.status });
        feedback('catalog-message', next === 'paused' ? 'Oferta suspensa.' : 'Oferta aprovada e publicada na vitrine.');
        await refreshCatalog();
        await refreshMetrics();
      } catch (error) {
        feedback('catalog-message', error.message, true);
      } finally {
        action.disabled = false;
      }
    });
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Editar';
    edit.addEventListener('click', () => beginEdit(offer));
    const actions = row.insertCell();
    actions.append(edit, document.createTextNode(' '), action);
    return row;
  }

  async function refreshCatalog() {
    const number = ++requestNumber;
    const status = byId('status-filter').value;
    const params = new URLSearchParams({ status, page: String(currentPage) });
    byId('previous').disabled = true;
    byId('next').disabled = true;
    try {
      const data = await api('/api/admin/catalog?' + params);
      if (number !== requestNumber) return;
      if (data.offers.length === 0 && currentPage > 1) {
        currentPage -= 1;
        return refreshCatalog();
      }
      const root = byId('catalog');
      root.replaceChildren(...data.offers.map(offerRow));
      if (data.offers.length === 0) {
        const cell = root.insertRow().insertCell();
        cell.colSpan = 5;
        cell.textContent = 'Nenhuma oferta para exibir.';
      }
      byId('page').textContent = 'Página ' + data.page;
      byId('previous').disabled = data.page <= 1;
      byId('next').disabled = !data.has_more;
    } catch (error) {
      if (number !== requestNumber) return;
      const root = byId('catalog');
      root.replaceChildren();
      const cell = root.insertRow().insertCell();
      cell.colSpan = 5;
      cell.textContent = 'Não foi possível carregar o catálogo.';
      byId('previous').disabled = currentPage <= 1;
    }
  }

  async function refreshMetrics() {
    await Promise.allSettled([
      api('/api/admin/summary').then(data => {
        for (const key of ['total', 'pending', 'approved', 'paused']) byId(key).textContent = data[key];
        const target = Number(data.target) || 500;
        byId('remaining').textContent = Math.max(0, Number(data.remaining) || 0);
        byId('pending-without-photo').textContent = Number(data.pending_without_photo) || 0;
        byId('goal-progress').max = target;
        byId('goal-progress').value = Math.min(target, Number(data.approved) || 0);
        byId('goal-progress-label').textContent = (Number(data.approved) || 0) +
          ' ofertas publicadas de ' + target + ' (' +
          Math.min(100, ((Number(data.approved) || 0) / target) * 100).toFixed(1).replace('.', ',') +
          '%). Faltam ' + Math.max(0, Number(data.remaining) || 0) + ' ofertas validadas.';
      }),
      api('/api/admin/operations').then(data => {
        for (const key of ['clicks', 'imports', 'jobs']) byId(key).textContent = data[key];
      }),
      refreshAudit(),
      refreshExtra(),
      refreshPageViews(),
      refreshDiagnostics(),
      refreshReviews(),
      refreshLinkInbox()
    ]);
  }

  byId('new-offer').addEventListener('submit', async event => {
    event.preventDefault();
    feedback('form-message');
    byId('offer-fields').disabled = true;
    byId('save-offer').disabled = true;
    try {
      const input = {
        title: byId('title').value,
        category: byId('category').value,
        merchant: byId('merchant').value,
        price_cents: priceInCents(byId('price').value),
        url: byId('url').value,
        image_url: byId('image-url').value
      };
      const wasEditing = Boolean(editingOffer);
      if (wasEditing) {
        await api('/api/admin/offers/' + editingOffer.id, 'PUT', { ...input, previous: editingOffer });
      } else {
        await api('/api/admin/offers', 'POST', input);
      }
      resetEditor();
      byId('status-filter').value = 'pending';
      currentPage = 1;
      feedback('catalog-message');
      feedback('form-message', wasEditing ? 'Alterações salvas. Oferta aguardando aprovação.' : 'Oferta cadastrada como pendente.');
      await Promise.all([refreshCatalog(), refreshMetrics()]);
    } catch (error) {
      feedback('form-message', error.message, true);
    } finally {
      byId('offer-fields').disabled = false;
      byId('save-offer').disabled = false;
    }
  });


  function splitCsvLine(line) {
    const cells = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { current += '"'; i++; }
        else quoted = !quoted;
      } else if (ch === ';' && !quoted) {
        cells.push(current.trim());
        current = '';
      } else current += ch;
    }
    if (quoted) throw new Error('Há aspas não fechadas no CSV.');
    cells.push(current.trim());
    return cells;
  }

  function parseCsv(text) {
    const lines = text.replaceAll(String.fromCharCode(13), '').replaceAll(String.fromCharCode(65279), '')
      .split(String.fromCharCode(10)).filter(x => x.trim().length);
    if (lines.length < 2) throw Error('O CSV precisa de cabeçalho e pelo menos uma oferta.');
    const header = splitCsvLine(lines.shift()).map(x => x.trim().toLocaleLowerCase('pt-BR'));
    const pick = (...names) => names.map(x => header.indexOf(x)).find(index => index >= 0);
    const fields = [
      pick('titulo', 'título', 'produto', 'title'), pick('categoria', 'category'),
      pick('loja', 'merchant'), pick('preco', 'preço', 'price'), pick('url', 'link')
    ];
    if (fields.some(x => x === undefined) || new Set(fields).size !== 5) {
      throw Error('Cabeçalho esperado: titulo;categoria;loja;preco;url.');
    }
    const pictureColumn = pick('foto', 'imagem', 'image_url', 'foto_url');
    if (lines.length > 50) throw Error('Limite de 50 ofertas por importação.');
    return lines.map((line, index) => {
      const cells = splitCsvLine(line);
      if (cells.length !== header.length) throw Error('Quantidade de colunas incorreta na linha ' + (index + 2) + '.');
      return {
        title: cells[fields[0]], category: cells[fields[1]],
        merchant: cells[fields[2]], price_cents: priceInCents(cells[fields[3]]),
        url: cells[fields[4]], image_url: pictureColumn === undefined ? '' : cells[pictureColumn]
      };
    });
  }

  byId('import-form').addEventListener('submit', async event => {
    event.preventDefault();
    feedback('import-message');
    byId('import-fields').disabled = true;
    byId('import-submit').disabled = true;
    try {
      const selected = byId('import-file').files[0];
      if (selected && selected.size > 128 * 1024) throw Error('Arquivo CSV excede 128 KB.');
      const text = selected ? await selected.text() : byId('import-text').value;
      const rows = parseCsv(text);
      const result = await api('/api/admin/import', 'POST', { rows });
      byId('status-filter').value = 'pending';
      currentPage = 1;
      await Promise.all([refreshCatalog(), refreshMetrics()]);
      event.target.reset();
      const summary = result.imported + ' importadas e ' + result.rejected + ' rejeitadas. Lote #' + result.batch_id + '.';
      const details = result.errors.slice(0, 3).map(x => ' Linha ' + x.line + ': ' + x.error).join(' ');
      feedback('import-message', summary + details, result.rejected > 0);
    } catch (error) {
      feedback('import-message', error.message, true);
    } finally {
      byId('import-fields').disabled = false;
      byId('import-submit').disabled = false;
    }
  });


  function parsePhotoCsv(text) {
    const lines = text.replaceAll(String.fromCharCode(13), '').replaceAll(String.fromCharCode(65279), '')
      .split(String.fromCharCode(10)).filter(x => x.trim());
    if (lines.length < 2) throw Error('Informe cabecalho e ao menos uma oferta.');
    const header = splitCsvLine(lines.shift()).map(x => x.trim().toLocaleLowerCase('pt-BR'));
    const idColumn = header.indexOf('id');
    const photoColumn = ['foto','imagem','image_url'].map(x => header.indexOf(x)).find(x => x >= 0);
    if (idColumn < 0 || photoColumn === undefined) throw Error('Cabeçalho deve conter id;foto.');
    const selected = [];
    for (const [index,line] of lines.entries()) {
      const cells = splitCsvLine(line);
      if (cells.length !== header.length) throw Error('Número de colunas incorreto na linha ' + (index+2) + '.');
      if (!cells[photoColumn]) continue;
      const id = Number(cells[idColumn]);
      if (!Number.isSafeInteger(id) || id < 1) throw Error('ID inválido na linha ' + (index+2) + '.');
      selected.push({id,image_url:cells[photoColumn]});
    }
    if (!selected.length) throw Error('Preencha ao menos uma foto oficial.');
    if (selected.length > 500) throw Error('Máximo de 500 fotos por arquivo.');
    if (new Set(selected.map(x=>x.id)).size !== selected.length) throw Error('IDs repetidos no arquivo.');
    return selected;
  }

  byId('photo-import-form').addEventListener('submit', async event => {
    event.preventDefault();
    feedback('photo-import-message');
    byId('photo-import-fields').disabled = true;
    byId('photo-import-submit').disabled = true;
    try {
      const file = byId('photo-import-file').files[0];
      if (file && file.size > 256 * 1024) throw Error('Arquivo de fotos excede 256 KB.');
      const rows = parsePhotoCsv(file ? await file.text() : byId('photo-import-text').value);
      let added = 0, skipped = 0;
      for (let offset = 0; offset < rows.length; offset += 50) {
        const result = await api('/api/admin/photos/import','POST',{rows:rows.slice(offset,offset+50)});
        added += result.added; skipped += result.skipped;
      }
      feedback('photo-import-message', added+' fotos cadastradas em ofertas pendentes; '+skipped+
        ' não modificadas. Revise preço, produto e link de afiliado antes de aprovar.');
      byId('photo-import-form').reset();
      await Promise.all([refreshCatalog(), refreshMetrics()]);
    } catch(e) {
      feedback('photo-import-message',e.message,true);
    } finally {
      byId('photo-import-fields').disabled=false;
      byId('photo-import-submit').disabled=false;
    }
  });

  byId('cancel-edit').addEventListener('click', () => { resetEditor(); feedback('form-message'); });
  byId('status-filter').addEventListener('change', () => { currentPage = 1; feedback('catalog-message'); refreshCatalog(); });
  byId('previous').addEventListener('click', () => { currentPage -= 1; refreshCatalog(); });
  byId('next').addEventListener('click', () => { currentPage += 1; refreshCatalog(); });
  byId('logout').addEventListener('click', async () => {
    try { await api('/api/auth/logout', 'POST', {}); location.assign('/admin/login'); }
    catch (error) { feedback('account-message', error.message, true); }
  });

  refreshCatalog();
  refreshMetrics();
</script>
</body>
</html>`;
}

