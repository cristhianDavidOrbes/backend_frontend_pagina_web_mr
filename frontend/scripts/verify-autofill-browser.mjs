import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||'C:/Users/crist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3100';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local preview only');
const output=await mkdtemp(path.join(tmpdir(),'algolab-autofill-'));
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
try{
  for(const [width,height] of [[390,844],[1440,1000]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<500});
    await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
    const page=await context.newPage();
    const cdp=await context.newCDPSession(page);
    await cdp.send('DOM.enable');await cdp.send('CSS.enable');
    for(const route of ['/iniciar-sesion','/registrarse']){
      const emailSelector=route==='/registrarse'?'#correo-registro':'#correo';
      const passwordSelector=route==='/registrarse'?'#contrasena-registro':'#contrasena';
      await page.goto(base+route);await page.locator(emailSelector).waitFor();
      const {root}=await cdp.send('DOM.getDocument');
      for(const selector of [emailSelector,passwordSelector]){
        const input=page.locator(selector);
        const autocomplete=await input.getAttribute('autocomplete');
        check(Boolean(autocomplete)&&autocomplete!=='off','Saved credentials remain enabled');
        await input.fill(selector===emailSelector?'prueba@example.test':'Synthetic-test-only!');
        const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});
        await cdp.send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['autofill']});
        check(await input.evaluate(el=>el.matches(':autofill')),'Real engine autofill pseudo-class is active');
        await input.blur();
        await page.waitForTimeout(300);
        let style=await input.evaluate(el=>{const s=getComputedStyle(el);return {shadow:s.boxShadow,text:s.webkitTextFillColor};});
        check(style.shadow.includes('rgb(4, 18, 15)')&&style.shadow.includes('inset'),'Autofill yellow is covered by the existing dark palette');
        check(style.text==='rgb(241, 250, 246)','Autofilled text stays readable');
        await input.focus();await page.waitForTimeout(300);
        style=await input.evaluate(el=>({shadow:getComputedStyle(el).boxShadow,border:getComputedStyle(el).borderColor}));
        check(style.shadow.includes('inset')&&style.shadow.includes('rgba(41, 195, 231, 0.18)'),'Autofill preserves the visible focus ring');
        await input.evaluate(el=>el.setAttribute('aria-invalid','true'));
        await page.waitForFunction(selector=>getComputedStyle(document.querySelector(selector)).boxShadow.includes('rgba(255, 107, 120, 0.14)'),selector,{timeout:5000});
        const invalidStyle=await input.evaluate(el=>({shadow:getComputedStyle(el).boxShadow,ring:getComputedStyle(el).getPropertyValue('--field-ring'),invalid:el.getAttribute('aria-invalid')}));
        check(invalidStyle.shadow.includes('rgba(255, 107, 120, 0.14)'),`Validation ring survives autofill: ${JSON.stringify(invalidStyle)}`);
        await input.evaluate(el=>el.setAttribute('aria-invalid','false'));
      }
      await page.getByRole('button',{name:'Mostrar contraseña',exact:true}).click();
      check(await page.locator(passwordSelector).getAttribute('type')==='text','Password reveal still works');
      await page.getByRole('button',{name:'Ocultar contraseña',exact:true}).click();
      check(await page.locator(passwordSelector).getAttribute('type')==='password','Password can be hidden again');
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
      await page.locator(emailSelector).focus();await page.waitForTimeout(300);
      await page.screenshot({path:path.join(output,`${width}-${route.slice(1)}.png`),fullPage:true});
    }
    await context.close();
  }
  console.log(JSON.stringify({checks,output,scope:'Chromium autofill pseudo-state; desktop and mobile emulation, synthetic credentials only'}));
}finally{await browser.close();}
