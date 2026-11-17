import { adminPage } from "./admin.mjs";
import { addCouponAdmin } from "./admin_coupons.mjs";
import { changeOfferStatus, createOffer, updateOffer, importOffers, listCatalog, offerDestination } from "./catalog.mjs";
import { adminEmail, loginPage, storefrontPage, aboutPage, guidePage } from "./pages.mjs";
import { renderGuidePage, guideSlugs } from "./guides.mjs";
import { renderOfferPage } from "./offer_pages.mjs";
import { primaryProductImage, productImageHosts, safeProductImageUrl } from "./product_images.mjs";
import { compareProducts, dropExpiredComparisonQuotes, recordComparisonQuotes } from "./comparator.mjs";
import { addComparator } from "./comparator_page.mjs";
import { couponForCatalogOffer, expireCoupon, listAdminCoupons, listCoupons, publishCoupon } from "./coupons.mjs";
import { dailyCuration } from "./curation.mjs";
import { addRadar } from "./radar_page.mjs";
import shareCover from "./vitrine-radar-capa.jpg";

const authHeaders = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};
const contentPolicy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
const publicContentPolicy = contentPolicy + "; img-src data: " + productImageHosts.map(host => "https://" + host).join(" ");
const sessionCookie = "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=";
const sessionSeconds = 8 * 60 * 60;
const attemptWindowMs = 15 * 60 * 1000;
const encoder = new TextEncoder();

function hex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function hash(value) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

function same(a, b) {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

function authJson(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { ...authHeaders, ...headers } });
}

function authError(error, status) {
  return authJson({ error }, status);
}

