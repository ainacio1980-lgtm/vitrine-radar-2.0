import { primaryProductImage, safeProductImageUrl } from "./product_images.mjs";

const esc=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const root="https://vitrine-radar.ainacio1980-financas.workers.dev";
const money=n=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n/100);
const formatDate=value=>{const v=String(value||"").slice(0,10);const arr=v.split("-");return arr.length===3?arr.reverse().join("/"):v;};
const photoStyle = ".offer-photo{margin:18px 0;max-width:460px}.offer-photo img{display:block;width:100%;max-height:360px;object-fit:contain;border-radius:10px;background:#f6f8fb}";

function productPhoto(item) {
  const url = safeProductImageUrl(item.image_url);
  if (!url) return { image: "", metadata: "" };
  const src = esc(url);
  return {
    image: '<figure class="offer-photo"><img src="' + src + '" alt="' + esc(item.title) +
      '" decoding="async" referrerpolicy="no-referrer" onerror="this.parentElement.remove()"></figure>',
    metadata: '<meta property="og:image" content="' + src + '">'
  };
}

export async function renderOfferPage(db,id){
  const item=await db.prepare(`SELECT o.id,o.title,o.category,o.merchant,o.price_cents,o.price_terms,o.updated_at,
    m.kind AS link_kind, ${primaryProductImage} FROM offers o
    LEFT JOIN offer_link_meta m ON m.offer_id=o.id WHERE o.id=? AND o.status='approved'`).bind(id).first();
  if(!item)return null;
  const photo = productPhoto(item);
  if (item.link_kind || item.price_cents <= 0) return renderListingPage(item, photo);
  const {results:related}=await db.prepare("SELECT id,title,price_cents FROM offers WHERE status='approved' AND id!=? ORDER BY updated_at DESC LIMIT 3").bind(id).all();
  const permalink=root+"/ofertas/"+id;
  const share="https://api.whatsapp.com/send?text="+encodeURIComponent(item.title+" — publicidade, oferta com link de afiliado: "+permalink);
  const ctaText=item.merchant==='Mercado Livre'?'Ver seleção no Mercado Livre':'Conferir preço e comprar na loja';
  const title=esc(item.title),price=money(item.price_cents);
  const conditions=item.price_terms?.trim();
  const terms=conditions ? (/^preço\b/i.test(conditions) ? conditions : "Preço "+conditions) : "Preço de referência";
  const siblings=related.map(x=>'<li><a href="/ofertas/'+x.id+'">'+esc(x.title)+'</a> — '+(x.price_cents>0 ? money(x.price_cents) : "Consultar preço na loja")+'</li>').join("");
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    +'<meta name="description" content="'+esc(item.title+" no "+item.merchant+" por "+price+" ("+terms+"). Consulte o preço atualizado e condições no site da loja.")+'">'
    +'<meta property="og:type" content="product"><meta property="og:title" content="'+title+' | Vitrine Radar"><meta property="og:description" content="'+esc(price+" "+terms+" — valor registrado em "+formatDate(item.updated_at))+'">'
    +photo.metadata+'<link rel="canonical" href="'+permalink+'"><title>'+title+' | Vitrine Radar</title><style>'+photoStyle+'</style>'
    +'<style>:root{font:17px/1.65 system-ui;color:#18253d;background:#f4f6fb}*{box-sizing:border-box}body{margin:0}header{background:#152748;color:white;padding:19px 22px}header .inside{max-width:960px;margin:auto}header a{color:#e4efff}.wrap{max-width:960px;margin:30px auto;padding:0 18px}article,aside{background:#fff;border:1px solid #e0e5ef;border-radius:16px;padding:clamp(20px,4vw,34px);margin-bottom:22px}h1{font-size:clamp(1.55rem,3.4vw,2.6rem);line-height:1.2;margin:12px 0}h2{font-size:1.28rem}.small{color:#5c6880;font-size:.93rem}.price{font-size:clamp(2rem,4vw,2.6rem);font-weight:800;color:#172849;margin:10px 0 0}.badge{display:inline-block;color:#235399;background:#eff4ff;border-radius:8px;font-weight:700;padding:5px 10px;font-size:.8rem}.cta{display:inline-block;background:#2059a6;color:#fff;text-decoration:none;padding:14px 20px;border-radius:9px;font-weight:700;margin:12px 9px 0 0}.share{display:inline-block;color:#126649;padding:13px;margin:12px 0 0}.notice{background:#f6f8fb;border-left:3px solid #9eaed0;padding:14px 19px}a{color:#2157a0}li{margin:9px 0}footer{text-align:center;padding:20px;color:#61708a}</style></head>'
    +'<body><header><div class="inside"><strong>◆ Vitrine Radar</strong> · <a href="/">Ver todas as ofertas</a></div></header>'
    +'<main class="wrap"><article><span class="badge">'+esc(item.category)+'</span><h1>'+title+'</h1>'+photo.image
    +'<p class="small">Loja: '+esc(item.merchant)+'</p><p class="price">'+price+'</p><p>'+esc(terms)+'</p>'
    +'<p class="small">Publicidade · link de afiliado. Valor registrado em '+formatDate(item.updated_at)+'. O preço final pode variar conforme forma de pagamento, CEP, frete, disponibilidade e horário.</p>'
    +'<a class="cta" href="/go/'+id+'" rel="noopener noreferrer sponsored" target="_blank">'+ctaText+'</a>'
    +'<a class="share" href="'+share+'" target="_blank" rel="noopener noreferrer">Compartilhar no WhatsApp</a>'
    +'<h2>Antes de finalizar</h2><p>Confirme na página oficial o modelo e as características do produto, o vendedor, o prazo de entrega, eventuais taxas e a política de devolução. O Vitrine Radar não processa pagamentos.</p>'
    +'<p class="notice">Transparência: este é um link de afiliado. O Vitrine Radar pode receber comissão por compras qualificadas, sem acrescentar cobrança pelo acesso ao nosso site.</p>'
    +'</article><aside><h2>Outras ofertas cadastradas</h2><ul>'+siblings+'</ul><p><a href="/guia-de-compras">Calcule o custo final incluindo frete e descontos</a></p></aside></main>'
    +'<footer><a href="/sobre">Critérios de curadoria e privacidade</a></footer></body></html>';
}

