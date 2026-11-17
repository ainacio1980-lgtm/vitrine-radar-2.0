import { couponStores } from "./coupons.mjs";

const panel = `<section class="card" aria-labelledby="admin-coupons-title">
  <h2 id="admin-coupons-title">Cupons oficiais</h2>
  <form id="coupon-form">
    <fieldset class="fields">
      <label>Loja<select name="marketplace">${couponStores.map(({ marketplace }) => `<option>${marketplace}</option>`).join("")}</select></label>
      <label>Nome da campanha<input name="campaign_name" maxlength="140" required></label>
      <label>Código, quando fornecido<input name="code" maxlength="60"></label>
      <label>Válido até, no seu horário local<input name="valid_until" type="datetime-local" required></label>
      <label>Tipo de desconto<select name="discount_type"><option value="percent">Percentual</option><option value="fixed">Valor fixo</option><option value="shipping">Frete</option></select></label>
      <label>Desconto em % ou R$<input name="discount_value" type="number" min="0.01" required></label>
      <label>Pedido mínimo em R$<input name="min_order" type="number" min="0" step="0.01"></label>
      <label>Teto do desconto percentual em R$<input name="max_discount" type="number" min="0.01" step="0.01"></label>
      <label class="wide">Página oficial da campanha<input name="official_source_url" type="url" maxlength="2048" required></label>
      <label class="wide">Regras e restrições<textarea name="terms" maxlength="700" rows="2" required></textarea></label>
      <details class="wide">
        <summary>Vincular ao preço de um anúncio no comparador</summary>
        <div class="fields">
          <label>ID da variante<input name="product_id" maxlength="80"></label>
          <label>ID do anúncio<input name="listing_id" maxlength="150"></label>
          <label>Pagamento<select name="payment"><option value="">Selecione</option><option value="cash">ì vista</option><option value="pix">Pix</option></select></label>
          <label class="wide" style="display:flex;align-items:center;gap:8px"><input name="confirmed_listing_terms" type="checkbox" style="min-height:20px;width:20px"> Confirmei a elegibilidade do anúncio e deste pagamento para a estimativa.</label>
        </div>
      </details>
      <label class="wide" style="display:flex;align-items:center;gap:8px"><input name="confirmed_official" type="checkbox" style="min-height:20px;width:20px" required> Verifiquei a campanha e suas regras na fonte oficial.</label>
    </fieldset>
    <div class="form-actions"><button class="primary" type="submit" id="coupon-save">Publicar cupom verificado</button><p class="feedback" role="status" id="coupon-message"></p></div>
  </form>
  <div class="table"><table>
    <thead><tr><th>Campanha</th><th>Loja</th><th>Status</th><th>Ação</th></tr></thead>
    <tbody id="coupon-admin-list"></tbody>
  </table></div>
</section>`;

function startCouponAdmin(api, feedback) {
  const form = document.getElementById("coupon-form");
  const save = document.getElementById("coupon-save");
  const list = document.getElementById("coupon-admin-list");
  function setMessage(message, error) {
    feedback("coupon-message", message, error);
  }

  async function refresh() {
    const { coupons } = await api("/api/admin/coupons");
    list.replaceChildren(...coupons.map(coupon => {
      const row = document.createElement("tr");
      for (const value of [coupon.campaign_name, coupon.marketplace, coupon.visible ? "Publicado" :
        coupon.verification_status === "expired" ? "Encerrado" : "Fora do período de exibição"]) {
        row.insertCell().textContent = value;
      }
      const action = row.insertCell();
      if (coupon.verification_status !== "expired") {
        const stop = document.createElement("button");
        stop.type = "button";
        stop.textContent = "Encerrar";
        stop.setAttribute("aria-label", "Encerrar " + coupon.campaign_name);
        stop.addEventListener("click", async () => {
          stop.disabled = true;
          try {
            await api("/api/admin/coupons/" + coupon.id, "PATCH", {});
            setMessage("Cupom encerrado.");
            await refresh();
          } catch (error) {
            stop.disabled = false;
            setMessage(error.message, true);
          }
        });
        action.append(stop);
      }
      return row;
    }));
  }

  const fields = form.elements;
  function syncDiscountFields() {
    const kind = fields.discount_type.value;
    fields.discount_value.disabled = kind === "shipping";
    fields.discount_value.required = kind !== "shipping";
    fields.discount_value.step = kind === "percent" ? "1" : "0.01";
    fields.discount_value.min = kind === "percent" ? "1" : "0.01";
    fields.discount_value.max = kind === "percent" ? "100" : "10000000";
    fields.max_discount.disabled = kind !== "percent";
  }
  syncDiscountFields();
  fields.discount_type.addEventListener("change", syncDiscountFields);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(form);
    const values = Object.fromEntries(data);
    const kind = values.discount_type;
    const money = value => Math.round(Number(value || 0) * 100);
    save.disabled = true;
    try {
      await api("/api/admin/coupons", "POST", {
        ...values,
        valid_until: new Date(values.valid_until).toISOString(),
        discount_value: kind === "shipping" ? 0 : kind === "percent" ? Number(values.discount_value) : money(values.discount_value),
        min_order_cents: money(values.min_order),
        max_discount_cents: values.max_discount ? money(values.max_discount) : null,
        confirmed_official: data.has("confirmed_official"),
        confirmed_listing_terms: data.has("confirmed_listing_terms"),
      });
      form.reset();
      syncDiscountFields();
      setMessage("Cupom publicado.");
      await refresh();
    } catch (error) {
      setMessage(error.message, true);
    } finally {
      save.disabled = false;
    }
  });
  refresh().catch(error => setMessage(error.message, true));
}

export function addCouponAdmin(page) {
  return page.replace('  <section class="card" aria-labelledby="catalog-title">', `${panel}<section class="card" aria-labelledby="catalog-title">`)
    .replace("</body>", `<script>(${startCouponAdmin.toString()})(api, feedback);</script></body>`);
}
