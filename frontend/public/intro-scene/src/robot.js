import * as THREE from '../assets/vendor/three.module.js';
import { GLTFLoader } from '../assets/vendor/loaders/GLTFLoader.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = value => value * value * (3 - 2 * value);

/** Load the actual AlgoLab mascot and animate a reversible, local copy of its geometry. */
export async function createRobot(scene) {
  const gltf = await new GLTFLoader().loadAsync(new URL('../assets/algolab-robot-demo.glb', import.meta.url).href);
  const root = new THREE.Group();
  root.name = 'AlgoLab protagonist';
  root.position.y = -1.55;
  const body = new THREE.Group();
  const original = gltf.scene;
  original.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(original);
  const scale = 2.5 / (bounds.max.y - bounds.min.y);
  body.scale.setScalar(scale);
  body.position.y = -bounds.min.y * scale;
  root.add(body);

  const joints = [];
  const glowMaterials = [];
  const meshes = [];
  original.traverse(object => { if (object.isMesh) meshes.push(object); });
  const jointData = [
    { key: 'brazo.l', upper: [0.877, 0.63, 0.025], lower: [0.877, 0.08, 0.025], high: 0.20, low: -0.04, type: 'armL' },
    { key: 'brazo.r', upper: [-0.877, 0.63, 0.025], lower: [-0.877, 0.08, 0.025], high: 0.20, low: -0.04, type: 'armR' },
    { key: 'pierna.l', upper: [0.44, -1.15, -0.04], lower: [0.44, -1.68, -0.04], high: -1.55, low: -1.80, type: 'legL' },
    { key: 'pierna.r', upper: [-0.44, -1.15, -0.04], lower: [-0.44, -1.68, -0.04], high: -1.55, low: -1.80, type: 'legR' },
    { key: 'cabeza', upper: [0, 1.02, 0], lower: null, type: 'head' },
  ];
  for (const source of meshes) {
    const geometry = source.geometry.clone().applyMatrix4(source.matrixWorld);
    const material = source.material.clone();
    material.roughness = 0.46;
    material.metalness = 0.12;
    if (material.emissive) glowMaterials.push({ material, color: material.emissive.clone(), intensity: material.emissiveIntensity });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = source.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Articulated vertices extend beyond the static GLB bounds.
    mesh.frustumCulled = false;
    body.add(mesh);
    const name = source.name.toLowerCase().replaceAll('_', '.');
    const data = jointData.find(joint => name.startsWith(joint.key) || name.replaceAll('.', '').startsWith(joint.key.replaceAll('.', '')));
    if (data) {
      geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
      geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
      joints.push({ ...data, geometry, positions: geometry.attributes.position.array.slice(), normals: geometry.attributes.normal.array.slice() });
    }
  }
  root.userData.diagnostics = {
    meshes: meshes.length,
    articulatedParts: joints.length,
    joints: joints.map(joint => joint.type),
    originalAsset: true,
    height: 2.5,
    controls: ['walk', 'reach', 'wave', 'lookX', 'lean', 'crouch', 'jump', 'surprise', 'lookY', 'headTilt', 'celebrate', 'push', 'run'],
  };
  root.diagnostics = root.userData.diagnostics;
  scene.add(root);

  const upperQ = new THREE.Quaternion();
  const upperEuler = new THREE.Euler();
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const glowColor = new THREE.Color();
  function articulate(joint, rx, ry, rz, bend = 0) {
    upperQ.setFromEuler(upperEuler.set(rx, ry, rz, 'XYZ'));
    const target = joint.geometry.attributes.position.array;
    const normals = joint.geometry.attributes.normal.array;
    const upper = joint.upper;
    for (let offset = 0; offset < target.length; offset += 3) {
      point.fromArray(joint.positions, offset);
      normal.fromArray(joint.normals, offset);
      if (joint.lower && bend) {
        const weight = smooth(clamp((joint.high - point.y) / (joint.high - joint.low), 0, 1));
        const angle = bend * weight;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const y = point.y - joint.lower[1];
        const z = point.z - joint.lower[2];
        point.y = joint.lower[1] + y * cosine - z * sine;
        point.z = joint.lower[2] + y * sine + z * cosine;
        const ny = normal.y;
        normal.y = ny * cosine - normal.z * sine;
        normal.z = ny * sine + normal.z * cosine;
      }
      point.x -= upper[0]; point.y -= upper[1]; point.z -= upper[2];
      point.applyQuaternion(upperQ);
      point.x += upper[0]; point.y += upper[1]; point.z += upper[2];
      normal.applyQuaternion(upperQ);
      point.toArray(target, offset);
      normal.toArray(normals, offset);
    }
    joint.geometry.attributes.position.needsUpdate = true;
    joint.geometry.attributes.normal.needsUpdate = true;
  }

  function update(t = 0, pose = {}) {
    if (pose.glow > .001) glowColor.set(pose.glowColor || '#38d6a2');
    if (pose.glow !== undefined) for (const entry of glowMaterials) {
      entry.material.emissive.copy(entry.color);
      if (pose.glow > .001) entry.material.emissive.lerp(glowColor, pose.glow);
      entry.material.emissiveIntensity = pose.shutdown ? 0 : entry.intensity + pose.glow;
    }
    const run = clamp(pose.run || 0, 0, 1);
    const walking = clamp(Math.max(pose.walk || 0, run), 0, 1);
    const reach = clamp(pose.reach || 0, 0, 1);
    const wave = clamp(pose.wave || 0, 0, 1);
    const crouch = clamp(pose.crouch || 0, 0, 1);
    const surprise = clamp(pose.surprise || 0, 0, 1);
    const celebrate = clamp(pose.celebrate || 0, 0, 1);
    const push = clamp(pose.push || 0, 0, 1);
    // jump is a physical height, while the acting controls are animation weights.
    const jump = clamp(pose.jump || 0, 0, 2.5);
    const cycle = Math.sin(t * 7.6) * (1 - run) + Math.sin(t * 12.6) * run;
    const stride = cycle * walking * (1 - crouch * 0.7);
    const bounce = Math.abs(cycle) * (0.035 + run * 0.045) * walking;
    const cheering = Math.abs(Math.sin(t * 8.5)) * 0.075 * celebrate;
    const kneeAngle = crouch * 0.82;
    // Shortening the projected leg length matches the body drop, keeping the
    // soles planted through the anticipation pose without scaling the mascot.
    body.position.y = -bounds.min.y * scale - 1.115 * (1 - Math.cos(kneeAngle)) * scale;
    body.position.z = 0.055 * Math.sin(kneeAngle) * scale;
    root.position.set(pose.x ?? 0, (pose.y ?? -1.55) + jump + bounce + cheering, pose.z ?? 0);
    root.rotation.set((pose.lean || 0) + push * 0.1 + run * 0.07 - surprise * 0.055, pose.yaw || 0, cycle * walking * 0.023 + Math.sin(t * 4.7) * celebrate * 0.045);
    for (const joint of joints) {
      switch (joint.type) {
        case 'head':
          articulate(joint,
            clamp(pose.headPitch ?? (-(pose.lookY || 0) - surprise * 0.16 - celebrate * 0.08 - 0.05 * reach + push * 0.05 + Math.sin(t * 1.9) * 0.018), -0.7, 0.7),
            clamp(pose.lookX || 0, -0.95, 0.95),
            clamp((pose.headTilt || 0) + (pose.headPitch === undefined ? Math.sin(t * 1.3) * 0.018 : 0) + Math.sin(t * 6) * celebrate * 0.08, -0.65, 0.65));
          break;
        case 'armL':
          articulate(joint,
            stride * (0.35 + run * 0.28) - reach * 0.7 - push * 1.2 - surprise * 0.22,
            -reach * 0.12,
            clamp(pose.armL ?? (0.05 + wave * 1.75 + Math.sin(t * 10) * wave * 0.16 + surprise * 2.3 + celebrate * (2.15 + Math.sin(t * 7) * 0.18)), -2.7, 2.7),
            -clamp(0.18 + reach * 0.75 + wave * 0.7 + surprise * 0.85 + celebrate * 0.35 + run * 0.65 + push * 0.22, 0, 1.8));
          break;
        case 'armR':
          articulate(joint,
            -stride * (0.35 + run * 0.28) - reach * 1.02 - push * 1.25 - surprise * 0.22,
            reach * 0.22,
            clamp(pose.armR ?? (-0.05 - reach * 0.34 - surprise * 2.3 - celebrate * (2.15 - Math.sin(t * 7) * 0.18)), -2.7, 2.7),
            -clamp(0.12 + reach * 0.5 + surprise * 0.85 + celebrate * 0.35 + run * 0.65 + push * 0.22, 0, 1.8));
          break;
        case 'legL':
          articulate(joint, -stride * (0.32 + run * 0.22) - kneeAngle, 0, 0, kneeAngle * 2 + Math.max(0, -cycle) * walking * (0.43 + run * 0.4));
          break;
        case 'legR':
          articulate(joint, stride * (0.32 + run * 0.22) - kneeAngle, 0, 0, kneeAngle * 2 + Math.max(0, cycle) * walking * (0.43 + run * 0.4));
          break;
      }
    }
  }
  update();
  return { root, update };
}
