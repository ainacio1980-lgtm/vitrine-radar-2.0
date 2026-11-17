import { normalizeProductSearch, productSearchTerms } from "./comparator_search.mjs";

export const adminEmail = "ainacio1980@gmail.com";

export const loginPage = "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><title>Vitrine Radar — Login</title><style>body{background:#0b1220;color:#e5eaf3;font:16px system-ui;margin:0;display:grid;min-height:100vh;place-items:center}main{background:#172338;border:1px solid #31425c;border-radius:16px;padding:30px;width:min(390px,85vw)}h1{margin-top:0}label{display:block;margin:16px 0 6px}input,button{box-sizing:border-box;width:100%;padding:13px;border-radius:9px;font:inherit}input{background:#0b1220;border:1px solid #4b5870;color:white}button{background:#2563eb;border:0;color:white;margin-top:20px;cursor:pointer}p{color:#a9b6c9}a{color:#7dd3fc}</style></head><body><main><h1>Vitrine Radar</h1><p>Acesso administrativo privado</p><form id=\"login\"><label for=\"email\">E-mail</label><input id=\"email\" type=\"email\" autocomplete=\"username\" required><label for=\"password\">Senha</label><input id=\"password\" type=\"password\" autocomplete=\"current-password\" required><button>Entrar</button></form><p id=\"message\" role=\"status\"></p><a href=\"/\">Voltar à vitrine</a></main><script>document.getElementById(\"login\").addEventListener(\"submit\",async e=>{e.preventDefault();const message=document.getElementById(\"message\");message.textContent=\"Verificando...\";try{const r=await fetch(\"/api/auth/login\",{method:\"POST\",headers:{\"content-type\":\"application/json\"},body:JSON.stringify({email:document.getElementById(\"email\").value,password:document.getElementById(\"password\").value})});const data=await r.json();if(!r.ok)throw Error(data.error||\"Não foi possível entrar\");location.assign(\"/admin\")}catch(err){message.textContent=err.message}});</script></body></html>";

export const aboutPage = "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"description\" content=\"Conheça os critérios de curadoria e a transparência do Vitrine Radar.\"><title>Sobre o Vitrine Radar</title><style>body{font:17px/1.6 system-ui;background:#f5f7fb;color:#16243b;margin:0}main{max-width:780px;margin:auto;padding:30px 20px}article{background:white;border:1px solid #d9e3f2;border-radius:16px;padding:30px}h1{font-size:2.1rem}h2{font-size:1.35rem;margin-top:30px}a{color:#2458a1}</style></head><body><main><p><a href=\"/\">← Voltar para a vitrine</a></p><article><h1>Sobre o Vitrine Radar</h1><p>O Vitrine Radar reúne recomendações e oportunidades de compra. A proposta é organizar informações de produtos e lojas com uma apresentação simples, sem prometer preços ou disponibilidade que não possam ser confirmados.</p><h2>Como funcionam as ofertas</h2><p>As ofertas cadastradas passam por uma revisão antes de aparecer publicamente. Os valores exibidos servem como referência do momento do cadastro; preço final, frete, estoque, prazo, parcelamento, garantia e devolução devem ser conferidos no site da loja. Uma oferta pode deixar de estar disponível sem aviso prévio.</p><h2>Critérios de escolha</h2><p>É importante considerar utilidade, qualidade, assistência técnica, avaliação do vendedor, custo total e condições de entrega. Um desconto isolado não significa que uma compra seja vantajosa. Compare alternativas e desconfie de pagamentos feitos fora de plataformas reconhecidas.</p><h2>Transparência sobre comissões</h2><p>Os links para lojas e ofertas são identificados como publicidade e podem gerar comissão. Quando uma compra é elegível e rastreada pela plataforma, o projeto pode receber uma comissão, sem cobrar uma taxa adicional por você consultar a vitrine. Isso não garante que o produto indicado tenha o menor preço do mercado.</p><p>Como associado da Amazon, eu ganho com compras qualificadas.</p><h2>Dados e privacidade</h2><p>Não é necessário criar uma conta para navegar. O site registra contagens agregadas por dia e página, além de cliques em ofertas, acessos à loja parceira e ações de compartilhamento. Não usamos cookies de rastreamento nesses relatórios nem associamos as contagens a uma identidade de visitante. As contagens de visualizações e compartilhamentos dos guias são eliminadas após 180 dias. O Vitrine Radar não solicita dados de pagamento nem realiza as vendas: cada loja é responsável pela transação em seu próprio ambiente.</p></article></main></body></html>";

