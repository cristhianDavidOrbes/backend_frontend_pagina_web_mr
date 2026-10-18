import * as THREE from '../assets/vendor/three.module.js';
import { RoundedBoxGeometry } from '../assets/vendor/geometries/RoundedBoxGeometry.js';

// Compact AlgoLab hatchback. The body, cabin and four wheels stay independent
// so the short film can assemble them without swapping the complete vehicle.
export function createCar(scene) {
  const car = new THREE.Group();
  car.name = 'AlgoLab lime hatchback';
  scene.add(car);
  const chassis = new THREE.Group();
  chassis.name = 'Sculpted chassis';
  car.add(chassis);
  const cabin = new THREE.Group();
  cabin.name = 'Cream roof and glazed cabin';
  car.add(cabin);

  const material = (color, metalness = .15, roughness = .32, extras = {}) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extras });
  const paint = material('#a5e638', .34, .24);
  const paintDark = material('#73b71d', .28, .29);
  const cream = material('#fff4d8', .12, .33);
  const rubber = material('#17231f', .02, .78);
  const trim = material('#233b35', .22, .42);
  const glass = material('#183c43', .55, .12);
  const glassHighlight = material('#78bbc4', .45, .22);
  const silver = material('#d1ded6', .7, .22);
  const hubDark = material('#304440', .55, .3);
  const gold = material('#e8c74a', .55, .27);
  const headlight = material('#fff1bd', .18, .22, { emissive: '#ffe5a0', emissiveIntensity: .65 });
  const taillight = material('#ea5445', .2, .25, { emissive: '#c52d1c', emissiveIntensity: .4 });

  function mesh(parent, geometry, mat, xyz = [0, 0, 0]) {
    const item = new THREE.Mesh(geometry, mat);
    item.position.set(...xyz);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  function box(parent, size, xyz, mat, radius = .035) {
    return mesh(parent, new RoundedBoxGeometry(...size, 3, Math.min(radius, ...size.map(v => v / 3))), mat, xyz);
  }
  function cylinder(parent, radius, width, xyz, mat) {
    const item = mesh(parent, new THREE.CylinderGeometry(radius, radius, width, 32), mat, xyz);
    item.rotation.x = Math.PI / 2;
    return item;
  }
  function line(parent, a, b, radius, mat) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const item = mesh(parent, new THREE.CylinderGeometry(radius, radius, delta.length(), 8), mat);
    item.position.copy(start.add(end).multiplyScalar(.5));
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return item;
  }
  function profile(parent, points, width, mat, z = -width / 2, bevel = .025) {
    const shape = new THREE.Shape();
    points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: width, bevelEnabled: bevel > 0, bevelSegments: 2,
      steps: 1, bevelSize: bevel, bevelThickness: bevel,
    });
    return mesh(parent, geometry, mat, [0, 0, z]);
  }
  function quad(parent, points, mat) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    const double = mat.clone();
    double.side = THREE.DoubleSide;
    return mesh(parent, geometry, double);
  }

  // The nose, hood and rear haunches have different silhouettes: this is not a
  // stacked box car. Front points along +X throughout the animation.
  profile(chassis, [
    [-1.23, .35], [-1.21, .62], [-1.05, .76], [-.76, .79],
    [.47, .75], [.99, .67], [1.23, .57], [1.27, .4], [1.11, .29], [-1.08, .29],
  ], 1.08, paint, -.54, .055);
  box(chassis, [2.28, .095, 1.16], [0, .29, 0], trim, .035);
  const hood = box(chassis, [.72, .075, 1.0], [.79, .698, 0], paint, .05);
  hood.rotation.z = -.13;
  box(chassis, [.075, .16, .63], [1.268, .44, 0], trim, .045);
  for (const y of [.405, .45, .495]) box(chassis, [.013, .012, .52], [1.311, y, 0], silver, .004);
  box(chassis, [.09, .055, 1.02], [1.23, .32, 0], silver, .025);
  box(chassis, [.09, .12, 1.12], [-1.225, .385, 0], trim, .035);
  box(chassis, [.02, .08, .25], [-1.277, .425, 0], cream, .008);
  // Small gold nose badge, no lettering.
  const badge = cylinder(chassis, .041, .018, [1.284, .61, 0], gold);
  badge.rotation.z = Math.PI / 2;

  for (const side of [-1, 1]) {
    box(chassis, [.11, .12, .26], [1.198, .59, side * .405], headlight, .045);
    box(chassis, [.065, .17, .18], [-1.222, .59, side * .445], taillight, .025);
    box(chassis, [1.14, .035, .03], [-.015, .41, side * .589], paintDark, .009);
    line(chassis, [-.32, .7, side * .58], [-.32, .42, side * .58], .008, paintDark);
    box(chassis, [.14, .032, .035], [.16, .675, side * .59], silver, .009);
    box(chassis, [.115, .03, .035], [-.72, .68, side * .59], silver, .009);
    for (const x of [-.81, .81]) {
      const arch = mesh(chassis, new THREE.TorusGeometry(.335, .044, 8, 28, Math.PI), trim, [x, .3, side * .568]);
      arch.name = 'Wheel arch';
    }
  }

  // Sloping windshield, tall rear hatch, cream pillars and contrasting roof.
  profile(cabin, [
    [-1.015, .72], [-.79, 1.205], [-.64, 1.29], [.05, 1.29], [.19, 1.23], [.575, .755],
  ], .93, cream, -.465, .045);
  box(cabin, [.85, .065, .98], [-.285, 1.304, 0], cream, .045);
  for (const side of [-1, 1]) {
    const z = side > 0 ? .494 : -.51;
    profile(cabin, [[-.9, .785], [-.704, 1.205], [-.388, 1.225], [-.388, .785]], .016, glass, z, .009);
    profile(cabin, [[-.315, .785], [-.315, 1.225], [.07, 1.225], [.459, .785]], .016, glass, z, .009);
    // One small reflection is enough to sell glass without noisy decals.
    line(cabin, [-.81, .857, side * .522], [-.66, 1.16, side * .522], .014, glassHighlight);
    line(cabin, [.37, .818, side * .49], [.43, .805, side * .624], .025, trim);
    const mirror = box(cabin, [.16, .11, .12], [.43, .815, side * .662], paint, .035);
    mirror.rotation.y = side * -.12;
    box(cabin, [.095, .067, .014], [.424, .818, side * .728], glass, .013);
  }
  // ExtrudeGeometry expands the cabin silhouette by its .045 bevel. Position
  // glazing outside that actual surface, not on the un-bevelled profile edge.
  function slopingWindow(name, top, bottom, normal) {
    const n = new THREE.Vector3(...normal).normalize();
    const point = (t, z, offset) => [
      top[0] + (bottom[0] - top[0]) * t + n.x * offset,
      top[1] + (bottom[1] - top[1]) * t + n.y * offset,
      z,
    ];
    quad(cabin, [point(.035, -.429, .054), point(.035, .429, .054), point(.965, .455, .054), point(.965, -.455, .054)], trim);
    const window = quad(cabin, [point(.075, -.405, .059), point(.075, .405, .059), point(.925, .431, .059), point(.925, -.431, .059)], glass);
    window.name = name;
    window.userData.surfaceNormal = n.toArray();
    window.userData.surfaceCenter = point(.5, 0, .059);
    line(cabin, point(.19, -.32, .064), point(.71, -.32, .064), .009, glassHighlight);
    return window;
  }
  slopingWindow('Front windshield glass', [.19, 1.23], [.575, .755], [.475, .385, 0]);
  slopingWindow('Rear hatch glass', [-.79, 1.205], [-1.015, .72], [-.485, .225, 0]);
  box(cabin, [.2, .055, 1.01], [-.79, 1.238, 0], cream, .024);

  const wheels = [];
  for (const x of [-.81, .81]) {
    for (const z of [-.61, .61]) {
      const axle = new THREE.Group();
      axle.name = `Wheel ${x < 0 ? 'rear' : 'front'} ${z < 0 ? 'left' : 'right'}`;
      axle.userData.target = [x, .3, z];
      axle.position.set(...axle.userData.target);
      car.add(axle);
      cylinder(axle, .3, .205, [0, 0, 0], rubber);
      cylinder(axle, .222, .217, [0, 0, 0], hubDark);
      for (const face of [-1, 1]) {
        const depth = face * .118;
        mesh(axle, new THREE.TorusGeometry(.199, .018, 8, 28), silver, [0, 0, depth]);
        for (let i = 0; i < 5; i++) {
          const angle = i * Math.PI * 2 / 5;
          const spoke = box(axle, [.055, .152, .018], [Math.sin(angle) * .105, Math.cos(angle) * .105, depth], silver, .012);
          spoke.rotation.z = -angle;
        }
        cylinder(axle, .064, .018, [0, 0, face * .133], gold);
      }
      wheels.push(axle);
    }
  }
  car.userData.frontAxis = '+X';
  return { car, chassis, cabin, wheels };
}
