import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||'C:/Users/crist/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3100';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local preview only');
const output=await mkdtemp(path.join(tmpdir(),'algolab-room-wall-'));
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
try{
  for(const [label,width,height] of [['ultrawide',2560,1080],['reported',2078,962],['wide',2048,1186],['desktop',1365,768],['mobile',390,844]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:label==='mobile'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${base}/intro-scene/index.html?site=1`);
    await page.waitForFunction(()=>window.__isRobotReady?.(),{timeout:60000});
    let wallId;
    for(const time of [0,5.2,5.89,6.025,6.15,9.4,10.35,14.6,17,19.2,20,0]){
      const d=await page.evaluate(time=>{window.__renderAtTime(time);return {scene:window.__sceneDiagnostics(),continuity:window.__continuityDiagnostics()};},time);
      const wall=d.scene.room.rightWall;
      check(wall?.visible&&wall.skirting,`${label}: wall and skirting remain present at ${time}s`);
      wallId??=wall.id;
      check(wall.id===wallId,`${label}: seeking never duplicates/replaces the wall`);
      check(wall.position.every((v,i)=>Math.abs(v-[6.55,1.7,6.8][i])<1e-8)&&wall.size.every((v,i)=>Math.abs(v-[.2,6.6,22.4][i])<1e-8),`${label}: side extends past all camera positions`);
      check(d.scene.camera[0]<wall.position[0]-wall.size[0]/2,`${label}: camera remains on the room side of the wall`);
      check(d.continuity.performance.pixels<=d.continuity.performance.budget+width+height,`${label}: pixel budget is preserved, allowing canvas integer rounding`);
      const opening=d.scene.room.doorOpening;
      check(opening.centerZ===opening.skirtingCenterZ,`${label}: door and marked skirting opening share one center`);
      if(time<5.9)check(opening.skirtingVisible&&opening.skirtingGapWidth===0&&opening.wallInfillVisible,`${label}: wall and skirting stay complete before docking`);
      else if(time<6.15)check(opening.skirtingVisible&&opening.skirtingGapWidth>0&&opening.skirtingGapWidth<1.1,`${label}: skirting opens only while door is docking`);
      else check(!opening.skirtingVisible&&!opening.wallInfillVisible,`${label}: installed door replaces the infill without skirting across its threshold`);
      if(time===0||time===14.6||time===10.35)await page.screenshot({path:path.join(output,`${label}-${time}.png`)});
    }
    const geometry=await page.evaluate(async()=>{
      const THREE=await import('/intro-scene/assets/vendor/three.module.js');
      const {createRoom}=await import('/intro-scene/src/room.js');
      const {exitRoute}=await import('/intro-scene/src/prop-motion.js');
      const {DOOR_MOUNT}=await import('/intro-scene/src/door-motion.js');
      const scene=new THREE.Scene(),room=createRoom(scene,{extendedFloor:true});
      await room.ready;scene.updateMatrixWorld(true);
      const wall=room.group.getObjectByName('room-right-wall');
      const leftWall=room.group.getObjectByName('room-left-wall');
      const skirting=room.group.getObjectByName('room-right-skirting');
      const doorSkirting=room.group.getObjectByName('room-door-skirting-infill');
      const trimCoverage=[];
      for(const t of [0,5.89,6.025,6.15,0]) {
        room.update(t);scene.updateMatrixWorld(true);
        const targets=[skirting,...(doorSkirting.visible?doorSkirting.children:[])];
        const covered=Array.from({length:21},(_,i)=>{
          const z=DOOR_MOUNT.z+DOOR_MOUNT.width*(i/20-.5)*.98;
          return new THREE.Raycaster(new THREE.Vector3(6,room.floorY+.11,z),new THREE.Vector3(1,0,0)).intersectObjects(targets).length>0;
        }).filter(Boolean).length;
        trimCoverage.push({t,covered,centerZ:doorSkirting.position.z});
      }
      const roadBox=new THREE.Box3().setFromObject(room.group.getObjectByName('car-route-right-hand-bend'));
      const hit=new THREE.Raycaster(new THREE.Vector3(3,3,0),new THREE.Vector3(1,0,0)).intersectObject(wall)[0];
      const wallBox=new THREE.Box3().setFromObject(wall),trimBox=new THREE.Box3().setFromObject(skirting);
      const carClear=Array.from({length:281},(_,i)=>exitRoute(i/10)).every(p=>p.x<wallBox.min.x-.9||p.z<wallBox.min.z-.9);
      const aspect=innerWidth/innerHeight,camera=new THREE.PerspectiveCamera(40,aspect,.1,100);
      camera.position.set(5.8,3.6,11);camera.lookAt(0,-.05,-.3);camera.updateMatrixWorld(true);
      const ray=new THREE.Raycaster();
      const sideCoverage=[-1,1].every(x=>[-.5,0,.5].every(y=>{
        ray.setFromCamera(new THREE.Vector2(x,y),camera);
        return ray.intersectObjects([leftWall,wall]).length>0;
      }));
      return {trimCoverage,hitX:hit?.point.x,wallMin:wallBox.min.toArray(),wallMax:wallBox.max.toArray(),roadMaxZ:roadBox.max.z,trimMaxX:trimBox.max.x,trimMaxZ:trimBox.max.z,leftSize:leftWall.geometry.parameters.depth,leftZ:leftWall.position.z,sideCoverage,count:room.group.children.filter(o=>o.name==='room-right-wall').length,fragments:room.group.children.filter(o=>o.name.startsWith('wall-fragment')).length,carClear};
    });
    check(Math.abs(geometry.hitX-6.45)<1e-6,`${label}: solid wall blocks the former open right-side view`);
    check(geometry.wallMin[2]<-4.3&&geometry.wallMin[1]<-1.55&&geometry.wallMax[2]>13.8,`${label}: joins back wall and extends beyond the furthest camera`);
    check(geometry.leftSize===22.4&&Math.abs(geometry.leftZ-6.8)<1e-8&&geometry.trimMaxZ>13.8,`${label}: both sides and skirtings extend equally`);
    if(label==='ultrawide'||label==='reported')check(geometry.sideCoverage,`${label}: opening shot edge rays cannot see around the side walls`);
    check(geometry.trimMaxX>=geometry.wallMin[0]&&geometry.count===1,`${label}: one matching skirting joins the wall`);
    check(geometry.fragments===18,`${label}: original breakable car exit stays intact`);
    check(geometry.carClear,`${label}: the car turns right outside, without crossing the new side wall`);
    check(geometry.roadMaxZ<=-4.4+1e-6,`${label}: road stays entirely outside the back wall, never over the interior floor`);
    check(geometry.trimCoverage[0].covered===21&&geometry.trimCoverage[1].covered===21&&geometry.trimCoverage[4].covered===21,`${label}: real geometry closes the full marked skirting gap, including after rewind`);
    check(geometry.trimCoverage[2].covered>0&&geometry.trimCoverage[2].covered<21&&geometry.trimCoverage[3].covered===0,`${label}: threshold opens progressively only during final docking`);
    await context.close();
  }
  check(errors.length===0,`No browser errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({checks,output,scope:'desktop and mobile emulation; no backend connection'}));
}finally{await browser.close();}