export const guidePage = "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"description\" content=\"Compare preço total, frete e desconto com nossa calculadora gratuita e veja critérios para avaliar ofertas com segurança.\"><title>Guia para comparar ofertas e calcular o custo final | Vitrine Radar</title><style>\n:root{font:17px/1.7 system-ui;color:#1a2940;background:#f5f7fa}*{box-sizing:border-box}body{margin:0}main{max-width:900px;margin:auto;padding:24px 18px 65px}h1{line-height:1.18;font-size:clamp(2rem,4vw,2.8rem)}h2{line-height:1.3;margin:32px 0 10px}p{margin:12px 0}a{color:#1a55a0}header{background:#172c52;color:#fff;padding:20px}header .inner{max-width:900px;margin:auto}header a{color:#e3edff}article,section.calculator{background:#fff;border:1px solid #dbe2ed;border-radius:16px;padding:clamp(18px,4vw,32px);margin:20px 0}label{display:block;font-size:.95rem;font-weight:600}input{width:100%;padding:11px;border:1px solid #b8c7d8;border-radius:8px;font:inherit;margin:5px 0 0} .fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px}output{display:block;margin-top:18px;padding:18px;border-radius:11px;background:#edf5ff;font-size:1.35rem;font-weight:700}small{color:#4a5a71}.action{display:inline-block;padding:13px 18px;background:#205ea8;color:white;text-decoration:none;border-radius:9px;font-weight:700;margin-top:10px}ul{padding-left:21px}.example{background:#f2f6fc;border-left:3px solid #2e68c2;padding:15px 20px}</style></head><body>\n<header><div class=\"inner\"><strong><img src=\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20650%20190%22%3E%3Crect%20width%3D%22650%22%20height%3D%22190%22%20rx%3D%2220%22%20fill%3D%22%23090909%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23f4be35%22%20stroke-width%3D%228%22%3E%3Crect%20x%3D%2220%22%20y%3D%2243%22%20width%3D%22125%22%20height%3D%22125%22%2F%3E%3Cpath%20d%3D%22M52%2043V28Q52%208%2083%208T114%2028V43%22%2F%3E%3Ccircle%20cx%3D%22544%22%20cy%3D%2283%22%20r%3D%2262%22%2F%3E%3Ccircle%20cx%3D%22544%22%20cy%3D%2283%22%20r%3D%2240%22%2F%3E%3Cpath%20d%3D%22M544%2083L588%2034%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22172%22%20y%3D%2285%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2261%22%20font-weight%3D%22900%22%20fill%3D%22%23f1f5fa%22%3EVITRINE%3C%2Ftext%3E%3Ctext%20x%3D%22172%22%20y%3D%22150%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2275%22%20font-weight%3D%22900%22%20fill%3D%22%23f4be35%22%3ERADAR%3C%2Ftext%3E%3C%2Fsvg%3E\" alt=\"Vitrine Radar\" width=\"325\" height=\"95\" style=\"display:block;width:min(325px,90vw);height:auto\"></strong> · <a href=\"/\">Voltar à vitrine</a></div></header><main>\n<article><h1>Como identificar uma oferta que realmente vale a pena</h1>\n<p>Um percentual de desconto, sozinho, não informa quanto você vai gastar. Para comparar duas lojas, considere o <strong>custo total da compra</strong>: valor do produto, frete, descontos que realmente se aplicam e eventuais encargos do pagamento. Use este guia para tomar decisões mais informadas, sem depender de anúncios que exibem apenas o menor preço.</p>\n<h2>1. Compare o preço final, não apenas o anúncio</h2><p>Some o frete ao preço já descontado e confira se o cupom é acumulável. Um produto anunciado por R$ 199 com frete de R$ 30 custa R$ 229; outra oferta de R$ 215 com frete grátis pode sair mais barata. Esse exemplo é ilustrativo e não corresponde a um produto específico.</p>\n<p>Verifique o valor na última tela antes de confirmar o pagamento: impostos aplicáveis, frete, parcelamento, cupons e descontos condicionados ao meio de pagamento podem mudar o total.</p>\n</article>\n<section class=\"calculator\" aria-labelledby=\"calc-title\"><h2 id=\"calc-title\">Calculadora de custo final estimado</h2><p>Preencha os valores que aparecem na loja. O cálculo não aplica regras especiais de cada cupom: confirme o resultado na finalização da compra.</p>\n<div class=\"fields\">\n<label>Preço anunciado (R$)<input type=\"number\" id=\"amount\" min=\"0\" max=\"10000000\" step=\"0.01\" inputmode=\"decimal\" value=\"200\"></label>\n<label>Desconto percentual (%)<input type=\"number\" id=\"discount\" min=\"0\" max=\"100\" step=\"0.1\" inputmode=\"decimal\" value=\"0\"></label>\n<label>Cupom fixo (R$)<input type=\"number\" id=\"coupon\" min=\"0\" max=\"10000000\" step=\"0.01\" inputmode=\"decimal\" value=\"0\"></label>\n<label>Frete (R$)<input type=\"number\" id=\"shipping\" min=\"0\" max=\"10000000\" step=\"0.01\" inputmode=\"decimal\" value=\"0\"></label>\n</div><output id=\"total\" aria-live=\"polite\">Total estimado: R$ 200,00</output><small>Estimativa matemática; não inclui juros de parcelamento, taxas adicionais ou regras de elegibilidade de cupom.</small></section>\n<article><h2>2. Avalie o vendedor e a entrega</h2><ul><li>Confira quem vende e quem entrega. Em marketplaces, vendedores distintos podem oferecer o mesmo item com garantias de atendimento diferentes.</li><li>Consulte reputação recente, política de devolução, prazo de entrega e disponibilidade para seu CEP antes de comprar.</li><li>Evite convites para finalizar pagamento fora do ambiente oficial da loja.</li></ul>\n<h2>3. Compare o produto correto</h2><p>Dois anúncios com nomes semelhantes nem sempre são a mesma versão. Compare código do modelo, tamanho, potência, acessórios, voltagem, garantia e assistência técnica. Em aparelhos elétricos, a voltagem correta e o consumo de energia podem importar mais do que um desconto pequeno.</p>\n<h2>4. Prefira uma boa compra a uma compra por impulso</h2><p>Defina o que o produto precisa resolver, o limite de gasto e os recursos indispensáveis. Um item mais barato que não atende às suas necessidades pode custar mais no longo prazo. Por outro lado, funções extras só valem a diferença de preço quando serão realmente usadas.</p>\n<h2>Checklist de decisão</h2><p>Antes de comprar, responda: o modelo é exatamente o que preciso? O valor final com frete e taxas cabe no orçamento? Entrega, garantia e devolução são adequadas? Confirmei o vendedor e as condições do cupom? Se alguma dessas respostas for incerta, vale investigar antes de pagar.</p>\n<div class=\"example\"><strong>Explore opções na loja parceira</strong><p>Depois de escolher os critérios importantes, você pode pesquisar produtos e confirmar condições atuais diretamente na nossa loja.</p><a class=\"action\" href=\"https://www.magazinevoce.com.br/magazinevitrineradar/\" target=\"_blank\" rel=\"noopener noreferrer sponsored\">Acessar a loja Vitrineradar</a><p><small>O Vitrine Radar pode receber comissão em compras qualificadas. Nenhuma compra é feita aqui.</small></p></div></article>\n<p><a href=\"/sobre\">Critérios e transparência do Vitrine Radar</a></p>\n</main><script>\nconst money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});\nconst ids=['amount','discount','coupon','shipping'];\nfunction readNumber(id){const n=Number(document.getElementById(id).value);return Number.isFinite(n)?Math.min(10000000,Math.max(0,n)):0}\nfunction calculate(){const original=readNumber('amount'),discount=Math.min(100,readNumber('discount')),coupon=readNumber('coupon'),shipping=readNumber('shipping');const afterDiscount=original*(1-discount/100);const total=Math.max(0,afterDiscount-coupon)+shipping;document.getElementById('total').textContent='Total estimado: '+money.format(total)}\nfor(const id of ids)document.getElementById(id).addEventListener('input',calculate);\ncalculate();\n</script></body></html>";

