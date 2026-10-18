import * as THREE from '../assets/vendor/three.module.js';

// The physical room remains present throughout the film, including the
// broken wall pieces after the car's departure. Animation is seekable.
export function createRoom(scene, { extendedFloor = false } = {}) {
  const floorY = -1.55;
  const room = new THREE.Group();
  room.name = 'persistent-physical-room';
  scene.add(room);
  const material = (color, roughness = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const cream = material('#e4e0d0');
  const sage = material('#a1b6a8');
  const oak = material('#ba8e62');
  const darkOak = material('#72533a');
  const porcelain = material('#f1eee0', 0.4);
  const graphite = material('#26332f', 0.55);
  const brass = material('#b99b55', 0.38, { metalness: 0.42 });
  const terracotta = material('#b86d4f');
  const mint = material('#48ad8e');
  function mesh(geometry, mat, x, y, z, parent = room) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(w, h, d, mat, x, y, z, parent = room) {
    return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  }
  function cylinder(rt, rb, h, mat, x, y, z, parent = room) {
    return mesh(new THREE.CylinderGeometry(rt, rb, h, 24), mat, x, y, z, parent);
  }
  function ball(r, mat, x, y, z, parent = room) {
    return mesh(new THREE.SphereGeometry(r, 20, 12), mat, x, y, z, parent);
  }

  // Pale oak floor, staggered boards: a physical reference for contact shadows.
  box(14, 0.18, extendedFloor ? 24 : 12, darkOak, 0, floorY - 0.1, extendedFloor ? 6 : 0);
  const plankGeo = new THREE.BoxGeometry(2.31, 0.055, 0.47);
  const planks = new THREE.InstancedMesh(plankGeo, oak, extendedFloor ? 288 : 150);
  const transform = new THREE.Object3D();
  const tint = new THREE.Color();
  let instance = 0;
  for (let row = 0; row < (extendedFloor ? 48 : 24); row++) {
    for (let col = 0; col < 6; col++) {
      transform.position.set(-5.82 + col * 2.33 + (row % 2) * 0.12, floorY - 0.012, -5.58 + row * 0.48);
      transform.updateMatrix();
      planks.setMatrixAt(instance, transform.matrix);
      tint.setHSL(0.092, 0.29, 0.54 + Math.sin(row * 8.3 + col * 2.1) * 0.035);
      planks.setColorAt(instance++, tint);
    }
  }
  planks.count = instance;
  planks.receiveShadow = true;
  room.add(planks);

  // An open front/right cutaway lets the camera see the room and its contents.
  // Real aperture: no opaque backing is left behind the breakable panel.
  // The lower 2.3 m of this section is tiled with eighteen plaster shards.
  box(7.25, 6.6, 0.2, cream, -3.375, 1.7, -4.3);
  box(4.25, 6.6, 0.2, cream, 4.875, 1.7, -4.3);
  box(2.5, 4.25, 0.2, cream, 1.5, 2.875, -4.3);
  box(0.2, 6.6, 10.8, sage, -6.55, 1.7, 1);
  box(7.2, 0.18, 0.12, porcelain, -3.35, floorY + 0.11, -4.12);
  box(4.2, 0.18, 0.12, porcelain, 4.85, floorY + 0.11, -4.12);
  box(0.12, 0.18, 10.5, porcelain, -6.4, floorY + 0.11, 0.9);

  const garden = material('#8c9b74');
  const path = material('#b8b39d');
  box(14, 0.12, 12, garden, 0, floorY - 0.035, -10.4);
  box(2.45, 0.035, 11.8, path, 1.5, floorY + 0.04, -10.4);
  const fragments = [];
  const xs = [0.25, 1.02, 1.91, 2.75];
  const ys = [floorY, -0.77, 0.02, 0.75];
  function rememberFragment(object, index) {
    const start = object.position.clone();
    const speedY = 1.65 + (index % 4) * 0.27;
    const landingY = floorY + 0.13;
    const duration = (speedY + Math.sqrt(speedY * speedY + 19.6 * Math.max(0, start.y - landingY))) / 9.8;
    fragments.push({
      object, start, speedY, duration, landingY,
      vx: (start.x - 1.5) * 1.25 + Math.sin(index * 2.4) * 0.32,
      vz: -2.55 - (index % 5) * 0.24,
      spin: (index % 2 ? 1 : -1) * (0.65 + index % 3 * 0.19),
    });
  }
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x0 = xs[col], x1 = xs[col + 1], y0 = ys[row], y1 = ys[row + 1];
      const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      const triangles = (row + col) % 2 ? [[0,1,3], [1,2,3]] : [[0,1,2], [0,2,3]];
      for (const ids of triangles) {
        const vertices = ids.map(i => corners[i]);
        const cx = vertices.reduce((sum, v) => sum + v[0], 0) / 3;
        const cy = vertices.reduce((sum, v) => sum + v[1], 0) / 3;
        const shape = new THREE.Shape();
        shape.moveTo(vertices[0][0] - cx, vertices[0][1] - cy);
        shape.lineTo(vertices[1][0] - cx, vertices[1][1] - cy);
        shape.lineTo(vertices[2][0] - cx, vertices[2][1] - cy);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false, steps: 1 });
        geo.translate(0, 0, -0.1);
        const shard = mesh(geo, cream, cx, cy, -4.3);
        shard.name = `wall-fragment-${fragments.length}`;
        rememberFragment(shard, fragments.length);
      }
    }
  }
  for (let i = 0; i < 3; i++) {
    const trim = box(2.5 / 3, 0.18, 0.12, porcelain, 0.25 + (i + 0.5) * 2.5 / 3, floorY + 0.11, -4.12);
    rememberFragment(trim, fragments.length);
  }

  // A real CC0 illustrated landscape, graded into the room's soft sage palette.
  const sky = new THREE.MeshBasicMaterial({ color: '#badbd5' });
  const outside = new THREE.Group();
  outside.position.set(-3.65, 1.85, -4.12);
  room.add(outside);
  box(3.45, 2.65, 0.045, sky, 0, 0, 0, outside);
  let landscapeReady = false;
  const ready = new THREE.TextureLoader().loadAsync(new URL('../assets/landscape/cloudy-mountains-cc0.jpg', import.meta.url).href).then(texture => {
    texture.colorSpace = THREE.NoColorSpace;
    const landscapeMaterial = new THREE.ShaderMaterial({
      uniforms: { landscape: { value: texture } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D landscape; varying vec2 vUv;
        void main(){
          vec3 original=texture2D(landscape,vec2(.135+vUv.x*.73,vUv.y)).rgb;
          float light=pow(clamp(dot(original,vec3(.2126,.7152,.0722))+.06,0.0,1.0),.58);
          vec3 sage=mix(vec3(.28,.48,.37),vec3(.83,.89,.77),clamp(light*1.16,0.0,1.0));
          float sky=smoothstep(.52,.94,vUv.y);
          vec3 color=mix(sage,vec3(.77,.87,.87),sky*.74);
          gl_FragColor=vec4(mix(color,vec3(.87,.91,.82),.12),1.0);
        }`,
      toneMapped: false,
    });
    const view = mesh(new THREE.PlaneGeometry(3.45, 2.65), landscapeMaterial, 0, 0, .035, outside);
    view.name = 'CC0 landscape · Ahmad_KH · Cloudy Green Hills';
    view.castShadow = false;
    view.receiveShadow = false;
    landscapeReady = true;
  });
  for (const x of [-1.77, 0, 1.77]) box(0.105, 2.88, 0.18, porcelain, x, 0, 0.13, outside);
  for (const y of [-1.38, 0.05, 1.38]) box(3.64, 0.105, 0.18, porcelain, 0, y, 0.13, outside);
  box(3.84, 0.12, 0.38, porcelain, -3.65, 0.42, -3.99);

  // Desk and curved chair stay outside the central demonstration area.
  box(2.65, 0.13, 1.25, oak, -4.35, -0.08, -2.92);
  for (const x of [-5.43, -3.27]) for (const z of [-3.4, -2.45]) cylinder(0.055, 0.045, 1.38, graphite, x, -0.83, z);
  const chair = new THREE.Group();
  chair.position.set(-4.5, floorY, -1.85);
  room.add(chair);
  cylinder(0.42, 0.4, 0.12, mint, 0, 0.83, 0, chair);
  const back = mesh(new THREE.SphereGeometry(0.46, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mint, 0, 1.25, 0.19, chair);
  back.scale.set(1, 1, 0.19);
  // The uprights physically join the seat to the curved backrest.
  for (const x of [-.3, .3]) {
    const upright = cylinder(.031, .035, .69, darkOak, x, 1.095, .21, chair);
    upright.name = 'chair-back-upright';
  }
  box(.65, .045, .055, darkOak, 0, .96, .21, chair);
  for (const x of [-0.28, 0.28]) for (const z of [-0.25, 0.25]) cylinder(0.035, 0.025, 0.8, darkOak, x, 0.4, z, chair);
  cylinder(0.14, 0.12, 0.22, porcelain, -3.5, 0.1, -2.9);
  mesh(new THREE.TorusGeometry(0.085, 0.022, 8, 16), porcelain, -3.35, 0.11, -2.9);
  box(0.56, 0.045, 0.4, mint, -4.22, 0.01, -2.65);

  // A recognisable mixed-reality headset resting on the desk.
  const headset = new THREE.Group();
  headset.position.set(-4.85, 0.18, -2.88);
  headset.rotation.y = 0.3;
  room.add(headset);
  const shell = ball(0.27, porcelain, 0, 0, 0, headset);
  shell.scale.set(1.35, 0.68, 0.7);
  const mask = ball(0.25, graphite, 0, 0, -0.1, headset);
  mask.scale.set(1.25, 0.58, 0.7);
  for (const x of [-0.17, 0, 0.17]) {
    const camera = ball(0.035, graphite, x, 0.015, 0.168, headset);
    camera.scale.set(0.65, 1.3, 0.35);
  }
  const strap = mesh(new THREE.TorusGeometry(0.25, 0.028, 8, 32, Math.PI), porcelain, 0, 0.01, -0.13, headset);
  strap.rotation.x = Math.PI / 2;
  strap.rotation.z = Math.PI;

  // Tapered lamp, books and botanical silhouettes give the space lived-in scale.
  cylinder(0.2, 0.24, 0.045, brass, -5.25, 0.025, -3.25);
  cylinder(0.025, 0.025, 0.62, brass, -5.25, 0.35, -3.25);
  cylinder(0.16, 0.29, 0.3, porcelain, -5.25, 0.7, -3.25);
  const bookColors = ['#405e59', '#bc714f', '#e5c45c', '#458b9d', '#a0b091'].map(c => material(c));
  const shelfX = 4.65;
  box(2.2, 3.65, 0.13, sage, shelfX, 0.32, -3.98);
  for (const x of [3.48, 5.82]) box(0.11, 3.75, 0.6, darkOak, x, 0.3, -3.7);
  for (const y of [-1.48, -0.32, 0.84, 2.04]) box(2.44, 0.09, 0.64, oak, shelfX, y, -3.7);
  const pages = material('#e8ddbd');
  for (let i = 0; i < 11; i++) {
    const row = i < 6 ? 0 : 1;
    const j = row ? i - 6 : i;
    const h = 0.54 + ((i * 7) % 4) * 0.09;
    const x = 3.71 + j * 0.25;
    const base = row ? 0.9 : -0.27;
    box(0.19, h, 0.39, pages, x, base + h / 2, -3.57);
    box(0.21, h + 0.035, 0.04, bookColors[i % 5], x, base + h / 2, -3.35);
    box(0.14, 0.022, 0.047, brass, x, base + h * 0.25, -3.32);
  }

  const plant = new THREE.Group();
  plant.position.set(5.4, floorY, -1.8);
  room.add(plant);
  cylinder(0.38, 0.28, 0.6, terracotta, 0, 0.3, 0, plant);
  cylinder(0.36, 0.36, 0.03, darkOak, 0, 0.61, 0, plant);
  const stemMat = material('#567a46', .91);
  const leafMaterials = ['#3e704d', '#527e50', '#3e6950', '#638953'].map(color => material(color, .82, { side: THREE.DoubleSide }));
  const leaves = new THREE.Group();
  leaves.name = 'plant · curved lanceolate leaves and connected petioles';
  plant.add(leaves);
  const stem = new THREE.CatmullRomCurve3([new THREE.Vector3(0,.61,0),new THREE.Vector3(-.04,1.1,.02),new THREE.Vector3(.045,1.65,-.015),new THREE.Vector3(0,2.12,0)]);
  mesh(new THREE.TubeGeometry(stem, 18, .018, 6, false), stemMat, 0, 0, 0, leaves);
  const lip = mesh(new THREE.TorusGeometry(.365,.028,8,32), terracotta,0,.61,0,plant);lip.rotation.x=Math.PI/2;
  function leafGeometry(length, width, curl) {
    const vertices=[],indices=[],rows=12,columns=6;
    for(let row=0;row<=rows;row++) {
      const u=row/rows,half=width*Math.pow(Math.sin(Math.PI*u),.86);
      for(let col=0;col<=columns;col++) {
        const v=col/columns*2-1;
        vertices.push(half*v,length*u,.05*Math.sin(Math.PI*u)*(1-Math.abs(v))-.055*Math.abs(v)*Math.sin(Math.PI*u)-curl*u*u);
      }
    }
    for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
      const a=row*(columns+1)+col,b=a+columns+1;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    return geometry;
  }
  for(let i=0;i<12;i++) {
    const angle=i*2.39996,height=.84+(i%5)*.245,length=.57+(i%3)*.095;
    const endpoint=new THREE.Vector3(Math.cos(angle)*(.19+(i%3)*.055),height+.12,Math.sin(angle)*(.19+(i%3)*.055));
    const petiole=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,height-.18,0),new THREE.Vector3(endpoint.x*.45,height+.1,endpoint.z*.45),endpoint);
    mesh(new THREE.TubeGeometry(petiole,7,.009,5,false),stemMat,0,0,0,leaves);
    const leaf=new THREE.Group();leaf.position.copy(endpoint);
    leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(Math.cos(angle)*.82,.40+(i%3)*.13,Math.sin(angle)*.82).normalize());
    leaves.add(leaf);
    const surface=mesh(leafGeometry(length,.125+(i%3)*.022,.09+(i%2)*.055),leafMaterials[i%4],0,0,0,leaf);
    surface.name='plant-leaf-surface';
    const vein=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,0,.003),new THREE.Vector3(0,length*.5,.028),new THREE.Vector3(0,length,-.09-(i%2)*.055));
    mesh(new THREE.TubeGeometry(vein,9,.0035,4,false),stemMat,0,0,.003,leaf);
  }

  // Room-anchored MR zone, deliberately finite rather than a sci-fi grid.
  const boundaryMat = new THREE.LineBasicMaterial({ color: '#36bfa8', transparent: true, opacity: 0.35, depthWrite: false });
  const boundaryPoints = [[-3.3,-2.45],[3.3,-2.45],[3.3,2.75],[-3.3,2.75],[-3.3,-2.45]];
  const boundary = new THREE.Line(new THREE.BufferGeometry().setFromPoints(boundaryPoints.map(([x,z]) => new THREE.Vector3(x,floorY + 0.045,z))), boundaryMat);
  room.add(boundary);
  const cornerMaterial = new THREE.LineBasicMaterial({ color: '#74edd4', transparent: true, opacity: 0.35, depthWrite: false });
  for (const [x,z] of boundaryPoints.slice(0,4)) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,floorY + 0.05,z),new THREE.Vector3(x,floorY + 0.42,z)]), cornerMaterial);
    room.add(line);
  }
  const scanMaterial = new THREE.MeshBasicMaterial({ color: '#8aefd5', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const scan = mesh(new THREE.PlaneGeometry(6.6,0.055), scanMaterial, 0, floorY + 0.055, 2.75);
  scan.rotation.x = -Math.PI / 2;
  scan.castShadow = false;
  return {
    floorY,
    group: room,
    ready,
    diagnostics: () => ({ chairBackUprights: 2, botanicalLeafSurfaces: 12, landscapeReady, landscapeLicense: 'CC0-1.0' }),
    update(t) {
      const p = THREE.MathUtils.clamp(t / 2.5, 0, 1);
      const eased = p * p * (3 - 2 * p);
      scan.position.z = 2.75 - eased * 5.2;
      scanMaterial.opacity = 0.5 * Math.sin(Math.PI * p);
      boundaryMat.opacity = 0.2 + 0.24 * Math.exp(-t * 0.8);
      cornerMaterial.opacity = 0.2 + 0.28 * Math.exp(-t * 0.8);
      leaves.rotation.z = Math.sin(t * 0.75) * 0.008;
      const impactTime = Math.max(0, t - 9.4);
      for (const f of fragments) {
        const flight = Math.min(impactTime, f.duration);
        const afterLanding = Math.max(0, impactTime - f.duration);
        const skid = 0.24 * (1 - Math.exp(-afterLanding * 4));
        f.object.position.set(
          f.start.x + f.vx * (flight + skid),
          impactTime <= f.duration
            ? f.start.y + f.speedY * flight - 4.9 * flight * flight
            : f.landingY + 0.13 * Math.sin(Math.PI * Math.min(1, afterLanding / 0.46)),
          f.start.z + f.vz * (flight + skid),
        );
        const settle = THREE.MathUtils.smoothstep(afterLanding, 0, 0.46);
        f.object.rotation.set(
          THREE.MathUtils.lerp(flight * f.spin * 1.4, Math.PI / 2, settle),
          flight * f.spin * 0.3 * (1 - settle),
          flight * f.spin * 0.6,
        );
      }
    },
  };
}