const launchChannels = new Set(["instagram", "whatsapp"]);
const publicViewScript = `<script>
  try {
    if (navigator.sendBeacon) {
      const path = location.pathname === "/index.html" ? "/" : location.pathname;
      const event = { path };
      const params = new URLSearchParams(location.search);
      const channel = params.get("utm_source");
      if (params.get("utm_campaign") === "lancamento" && (channel === "instagram" || channel === "whatsapp")) {
        event.channel = channel;
      }
      navigator.sendBeacon("/api/page-view", new Blob([JSON.stringify(event)], { type: "text/plain" }));
    }
  } catch {}
</script>`;
function html(page, isPrivate = false) {
  return new Response(isPrivate ? page : page.replace('</body>', publicViewScript + '</body>'), {
    headers: {
      ...(isPrivate ? authHeaders : { "cache-control": "no-cache, must-revalidate", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin" }),
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": isPrivate ? contentPolicy : publicContentPolicy,
    },
  });
}

function sessionToken(request) {
  return (request.headers.get("cookie") || "").match(/(?:^|;\s*)vr_session=([a-f0-9]{64})(?:;|$)/)?.[1];
}

async function getSession(db, request) {
  const token = sessionToken(request);
  if (!token) return null;
  return db.prepare("SELECT email, csrf FROM admin_sessions WHERE token_hash = ? AND expires_at > ?")
    .bind(await hash(token), Date.now()).first();
}

async function readJson(request, maxBytes) {
  if (!request.body || Number(request.headers.get("content-length") || 0) > maxBytes) throw new Error();
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let content = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error();
      }
      content += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
  const body = JSON.parse(content + decoder.decode());
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
  return body;
}

async function login(request, url, env) {
  if (request.headers.get("origin") !== url.origin) return authError("Origem inválida.", 403);
  if (!env.ADMIN_PASSWORD) return authError("Acesso administrativo ainda não configurado.", 503);
  let body;
  try {
    body = await readJson(request, 2048);
  } catch {
    return authError("Solicitação inválida.", 400);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const ipHash = await hash(request.headers.get("cf-connecting-ip") || "unknown");
  const now = Date.now();
  const attempt = await env.DB.prepare(`
    INSERT INTO login_attempts (email, ip_hash, attempted_at)
    SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM login_attempts WHERE ip_hash = ? AND attempted_at > ?) < 8
  `).bind(email.slice(0, 255), ipHash, now, ipHash, now - attemptWindowMs).run();
  if (attempt.meta.changes === 0) return authError("Muitas tentativas. Aguarde 15 minutos.", 429);

  const [providedHash, configuredHash] = await Promise.all([hash(password), hash(env.ADMIN_PASSWORD)]);
  if (!(same(email, adminEmail) && same(providedHash, configuredHash))) return authError("Credenciais inválidas.", 401);
  const newToken = hex(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare("INSERT INTO admin_sessions (token_hash, email, csrf, expires_at) VALUES (?, ?, ?, ?)")
    .bind(await hash(newToken), adminEmail, crypto.randomUUID(), now + sessionSeconds * 1000).run();
  return authJson({ ok: true }, 200, { "set-cookie": "vr_session=" + newToken + sessionCookie + sessionSeconds });
}

async function logout(request, url, db) {
  if (request.headers.get("origin") !== url.origin) return authError("Origem inválida.", 403);
  const token = sessionToken(request);
  if (token) await db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await hash(token)).run();
  return authJson({ ok: true }, 200, { "set-cookie": "vr_session=" + sessionCookie + "0" });
}

async function handleAdmin(request, url, db) {
  const path = url.pathname;
  const isApi = path.startsWith("/api/admin/");
  const session = await getSession(db, request);
  if (!session) {
    return isApi ? authError("Não autorizado", 401) : new Response(null, {
      status: 302,
      headers: { ...authHeaders, location: url.origin + "/admin/login" },
    });
  }
  if (!isApi) {
    return request.method === "GET" ? html(addCouponAdmin(adminPage(session.csrf)), true) : authError("Método inválido.", 405);
  }

  if (request.method === "GET") {
    if (path === "/api/admin/coupons") return authJson(await listAdminCoupons(db));
    if (path === "/api/admin/link-inbox") {
      const { results } = await db.prepare("SELECT id,marketplace,url,status,created_at FROM affiliate_link_inbox ORDER BY id DESC LIMIT 100").all();
      return authJson({ links: results });
    }
    if (path === "/api/admin/reviews") {
      const {results}=await db.prepare(
        "SELECT r.id AS review_id,r.offer_id,r.reason,r.created_at,o.title,o.merchant,o.status,o.url,o.price_cents,"+
        "(SELECT details FROM offer_quality_checks q WHERE q.offer_id=o.id AND q.passed=0 ORDER BY q.id DESC LIMIT 1) AS latest_issue,"+
        "(SELECT note FROM moderation_notes n WHERE n.offer_id=o.id ORDER BY n.id DESC LIMIT 1) AS last_note "+
        "FROM offer_review_queue r JOIN offers o ON o.id=r.offer_id WHERE r.status='pending' "+
        "ORDER BY CASE WHEN o.merchant='Mercado Livre' THEN 0 ELSE 1 END,r.created_at ASC,r.id ASC LIMIT 100"
      ).all();
      return authJson({reviews:results,count:results.length,note:"Pendências internas; não comprovam preços, estoques ou comissões."});
    }
    if (path === "/api/admin/catalog") {
      const result = await listCatalog(db, url.searchParams);
      return result.error ? authError(result.error, result.status) : authJson(result.data);
    }
    if (path === "/api/admin/summary") {
      const { results } = await db.prepare("SELECT status, COUNT(*) AS total FROM offers GROUP BY status").all();
      const totals = { pending: 0, approved: 0, paused: 0 };
      for (const row of results) {
        if (Object.hasOwn(totals, row.status)) totals[row.status] = row.total;
      }
      return authJson({ total: totals.pending + totals.approved + totals.paused, ...totals });
    }
    if (path === "/api/admin/export") {
      const { results } = await db.prepare("SELECT id,title,category,merchant,price_cents,url,status,created_at,updated_at FROM offers ORDER BY id LIMIT 5000").all();
      const columns = ["id","title","category","merchant","price_cents","url","status","created_at","updated_at"];
      const clean = value => {
        const s = String(value ?? "");
        const safe = /^[=+@-]/.test(s) ? "'" + s : s;
        return '"' + safe.replaceAll('"','""') + '"';
      };
      const csv = String.fromCharCode(65279) + columns.join(";") + "\r\n" +
        results.map(row => columns.map(key => clean(row[key])).join(";")).join("\r\n");
      return new Response(csv, { headers: { ...authHeaders,
        "content-type":"text/csv; charset=utf-8",
        "content-disposition":'attachment; filename="vitrine-radar-ofertas.csv"' } });
    }
    if (path === "/api/admin/marketplaces") {
      const { results } = await db.prepare("SELECT p.marketplace, p.approval_status, p.program_url, m.enabled FROM affiliate_programs p LEFT JOIN marketplace_sources m ON m.marketplace = p.marketplace ORDER BY p.id").all();
      return authJson({ marketplaces: results });
    }
    if (path === "/api/admin/analytics") {
      const { results } = await db.prepare("SELECT substr(clicked_at,1,10) AS day, COUNT(*) AS clicks FROM affiliate_clicks WHERE clicked_at >= date('now','-13 days') GROUP BY substr(clicked_at,1,10) ORDER BY day").all();
      const { results: storeDays } = await db.prepare("SELECT substr(occurred_at,1,10) AS day, SUM(CASE WHEN action='visit' THEN 1 ELSE 0 END) AS visits, SUM(CASE WHEN action='share' THEN 1 ELSE 0 END) AS shares FROM store_engagement WHERE occurred_at >= date('now','-13 days') GROUP BY substr(occurred_at,1,10) ORDER BY day").all();
      const { results: topOffers } = await db.prepare("SELECT o.id,o.title,o.category,COALESCE(c.clicks,0) AS clicks,COALESCE(v.views,0) AS views FROM offers o LEFT JOIN (SELECT offer_id,COUNT(*) AS clicks FROM affiliate_clicks WHERE clicked_at>=date('now','-13 days') GROUP BY offer_id) c ON c.offer_id=o.id LEFT JOIN (SELECT CAST(substr(path,10) AS INTEGER) AS offer_id,SUM(views) AS views FROM page_view_daily WHERE path LIKE '/ofertas/%' AND day>=date('now','-13 days') GROUP BY path) v ON v.offer_id=o.id WHERE o.status='approved' ORDER BY clicks DESC,views DESC,o.updated_at DESC LIMIT 30").all();
      const { results: launchVisits } = await db.prepare(`
        SELECT channel, SUM(clicks) AS visits
        FROM traffic_daily
        WHERE day >= date('now', '-13 days') AND channel IN ('instagram', 'whatsapp')
        GROUP BY channel
      `).all();
      return authJson({ days: results, storeDays, topOffers, launchVisits });
    }
    if(path === "/api/admin/shopee-store") {
      const store=await db.prepare("SELECT affiliate_url,status,verified_at,updated_at FROM partner_storefronts WHERE marketplace='Shopee'").first();
      const payout=await db.prepare("SELECT value FROM system_config WHERE key='shopee_payout_status'").first();
      return authJson({store:store||{status:'draft'},payout_status:payout?.value||'not_verified',note:'Cliques não são vendas nem comissões.'});
    }
    if (path === "/api/admin/partner-stores") {
      const {results:stores}=await db.prepare("SELECT marketplace,display_name,status,verified_at,updated_at FROM partner_storefronts ORDER BY marketplace").all();
      const {results:daily}=await db.prepare("SELECT marketplace,substr(clicked_at,1,10) AS day,COUNT(*) AS clicks FROM partner_store_clicks WHERE clicked_at>=date('now','-29 days') GROUP BY marketplace,substr(clicked_at,1,10) ORDER BY day DESC,marketplace").all();
      const {results:totals}=await db.prepare("SELECT marketplace,COUNT(*) AS clicks FROM partner_store_clicks GROUP BY marketplace ORDER BY clicks DESC").all();
      return authJson({stores,daily,totals,period_days:30,note:'Cliques de saída, não vendas ou comissões.'});
    }
    if (path === "/api/admin/pageviews") {
      const { results } = await db.prepare("SELECT path, SUM(views) AS views FROM page_view_daily WHERE day >= date('now', '-13 days') GROUP BY path ORDER BY views DESC").all();
      const { results: shareResults } = await db.prepare("SELECT path, SUM(shares) AS shares FROM content_share_daily WHERE day >= date('now', '-13 days') GROUP BY path ORDER BY shares DESC").all();
      return authJson({ pages: results, shares: shareResults });
    }
    if (path === "/api/admin/diagnostics") {
      const stats = await db.prepare(
        "SELECT (SELECT COUNT(*) FROM affiliate_programs) AS total_programs," +
        "(SELECT COUNT(*) FROM affiliate_programs WHERE approval_status='approved') AS approved_programs," +
        "(SELECT COUNT(*) FROM marketplace_sources WHERE enabled=1) AS active_syncs," +
        "(SELECT COUNT(*) FROM offers WHERE status='approved') AS approved_offers," +
        "(SELECT COUNT(*) FROM offers WHERE status='pending') AS pending_offers," +
        "(SELECT value FROM system_config WHERE key='magalu_store_url') AS store_url," +
        "(SELECT value FROM system_config WHERE key='shopee_payout_status') AS shopee_payout," +
        "(SELECT value FROM system_config WHERE key='stale_offer_days') AS stale_days," +
        "(SELECT COUNT(*) FROM offer_review_queue WHERE status='pending') AS pending_reviews," +
        "(SELECT approval_status FROM affiliate_programs WHERE marketplace='Amazon') AS amazon_status," +
        "(SELECT value FROM system_config WHERE key='amazon_qualified_sales_target') AS amazon_target"
      ).first();
      const job = await db.prepare("SELECT status,created_at,finished_at FROM automation_jobs WHERE job_type='daily_housekeeping' ORDER BY id DESC LIMIT 1").first();
      const indexnow = await db.prepare("SELECT response_status,attempted_at FROM indexnow_notifications ORDER BY attempted_at DESC LIMIT 1").first();
      return authJson({ ...stats, stale_days: Number(stats.stale_days || 30), last_job: job || null, indexnow: indexnow || null });
    }
    if (path === "/api/admin/operations") {
      const { offers, clicks, imports, jobs } = await db.prepare(`
        SELECT (SELECT COUNT(*) FROM offers) AS offers,
          (SELECT COUNT(*) FROM affiliate_clicks) AS clicks,
          (SELECT COUNT(*) FROM offer_import_batches) AS imports,
          (SELECT COUNT(*) FROM automation_jobs) AS jobs
      `).first();
      return authJson({ offers, clicks, imports, jobs, mode: "manual-approval", updated_at: new Date().toISOString() });
    }
    if (path === "/api/admin/audit") {
      const { results } = await db.prepare("SELECT event_type, offer_id, created_at FROM admin_events ORDER BY id DESC LIMIT 20").all();
      return authJson({ events: results });
    }
    return authError("Não encontrado.", 404);
  }

  const reviewNotePath = path.match(/^\/api\/admin\/reviews\/([1-9][0-9]*)\/note$/);
  const statusPath = path.match(/^\/api\/admin\/offers\/([1-9][0-9]*)\/status$/);
  const editPath = path.match(/^\/api\/admin\/offers\/([1-9][0-9]*)$/);
  const couponPath = path.match(/^\/api\/admin\/coupons\/([1-9][0-9]*)$/);
  const publishingCoupon = path === "/api/admin/coupons" && request.method === "POST";
  const expiringCoupon = couponPath && request.method === "PATCH";
  const notingReview = Boolean(reviewNotePath && request.method === "POST");
  const savingShopee = path === "/api/admin/shopee-store" && request.method === "POST";
  const addingLink = path === "/api/admin/link-inbox" && request.method === "POST";
  const addingComparisonQuotes = path === "/api/admin/compare/quotes" && request.method === "POST";
  const importing = path === "/api/admin/import" && request.method === "POST";
  const creating = path === "/api/admin/offers" && request.method === "POST";
  const changing = statusPath && request.method === "PATCH";
  const editing = editPath && request.method === "PUT";
  if (!creating && !changing && !editing && !importing && !addingLink && !savingShopee &&
      !notingReview && !addingComparisonQuotes && !publishingCoupon && !expiringCoupon) return authError("Método inválido.", 405);
  if (request.headers.get("origin") !== url.origin || !same(request.headers.get("x-csrf-token") || "", session.csrf)) {
    return authError("Atualize o painel e tente novamente.", 403);
  }
  if (expiringCoupon) {
    const id = Number(couponPath[1]);
    if (!Number.isSafeInteger(id)) return authError("Cupom não encontrado.", 404);
    const result = await expireCoupon(db, session.email, id);
    return authJson(result.data, result.status);
  }

  let body;
  try {
    body = await readJson(request, importing || addingComparisonQuotes ? 128 * 1024 : 8192);
  } catch {
    return authError("Solicitação inválida.", 400);
  }
  if (addingComparisonQuotes) {
    const result = await recordComparisonQuotes(db, body);
    return authJson(result.data, result.status);
  }
  if (publishingCoupon) {
    const result = await publishCoupon(db, session.email, body);
    return authJson(result.data, result.status);
  }
  const id = changing ? Number(statusPath[1]) : editing ? Number(editPath[1]) : null;
  if ((changing || editing) && !Number.isSafeInteger(id)) return authError("Oferta não encontrada.", 404);

  if (notingReview) {
    const reviewId=Number(reviewNotePath[1]);
    const note=typeof body.note==="string"?body.note.trim():"";
    if(!Number.isSafeInteger(reviewId)||note.length<15||note.length>700)return authError("Registre uma observação de 15 a 700 caracteres.",400);
    const task=await db.prepare("SELECT offer_id FROM offer_review_queue WHERE id=? AND status='pending'").bind(reviewId).first();
    if(!task)return authError("Revisão pendente não encontrada.",404);
    await db.batch([
      db.prepare("INSERT INTO moderation_notes(offer_id,note) VALUES(?,?)").bind(task.offer_id,note),
      db.prepare("INSERT INTO admin_events(actor_email,event_type,offer_id,details) VALUES(?,'review_note_added',?,?)").bind(session.email,task.offer_id,note.slice(0,200))
    ]);
    return authJson({ok:true,note:"Observação registrada. Isso não valida preço, estoque ou comissão."},201);
  }
  if(savingShopee){
    if(body.confirmed_from_official_portal!==true || typeof body.url!=="string" || body.url.length>2048)
      return authError("Confirme que gerou o link na sua conta de afiliado Shopee.",400);
    let destination;
    try{
      destination=new URL(body.url.trim());
      const hosts=["s.shopee.com.br","shope.ee","shopee.com.br","www.shopee.com.br","shopee.com"];
      if(destination.protocol!=="https:"||!hosts.includes(destination.hostname.toLowerCase())||
         destination.username||destination.password||destination.port||destination.pathname==="/"||
         /\/login|\/help|\/m\/afiliados/.test(destination.pathname))throw Error();
    }catch{return authError("Informe o link oficial de compartilhamento gerado no portal Shopee, não o link de cadastro.",400);}
    await db.batch([
      db.prepare("UPDATE partner_storefronts SET affiliate_url=?,display_name='Shopee — Vitrine Radar',status='active',verified_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE marketplace='Shopee'").bind(destination.href),
      db.prepare("INSERT INTO admin_events(actor_email,event_type,offer_id,details) VALUES(?,'shopee_link_connected',NULL,'Owner-confirmed affiliate link')").bind(session.email),
      db.prepare("INSERT INTO system_config(key,value) VALUES('shopee_affiliate_link_evidence','owner_confirmed_portal') ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    ]);
    return authJson({ok:true,status:'active',store_url:'/lojas/shopee',note:'Comissões e pagamentos só são confirmados no painel Shopee.'});
  }
  if (addingLink) {
    const supported = {
      "Magalu": ["magazinevoce.com.br", "magazineluiza.com.br", "magalu.com.br", "magalu.com", "maga.lu"],
      "Mercado Livre": ["mercadolivre.com.br", "mercadolibre.com.br", "meli.la", "mercadolivre.com"],
      "Shopee": ["shopee.com.br", "shopee.com", "shope.ee"],
      "Amazon": ["amazon.com.br", "amazon.com", "amzn.to"]
    };
    const allowed = supported[body.marketplace];
    if (!allowed || typeof body.url !== "string" || body.url.length > 2048) return authError("Plataforma ou link inválido.", 400);
    let target;
    try {
      target = new URL(body.url.trim());
      if (target.protocol !== "https:" || target.username || target.password || target.port ||
          !allowed.some(domain => target.hostname === domain || target.hostname.endsWith("." + domain))) throw Error();
    } catch { return authError("Utilize um link HTTPS do domínio oficial da plataforma selecionada.", 400); }
    const total = await db.prepare("SELECT COUNT(*) AS total FROM affiliate_link_inbox").first();
    if (total.total >= 100) return authError("Limite de 100 links atingido. Revise o catálogo.", 409);
    const inserted = await db.prepare("INSERT OR IGNORE INTO affiliate_link_inbox (marketplace,url) VALUES (?,?)").bind(body.marketplace,target.href).run();
    if (!inserted.meta.changes) return authError("Esse link já foi guardado.", 409);
    return authJson({ ok: true, status: "pending" }, 201);
  }
  const result = importing ? await importOffers(db, session.email, body) : creating ? await createOffer(db, session.email, body) : editing ? await updateOffer(db, session.email, id, body) : await changeOfferStatus(db, session.email, id, body);
  if (!result.error && creating && typeof body.url === "string") {
    try { await db.prepare("UPDATE affiliate_link_inbox SET status = 'used' WHERE url = ?").bind(new URL(body.url.trim()).href).run(); } catch {}
  }
  return result.error ? authError(result.error, result.status) : authJson(result.data, result.status);
}

async function followOffer(db, path) {
  const id = Number(path.split("/")[2]);
  if (!Number.isSafeInteger(id)) return new Response("Link inválido", { status: 400 });
  const offer = await db.prepare("SELECT id, url FROM offers WHERE id = ? AND status = 'approved'").bind(id).first();
  if (!offer) return new Response("Oferta indisponível", { status: 404, headers: { "cache-control": "no-store" } });
  let destination;
  try {
    destination = offerDestination(offer.url);
  } catch {
    return new Response("Destino inválido", { status: 422 });
  }
  try {
    await db.prepare("INSERT INTO affiliate_clicks (offer_id, referrer_category) VALUES (?, 'storefront')").bind(id).run();
  } catch {
    // Visitors can reach an approved offer if click tracking is temporarily unavailable.
  }
  return new Response(null, { status: 302, headers: { location: destination.href, "cache-control": "no-store" } });
}


async function notifyIndexNow(env) {
  const config=await env.DB.prepare("SELECT value FROM system_config WHERE key='indexnow_key'").first();
  const key=config?.value;
  if(!key || !/^[a-f0-9]{32}$/.test(key))return {skipped:"indexnow_key_missing"};
  const root="https://vitrine-radar.ainacio1980-financas.workers.dev";
  const {results:offers}=await env.DB.prepare("SELECT id,updated_at FROM offers WHERE status='approved' ORDER BY id LIMIT 500").all();
  const homeRevision=offers.map(o=>o.id+":"+o.updated_at).join("|").slice(-2500);
  const pages=[
    {path:"/",revision:"2026-11-14:homepage:"+homeRevision},
    {path:"/sobre",revision:"2026-11-14:privacy"},
    {path:"/guia-de-compras",revision:"2026-11-14:guide"}
  ];
  for(const slug of guideSlugs)pages.push({path:"/guias/"+slug,revision:"2026-11-14:guide"});
  for(const o of offers)pages.push({path:"/ofertas/"+o.id,revision:String(o.updated_at)});
  const {results:history}=await env.DB.prepare("SELECT path,revision,response_status,attempted_at FROM indexnow_notifications").all();
  const prior=new Map(history.map(v=>[v.path,v]));
  const pending=pages.filter(p=>{
    const last=prior.get(p.path);
    if(!last||last.revision!==p.revision)return true;
    if(last.response_status===200||last.response_status===202)return false;
    const attempted=Date.parse(String(last.attempted_at||"").replace(" ","T")+"Z");
    return !Number.isFinite(attempted)||Date.now()-attempted>=20*60*60*1000;
  });
  if(!pending.length)return {sent:0};
  const request={
    host:new URL(root).host,
    key,
    keyLocation:root+"/"+key+".txt",
    urlList:pending.map(x=>root+x.path)
  };
  const response=await fetch("https://api.indexnow.org/indexnow",{
    method:"POST",
    headers:{"content-type":"application/json; charset=utf-8"},
    body:JSON.stringify(request)
  });
  await env.DB.batch(pending.map(p=>env.DB.prepare(
    "INSERT INTO indexnow_notifications(path,revision,response_status,attempted_at) VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(path) DO UPDATE SET revision=excluded.revision,response_status=excluded.response_status,attempted_at=CURRENT_TIMESTAMP"
  ).bind(p.path,p.revision,response.status)));
  if(response.status!==200 && response.status!==202)throw Error("IndexNow HTTP "+response.status);
  return {sent:pending.length,status:response.status};
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/logo-vitrine-radar.svg" && (request.method === "GET" || request.method === "HEAD")) return new Response(request.method === "HEAD" ? null : "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"650\" height=\"190\" viewBox=\"0 0 650 190\"><defs><linearGradient id=\"g\"><stop stop-color=\"#fff2a2\"/><stop offset=\".5\" stop-color=\"#ffc52d\"/><stop offset=\"1\" stop-color=\"#b77500\"/></linearGradient></defs><rect width=\"650\" height=\"190\" rx=\"20\" fill=\"#090909\"/><g stroke=\"url(#g)\" fill=\"none\" stroke-width=\"8\"><path d=\"M22 45H145V170H22Z M52 45V28Q52 7 83 7Q114 7 114 28V45\"/><circle cx=\"544\" cy=\"83\" r=\"66\"/><circle cx=\"544\" cy=\"83\" r=\"42\"/><path d=\"M544 83L592 30\"/></g><circle cx=\"544\" cy=\"83\" r=\"9\" fill=\"#ffda54\"/><text x=\"173\" y=\"85\" font-family=\"Arial\" font-size=\"61\" font-weight=\"900\" font-style=\"italic\" fill=\"#e9edf4\">VITRINE</text><text x=\"173\" y=\"150\" font-family=\"Arial\" font-size=\"75\" font-weight=\"900\" font-style=\"italic\" fill=\"url(#g)\">RADAR</text><path d=\"M180 163Q360 183 510 157\" stroke=\"#e6aa20\" stroke-width=\"5\" fill=\"none\"/></svg>", {headers: {"content-type":"image/svg+xml; charset=utf-8","cache-control":"public, max-age=3600","x-content-type-options":"nosniff"}});
    if (path === "/admin/login" && request.method === "GET") return html(loginPage, true);
    if (path === "/vitrine-radar-capa.jpg" && (request.method === "GET" || request.method === "HEAD")) {
      return new Response(request.method === "HEAD" ? null : shareCover, {
        headers: {
          "content-type": "image/jpeg",
          "content-length": String(shareCover.byteLength),
          "cache-control": "public, max-age=86400",
          "x-content-type-options": "nosniff"
        }
      });
    }
    try {
      if (path === "/api/auth/login" && request.method === "POST") return await login(request, url, env);
      if (path === "/api/auth/logout" && request.method === "POST") return await logout(request, url, env.DB);
      if (path === "/admin" || path === "/admin/" || path.startsWith("/api/admin/")) return await handleAdmin(request, url, env.DB);
      if (path === "/api/partner-stores" && request.method === "GET") {
        const {results}=await env.DB.prepare("SELECT marketplace,display_name,affiliate_url FROM partner_storefronts WHERE status='active' ORDER BY marketplace").all();
        return Response.json({stores:results.map(x=>({marketplace:x.marketplace,name:x.display_name,visit_url:'/lojas/'+(x.marketplace==='Mercado Livre'?'mercado-livre':x.marketplace.toLowerCase())}))},{headers:{'cache-control':'public,max-age=120','x-content-type-options':'nosniff'}});
      }
      const partnerRoute = {"/lojas/mercado-livre":"Mercado Livre", "/lojas/magalu":"Magalu", "/lojas/amazon":"Amazon"}[path];
      if (partnerRoute) {
        if (request.method !== "GET") return new Response(null, {status:405});
        const store = await env.DB.prepare("SELECT affiliate_url FROM partner_storefronts WHERE marketplace=? AND status='active'").bind(partnerRoute).first();
        if (!store) return new Response("Loja indisponível", {status:404});
        const destination = new URL(store.affiliate_url);
        const allowedHosts = {
          "Mercado Livre":["meli.la","www.mercadolivre.com.br"],
          "Magalu":["www.magazinevoce.com.br"],
          "Amazon":["www.amazon.com.br","amazon.com.br"]
        };
        if (destination.protocol !== "https:" || !allowedHosts[partnerRoute].includes(destination.hostname)) {
          return new Response("Destino não autorizado", {status:400});
        }
        await env.DB.prepare("INSERT INTO partner_store_clicks(marketplace,referrer_path) VALUES(?,?)").bind(partnerRoute,"/").run();
        return new Response(null, {status:302,headers:{"location":destination.toString(),"cache-control":"no-store","referrer-policy":"no-referrer"}});
      }
      if(path === "/lojas/shopee" && request.method === "GET") {
        const store=await env.DB.prepare("SELECT affiliate_url,status FROM partner_storefronts WHERE marketplace='Shopee'").first();
        if(store?.status==="active"){
          let destination;
          try{
            destination=new URL(store.affiliate_url);
            if(destination.protocol!=="https:"||!["s.shopee.com.br","shope.ee","shopee.com.br","www.shopee.com.br","shopee.com"].includes(destination.hostname)||
               destination.username||destination.password||destination.port)throw Error();
          }catch{return new Response("Destino Shopee não autorizado",{status:400});}
          await env.DB.prepare("INSERT INTO partner_store_clicks(marketplace,referrer_path) VALUES('Shopee','/')").run();
          return new Response(null,{status:302,headers:{location:destination.href,"cache-control":"no-store","referrer-policy":"no-referrer"}});
        }
        return html("<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex,follow\"><title>Shopee em integração · Vitrine Radar</title><style>body{background:#f5f7fb;font:16px system-ui,sans-serif;color:#253247;margin:0;padding:24px}main{max-width:650px;margin:5vh auto;background:white;border:1px solid #e2e8f1;border-radius:18px;padding:clamp(22px,5vw,40px)}h1{margin:0 0 12px;font-size:clamp(1.6rem,5vw,2rem)}p{line-height:1.7}a{color:#155ec9}a:focus-visible{outline:3px solid #f48e6a}.tag{color:#a64222;background:#fff1ec;padding:6px 10px;border-radius:6px;font-weight:700;font-size:12px}.action{display:inline-block;background:#ee4d2d;color:white;text-decoration:none;padding:12px 18px;border-radius:9px;font-weight:700;margin-top:10px}</style></head><body><main><span class=\"tag\">EM PREPARAÇÃO</span><h1>Shopee no Vitrine Radar</h1><p>Estamos preparando uma seleção de produtos da Shopee para a Vitrine Radar. A loja ainda não está disponível para compras por nossos links de afiliado.</p><p>Assim que o link da vitrine estiver confirmado, este endereço abrirá a seleção diretamente na Shopee.</p><a class=\"action\" href=\"/\">Voltar às ofertas disponíveis</a></main></body></html>",true);
      }
      if (path === "/api/content-share" && request.method === "POST") {
        if (request.headers.get("origin") !== url.origin) return new Response(null, { status: 403 });
        const body = await request.text();
        if (body.length > 96) return new Response(null, { status: 400 });
        let requested;
        try { requested = JSON.parse(body).path; } catch { return new Response(null, { status: 400 }); }
        if (typeof requested !== "string" || !requested.startsWith("/guias/") || !guideSlugs.includes(requested.slice(7))) {
          return new Response(null, { status: 400 });
        }
        await env.DB.prepare("INSERT INTO content_share_daily(day,path,shares) VALUES(date('now'),?,1) ON CONFLICT(day,path) DO UPDATE SET shares=shares+1")
          .bind(requested).run();
        return new Response(null, { status: 204, headers: { "cache-control":"no-store" } });
      }
      if (path === "/api/page-view" && request.method === "POST") {
        if (request.headers.get("origin") !== url.origin) return new Response(null, { status: 403 });
        let event;
        try { event = await readJson(request, 160); } catch { return new Response(null, { status: 400 }); }
        const requested = event.path;
        const match = typeof requested === "string" ? requested.match(/^\/ofertas\/([1-9][0-9]*)$/) : null;
        const offerId=match?Number(match[1]):null;
        const validOffer=Number.isSafeInteger(offerId) && Boolean(await env.DB.prepare("SELECT 1 FROM offers WHERE id=? AND status='approved'").bind(offerId).first());
        if (typeof requested !== "string" ||
            !(["/", "/sobre", "/guia-de-compras"].includes(requested) || validOffer ||
            (requested.startsWith("/guias/") && guideSlugs.includes(requested.slice(7))))) {
          return new Response(null, { status: 400 });
        }
        const pageView = env.DB.prepare("INSERT INTO page_view_daily(day,path,views) VALUES(date('now'),?,1) ON CONFLICT(day,path) DO UPDATE SET views=views+1").bind(requested);
        if (launchChannels.has(event.channel)) {
          const campaignVisit = env.DB.prepare(`
            INSERT INTO traffic_daily(day, channel, clicks)
            VALUES(date('now'), ?, 1)
            ON CONFLICT(day, channel) DO UPDATE SET clicks = clicks + 1
          `).bind(event.channel);
          await env.DB.batch([pageView, campaignVisit]);
        } else {
          await pageView.run();
        }
        return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
      }
      if (path === "/api/store-engagement" && request.method === "POST") {
        if (request.headers.get("origin") !== url.origin) return Response.json({ error: "Origem inválida" }, { status: 403 });
        const body = await request.text();
        if (body.length > 80) return Response.json({ error: "Requisição inválida" }, { status: 400 });
        let action;
        try { action = JSON.parse(body).action; } catch { return Response.json({ error: "Requisição inválida" }, { status: 400 }); }
        if (action !== "visit" && action !== "share") return Response.json({ error: "Ação inválida" }, { status: 400 });
        await env.DB.prepare("INSERT INTO store_engagement(action) VALUES (?)").bind(action).run();
        return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
      }
      if (request.method === "POST" && /^\/api\/click\/[1-9][0-9]*$/.test(path)) {
        if (request.headers.get("origin") !== url.origin) return authError("Origem inválida.", 403);
        const id = Number(path.split("/")[3]);
        if (!Number.isSafeInteger(id)) return authError("Oferta inválida.", 400);
        const offer = await env.DB.prepare("SELECT id FROM offers WHERE id = ? AND status = 'approved'").bind(id).first();
        if (!offer) return authError("Oferta indisponível.", 404);
        await env.DB.prepare("INSERT INTO affiliate_clicks (offer_id, referrer_category) VALUES (?, 'direct_link')").bind(id).run();
        return authJson({ ok: true });
      }
      if (request.method === "GET" && /^\/go\/[1-9][0-9]*$/.test(path)) return await followOffer(env.DB, path);

      const publicHeaders = { ...authHeaders, "access-control-allow-origin": url.origin };
      if (path === "/api/health") {
        const { total } = await env.DB.prepare("SELECT COUNT(*) AS total FROM offers").first();
        return Response.json({ ok: true, service: "vitrine-radar", database: "connected", offers: total }, { headers: publicHeaders });
      }
      if (path === "/api/compare") {
        if (request.method !== "GET") return Response.json({ error: "Método inválido." }, { status: 405, headers: publicHeaders });
        const comparison = await compareProducts(env.DB, url.searchParams);
        return Response.json(comparison.data, { status: comparison.status, headers: publicHeaders });
      }
      if (path === "/api/coupons" || path === "/api/curation") {
        if (request.method !== "GET") return Response.json({ error: "Método inválido." }, { status: 405, headers: publicHeaders });
        if (path === "/api/coupons" && url.searchParams.has("offer")) {
          const offer = url.searchParams.get("offer");
          const id = Number(offer);
          if (!/^[1-9][0-9]*$/.test(offer) || !Number.isSafeInteger(id) || url.searchParams.has("marketplace")) {
            return Response.json({ error: "Selecione um anúncio válido." }, { status: 400, headers: publicHeaders });
          }
          return Response.json(await couponForCatalogOffer(env.DB, id), { headers: publicHeaders });
        }
        const result = path === "/api/coupons" ? await listCoupons(env.DB, url.searchParams.get("marketplace")) :
          { data: await dailyCuration(env.DB) };
        return Response.json(result.data, { status: result.status, headers: publicHeaders });
      }
      if (path === "/api/offers") {
        if (request.method !== "GET") return Response.json({ error: "method_not_allowed" }, { status: 405, headers: publicHeaders });
        const offset = Number(url.searchParams.get("offset") ?? "0");
        if (!Number.isSafeInteger(offset) || offset < 0) {
          return Response.json({ error: "invalid_offset" }, { status: 400, headers: publicHeaders });
        }
        const pageSize = 60;
        const { results } = await env.DB.prepare(`
          SELECT o.id, o.title, o.category, o.merchant, o.price_cents, o.price_terms, o.updated_at, o.url,
          COALESCE(m.kind, 'affiliate_existing') AS link_kind, ${primaryProductImage} FROM offers o
          LEFT JOIN offer_link_meta m ON m.offer_id=o.id
          WHERE o.status = 'approved' ORDER BY o.updated_at DESC, o.id DESC LIMIT ? OFFSET ?
        `).bind(pageSize + 1, offset).all();
        const offers = results.slice(0, pageSize).map(offer => ({ ...offer, image_url: safeProductImageUrl(offer.image_url) }));
        const nextOffset = results.length > pageSize ? offset + pageSize : null;
        return Response.json({ offers, count: offers.length, next_offset: nextOffset }, { headers: publicHeaders });
      }
      if (request.method === "GET" && /^\/ofertas\/[1-9][0-9]*$/.test(path)) {const id=Number(path.slice(9));if(Number.isSafeInteger(id)){const page=await renderOfferPage(env.DB,id);if(page)return html(page);}return new Response("Oferta indisponível",{status:404,headers:{"cache-control":"no-store"}});}
      if (path === "/guia-de-compras" && request.method === "GET") return html(guidePage);
      if (path.startsWith("/guias/") && request.method === "GET") { const page = renderGuidePage(path.slice(7)); if (page) return html(page); }
      if (path === "/sobre" && request.method === "GET") return html(aboutPage);
      if (request.method === "GET" && /^\/[a-f0-9]{32}\.txt$/.test(path)) {
        const row=await env.DB.prepare("SELECT value FROM system_config WHERE key='indexnow_key'").first();
        if(row && path==="/"+row.value+".txt")return new Response(row.value,{headers:{"content-type":"text/plain; charset=utf-8","cache-control":"public,max-age=3600"}});
        return new Response("Não encontrado",{status:404});
      }
      if (path === "/sitemap.xml" && request.method === "GET") { 
        const root = "https://vitrine-radar.ainacio1980-financas.workers.dev";
        const { results: offers } = await env.DB.prepare("SELECT id,updated_at FROM offers WHERE status='approved' ORDER BY id LIMIT 1000").all();
        const offerPages=offers.map(o=>({path:"/ofertas/"+o.id, lastmod:String(o.updated_at).slice(0,10)}));
        const latest=offerPages.reduce((v,o)=>o.lastmod>v?o.lastmod:v,"2026-11-13");
        const entries=[{path:"/",lastmod:latest},{path:"/sobre",lastmod:"2026-11-13"},{path:"/guia-de-compras",lastmod:"2026-11-13"},
          ...guideSlugs.map(s=>({path:"/guias/"+s,lastmod:"2026-11-13"})),...offerPages];
        const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
          entries.map(o=>"<url><loc>"+root+o.path+"</loc><lastmod>"+o.lastmod+"</lastmod></url>").join("")+"</urlset>";
        return new Response(xml,{headers:{"content-type":"application/xml; charset=utf-8"}});
      }
      if (path === "/robots.txt" && request.method === "GET") return new Response("User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /go/\nSitemap: https://vitrine-radar.ainacio1980-financas.workers.dev/sitemap.xml\n", {headers:{"content-type":"text/plain; charset=utf-8"}});
      if(path === "/" || path === "/index.html"){
        const s=await env.DB.prepare("SELECT status FROM partner_storefronts WHERE marketplace='Shopee'").first();
        const page=s?.status==="active"?storefrontPage:storefrontPage.replace("Shopee · Vitrine Radar","Shopee · Em integração").replace("Abrir ofertas Shopee de saúde e bem-estar","Shopee em integração").replace("background:#ee4d2d;color:#fff;text-decoration:none;font-weight:700","background:#f0f3f7;color:#42526a;font-weight:700;border:1px solid #cdd7e3").replace("href='/lojas/shopee' target='_blank' rel='sponsored noopener noreferrer'","href='/lojas/shopee'");
        return html(addRadar(addComparator(page)));
      }
      return new Response("Não encontrado", { status: 404 });
    } catch {
      if (path === "/api/health") return Response.json({ ok: false, database: "unavailable" }, { status: 503, headers: authHeaders });
      if (path === "/api/offers") return Response.json({ error: "temporarily_unavailable" }, { status: 503, headers: authHeaders });
      return authError("Serviço temporariamente indisponível. Tente novamente.", 503);
    }
  },

  async scheduled(controller, env) {
    if (controller.cron === "10 * * * *") {
      await dropExpiredComparisonQuotes(env.DB, Date.now()).run();
      return;
    }
    if (controller.cron !== "0 6 * * *") return;
    const now = Date.now();
    const run = await env.DB.prepare("INSERT INTO automation_jobs (job_type, status, started_at) VALUES ('daily_housekeeping', 'running', CURRENT_TIMESTAMP)").run();
    const jobId = run.meta.last_row_id;
    try {
      const configured = await env.DB.prepare("SELECT value FROM system_config WHERE key = ?").bind("stale_offer_days").first();
      const staleDays = Math.min(90, Math.max(7, Number(configured?.value) || 30));
      const age = "-" + staleDays + " days";
      await env.DB.batch([
        dropExpiredComparisonQuotes(env.DB, now),
        env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at < ?").bind(now),
        env.DB.prepare("DELETE FROM login_attempts WHERE attempted_at < ?").bind(now - 604800000),
        env.DB.prepare("DELETE FROM page_view_daily WHERE day < date('now', '-180 days')"),
        env.DB.prepare("DELETE FROM traffic_daily WHERE day < date('now', '-180 days') AND channel IN ('instagram', 'whatsapp')"),
        env.DB.prepare("DELETE FROM content_share_daily WHERE day < date('now', '-180 days')"),
        env.DB.prepare("INSERT INTO admin_events(actor_email,event_type,offer_id,details) SELECT 'system','offer_auto_paused',id,'No review in ' || ? || ' days' FROM offers WHERE status='approved' AND updated_at < datetime('now', ?)").bind(staleDays, age),
        env.DB.prepare("UPDATE offers SET status='paused',updated_at=CURRENT_TIMESTAMP WHERE status='approved' AND updated_at < datetime('now', ?)").bind(age),
        env.DB.prepare("INSERT INTO daily_offer_metrics (day, offer_id, clicks) SELECT substr(clicked_at,1,10), offer_id, COUNT(*) FROM affiliate_clicks WHERE clicked_at >= date('now', '-7 days') GROUP BY substr(clicked_at,1,10), offer_id ON CONFLICT(day,offer_id) DO UPDATE SET clicks=excluded.clicks")
      ]);
      await env.DB.prepare("UPDATE automation_jobs SET status='completed', finished_at=CURRENT_TIMESTAMP WHERE id=?").bind(jobId).run();
      try { const seo=await notifyIndexNow(env); if(seo.sent)await env.DB.prepare("INSERT INTO automation_jobs(job_type,status,started_at,finished_at) VALUES('indexnow_notify','completed',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(); } catch (seoError) {await env.DB.prepare("INSERT INTO automation_jobs(job_type,status,started_at,finished_at,error_text) VALUES('indexnow_notify','failed',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?)").bind(String(seoError).slice(0,300)).run();}
    } catch (error) {
      await env.DB.prepare("UPDATE automation_jobs SET status='failed', error_text=?, finished_at=CURRENT_TIMESTAMP WHERE id=?").bind(String(error).slice(0,500), jobId).run();
      throw error;
    }
  },
};