export const storefrontPage = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Explore produtos e ofertas selecionadas de Magalu, Mercado Livre, Shopee e Amazon. Consulte preços e condições diretamente nas lojas parceiras."><meta property="og:title" content="Vitrine Radar · Sua vitrine de ofertas"><meta property="og:description" content="Ofertas e links de afiliados de Magalu, Mercado Livre, Shopee e Amazon, com categorias, preços de referência e guias de compra."><meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="Vitrine Radar"><meta property="og:url" content="https://vitrine-radar.ainacio1980-financas.workers.dev/"><meta property="og:image" content="https://vitrine-radar.ainacio1980-financas.workers.dev/vitrine-radar-capa.jpg"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Vitrine Radar — ofertas de quatro lojas em um só lugar"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="https://vitrine-radar.ainacio1980-financas.workers.dev/"><title>Vitrine Radar — Ofertas em lojas parceiras</title><style>body{font:16px system-ui;margin:0;background:#f5f7fb;color:#17243b}header{background:#090909;color:#fff;padding:25px max(20px,calc((100% - 1100px)/2))}header h1{margin:0;font-size:30px}header p{color:#c4d4ee}.wrap{max-width:1100px;margin:auto;padding:24px 18px}.hero-catalog{display:inline-block;padding:12px 18px;border-radius:9px;background:#e6efff;color:#18294b;text-decoration:none;font-weight:700}.hero-catalog:hover,.hero-catalog:focus-visible{background:#fff;text-decoration:underline}.hero{background:linear-gradient(110deg,#172d5b,#3157a2);color:white;padding:34px;border-radius:18px}.hero-headline{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin:0 0 19px;line-height:1.2;letter-spacing:-.03em}.hero-brand{position:relative;display:inline-block;flex:none;white-space:nowrap;padding:8px 15px 9px;border:2px solid #f4be35;border-radius:17px;background:linear-gradient(115deg,rgba(6,14,37,.4),rgba(16,32,70,.68));font:900 clamp(1.6rem,3vw,2.3rem)/1.15 Arial,system-ui,sans-serif;box-shadow:0 0 0 1px rgba(252,204,74,.14),0 7px 16px rgba(0,0,0,.16),inset 0 1px 13px rgba(251,202,65,.08)}.hero-brand:after{content:"";pointer-events:none;position:absolute;bottom:-3px;left:20%;width:60%;height:4px;background:linear-gradient(90deg,transparent,#ffcf45,transparent);filter:blur(3px)}.hero-brand-vitrine{color:#fff;text-shadow:0 2px 3px rgba(0,0,0,.28)}.hero-brand-radar{color:#f4be35;text-shadow:0 2px 4px rgba(0,0,0,.3)}.hero-dash{color:#fff;font-size:clamp(1.5rem,2.7vw,2rem);font-weight:700}.hero-promise{color:#f4be35;font:italic 800 clamp(1.35rem,2.6vw,1.95rem)/1.2 Arial,system-ui,sans-serif;text-shadow:0 2px 3px rgba(0,0,0,.24);letter-spacing:-.035em;min-width:0}@media(max-width:700px){.hero{padding:22px}.hero-headline{gap:9px;margin-bottom:17px}.hero-brand{padding:7px 11px;font-size:clamp(1.5rem,6.3vw,2rem);border-radius:13px}.hero-dash{display:none}.hero-promise{flex-basis:100%;font-size:clamp(1.3rem,5.4vw,1.8rem)}}.filters{display:flex;gap:12px;margin:22px 0;flex-wrap:wrap;align-items:center}.complete-filter{display:inline-flex;align-items:center;gap:7px;color:#334763;font-size:14px;font-weight:650}.complete-filter input{min-width:0;flex:none;accent-color:#2059a6}input,select{padding:13px;border:1px solid #cbd5e1;border-radius:10px;font:inherit}input{flex:1;min-width:190px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}.card{background:white;border:1px solid #e1e7f0;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:6px}.product-photo{display:block;aspect-ratio:4 / 3;overflow:hidden;padding:10px;background:#fff;border:1px solid #edf0f6;border-radius:12px}.product-photo img{display:block;width:100%;height:100%;object-fit:contain;transition:transform .2s ease}.product-photo:hover img{transform:scale(1.04)}@media(prefers-reduced-motion:reduce){.product-photo img{transition:none}}.product-photo:focus-visible{outline:2px solid #2059a6;outline-offset:2px}.card h3{margin:5px 0;line-height:1.35;font-size:18px;flex:1}.product-title{color:inherit;text-decoration:none}.product-title:hover,.product-title:focus-visible{text-decoration:underline}.card .btn{margin-top:auto}.card:focus-within{outline:2px solid #3157a2;outline-offset:2px}.tag{font-size:12px;color:#2855a5;font-weight:700}.price{font-size:28px;font-weight:850;line-height:1.15;color:#0d5e44;margin:8px 0 0;letter-spacing:-.025em}.price-query{font-size:16px;color:#52647e;letter-spacing:0}.price-prefix{display:block;font-size:13px;font-weight:650;letter-spacing:0}.terms{font-size:13px;margin:0 0 11px}.merchant{color:#475770;font-size:14px;font-weight:650}.offer-disclosure{font-size:12px;color:#52647e;margin:0 0 8px}.card p.tag,.card p.merchant{margin:0}.card .btn:hover{background:#1b3d77}.muted{color:#64748b}.btn{display:block;text-align:center;background:#254f99;color:white;padding:11px;border-radius:10px;text-decoration:none;font-weight:700}footer{padding:25px;text-align:center;color:#64748b}.partner-store{background:#fff;border:1px solid #d9e3f2;border-radius:16px;padding:22px;margin-top:18px}.partner-store h2{margin:0 0 10px}.partner-store p{line-height:1.55}.partner-store a{display:inline-block;background:#1559a7;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700}.partner-store .muted{font-size:13px}.learning{background:white;border:1px solid #d9e3f2;border-radius:16px;padding:20px;margin-top:16px}.learning a{font-weight:700;color:#205ea8}.guide-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:9px;margin-top:16px}.guide-grid a{display:block;border:1px solid #dbe5f4;padding:11px;border-radius:9px;text-decoration:none}.guide-grid a:hover,.guide-grid a:focus-visible{background:#eef4ff}.store-actions{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}.store-actions .share-link{background:#126649}.partner-store a:focus-visible{outline:3px solid #f5a524;outline-offset:3px}.empty{background:white;padding:30px;border-radius:15px;border:1px solid #e1e7f0}</style></head><body><header><h1><img src=\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20650%20190%22%3E%3Crect%20width%3D%22650%22%20height%3D%22190%22%20rx%3D%2220%22%20fill%3D%22%23090909%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23f4be35%22%20stroke-width%3D%228%22%3E%3Crect%20x%3D%2220%22%20y%3D%2243%22%20width%3D%22125%22%20height%3D%22125%22%2F%3E%3Cpath%20d%3D%22M52%2043V28Q52%208%2083%208T114%2028V43%22%2F%3E%3Ccircle%20cx%3D%22544%22%20cy%3D%2283%22%20r%3D%2262%22%2F%3E%3Ccircle%20cx%3D%22544%22%20cy%3D%2283%22%20r%3D%2240%22%2F%3E%3Cpath%20d%3D%22M544%2083L588%2034%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22172%22%20y%3D%2285%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2261%22%20font-weight%3D%22900%22%20fill%3D%22%23f1f5fa%22%3EVITRINE%3C%2Ftext%3E%3Ctext%20x%3D%22172%22%20y%3D%22150%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2275%22%20font-weight%3D%22900%22%20fill%3D%22%23f4be35%22%3ERADAR%3C%2Ftext%3E%3C%2Fsvg%3E\" alt=\"Vitrine Radar\" width=\"325\" height=\"95\" style=\"display:block;width:min(325px,90vw);height:auto\"></h1><p>As melhores ofertas estão no seu radar!</p></header><style>.partners-top{margin:12px 0 22px;padding:18px;background:#fff;border:1px solid #dce5f1;border-radius:16px}.partners-top h2{margin:0 0 14px;color:#102e68;font-size:clamp(21px,3vw,29px)}.partners-top .partner-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.partners-top .partner-grid a{display:flex!important;align-items:center;justify-content:center;text-align:center;min-height:66px;box-sizing:border-box;padding:13px 10px!important;border-radius:14px!important;box-shadow:0 3px 8px #12254a22;font-size:clamp(13px,2.5vw,18px);line-height:1.25}.partners-top .partner-grid a:hover,.partners-top .partner-grid a:focus-visible{filter:brightness(.94);outline:2px solid #234a94;outline-offset:2px}.partners-top p{font-size:13px;line-height:1.5}@media(min-width:900px){.partners-top .partner-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:350px){.partners-top .partner-grid{gap:8px}.partners-top .partner-grid a{font-size:12px}}</style><main class="wrap"><section class="hero"><h2 class='hero-headline'><span class='hero-brand'><span class='hero-brand-vitrine'>Vitrine</span> <span class='hero-brand-radar'>Radar</span></span><span class='hero-promise'>Sua próxima grande descoberta!</span></h2><p>Encontre produtos selecionados, compare categorias e acesse ofertas diretamente nas lojas parceiras. O Vitrine Radar não processa pagamentos.</p><strong>CATÁLOGO CONECTADO · CONFIRA PREÇOS E ESTOQUE NA LOJA</strong><p><a class="hero-catalog" href="#offers-title">Ver ofertas das quatro lojas</a></p></section><section class="partner-store" aria-labelledby="store-title"><h2 id="store-title">Loja Vitrineradar · produtos selecionados</h2><p>Conheça nossa loja parceira com diversas categorias de produtos. Consulte preço, estoque, entrega e condições diretamente no site de compra.</p><div class="store-actions"><a id="store-visit" href="/lojas/magalu" target="_blank" rel="noopener noreferrer sponsored">Explorar produtos na loja</a><a id="store-share" class="share-link" href="https://api.whatsapp.com/send?text=Publicidade%20%7C%20Vitrine%20Radar%3A%20ofertas%20de%20Magalu%2C%20Mercado%20Livre%2C%20Shopee%20e%20Amazon.%20Confira%20pre%C3%A7os%20e%20condi%C3%A7%C3%B5es%20diretamente%20nas%20lojas.%20Links%20de%20afiliados%3A%20https%3A%2F%2Fvitrine-radar.ainacio1980-financas.workers.dev%2F%3Futm_source%3Dwhatsapp%26utm_medium%3Dsocial%26utm_campaign%3Dlancamento" target="_blank" rel="noopener noreferrer">Compartilhar Vitrine Radar no WhatsApp</a></div><p class="muted">O Vitrine Radar pode receber comissão por compras qualificadas feitas na loja parceira. Compartilhar é opcional e nenhuma mensagem é enviada automaticamente.</p></section><section aria-label="Lojas parceiras" class="partners-top"><h2>Lojas parceiras</h2><p>Explore os links para lojas parceiras. Preços, estoque e condições são definidos por cada loja. Alguns links levam a categorias ou seleções, não a uma vitrine exclusiva.</p><div class="partner-grid"><a style="display:inline-block;padding:14px 20px;border-radius:10px;background:#ffe600;color:#222;text-decoration:none;font-weight:700" href="/lojas/mercado-livre" target="_blank" rel="sponsored noopener noreferrer">Mercado Livre · Vitrine Radar</a><a style="display:inline-block;padding:14px 20px;border-radius:10px;background:#1366b5;color:white;text-decoration:none;font-weight:700" href="/lojas/magalu" target="_blank" rel="sponsored noopener noreferrer">Magalu · Vitrine Radar</a><a style="display:inline-block;padding:14px 20px;border-radius:10px;background:#ee4d2d;color:#fff;text-decoration:none;font-weight:700" aria-label="Abrir ofertas Shopee de saúde e bem-estar" href='/lojas/shopee' target='_blank' rel='sponsored noopener noreferrer'>Shopee · Vitrine Radar</a><a style="display:inline-block;padding:14px 20px;border-radius:10px;background:#232f3e;color:white;text-decoration:none;font-weight:700" href="/lojas/amazon" target="_blank" rel="sponsored noopener noreferrer" aria-label="Amazon Associados Vitrine Radar">Amazon · Vitrine Radar</a></div><p style="font-size:13px">Transparência: alguns links são de afiliados e podem gerar comissão; outros direcionam diretamente à loja, sem comissão confirmada. Preços e estoques devem ser conferidos no destino. Como associado da Amazon, eu ganho com compras qualificadas.</p></section><h2 id="offers-title">Ofertas das lojas parceiras</h2><div class="filters"><input id="q" placeholder="Pesquisar ofertas..." aria-label="Pesquisar ofertas"><select id="cat" aria-label="Categoria"><option value="">Todas as categorias</option></select><select id="merchant" aria-label="Loja"><option value="">Todas as lojas</option></select><select id="sort" aria-label="Ordenar ofertas"><option value="featured">Com foto e preço primeiro</option><option value="recent">Mais recentes</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="name">Nome A–Z</option></select><input type="number" id="minPrice" min="0" step="0.01" inputmode="decimal" placeholder="Preço mín. R$" aria-label="Preço mínimo em reais" style="flex:0 1 150px;min-width:122px"><input type="number" id="maxPrice" min="0" step="0.01" inputmode="decimal" placeholder="Preço máx. R$" aria-label="Preço máximo em reais" style="flex:0 1 150px;min-width:122px"><button type="button" id="clearFilters" style="padding:11px 15px;border:1px solid #9baeca;border-radius:9px;background:#fff;color:#1b365f;font-weight:700;cursor:pointer">Limpar filtros</button><label class="complete-filter"><input id="completeOnly" type="checkbox"> Só com foto e preço</label></div><p id="result-count" class="muted" aria-live="polite"></p><div id="cards" class="grid"><p class="muted">Carregando ofertas...</p></div><p class="muted">Os preços e condições variam conforme a loja e a forma de pagamento. Confira o valor final, o frete e o estoque antes de comprar.</p><section class="learning"><h2>Saiba comparar antes de comprar</h2><p>Veja como avaliar preço total, frete, descontos e condições em uma calculadora gratuita.</p><a href="/guia-de-compras">Acessar guia de compras inteligentes</a></section><section class="learning" aria-labelledby="guides-title"><h2 id="guides-title">Guias para comprar melhor</h2><p>Compare características, instalação, custos e garantias antes de decidir. Sem preços fictícios ou promoções inventadas.</p><nav class="guide-grid" aria-label="Guias de compra"><a href="/guias/celular">Como escolher um celular sem pagar por recursos que não vai usar</a><a href="/guias/notebook">Notebook para trabalhar ou estudar: o que comparar antes de comprar</a><a href="/guias/televisao">Como comparar televisores: imagem, tamanho e conexões</a><a href="/guias/geladeira">Guia de geladeiras: espaço, eficiência e capacidade útil</a><a href="/guias/lava-e-seca">Lava e seca: capacidade, ciclos e pontos de instalação</a><a href="/guias/air-fryer">Air fryer: como avaliar capacidade, limpeza e consumo</a><a href="/guias/aspirador">Aspirador de pó: robô, vertical ou tradicional?</a><a href="/guias/roteador-wifi">Wi-Fi em casa: roteador comum ou sistema mesh?</a><a href="/guias/ar-condicionado">Ar-condicionado: dimensionamento e custo de uso</a></nav></section></main><footer>Vitrine Radar · Catálogo público · <a href="/sobre">Sobre e transparência</a></footer><script>function recordStoreAction(action){try{navigator.sendBeacon('/api/store-engagement',new Blob([JSON.stringify({action:action})],{type:'text/plain'}))}catch(e){}}document.getElementById('store-visit').addEventListener('click',function(){recordStoreAction('visit')});document.getElementById('store-share').addEventListener('click',function(){recordStoreAction('share')});
const elements = Object.fromEntries(
  ['q', 'cat', 'merchant', 'minPrice', 'maxPrice', 'sort', 'completeOnly', 'clearFilters', 'cards', 'result-count']
    .map(id => [id, document.getElementById(id)])
);
const brl = new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'});
const pricePrefix = 'a partir de · ';
const normalizeProductSearch = ${normalizeProductSearch.toString()};
const productSearchTerms = ${productSearchTerms.toString()};
let products = [];
let catalogLoaded = false;
let selectedOfferId = null;