function renderListingPage(item,photo){
  const title=esc(item.title),merchant=esc(item.merchant),category=esc(item.category);
  const permalink=root+"/ofertas/"+item.id;
  const affiliate = item.link_kind !== "retailer_direct";
  const details = affiliate ? "O Vitrine Radar pode receber comissão por compras qualificadas." : "Link direto da loja, sem atribuição de comissão de afiliado confirmada.";
  const terms = item.price_terms?.trim() ?? "";
  const hasPrice = item.price_cents > 0;
  const startsAt = /^a partir de\b/i.test(terms);
  const displayPrice = hasPrice ? (startsAt ? "A partir de " : "") + money(item.price_cents) : "Consultar preço na loja";
  const priceContext = hasPrice
    ? [terms.replace(/^a partir de(?:\s*·\s*)?/i, ""), "Preço de referência consultado em " + formatDate(item.updated_at)].filter(Boolean).join(" · ") + "."
    : "Consulte o preço atual diretamente na loja.";
  const share="https://api.whatsapp.com/send?text="+encodeURIComponent(item.title+" — consulte o preço atual na "+item.merchant+": "+permalink);
  return "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"description\" content=\""+esc("Confira "+item.title+" na "+item.merchant+". Consulte o preço, estoque e condições diretamente na loja.")+"\"><link rel=\"canonical\" href=\""+permalink+"\"><title>"+title+" | Vitrine Radar</title>"+
   photo.metadata+"<style>"+photoStyle+":root{font:17px/1.65 system-ui;color:#18253d;background:#f4f6fb}*{box-sizing:border-box}body{margin:0}header{background:#152748;color:white;padding:20px}header a{color:white}main{max-width:920px;margin:28px auto;padding:0 18px}article{background:white;border:1px solid #dce3ed;border-radius:16px;padding:clamp(20px,4vw,34px)}h1{font-size:clamp(1.45rem,3vw,2.4rem);line-height:1.25}.price{font-size:1.7rem;font-weight:800;color:#18365c}.muted{color:#55657f}.cta{display:inline-block;background:#2059a6;color:white;border-radius:9px;padding:15px 19px;text-decoration:none;font-weight:700;margin:10px 10px 10px 0}.notice{background:#f4f7fb;padding:15px;border-left:3px solid #abc0e1}a{color:#2059a6}footer{text-align:center;color:#64748b;padding:20px}</style></head><body>"+
   "<header><a href=\"/\">Vitrine Radar — voltar ao catálogo</a></header><main><article><p class=\"muted\">"+category+" · "+merchant+"</p><h1>"+title+"</h1>"+photo.image+"<p class=\"price\">"+esc(displayPrice)+"</p>"+
   "<p class=\"muted\">"+esc(priceContext)+" Confira estoque, frete e valor final na loja.</p>"+
   "<a class=\"cta\" href=\"/go/"+item.id+"\" rel=\"noopener noreferrer"+(affiliate?" sponsored":"")+"\" target=\"_blank\">Ver produto em "+merchant+"</a>"+
   "<a href=\""+share+"\" target=\"_blank\" rel=\"noopener noreferrer\">Compartilhar</a>"+
   "<p class=\"notice\">Transparência: "+esc(details)+" O Vitrine Radar não realiza vendas nem processa pagamentos.</p>"+
   "<p><a href=\"/\">Pesquisar outras ofertas de todas as lojas</a></p></article></main><footer><a href=\"/sobre\">Critérios de curadoria e privacidade</a></footer></body></html>";
}

