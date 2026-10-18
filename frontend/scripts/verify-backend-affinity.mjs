import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const primary='https://railway.example.test', backup='https://render.example.test';
const source=await readFile(new URL('../src/lib/backend.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let calls=[], handler;
const exports={};
vm.runInNewContext(compiled,{
  exports,module:{exports},require(name){
    if(name==='server-only')return {};
    if(name==='node:crypto')return {createHash};
    if(name==='next/server')return {NextResponse:{json:(data,init)=>Response.json(data,init)}};
    throw Error('Unexpected import '+name);
  },Request,Response,Headers,URL,FormData,File,Blob,AbortSignal,
  process:{env:{RAILWAY_API_BASE_URL:primary,RENDER_API_BASE_URL:backup}},
  fetch:async(url,options)=>{assert.ok([primary,backup].includes(new URL(url).origin));calls.push({url,options});return handler(url,options);},
});
const hash=t=>createHash('sha256').update(t).digest('hex');
const cookie=(provider,token)=>`algolab_backend=${provider}.${hash(token)}`;
const request=(method,token,affinity,body={correo:'synthetic@example.test'})=>new Request('https://frontend.example.test/api/test',{
  method,headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...(affinity?{Cookie:affinity}:{}),'Content-Type':'application/json'},
  ...(['GET','DELETE'].includes(method)?{}:{body:JSON.stringify(body)}),
});
const run=(method,path,token,affinity)=>exports.proxyBackend({method,path,request:request(method,token,affinity)});
const json=(status,data={})=>Response.json(data,{status});
let checks=0;
function check(value,message){assert.ok(value,message);checks++;}

handler=async url=>url.startsWith(primary)?json(401):json(200,{token:'render-jwt'});
let result=await run('POST','/api/usuarios/iniciar-sesion');
check(calls.length===2 && calls[0].url.startsWith(primary) && calls[1].url.startsWith(backup),'Login tries Railway before Render');
check(result.headers.get('set-cookie').includes(cookie('render','render-jwt')),'Successful fallback binds the returned token');
check(/HttpOnly; SameSite=Lax/.test(result.headers.get('set-cookie')) && result.headers.get('set-cookie').includes('Secure'),'Affinity cookie is private and secure');
calls=[]; handler=async()=>json(200,{ok:true});
await run('POST','/api/progreso','render-jwt',cookie('render','render-jwt'));
check(calls.length===1 && calls[0].url.startsWith(backup),'Progress uses the issuer backend');
calls=[];
await run('POST','/api/progreso','different-jwt',cookie('render','render-jwt'));
check(calls.length===1 && calls[0].url.startsWith(primary),'A stale cookie cannot route another session');
calls=[];handler=async()=>json(503);
await run('POST','/api/progreso','railway-jwt');
check(calls.length===1,'A failed mutation is never replayed against a second database');
calls=[];await run('POST','/api/usuarios/registrar');
check(calls.length===1,'Registration is not duplicated');
for(const status of [403,423,429]){
  calls=[];handler=async()=>json(status);await run('POST','/api/usuarios/iniciar-sesion');
  check(calls.length===1,`Login restriction ${status} is not bypassed`);
}
calls=[];handler=async url=>url.startsWith(primary)?json(401):json(200,{id:1});
result=await run('GET','/api/usuarios/me','legacy-jwt');
check(calls.length===2 && result.headers.get('set-cookie').includes(cookie('render','legacy-jwt')),'Existing Render sessions recover on a read');
calls=[];handler=async url=>url.startsWith(primary)?json(401):json(401);
result=await run('GET','/api/usuarios/me','invalid-jwt');
check(result.status===401 && !result.headers.has('set-cookie'),'Invalid sessions remain rejected');
calls=[];handler=async url=>{if(url.startsWith(primary))throw Error('Synthetic outage');return json(200,{requiereSegundoFactor:true});};
result=await run('POST','/api/usuarios/iniciar-sesion');
check(result.headers.get('set-cookie').includes('algolab_backend=render.pending'),'Two-factor login keeps pending issuer affinity');
calls=[];handler=async()=>json(200,{token:'2fa-jwt'});
result=await run('POST','/api/auth/2fa/verificar',null,'algolab_backend=render.pending');
check(calls[0].url.startsWith(backup) && result.headers.get('set-cookie').includes(cookie('render','2fa-jwt')),'Two-factor completion binds the final token to its issuer');
calls=[];handler=async()=>json(200,{token:'new-railway-jwt'});
result=await run('POST','/api/usuarios/iniciar-sesion',null,cookie('render','old-jwt'));
check(calls[0].url.startsWith(primary) && result.headers.get('set-cookie').includes(cookie('railway','new-railway-jwt')),'Fresh login always retries the primary');
calls=[];handler=async()=>json(200,{ok:true});
await Promise.all(Array.from({length:100},(_,i)=>run('POST',`/api/progreso?user=${i}`,`jwt-${i}`,cookie(i%2?'render':'railway',`jwt-${i}`))));
check(calls.length===100 && calls.every(({url,options})=>{const i=Number(new URL(url).searchParams.get('user'));return url.startsWith(i%2?backup:primary)&&options.headers.Authorization===`Bearer jwt-${i}`;}),'100 concurrent sessions preserve provider and identity without duplicate writes');
console.log(`Backend affinity: ${checks} checks passed; synthetic fetch only, no production requests.`);