function matchesSearch(product, terms) {
  return terms.prefixes.every(prefix => product.searchText.includes(prefix));
}

function findCatalogOffers(query, limit) {
  const terms = productSearchTerms(query);
  if (!terms) return { offers: [], more: false };
  const matches = products.filter(product => product.image_url && product.price_cents > 0 && matchesSearch(product, terms));
  matches.sort((a, b) => Number(b.searchText.includes(terms.phrase)) - Number(a.searchText.includes(terms.phrase)));
  return { offers: matches.slice(0, limit), more: matches.length > limit };
}

function priceLimit(field) {
  return field.value === '' ? null : Math.round(Number(field.value) * 100);
}

function completeness(offer) {
  return Number(Boolean(offer.image_url)) + 2 * Number(offer.price_cents > 0);
}

function renderCard(product) {
  const card = document.createElement('article');
  card.className = 'card';

  const title = document.createElement('h3');
  const detail = document.createElement('a');
  detail.href = '/ofertas/' + encodeURIComponent(product.id);
  detail.textContent = product.title;
  detail.className = 'product-title';
  title.append(detail);

  if (product.image_url) {
    const photo = document.createElement('a');
    photo.className = 'product-photo';
    photo.href = detail.href;
    photo.setAttribute('aria-label', 'Ver ' + product.title);
    const image = document.createElement('img');
    image.alt = product.title;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => photo.remove(), { once: true });
    image.src = product.image_url;
    photo.append(image);
    card.append(photo);
  }

  const category = document.createElement('p');
  category.className = 'tag';
  category.textContent = product.category;
  const merchant = document.createElement('p');
  merchant.className = 'merchant';
  merchant.textContent = product.merchant;

  const price = document.createElement('p');
  const terms = document.createElement('p');
  terms.className = 'muted terms';
  if (product.price_cents > 0) {
    price.className = 'price';
    const value = product.price_terms || '';
    const startsAt = value.toLowerCase().startsWith(pricePrefix);
    if (startsAt) {
      const prefix = document.createElement('span');
      prefix.className = 'price-prefix';
      prefix.textContent = 'A partir de ';
      price.append(prefix);
    }
    price.append(brl.format(product.price_cents / 100));
    const date = product.updated_at?.slice(0, 10).split('-').reverse().join('/');
    const condition = startsAt ? value.slice(pricePrefix.length) : value;
    terms.textContent = [condition, date ? 'Referência de ' + date : 'Preço de referência'].filter(Boolean).join(' · ');
  } else {
    price.className = 'price price-query';
    price.textContent = 'Consultar preço na loja';
  }

  const direct = product.link_kind === 'retailer_direct';
  const disclosure = document.createElement('p');
  disclosure.className = 'offer-disclosure';
  disclosure.textContent = direct ? 'Link direto da loja' : 'Publicidade · link de afiliado';

  const action = document.createElement('a');
  action.className = 'btn';
  action.textContent = product.merchant === 'Mercado Livre' && product.link_kind === 'affiliate_existing'
    ? 'Ver seleção no Mercado Livre'
    : 'Ver na loja';
  action.href = '/go/' + encodeURIComponent(product.id);
  action.target = '_blank';
  action.rel = direct ? 'noopener noreferrer' : 'noopener noreferrer sponsored';
  action.setAttribute('aria-label', 'Ver ' + product.title + ' em ' + product.merchant);

  card.append(category, title, merchant, price);
  if (terms.textContent) card.append(terms);
  card.append(disclosure, action);
  return card;
}

