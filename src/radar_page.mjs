import { couponStores } from "./coupons.mjs";

const styles = `<style>
.vr-radar{margin:18px 0 24px;padding:clamp(17px,3vw,28px);background:#fff;border:1px solid #d7e2f4;border-radius:18px;color:#172c52}
.vr-radar h2{margin:0 0 8px;color:#102e68;line-height:1.2;font-size:clamp(1.35rem,2.8vw,1.9rem);letter-spacing:-.02em}
.vr-radar p{margin:6px 0;line-height:1.45}
.vr-radar a,.vr-compare .vr-coupon-link,.vr-compare .vr-store-search{color:#154889;font-weight:700;text-underline-offset:3px}
.vr-radar :is(a,button,select):focus-visible{outline:3px solid #2a63ab;outline-offset:3px}
.vr-radar [hidden]{display:none}
.vr-radar-status{font-size:.88rem;color:#405676}
.vr-radar-source-list,.vr-radar-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0 0}
.vr-radar-source-list a{display:grid;gap:4px;align-content:center;min-height:52px;padding:9px 10px;border:1px solid #cbd8ed;border-radius:11px;background:#f6f9fe;text-decoration:none}
.vr-radar-source-list a:hover{background:#eaf2ff;text-decoration:underline}
.vr-radar-source-list a span{font-size:.8rem;font-weight:550}
.vr-radar-picker{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:14px;font-size:.88rem;font-weight:650}
.vr-radar-picker select{padding:7px 10px;color:#172c52}
.vr-radar-card{padding:12px;border:1px solid #cbd8ed;border-radius:12px;display:flex;min-width:0;flex-direction:column;gap:6px;overflow-wrap:anywhere}
.vr-radar-card :is(h3,p){margin:0}
.vr-radar-card h3{font-size:1rem;line-height:1.3}
.vr-radar-card img{width:100%;height:126px;object-fit:contain}
.vr-radar-card span,.vr-radar-card small{font-size:.8rem;line-height:1.35;color:#405676}
.vr-radar-card .vr-radar-price{font-size:1.35rem;color:#163a6a}
.vr-radar-card .vr-radar-action{margin-top:auto}
.vr-coupon-detail{display:grid;gap:7px;border-top:1px solid #d7e2f4;padding-top:8px;font-size:.8rem;color:#213657;overflow-wrap:anywhere}
.vr-coupon-detail p{margin:0}
.vr-coupon-code-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.vr-coupon-code-row code{background:#fff2c4;color:#584100;padding:4px 6px;border-radius:5px;font-size:inherit;font-weight:750}
.vr-radar .vr-coupon-copy,.vr-compare .vr-coupon-copy{border:1px solid #b8cbe4;border-radius:6px;background:#eef4fc;color:#174782;padding:4px 7px;font:inherit;font-weight:700;cursor:pointer}
.vr-coupon-detail .vr-coupon-link{font-size:.78rem}
.vr-compare .vr-coupon-estimate{font-size:1rem;color:#11634e;line-height:1.32}
@media(max-width:760px){.vr-radar-grid,.vr-radar-source-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:410px){.vr-radar-card{padding:9px}.vr-radar-card img{height:99px}}
</style>`;

export function couponDetails(coupon, money, time) {
  const detail = document.createElement("div");
  detail.className = "vr-coupon-detail";
  const min = coupon.min_order_cents > 0 ? "Pedido a partir de " + money.format(coupon.min_order_cents / 100) : "";
  const cap = coupon.max_discount_cents ? "Teto de " + money.format(coupon.max_discount_cents / 100) : "";
  const discount = coupon.discount_type === "shipping" ? "Benefício no frete" :
    coupon.discount_type === "percent" ? coupon.discount_value + "% de desconto" :
      money.format(coupon.discount_value / 100) + " de desconto";
  const rules = document.createElement("p");
  rules.textContent = [discount, min, cap].filter(Boolean).join(" · ");
  detail.append(rules);
  if (coupon.code) {
    const row = document.createElement("div");
    row.className = "vr-coupon-code-row";
    const code = document.createElement("code");
    code.textContent = coupon.code;
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "vr-coupon-copy";
    copy.textContent = "Copiar";
    copy.setAttribute("aria-label", "Copiar cupom " + coupon.code);
    const status = document.createElement("span");
    status.setAttribute("role", "status");
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(coupon.code);
        status.textContent = "Copiado";
      } catch {
        const range = document.createRange();
        range.selectNodeContents(code);
        getSelection()?.removeAllRanges();
        getSelection()?.addRange(range);
        status.textContent = "Código selecionado";
      }
    });
    row.append(code, copy, status);
    detail.append(row);
  }
  const terms = document.createElement("p");
  terms.textContent = coupon.terms;
  const validity = document.createElement("small");
  validity.textContent = "Até " + time.format(new Date(coupon.valid_until)) + " (Brasília)";
  const source = document.createElement("a");
  source.className = "vr-coupon-link";
  source.href = coupon.official_source_url;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.textContent = "Ver regras na loja";
  detail.append(terms, validity, source);
  return detail;
}

