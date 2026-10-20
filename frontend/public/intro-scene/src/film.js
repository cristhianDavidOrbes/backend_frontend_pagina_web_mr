import * as THREE from '../assets/vendor/three.module.js';
import { RoundedBoxGeometry } from '../assets/vendor/geometries/RoundedBoxGeometry.js';
import { createRoom } from './room.js';
import { createRobot } from './robot.js';
import { createCar } from './car.js';
import { createLandingRobotPass } from './landing-robot.js';
import { createLandingBehavior } from './landing-behavior.js';
import { renderQuality } from './render-quality.js';
import { carDeparture, EXIT_APPROACH, EXIT_ARC } from './prop-motion.js';
import { DOOR_MOUNT, doorPose } from './door-motion.js';

const DURATION = 20;
// Preserve the authored pacing on a twenty-second public timeline.
const STORY_DURATION = 20;
// The website gets an authored portrait camera, not a crop of the wide film.
// Its last shot hands over to the actual responsive DOM, never a screenshot.
const parameters = new URLSearchParams(location.search);
let portrait = matchMedia('(orientation: portrait)').matches;
const siteIntro = parameters.get('site') === '1';
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const quality = () => renderQuality({ width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio || 1, coarse: matchMedia('(pointer: coarse)').matches, memory: navigator.deviceMemory, cores: navigator.hardwareConcurrency });
const initialQuality = quality();
const initialRatio = initialQuality.ratio;
let WIDTH = Math.round(innerWidth * initialRatio);
let HEIGHT = Math.round(innerHeight * initialRatio);
let embeddedLanding = false, landingStarted = 0, lastLandingFrame = 0, embeddedVisible = true, embeddedYaw = 0, embeddedPitch = 0, reactionKind = '';
const landingBehavior = createLandingBehavior();
let landingPose = landingBehavior.diagnostics();
let embeddedTarget = { x: .334, y: .702, height: .394 };
const rendererId = `scene-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const canvas = document.querySelector('#filmCanvas');
canvas.width = WIDTH;
canvas.height = HEIGHT;
const ctx = canvas.getContext('2d', { alpha: true });
const renderer = new THREE.WebGLRenderer({ antialias: initialQuality.antialias, alpha: true });
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d6dac9');
scene.fog = new THREE.Fog('#d6dac9', 16, 35);
const camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, .1, 60);
function fitCamera(){const aspect=WIDTH/HEIGHT,reference=portrait?720/1280:16/9;camera.aspect=aspect;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(20))*Math.max(1,reference/aspect)));camera.updateProjectionMatrix();}
fitCamera();
scene.add(new THREE.HemisphereLight('#e7f6ff', '#9d7756', 2));
const sun = new THREE.DirectionalLight('#fff0d4', 3.4);
sun.position.set(-3, 7, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(initialQuality.shadowSize, initialQuality.shadowSize);
Object.assign(sun.shadow.camera, { left:-9, right:9, top:8, bottom:-7, near:.1, far:24 });
sun.shadow.bias = -.0005;
sun.shadow.normalBias = .035;
sun.shadow.radius = 3;
scene.add(sun);
const fill = new THREE.DirectionalLight('#b9f8e7', 1.1); fill.position.set(5, 3, 1); scene.add(fill);
const room = createRoom(scene, { extendedFloor: true });
const landingRobot=createLandingRobotPass(renderer,scene,camera,ctx,{viewport:()=>[WIDTH,HEIGHT],target:()=>({x:embeddedTarget.x*WIDTH,y:embeddedTarget.y*HEIGHT,height:embeddedTarget.height*HEIGHT}),yaw:()=>embeddedYaw+(embeddedLanding?landingPose.bodyYaw:0),pitch:()=>embeddedPitch,lift:()=>embeddedLanding?landingPose.lift:0});
const clamp = (v, a=0, b=1) => Math.max(a,Math.min(b,v));
const ease = x => {x=clamp(x);return x*x*(3-2*x);};
const phase=(t,a,b)=>ease((t-a)/(b-a));
const mix=(a,b,p)=>a+(b-a)*p;
const pulse=(t,a,b)=>Math.sin(phase(t,a,b)*Math.PI);
const mat=(color,metalness=.08,roughness=.42)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const materials={mint:mat('#36c99a',.3,.27),gold:mat('#edbe41',.5,.3),dark:mat('#143d35'),white:mat('#f5efd9'),cyan:mat('#42b8db',.2,.3),wood:mat('#ac7249'),tire:mat('#202b2b',0,.75),chrome:mat('#b9ccca',.65,.25),coral:mat('#dd7952'),glass:mat('#285867',.6,.14)};
function rounded(parent,size,pos,material,r=.05){const mesh=new THREE.Mesh(new RoundedBoxGeometry(...size,2,Math.min(r,...size.map(n=>n/3))),material);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function cylinder(parent,radius,depth,pos,material,axis='z'){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,depth,32),material);if(axis==='z')mesh.rotation.x=Math.PI/2;mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function sphere(parent,radius,pos,material){const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,20,12),material);mesh.position.set(...pos);mesh.castShadow=true;parent.add(mesh);return mesh;}
function diagramTexture(mode,complete=false){const c=document.createElement('canvas');c.width=1024;c.height=640;const g=c.getContext('2d');g.fillStyle='#092c25';g.fillRect(0,0,1024,640);g.lineWidth=12;g.lineCap='round';g.strokeStyle='#68e6b7';
 if(mode==='console'){g.strokeRect(96,110,500,180);g.fillStyle=complete?'#68e6b7':'#efb748';g.fillRect(115,130,complete?460:155,140);g.fillRect(600,167,28,65);g.strokeStyle='#b6eaff';g.beginPath();g.moveTo(755,130);g.lineTo(755,400);g.stroke();g.beginPath();g.arc(755,450,55,0,Math.PI*2);g.stroke();g.fillStyle=complete?'#68e6b7':'#ef885a';g.beginPath();g.arc(755,450,38,0,Math.PI*2);g.fill();for(let i=0;i<3;i++){g.fillStyle=['#68e6b7','#5cc8e9','#efc555'][i];g.beginPath();g.arc(180+i*180,455,35,0,Math.PI*2);g.fill();}}
 else{const colors=['#62d8b2','#65caed','#f0c968','#e9eee0'];for(let row=0;row<6;row++){let x=row===0||row===5?80:140;for(let part=0;part<3;part++){g.strokeStyle=colors[(row+part)%4];const width=80+((row*71+part*39)%170);g.beginPath();g.moveTo(x,100+row*82);g.lineTo(x+width,100+row*82);g.stroke();x+=width+40;}}if(complete){g.strokeStyle='#b4ffdf';g.lineWidth=20;g.beginPath();g.moveTo(790,480);g.lineTo(840,530);g.lineTo(940,400);g.stroke();}}
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
function textPlane(parent,w,h,pos,texture){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,toneMapped:false,side:THREE.DoubleSide}));m.position.set(...pos);parent.add(m);return m;}

// One physical green shell travels through the story. Its bevel and gold corner
// remain recognizable while fittings unfold, lock in and park in the same room.
const shell=new THREE.Group();scene.add(shell);
shell.name='original-book-and-door';
const coverPanel=rounded(shell,[1,1,.12],[0,0,0],materials.mint,.045);
const coverCorner=rounded(shell,[.18,.08,.035],[.38,.42,.075],materials.gold,.015);
const inset=rounded(shell,[.78,.76,.025],[0,0,.074],mat('#2ead87'),.025);
const handle=new THREE.Group();shell.add(handle);
cylinder(handle,.045,.12,[.34,-.03,.16],materials.gold);
rounded(handle,[.14,.038,.04],[.27,-.03,.23],materials.gold,.015);
// The visual thread starts as a real bound field guide, not an unexplained tile.
const openingBook=new THREE.Group();shell.add(openingBook);
rounded(openingBook,[.94,.94,.2],[0,0,-.16],materials.white,.018);
rounded(openingBook,[1.02,1.02,.055],[0,0,-.28],materials.dark,.025);
rounded(openingBook,[.095,1.02,.32],[-.485,0,-.12],materials.gold,.02);
for(let i=0;i<7;i++)rounded(openingBook,[.006,.89,.005],[.475,0,-.245+i*.024],materials.chrome,.001);
const bookBadge=textPlane(shell,.56,.56,[0,.04,.092],null);
const brandReady=new THREE.TextureLoader().loadAsync(new URL('../assets/algolab-brand.png',import.meta.url).href).then(texture=>{texture.colorSpace=THREE.SRGBColorSpace;bookBadge.material.map=texture;bookBadge.material.transparent=true;bookBadge.material.needsUpdate=true;});

// Door frames are hollow, so the robot and background remain visible through them.
const doors=new THREE.Group();scene.add(doors);
function doorFrame(){const g=new THREE.Group();doors.add(g);rounded(g,[.1,2.45,.19],[-.6,1.225,0],materials.dark);rounded(g,[.1,2.45,.19],[.6,1.225,0],materials.dark);rounded(g,[1.3,.12,.19],[0,2.45,0],materials.dark);rounded(g,[1.35,.07,.45],[0,.035,0],materials.chrome);return g;}
const firstDoor=doorFrame();
// The original book is the first door leaf; there is no replacement panel.
const doorCenter=new THREE.Vector3(0,1.22,.05);

const {car,chassis,cabin,wheels}=createCar(scene);

// Console fittings fold onto the same green shell. Only controls change the state.
const consoleFit=new THREE.Group();scene.add(consoleFit);
rounded(consoleFit,[1.15,1.25,.14],[0,.03,0],materials.dark,.07);
const consoleScreen=textPlane(consoleFit,.94,.5,[0,.32,.1],diagramTexture('console'));
const buttons=[];
for(let i=0;i<3;i++){const b=cylinder(consoleFit,.105,.07,[-.35+i*.35,-.34,.15],[materials.mint,materials.cyan,materials.gold][i]);buttons.push(b);}
const base=new THREE.Group();consoleFit.add(base);const consoleStem=rounded(base,[.12,.7,.12],[0,-1.0,0],materials.chrome);const consoleFoot=rounded(base,[.7,.06,.5],[0,-1.37,0],materials.dark);
const consoleGood=diagramTexture('console',true);

// A real bound book: page block, back cover, spine and a hinged front cover.
const book=new THREE.Group();scene.add(book);
// A later book is separate: the original guide remains the room's door.
// Reuse the small geometries/materials; there is no new asset or second door.
const laterBookCover=new THREE.Group();scene.add(laterBookCover);
laterBookCover.add(coverPanel.clone(),coverCorner.clone(),bookBadge.clone());
const bookCoverPose=new THREE.Object3D();
let bookCoverAngle=0;
rounded(book,[1.0,1.4,.08],[0,0,-.2],materials.dark,.025);
rounded(book,[.94,1.32,.2],[0,0,-.07],materials.white,.018);
rounded(book,[.09,1.41,.3],[-.48,0,-.07],materials.mint,.02);
for(let i=0;i<8;i++)rounded(book,[.92,.008,.006],[0,-.55+i*.15,.038],mat('#c9bfa5'),.002);
const vinyl=new THREE.Group();scene.add(vinyl);
rounded(vinyl,[1.17,1.17,.08],[0,0,-.03],materials.coral);
cylinder(vinyl,.53,.04,[.25,.13,.05],materials.tire);
cylinder(vinyl,.15,.05,[.25,.13,.08],materials.gold);
for(let i=0;i<4;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.24+i*.065,.003,6,48),materials.chrome);ring.position.set(.25,.13,.075);vinyl.add(ring);}
const code=new THREE.Group();scene.add(code);
rounded(code,[2.55,1.65,.12],[0,0,0],materials.dark,.05);
const codeFace=textPlane(code,2.35,1.34,[0,0,.09],diagramTexture('code'));
const codeSuccess=diagramTexture('code',true);

// Each prop folds into the next idea instead of accumulating behind the robot.
const dust=[];
for(let i=0;i<18;i++){const material=new THREE.MeshBasicMaterial({color:'#e5dfcf',transparent:true,opacity:0,depthWrite:false});const p=sphere(scene,.04+(i%4)*.018,[1.5,-.5,-4.3],material);p.castShadow=false;dust.push(p);}

const shellKeys=[
 [0,[.2,-1.03,.45],[-.35,-.15,.12],[.75,.9,1]],
 [.8,[.2,-1.03,.45],[-.35,-.15,.12],[.75,.9,1]],
 [2.1,[.35,.1,.25],[-.15,0,.1],[.75,.9,1]],
 [3.1,[.6,-.28,.05],[0,0,0],[1.1,2.3,1]],
 [4.4,[.413,-.28,.463],[0,-.85,0],[1.1,2.3,1]],
 [5.1,[.6,-.28,.05],[0,0,0],[1.1,2.3,1]],
 [6.15,[.8,-.91,.28],[-Math.PI/2,0,0],[2.2,1.1,1]],
 [7.9,[.8,-.91,.28],[-Math.PI/2,0,0],[2.2,1.1,1]],
 [8.65,[.5,.2,1.1],[-.12,-.2,0],[1.3,1.6,1]],
 [10.2,[.5,.2,1.1],[-.12,-.2,0],[1.3,1.6,1]],
 [11.8,[.9,-.1,.25],[-.12,-.2,0],[1.3,1.6,1]],
 [12.9,[.75,-.03,.3],[-.1,-.3,-.05],[1,1.4,1]],
 [14.4,[.45,-.03,.5],[-.1,-1.0,-.05],[1,1.4,1]],
 [15.6,[1.0,.05,.1],[0,-.15,0],[2.55,1.65,1]],
 [17.4,[1.0,.05,.1],[0,-.15,0],[2.55,1.65,1]],
 [19.2,[1.9,.45,.6],[0,0,0],[3.1,2,1]],
 [20,[1.9,.45,.6],[0,0,0],[3.1,2,1]]
];
function track(keys,t){let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const a=keys[i],b=keys[i+1],p=phase(t,a[0],b[0]);return a.slice(1).map((v,j)=>v.map((n,k)=>mix(n,b[j+1][k],p)));}
const portraitCameraKeys=[
 [0,[5,3,12.4],[-.35,-.1,-.1]], [2.5,[2.8,1.8,11.5],[-.1,-.1,0]],
 [5.2,[2,1.7,11.8],[.1,-.15,0]], [8.3,[3.1,2.4,12.6],[.3,-.35,0]],
 [9.6,[2.5,2.4,13.8],[-.65,-.2,-1.6]], [10.3,[2.7,2.1,11.7],[-.5,-.15,-.7]],
 [11.8,[2.4,1.3,10.9],[-.05,-.03,0]], [14.6,[.3,1.8,11.6],[.4,-.08,0]],
 [17.3,[2,1.8,12.2],[.1,-.05,0]], [19.4,[0,1.15,12.8],[.2,-.05,0]], [20,[0,1.15,12.8],[.2,-.05,0]],
];
const landscapeCameraKeys=[
 // Stay inside the new right wall, including the opening establishing shot.
 [0,[5.8,3.6,11],[0,-.05,-.3]], [2.5,[4.5,2.3,9],[0,-.05,0]],
 [5.2,[2.6,1.5,9],[.3,-.15,0]], [8.3,[4.8,2.7,8.6],[.4,-.35,0]],
 [9.6,[4.1,2.4,8.7],[.1,-.25,-1.4]], [10.3,[3.8,2.1,9],[.1,-.15,-.7]],
 [11.8,[2.3,1.3,8.7],[.1,-.03,0]], [14.6,[-.5,2.1,9.5],[.4,-.08,0]],
 [17.3,[2.7,1.6,10],[.1,-.05,0]], [19.4,[0,1.15,10.8],[.2,-.05,0]], [20,[0,1.15,10.8],[.2,-.05,0]]
];
let cameraKeys=portrait?portraitCameraKeys:landscapeCameraKeys;
const robotKeys=[
 [0,[-1.8,-1.55,1.1],[.8]], [.9,[-1,-1.55,.65],[.85]], [2.3,[-.85,-1.55,.45],[.7]],
 [4.0,[-1.25,-1.55,.4],[1.0]], [4.8,[-.9,-1.55,.5],[.7]],
 [5.6,[-1.3,-1.55,1],[.7]], [6.8,[-1.3,-1.55,.3],[.8]],
 [7.7,[-1.0,-1.55,.28],[.95]], [8.4,[-.35,-1.55,.5],[1.0]],
 [9.0,[-.9,-1.55,.9],[-.35]], [9.7,[-1.7,-1.55,1.35],[-.35]], [10.2,[-1.7,-1.55,1.35],[.7]],
 [11.1,[-.7,-1.55,.7],[.9]], [12,[-.95,-1.55,.5],[.5]], [14.4,[-.85,-1.55,.6],[.7]],
 [15.6,[-1.3,-1.55,.5],[.8]], [16.5,[-.8,-1.55,.75],[.8]],
 [17.4,[-1.1,-1.55,.7],[.35]], [18.9,[-2,-1.55,.65],[0]], [20,[-2,-1.55,.65],[0]]
];
const carKeys=[[0,[.8,-1.55,.28],[0]],[8.05,[.8,-1.55,.28],[0]],[8.7,[1.5,-1.55,-.15],[Math.PI/2]],[9.4,[1.5,-1.55,-3.05],[Math.PI/2]],[20,[1.5,-1.55,-3.05],[Math.PI/2]]];
const chapters=[
 {start:0,end:2.5,title:'Tu cuarto. Nuevas posibilidades.',sub:'Realidad mixta · lo virtual vive en tu espacio'},
 {start:2.5,end:5.5,title:'Una clase. Objetos con vida propia.',sub:'Clases y objetos · el libro se convierte en la puerta del cuarto'},
 {start:5.5,end:8.8,title:'Elige las piezas. Construye tu idea.',sub:'Construcción de objetos · del diseño a la acción'},
 {start:8.8,end:12.3,title:'Controla las acciones. Protege el interior.',sub:'Encapsulamiento · cargar, enfriar y apagar'},
 {start:12.3,end:15.2,title:'Descubre lo que importa.',sub:'Abstracción · selecciona según tu objetivo'},
 {start:15.2,end:18,title:'Ahora, dale vida con código.',sub:'Python y Java · programa, prueba y comprende'},
 {start:18,end:20,title:'AlgoLab',sub:'Aprender es experimentar.'}
];
const interactionGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
const interactionRay=new THREE.Line(interactionGeometry,new THREE.LineBasicMaterial({color:'#9cfbe2',transparent:true,opacity:0,depthWrite:false}));scene.add(interactionRay);
let robot,landing,ready=false,time=0,playing=false,last=null,reduced=motionPreference.matches,lastWorldTime=-1,worldPasses=0,worldActive=true;
function setWorldActive(active){if(worldActive===active)return;worldActive=active;for(const child of scene.children){if(child.isLight||child===robot?.root)continue;child.visible=active;child.matrixWorldAutoUpdate=active;}}
const soundtrack={sync(){},time:fallback=>fallback,diagnostics:()=>({externalClock:true})};
function fit(group,position,rotation,size){group.position.set(...position);group.rotation.set(...rotation);group.scale.set(...size);}
function renderAtTime(t){
 t=clamp(t,0,DURATION);let anim=t*STORY_DURATION/DURATION;
 // The room has gone: keep only this same actor alive, not the whole film simulation.
 if(embeddedLanding&&robot&&lastWorldTime===20&&t===DURATION){
  const now=performance.now(),quiet=motionPreference.matches;
  landingPose=landingBehavior.update(now,quiet);
  robot.update(quiet?20:20+(now-landingStarted)/1000,{x:-2,y:-1.55,z:.65,yaw:0,lookX:.5,...landingPose});
  ctx.clearRect(0,0,WIDTH,HEIGHT);worldPasses=0;landingRobot.draw(robot,20);return;
 }
 if(reduced){const chapter=chapters.find(c=>anim<c.end)||chapters.at(-1);anim=t>=DURATION?STORY_DURATION:(chapter.start+chapter.end)/2;}
 const c=track(cameraKeys,anim);camera.position.set(...c[0]);camera.lookAt(...c[1]);
 const impact=Math.max(0,anim-9.4),shake=anim>=9.4?Math.exp(-impact*9)*.035:0;camera.position.x+=Math.sin(impact*70)*shake;camera.position.y+=Math.sin(impact*91)*shake;
 camera.updateMatrixWorld(true);
 room.update(anim);
 dust.forEach((p,i)=>{p.material.opacity=(anim>=9.4?.4:0)*(1-phase(anim,9.65,10.3));p.visible=p.material.opacity>.001;if(!p.visible)return;const a=i*2.399;p.position.set(1.5+Math.cos(a)*impact*1.2,-.45+Math.sin(a)*impact*.8,-4.1-impact*(.8+(i%3)*.25));p.scale.setScalar(1+impact*4);});
 const s=track(shellKeys,anim);fit(shell,...s);
 // No loose green slab between scenes: the cover exists only as an actual
 // book or door. Vehicle, controls and code each have their own fitted body.
 shell.visible=true;
 const guide=1-phase(anim,2.1,2.75);openingBook.scale.z=Math.max(.001,guide);openingBook.visible=guide>.001;bookBadge.scale.setScalar(Math.max(.001,guide));
 const doorMode=phase(anim,2.15,2.9);
 handle.scale.setScalar(Math.max(.001,doorMode));
 inset.scale.setScalar(Math.max(.001,doorMode));
 const door=doorPose(anim);
 doors.position.set(...door.position);
 doors.scale.set(Math.max(.001,door.growth),Math.max(.001,door.growth),1);
 doors.rotation.set(0,door.yaw,0);
 doors.visible=door.growth>.001;
 if(anim>=3.05){
  doors.updateMatrixWorld(true);
  doorCenter.set(-.55+.55*Math.cos(door.angle),1.22,.05-.55*Math.sin(door.angle));
  shell.position.copy(doorCenter).applyMatrix4(firstDoor.matrixWorld);
  shell.rotation.set(0,door.yaw+door.angle,0);
  shell.scale.set(1.1,2.3,1);
 }
 // The robot gives its creation a push. It turns, accelerates and actually crosses the wall opening at 9.4s.
 const assemble=phase(anim,5.7,6.2),cp=track(carKeys,anim),departure=carDeparture(anim);car.position.set(...cp[0]);car.rotation.y=cp[1][0];car.scale.setScalar(Math.max(.001,assemble));
 if(anim>=9.4){car.position.set(departure.x,-1.55,departure.z);car.rotation.y=departure.yaw;}
 // No time-based disappearance: the car follows the bend behind the wall and
 // keeps driving right until normal camera/frustum occlusion hides it.
 car.visible=assemble>.001;
 const bodyP=phase(anim,5.75,6.45);chassis.position.y=mix(1.8,0,bodyP);
 const cabinP=phase(anim,6.7,7.6);cabin.position.set(0,mix(2.0,0,cabinP),0);cabin.scale.setScalar(Math.max(.001,cabinP));
 const steering=anim>=9.4&&departure.distance>EXIT_APPROACH&&departure.distance<EXIT_APPROACH+EXIT_ARC?-Math.sin(Math.PI*(departure.distance-EXIT_APPROACH)/EXIT_ARC)*.23:0;
 wheels.forEach((w,i)=>{const p=phase(anim,6.1+i*.1,6.85+i*.1),[x,y,z]=w.userData.target;w.position.set(x,y+Math.sin(p*Math.PI)*.25,z+Math.sign(z)*(1-p)*1.1);w.rotation.z=-((anim>=9.4?3.33+departure.distance:.28-car.position.z))/.3;w.rotation.y=x>0?steering:0;w.scale.setScalar(Math.max(.001,p));});
 // Controls lock onto the shell, then retract into the binding as it becomes a book.
 const controlP=phase(anim,8.65,9.2)*(1-phase(anim,11.9,12.6));
 consoleFit.position.set(...s[0]);consoleFit.rotation.set(...s[1]);consoleFit.scale.setScalar(Math.max(.001,controlP));
 consoleFit.visible=controlP>.001;
 const footY=-1.55-consoleFit.position.y;consoleFoot.position.y=footY+.03;consoleStem.position.y=(footY-.6)/2;consoleStem.scale.y=Math.max(.05,(-.6-footY)/.7);
 const press= Math.sin(phase(anim,10.4,11.0)*Math.PI);buttons[0].position.z=.15-press*.06;
 consoleScreen.material.map=anim>=10.9?consoleGood:consoleScreen.userData.initial;
 const bookP=phase(anim,12.0,12.85),parkBook=phase(anim,14.45,15.35);
 book.position.set(mix(.75,1,parkBook),mix(-.03,.05,parkBook),mix(.19,.02,parkBook));
 book.rotation.set(mix(-.1,0,parkBook),mix(-.3,-.15,parkBook),mix(-.05,0,parkBook));book.scale.setScalar(Math.max(.001,bookP*(1-parkBook)));
 book.visible=bookP*(1-parkBook)>.001;
 // Hinge this later book's cover at its spine. Closing, movement and shrink use
 // the body's single transform, so no separate green strip crosses the pages.
 bookCoverAngle=-1.05*phase(anim,13,13.9)*(1-phase(anim,14.05,14.6));
 laterBookCover.visible=book.visible;
 if(anim>=12&&anim<15.35){
  bookCoverPose.position.set(-.48+.48*Math.cos(bookCoverAngle)+.045*Math.sin(bookCoverAngle),0,.06-.48*Math.sin(bookCoverAngle)+.045*Math.cos(bookCoverAngle));
  bookCoverPose.rotation.set(0,bookCoverAngle,0);bookCoverPose.scale.set(1,1.4,1);bookCoverPose.updateMatrix();
  book.updateMatrixWorld(true);
  laterBookCover.matrix.multiplyMatrices(book.matrixWorld,bookCoverPose.matrix);
  laterBookCover.matrix.decompose(laterBookCover.position,laterBookCover.quaternion,laterBookCover.scale);
 }
 const vinylP=phase(anim,12.4,13.2);vinyl.position.set(mix(2.05,s[0][0],parkBook),mix(.0,s[0][1],parkBook)+Math.sin(parkBook*Math.PI)*.4,mix(.05,s[0][2]-.08,parkBook));vinyl.rotation.set(0,mix(-.3,Math.PI*2,parkBook),Math.sin(anim*1.6)*.025);vinyl.scale.setScalar(Math.max(.001,vinylP*(1-parkBook)));
 vinyl.visible=vinylP*(1-parkBook)>.001;
 const codeP=phase(anim,15.0,15.65);code.position.set(...s[0]);code.rotation.set(...s[1]);code.scale.setScalar(Math.max(.001,codeP));codeFace.material.map=anim>=16.6?codeSuccess:codeFace.userData.initial;
 code.visible=codeP>.001;
 if(robot){const rp=track(robotKeys,anim),before=track(robotKeys,Math.max(0,anim-.02));const moving=Math.min(1,Math.hypot(...rp[0].map((v,i)=>(v-before[0][i])*50)));
 const reach=Math.sin(phase(anim,1.3,2.5)*Math.PI)*.75+Math.sin(phase(anim,3.3,4.3)*Math.PI)*.7+Math.sin(phase(anim,6.2,7.7)*Math.PI)*.7+Math.sin(phase(anim,10.2,11.2)*Math.PI)*.85+Math.sin(phase(anim,13,14.6)*Math.PI)*.6+Math.sin(phase(anim,16,16.9)*Math.PI)*.85;
 const crouch=pulse(anim,.7,1.7)*.9+pulse(anim,5.8,6.8)*.85+pulse(anim,9.1,10.15)*.8;
 const jump=pulse(anim,2.05,2.7)*.32+pulse(anim,7.0,7.5)*.38+pulse(anim,9.35,9.95)*.55;
 const surprise=pulse(anim,9.25,10.4),celebrate=pulse(anim,11.05,12.1)*.9+pulse(anim,16.7,17.6);
 const actingTime=embeddedLanding&&!motionPreference.matches?20+(performance.now()-landingStarted)/1000:anim;
 if(embeddedLanding)landingPose=landingBehavior.update(performance.now(),motionPreference.matches);
 robot.update(actingTime,{x:rp[0][0],y:rp[0][1],z:rp[0][2],yaw:rp[1][0],walk:moving,reach,wave:embeddedLanding?0:pulse(anim,18,19.5),lookX:mix(.5,-.3,surprise),lookY:pulse(anim,1.6,2.8)*.3,headTilt:pulse(anim,12.5,13.5)*.3,lean:reach*.07,crouch,jump,surprise,celebrate,push:pulse(anim,7.7,8.6),run:pulse(anim,8.6,9.75),...(embeddedLanding?landingPose:{})});
 // Keep this very same 3D object throughout the move into the landing page.
 robot.root.visible=true;
 const target=anim<5.7?shell.position:anim<8.65?car.position:anim<12?consoleFit.position:anim<15.35?laterBookCover.position:code.position;
 const ray=interactionGeometry.attributes.position;ray.setXYZ(0,rp[0][0]+.42,rp[0][1]+1.4,rp[0][2]+.3);ray.setXYZ(1,target.x,target.y,target.z+.15);ray.needsUpdate=true;interactionGeometry.computeBoundingSphere();interactionRay.material.opacity=reach*.55;}
 ctx.clearRect(0,0,WIDTH,HEIGHT);
 worldPasses=0;
 if(anim<19.08){
  if(robot)robot.root.visible=anim<17.2;
  renderer.shadowMap.autoUpdate=anim<17.2;
  renderer.render(scene,camera);ctx.globalAlpha=1-phase(anim,17.2,19.08);ctx.drawImage(renderer.domElement,0,0,WIDTH,HEIGHT);ctx.globalAlpha=1;
  worldPasses=1;
 }
 if(robot)robot.root.visible=true;
 if(landing){const project=(group,offset=0)=>{const p=group.position.clone();p.y+=offset;p.project(camera);return [(p.x+1)*960,(1-p.y)*540];};landing.draw(ctx,anim,{robot:project(robot.root,1.25),book:project(book),door:project(doors,1),code:project(code),brand:project(shell)});}
 if(robot&&anim>=17.2)landingRobot.draw(robot,anim);
 lastWorldTime=anim;
 document.querySelector('#seek').value=t;document.querySelector('#time').textContent=`00:${String(Math.floor(t)).padStart(2,'0')} / 00:20`;
 const chapter=chapters.find(c=>anim<c.end)||chapters.at(-1);document.querySelectorAll('[data-time]').forEach((b,i)=>b.setAttribute('aria-current',String(i===chapters.indexOf(chapter))));
}
consoleScreen.userData.initial=consoleScreen.material.map;codeFace.userData.initial=codeFace.material.map;
const play=document.querySelector('#play');
function sync(){play.textContent=playing?'Pausar':time>=DURATION?'Repetir':'Reproducir';play.setAttribute('aria-label',playing?'Pausar animación':'Reproducir animación');}
function toggle(){if(!ready)return;if(time>=DURATION)time=0;playing=!playing;last=null;soundtrack.sync(true);sync();}
play.addEventListener('click',toggle);canvas.addEventListener('click',toggle);
document.querySelector('#restart').addEventListener('click',()=>{if(!ready)return;time=0;playing=true;last=null;soundtrack.sync(true);sync();});
const seek=document.querySelector('#seek');seek.addEventListener('input',()=>{playing=false;time=Number(seek.value);soundtrack.sync(true);renderAtTime(time);sync();});
document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>{time=Number(b.dataset.time);playing=false;soundtrack.sync(true);renderAtTime(time);sync();}));
document.querySelector('#reduced').checked=reduced;document.querySelector('#reduced').addEventListener('change',e=>{reduced=e.target.checked;renderAtTime(time);});
document.querySelector('#full').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('#player').requestFullscreen();}catch{document.querySelector('#full').textContent='No disponible';}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;soundtrack.sync();sync();}last=null;});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target===document.body){e.preventDefault();toggle();}});
window.__renderAtTime=t=>{time=clamp(t,0,DURATION);playing=false;reduced=false;soundtrack.sync(true);renderAtTime(time);sync();};
window.__audioDiagnostics=()=>soundtrack.diagnostics();
window.__isRobotReady=()=>ready;
window.__duration=DURATION;
// On-demand checks only: no bounding-box work is added to the animation loop.
window.__propDiagnostics=()=>{
 scene.updateMatrixWorld(true);
 const bounds=group=>{
  const box=new THREE.Box3().setFromObject(group),points=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));
  return {minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y))};
 };
 return {
  time,
  door:{id:shell.uuid,frameId:firstDoor.uuid,frameCount:doors.children.length,visible:shell.visible,framesVisible:doors.visible,scale:shell.scale.toArray(),frameScale:doors.scale.toArray(),localCenter:firstDoor.worldToLocal(shell.position.clone()).toArray(),bounds:bounds(doors),position:doors.position.toArray(),yaw:doors.rotation.y,installed:doorPose(time).installed,mount:DOOR_MOUNT,angle:doorPose(time).angle,leafWorldMaxX:new THREE.Box3().setFromObject(coverPanel).max.x},
  car:{id:car.uuid,visible:car.visible,position:car.position.toArray(),yaw:car.rotation.y,wheelRoll:wheels[0].rotation.z,steering:wheels[2].rotation.y,bounds:bounds(car)},
  book:{id:book.uuid,coverId:laterBookCover.uuid,visible:book.visible,coverVisible:laterBookCover.visible,scale:book.scale.x,coverScale:laterBookCover.scale.toArray(),hingeAngle:bookCoverAngle,coverLocal:book.worldToLocal(laterBookCover.position.clone()).toArray(),bounds:bounds(book)},
 };
};
window.__introProjection=()=>{
 if(!robot)return null;
 const project=point=>{const p=point.clone().project(camera);return[(p.x+1)*WIDTH/2,(1-p.y)*HEIGHT/2];};
 const feet=project(robot.root.position),head=project(robot.root.position.clone().add(new THREE.Vector3(0,2.5,0)));
 return {time,feet,height:Math.abs(feet[1]-head[1])};
};
window.__sceneDiagnostics=()=>({time,duration:DURATION,objects:scene.children.length,robot:robot?.root.position.toArray(),joints:robot?.root.diagnostics,car:car.position.toArray(),props:{doors:doors.scale.x,book:book.scale.x,vinyl:vinyl.scale.x},wall:room.group.children.filter(o=>o.name.startsWith('wall-fragment')).map(o=>o.position.toArray()),shell:shell.position.toArray(),landingReady:!!landing?.ready,room:room.diagnostics(),landingRobot:landingRobot.diagnostics(),camera:camera.position.toArray(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
let warmTimer, warmIdle, warmDisposed=false;
function warmLaterShots(){
 const jobs=[()=>landingRobot.prepare(robot),()=>renderer.compileAsync(car,camera,scene),()=>renderer.compileAsync(consoleFit,camera,scene),()=>renderer.compileAsync(book,camera,scene),()=>renderer.compileAsync(vinyl,camera,scene),()=>renderer.compileAsync(code,camera,scene)];
 const schedule=()=>{
  if(warmDisposed||!jobs.length||document.hidden||!worldActive)return;
  const work=()=>{warmIdle=undefined;if(warmDisposed||document.hidden||!worldActive)return;Promise.resolve().then(jobs.shift()).catch(error=>console.warn('Optional shader warmup failed',error)).finally(()=>{if(!warmDisposed)warmTimer=setTimeout(schedule,120);});};
  if(typeof requestIdleCallback==='function')warmIdle=requestIdleCallback(work,{timeout:500});else warmTimer=setTimeout(work,50);
 };
 // Let the first real frame and the soundtrack start before preparing props
 // that will not enter the story for several more seconds.
 warmTimer=setTimeout(schedule,250);
}
addEventListener('pagehide',()=>{warmDisposed=true;clearTimeout(warmTimer);if(warmIdle!==undefined&&typeof cancelIdleCallback==='function')cancelIdleCallback(warmIdle);});
Promise.all([createRobot(scene),siteIntro?Promise.resolve(null):import('./landing-morph.js').then(module=>module.createLandingMorph()),brandReady,room.ready]).then(([r,l])=>{robot=r;landing=l;ready=true;document.querySelector('#loading').hidden=true;renderAtTime(0);performance.mark('algolab:intro:first-frame');parent.postMessage({type:'algolab:ready',instanceId:robot.root.uuid,rendererId},location.origin);warmLaterShots();}).catch(error=>{document.querySelector('#loading').textContent='No se pudo cargar la escena. Abre la demo desde el servidor local y recarga.';parent.postMessage({type:'algolab:error',message:String(error)},location.origin);console.error(error);});
function loop(now){if(last===null)last=now;const dt=Math.min((now-last)/1000,.1);last=now;if(ready&&embeddedLanding&&embeddedVisible&&!document.hidden&&now-lastLandingFrame>=33){renderAtTime(20);lastLandingFrame=now;}if(ready&&playing){time=soundtrack.time(Math.min(time+dt,DURATION));renderAtTime(time);if(time>=DURATION){playing=false;soundtrack.sync();sync();}}requestAnimationFrame(loop);}requestAnimationFrame(loop);


function embeddedAnchors(){
 const project=(group,offset=0)=>{const p=group.position.clone();p.y+=offset;p.project(camera);return[(p.x+1)/2,(1-p.y)/2];};
 return {robot:project(robot.root,1.25),book:project(book),door:project(doors,1),code:project(code),brand:project(shell)};
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==parent||!event.data)return;
 const data=event.data;
 if(data.type==='algolab:hello'&&ready)parent.postMessage({type:'algolab:ready',instanceId:robot.root.uuid,rendererId},location.origin);
 if(data.target&&[data.target.x,data.target.y,data.target.height].every(Number.isFinite))embeddedTarget=data.target;
 if(data.type==='algolab:render'&&ready){setWorldActive(true);embeddedLanding=false;window.__renderAtTime(Number(data.time)||0);parent.postMessage({type:'algolab:frame',time,anchors:embeddedAnchors(),instanceId:robot.root.uuid,rendererId},location.origin);}
 if(data.type==='algolab:land'&&ready){embeddedLanding=true;landingStarted=performance.now();landingBehavior.reset(landingStarted);window.__renderAtTime(20);setWorldActive(false);}
 if(data.type==='algolab:target'){embeddedVisible=data.visible!==false;if(ready&&embeddedLanding)renderAtTime(20);}
 if(data.type==='algolab:signal'&&embeddedLanding){landingBehavior.react(data.kind,performance.now());reactionKind=landingBehavior.diagnostics().kind;}
 if(data.type==='algolab:pointer'&&embeddedLanding)landingBehavior.point(data);
 if(data.type==='algolab:rotate'&&embeddedLanding){embeddedYaw=clamp(embeddedYaw+clamp(Number(data.delta)||0,-.3,.3),-Math.PI/2.4,Math.PI/2.4);embeddedPitch=clamp(embeddedPitch+clamp(Number(data.pitch)||0,-.2,.2),-.4,.35);}
});
window.addEventListener('resize',()=>{
 portrait=matchMedia('(orientation: portrait)').matches;cameraKeys=portrait?portraitCameraKeys:landscapeCameraKeys;
 const ratio=quality().ratio;
 WIDTH=Math.round(innerWidth*ratio);HEIGHT=Math.round(innerHeight*ratio);canvas.width=WIDTH;canvas.height=HEIGHT;renderer.setSize(WIDTH,HEIGHT,false);fitCamera();if(ready)renderAtTime(time);
});
window.__continuityDiagnostics=()=>({instanceId:robot?.root.uuid,rendererId,landed:embeddedLanding,time,reactionKind,yaw:embeddedYaw,pitch:embeddedPitch,behavior:landingBehavior.diagnostics(),canvasCount:document.querySelectorAll('canvas').length,landing:landingRobot.diagnostics(),performance:{worldPasses,worldActive,pixels:WIDTH*HEIGHT,budget:quality().pixels,shadowSize:initialQuality.shadowSize}});
window.addEventListener('webglcontextlost',()=>parent.postMessage({type:'algolab:error',message:'WebGL context lost'},location.origin),true);