function render() {
  if (!catalogLoaded) return;
  const query = elements.q.value.trim();
  const terms = productSearchTerms(query, 1);
  const category = elements.cat.value;
  const merchant = elements.merchant.value;
  const minimum = priceLimit(elements.minPrice);
  const maximum = priceLimit(elements.maxPrice);
  const list = products.filter(product =>
    (selectedOfferId !== null ? String(product.id) === String(selectedOfferId) : (!query || (terms && matchesSearch(product, terms))))
    && (!category || product.category === category)
    && (!merchant || product.merchant === merchant)
    && (!elements.completeOnly.checked || (product.image_url && product.price_cents > 0))
    && (minimum === null || (product.price_cents > 0 && product.price_cents >= minimum))
    && (maximum === null || (product.price_cents > 0 && product.price_cents <= maximum))
  );

  switch (elements.sort.value) {
    case 'featured':
      list.sort((a, b) => completeness(b) - completeness(a));
      break;
    case 'price-asc':
      list.sort((a, b) => (a.price_cents || Infinity) - (b.price_cents || Infinity));
      break;
    case 'price-desc':
      list.sort((a, b) => b.price_cents - a.price_cents);
      break;
    case 'name':
      list.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
      break;
  }

  elements['result-count'].textContent = list.length === products.length
    ? list.length + ' ofertas'
    : list.length + ' de ' + products.length + ' ofertas';
  if (list.length) {
    elements.cards.replaceChildren(...list.map(renderCard));
    return;
  }
  const empty = document.createElement('p');
  empty.className = 'empty';
  empty.textContent = products.length ? 'Nenhuma oferta corresponde aos filtros.' : 'Ainda não há ofertas cadastradas.';
  elements.cards.replaceChildren(empty);
}