function startRadar(renderCouponDetails) {
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const time = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
  const couponGrid = document.getElementById("vr-coupon-list");
  const couponStatus = document.getElementById("vr-coupon-status");
  const market = document.getElementById("vr-coupon-market");
  const campaignLinks = [...document.querySelectorAll(".vr-radar-source-list a")];
  const curationGrid = document.getElementById("vr-curation-list");
  const curationStatus = document.getElementById("vr-curation-status");

  function node(tag, value, className) {
    const element = document.createElement(tag);
    if (value) element.textContent = value;
    if (className) element.className = className;
    return element;
  }

  let coupons = [];
  let couponRequestFailed = false;
  function renderCoupons() {
    for (const link of campaignLinks) link.hidden = Boolean(market.value && link.dataset.marketplace !== market.value);
    const filtered = coupons.filter(coupon => !market.value || coupon.marketplace === market.value);
    couponGrid.replaceChildren(...filtered.map(coupon => {
      const card = node("article", "", "vr-radar-card");
      card.append(node("span", coupon.marketplace), node("h3", coupon.campaign_name), renderCouponDetails(coupon, money, time));
      return card;
    }));
    couponGrid.hidden = !filtered.length;
    const count = filtered.length;
    couponStatus.textContent = couponRequestFailed ? "Códigos indisponíveis no momento. Consulte as campanhas oficiais." :
      count ? count + (count === 1 ? " cupom verificado" : " cupons verificados") :
      market.value ? "Nenhum cupom verificado para esta loja agora." : "Nenhum código verificado no momento. Consulte as campanhas oficiais.";
  }

  market.addEventListener("change", renderCoupons);
  fetch("/api/coupons").then(response => {
    if (!response.ok) throw Error();
    return response.json();
  }).then(data => {
    coupons = data.coupons;
    renderCoupons();
  }).catch(() => {
    couponRequestFailed = true;
    renderCoupons();
  });

  fetch("/api/curation").then(response => {
    if (!response.ok) throw Error();
    return response.json();
  }).then(data => {
    const cards = data.picks.map(pick => {
      const card = node("article", "", "vr-radar-card");
      const image = node("img");
      image.alt = pick.title;
      image.decoding = "async";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => {
        card.remove();
        if (!curationGrid.childElementCount) {
          curationGrid.hidden = true;
          curationStatus.textContent = "A seleção está sendo atualizada. Veja o catálogo de ofertas abaixo.";
        }
      });
      image.src = pick.image_url;
      const link = node("a", "Ver oferta na loja", "vr-radar-action");
      link.href = pick.offer_url;
      link.target = "_blank";
      link.rel = "sponsored noopener noreferrer";
      card.append(image, node("span", pick.marketplace + " · " + pick.category), node("h3", pick.title),
        node("strong", money.format(pick.price_cents / 100), "vr-radar-price"), node("small", pick.price_terms),
        node("small", pick.reason + " · " + time.format(new Date(pick.checked_at))), link);
      return card;
    });
    curationGrid.replaceChildren(...cards);
    curationGrid.hidden = !cards.length;
    curationStatus.textContent = cards.length ? "A seleção é atualizada conforme os preços são registrados. Confirme frete, estoque e valor final na loja." :
      "A seleção está sendo atualizada. Veja o catálogo de ofertas abaixo.";
  }).catch(() => {
    curationStatus.textContent = "Curadoria indisponível agora. Veja o catálogo de ofertas abaixo.";
  });
}

const panel = `<section id="cupons" class="vr-radar" aria-labelledby="vr-coupons-title">
  <h2 id="vr-coupons-title">Radar de Cupons</h2>
  <p>Confira os cupons das lojas e as condições para usar cada código.</p>
  <nav class="vr-radar-source-list" aria-label="Campanhas oficiais">
    ${couponStores.map(store => `<a href="${store.url}" data-marketplace="${store.marketplace}" target="_blank" rel="noopener noreferrer"><strong>${store.marketplace}</strong><span>${store.action}</span></a>`).join("")}
  </nav>
  <label class="vr-radar-picker">Cupons por loja <select id="vr-coupon-market">
    <option value="">Todas as lojas</option>${couponStores.map(({ marketplace }) => `<option>${marketplace}</option>`).join("")}
  </select></label>
  <p id="vr-coupon-status" class="vr-radar-status" role="status"></p>
  <div id="vr-coupon-list" class="vr-radar-grid" hidden></div>
</section>
<section id="curadoria" class="vr-radar" aria-labelledby="vr-curation-title">
  <h2 id="vr-curation-title">Curadoria do dia</h2>
  <p id="vr-curation-status" class="vr-radar-status" role="status"></p>
  <div id="vr-curation-list" class="vr-radar-grid" hidden></div>
</section>
<script>(${startRadar.toString()})(${couponDetails.toString()});</script>`;

export function addRadar(page) {
  return page.replace("</head>", `${styles}</head>`)
    .replace('<h2 id="offers-title">', `${panel}<h2 id="offers-title">`);
}
