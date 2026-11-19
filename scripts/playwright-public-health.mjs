import { chromium } from 'playwright';
const sites=[
 {name:'Dashboard Financeiro',base:'https://adriano-inacio.ainacio1980-financas.workers.dev',apis:['/api/indicadores','/api/intraday?id=usdbrl&latest=1','/api/intraday?id=selic&latest=1']},
 {name:'Vitrine Radar',base:'https://vitrine-radar.ainacio1980-financas.workers.dev',apis:['/api/health']}
];
const failures=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 for(const site of sites){
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message.slice(0,200)));
  try{
   const response=await page.goto(site.base,{waitUntil:'domcontentloaded',timeout:25000});
   if(!response||response.status()>=400)throw Error('HTTP '+(response?.status()??'sem resposta'));
   await page.waitForTimeout(1800);
   const title=await page.title();
   const visible=await page.locator('body').innerText({timeout:10000});
   if(visible.trim().length<60)throw Error('Página sem conteúdo suficiente');
   console.log(site.name+': HTTP '+response.status()+'; título '+title+'; caracteres '+visible.length);
   if(errors.length)failures.push(site.name+' JavaScript: '+errors.join('; '));
  }catch(e){failures.push(site.name+' página: '+e.message);}
  for(const path of site.apis){
   try{
    const response=await context.request.get(site.base+path,{timeout:25000,failOnStatusCode:false});
    const body=await response.text();
    if(!response.ok())throw Error('HTTP '+response.status());
    let payload;try{payload=JSON.parse(body);}catch{throw Error('JSON inválido');}
    if(path.includes('/api/intraday')){
      if(!Array.isArray(payload.points))throw Error('série inválida');
      if(payload.points.length===0&&!payload.unavailable)throw Error('sem pontos de cotação');
      if(payload.points.some(p=>!Number.isFinite(p.value)))throw Error('valor não numérico');
    }
    if(path==='/api/indicadores'&&['fx','selic','ipca','cdi'].every(k=>payload[k]==null))throw Error('todos indicadores nulos');
    console.log(site.name+' '+path+': HTTP '+response.status());
   }catch(e){failures.push(site.name+' '+path+': '+e.message);}
  }
  await context.close();
 }
}finally{await browser.close();}
if(failures.length){console.error('FALHAS DETECTADAS:\n'+failures.map(x=>'- '+x).join('\n'));process.exitCode=1;}
else console.log('Todas as verificações públicas passaram.');