async function loadCatalog() {
  try {
    const catalog = new Map();
    let offset = 0;
    while (offset !== null) {
      const response = await fetch('/api/offers' + (offset ? '?offset=' + offset : ''));
      if (!response.ok) throw new Error('Catálogo indisponível');
      const {offers, next_offset: nextOffset = null} = await response.json();
      for (const offer of offers) catalog.set(offer.id, offer);
      if (nextOffset !== null && (!Number.isSafeInteger(nextOffset) || nextOffset <= offset)) {
        throw new Error('Página inválida do catálogo');
      }
      offset = nextOffset;
    }
    products = [...catalog.values()].map(product => ({
      ...product,
      searchText: ' ' + normalizeProductSearch([product.title, product.category, product.merchant].join(' ')) + ' ',
    }));
    for (const [field, property] of [[elements.cat, 'category'], [elements.merchant, 'merchant']]) {
      const values = [...new Set(products.map(product => product[property]))];
      values.sort((a, b) => a.localeCompare(b, 'pt-BR'));
      for (const value of values) field.add(new Option(value, value));
    }
    catalogLoaded = true;
    updateSuggestions();
    render();
  } catch {
    elements.cards.textContent = 'Não foi possível carregar as ofertas. Atualize a página para tentar novamente.';
  }
}

