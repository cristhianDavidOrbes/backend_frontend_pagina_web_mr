import * as THREE from '../assets/vendor/three.module.js';

/** The exact protagonist and renderer survive the end of the film. */
export function createLandingRobotPass(renderer,scene,camera,context,options){
 const smooth=value=>{const x=Math.max(0,Math.min(1,value));return x*x*(3-2*x);};
 let diagnostics={active:false,sameInstance:true};
 scene.traverse(object=>{if(object.isLight)object.layers.enable(1);});
 function draw(robot,time){
  const [width,height]=options.viewport();
  const project=point=>{const p=point.clone().project(camera);return[(p.x+1)*width/2,(1-p.y)*height/2,p.z];};
  const root=robot.root;root.traverse(object=>object.layers.enable(1));
  const position=root.position.clone(),rotation=root.rotation.clone(),scale=root.scale.clone();
  const background=scene.background,fog=scene.fog,mask=camera.layers.mask,shadows=renderer.shadowMap.enabled;
  const clearColor=renderer.getClearColor(new THREE.Color()),clearAlpha=renderer.getClearAlpha();
  const feet=project(position),head=project(position.clone().add(new THREE.Vector3(0,2.5,0)));
  const p=smooth((time-17.2)/2.2),target=options.target();
  const x=THREE.MathUtils.lerp(feet[0],target.x,p),y=THREE.MathUtils.lerp(feet[1],target.y,p)-Math.sin(Math.PI*p)*38*height/1080-(options.lift?.()||0)*target.height/2.5*p;
  const targetHeight=THREE.MathUtils.lerp(Math.abs(feet[1]-head[1]),target.height,p);
  const anchor=new THREE.Vector3(x/width*2-1,1-y/height*2,feet[2]).unproject(camera);
  root.position.copy(anchor);
  root.rotation.x+=(options.pitch?.()||0)*p;
  root.rotation.y=THREE.MathUtils.lerp(rotation.y,Math.atan2(camera.position.x-anchor.x,camera.position.z-anchor.z),p)+options.yaw()*p;
  for(let iteration=0;iteration<2;iteration++){
   const projectedFeet=project(anchor),projectedHead=project(anchor.clone().add(new THREE.Vector3(0,2.5*root.scale.y,0)));
   root.scale.multiplyScalar(targetHeight/Math.max(1,Math.abs(projectedFeet[1]-projectedHead[1])));
  }
  root.updateMatrixWorld(true);
  context.save();context.globalAlpha=p*.22;context.fillStyle='#000';context.beginPath();context.ellipse(x,y+targetHeight*.021,targetHeight*.23,targetHeight*.027,0,0,Math.PI*2);context.fill();context.restore();
  try{
   scene.background=null;scene.fog=null;camera.layers.set(1);renderer.shadowMap.enabled=false;renderer.setClearColor(0x000000,0);renderer.render(scene,camera);context.drawImage(renderer.domElement,0,0,width,height);
   diagnostics={active:true,sameInstance:true,instanceId:root.uuid,progress:p,feet:[x/width,y/height],height:targetHeight/height};
  }finally{
   root.position.copy(position);root.rotation.copy(rotation);root.scale.copy(scale);root.updateMatrixWorld(true);scene.background=background;scene.fog=fog;camera.layers.mask=mask;renderer.shadowMap.enabled=shadows;renderer.setClearColor(clearColor,clearAlpha);
  }
 }
 return{draw,diagnostics:()=>diagnostics};
}
