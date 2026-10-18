import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium }=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||'C:/Users/crist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3100';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Use an isolated local preview');
const output=await mkdtemp(path.join(tmpdir(),'algolab-prop-continuity-'));
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
let checks=0;
function check(value,label){assert.ok(value,label);checks++;console.log(`PASS ${label}`);}
const offscreen=b=>b.minX>1||b.maxX< -1||b.minY>1||b.maxY< -1;
try {
  for(const [name,width,height] of [['desktop',1365,768],['mobile',390,844]]) {
    const context=await browser.newContext({viewport:{width,height},hasTouch:name==='mobile',isMobile:name==='mobile',deviceScaleFactor:name==='mobile'?2:1});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/intro-scene/index.html?site=1`);
    await page.waitForFunction(()=>window.__isRobotReady?.(),{timeout:60000});
    const sample=async t=>page.evaluate(t=>{window.__renderAtTime(t);return window.__propDiagnostics();},t);
    const original=await sample(0);
    for(const t of [3.1,4.4,5.1,5.25,5.5,5.8,6.149]) {
      const d=await sample(t);
      check(d.door.id===original.door.id&&d.door.frameId===original.door.frameId&&d.door.frameCount===2,`${name} ${t}s: same book/door and frame; no replacement leaf`);
      check(d.door.visible&&d.door.framesVisible&&d.door.scale.every((n,i)=>Math.abs(n-[1.1,2.3,1][i])<1e-8),`${name} ${t}s: original door stays full size`);
      if(t>=5.1)check(d.door.localCenter.every((n,i)=>Math.abs(n-[0,1.22,.05][i])<1e-8),`${name} ${t}s: door and frame move as one rigid object`);
      if([3.1,4.4,5.25,5.5].includes(t))await page.screenshot({path:path.join(output,`${name}-door-${t}.png`)});
    }
    const leaving=await sample(6.149),gone=await sample(6.15);
    check(offscreen(leaving.door.bounds)&&!gone.door.visible&&!gone.door.framesVisible,`${name}: doors only hide once the entire assembly has left the frame`);
    let last;
    for(const t of [9.4,9.7,9.95,10.1,10.35,10.5,10.8,11.8]) {
      const d=await sample(t);
      check(d.car.id===original.car.id&&d.car.visible,`${name} ${t}s: same car remains present after impact`);
      if(last)check(d.car.position[0]>=last.car.position[0]&&d.car.position[2]<=last.car.position[2],`${name} ${t}s: car follows its forward/right route`);
      if([9.4,9.95,10.1,10.35].includes(t))await page.screenshot({path:path.join(output,`${name}-car-${t}.png`)});
      last=d;
    }
    check(offscreen(last.car.bounds)&&last.car.yaw===0,`${name}: car drives right beyond the view without a visibility cutoff`);
    let bookScale=Infinity;
    for(const t of [12.9,13.9,14.4,14.65,14.95,15.15,15.3]) {
      const d=await sample(t),book=d.book,a=book.hingeAngle;
      const local=[-.48+.48*Math.cos(a)+.045*Math.sin(a),0,.06-.48*Math.sin(a)+.045*Math.cos(a)];
      check(book.coverId===original.door.id&&book.visible&&book.coverVisible,`${name} ${t}s: original cover stays with the physical book`);
      check(book.coverScale.every((n,i)=>Math.abs(n-book.scale*[1,1.4,1][i])<1e-8)&&book.coverLocal.every((n,i)=>Math.abs(n-local[i])<1e-8),`${name} ${t}s: binding, pages and cover share one scale and hinge`);
      check(book.scale<=bookScale,`${name} ${t}s: book contracts continuously without a second cover`);
      if(t>=14.65)check(Math.abs(a)<1e-8,`${name} ${t}s: book remains closed while it shrinks`);
      bookScale=book.scale;
      if([13.9,14.65,14.95,15.15].includes(t))await page.screenshot({path:path.join(output,`${name}-book-${t}.png`)});
    }
    const rewind=await sample(5.25);
    check(rewind.door.visible&&rewind.door.scale[1]===2.3&&rewind.door.id===original.door.id,`${name}: replay/rewind restores the original door without accumulating copies`);
    await context.close();
  }
  check(errors.length===0,`no browser errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({checks,output}));
} finally { await browser.close(); }