const suggestions = document.createElement('div');
suggestions.id = 'vr-suggestions';
suggestions.setAttribute('role','listbox');
suggestions.setAttribute('aria-label','Sugestões de produtos');
suggestions.style.cssText = 'display:none;position:absolute;top:100%;left:0;right:0;z-index:1000;max-height:280px;overflow:auto;background:#fff;border:1px solid #a8bbd9;border-radius:10px;box-shadow:0 8px 22px #152b4a30';
const searchWrap = document.createElement('div');
searchWrap.style.cssText = 'position:relative;flex:1 1 220px;min-width:180px';
elements.q.parentNode.insertBefore(searchWrap,elements.q);
searchWrap.append(elements.q,suggestions);
elements.q.style.width='100%';
elements.q.setAttribute('aria-controls',suggestions.id);
elements.q.setAttribute('aria-autocomplete','list');
function hideSuggestions(){suggestions.style.display='none';suggestions.replaceChildren();elements.q.setAttribute('aria-expanded','false');}
function updateSuggestions(){
  const q=elements.q.value.trim();
  const matches=q && catalogLoaded && !selectedOfferId ? findCatalogOffers(q,8).offers : [];
  suggestions.replaceChildren(...matches.map(offer=>{
    const item=document.createElement('button');
    item.type='button';item.setAttribute('role','option');
    item.style.cssText='display:block;width:100%;padding:11px 12px;text-align:left;background:#fff;color:#172c52;border:0;border-bottom:1px solid #e1e7f0;cursor:pointer;font:inherit';
    item.textContent=offer.title+' · '+offer.merchant;
    const selectOffer=()=>{selectedOfferId=offer.id;elements.q.value=offer.title;elements.cat.value='';elements.merchant.value='';elements.minPrice.value='';elements.maxPrice.value='';elements.completeOnly.checked=false;hideSuggestions();render();elements.q.focus();};
    item.addEventListener('click',selectOffer);
    // Native button keyboard activation handles Enter and Space without duplicate selection.
    return item;
  }));
  suggestions.style.display=matches.length?'block':'none';
  elements.q.setAttribute('aria-expanded',matches.length?'true':'false');
}
elements.q.addEventListener('input',()=>{selectedOfferId=null;updateSuggestions();render();});
elements.q.addEventListener('focus',updateSuggestions);
elements.q.addEventListener('keydown',event=>{if(event.key==='Escape')hideSuggestions();if(event.key==='ArrowDown'&&suggestions.style.display!=='none'){event.preventDefault();suggestions.querySelector('button')?.focus();}});
document.addEventListener('pointerdown',event=>{if(!searchWrap.contains(event.target))hideSuggestions();});
for (const field of [elements.q, elements.minPrice, elements.maxPrice]) {
  field.addEventListener('input', render);
}
for (const field of [elements.cat, elements.merchant, elements.sort, elements.completeOnly]) {
  field.addEventListener('change', render);
}
elements.clearFilters.addEventListener('click', () => {
  for (const field of [elements.q, elements.cat, elements.merchant, elements.minPrice, elements.maxPrice]) field.value = '';
  elements.sort.value = 'featured';
  elements.completeOnly.checked = false;
  selectedOfferId = null;
  hideSuggestions();
  render();
});
const vitrineCatalog = { ready: loadCatalog(), findOffers: findCatalogOffers, renderCard };
</script></body></html>`;

