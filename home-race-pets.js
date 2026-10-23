import * as THREE from './assets/race/three.module.min.js';

// Web-only articulated interpretations of the approved Sill character references.
// Local forward is -Z. The race owns position, heading, time and look target.
const geometryPool = new Map();
const materialPool = new Map();
const rigs = new Set();
const forward = new THREE.Vector3(0, 0, -1);
const gaze = new THREE.Vector3();
const direction = new THREE.Vector3();
const clamp = THREE.MathUtils.clamp;

function geometry(kind) {
  if (!geometryPool.has(kind)) {
    const value = kind === 'box' ? new THREE.BoxGeometry(1, 1, 1)
      : kind === 'ring' ? new THREE.TorusGeometry(1, .075, 6, 28)
      : kind === 'cone' ? new THREE.ConeGeometry(1, 1, 7)
      : new THREE.SphereGeometry(1, 20, 14);
    geometryPool.set(kind, value);
  }
  return geometryPool.get(kind);
}

function material(color, finish = 'soft') {
  const key = color + finish;
  if (!materialPool.has(key)) {
    materialPool.set(key, new THREE.MeshStandardMaterial({
      color, roughness: finish === 'glass' ? .2 : .58,
      metalness: finish === 'glass' ? .2 : .02,
      emissive: finish === 'glass' ? color : '#000000',
      emissiveIntensity: finish === 'glass' ? .15 : 0,
    }));
  }
  return materialPool.get(key);
}

function part(parent, color, position, scale, kind = 'sphere', finish = 'soft') {
  const mesh = new THREE.Mesh(geometry(kind), material(color, finish));
  mesh.position.set(...position);mesh.scale.set(...scale);parent.add(mesh);
  return mesh;
}

function joint(parent, position) {
  const group = new THREE.Group();group.position.set(...position);parent.add(group);
  return group;
}

// Bake rigid details together inside each joint, retaining independent limbs/eyes.
function batchJoint(group) {
  const groups = new Map();
  for (const mesh of [...group.children]) {
    if (!mesh.isMesh) continue;
    mesh.updateMatrix();
    const source = mesh.geometry.clone().applyMatrix4(mesh.matrix);
    const plain = source.index ? source.toNonIndexed() : source;
    if (plain !== source) source.dispose();
    if (!groups.has(mesh.material)) groups.set(mesh.material, []);
    groups.get(mesh.material).push(plain);group.remove(mesh);
  }
  for (const [mat, parts] of groups) {
    const count = parts.reduce((sum, g) => sum + g.attributes.position.count, 0);
    const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3);
    let offset = 0;
    for (const g of parts) {
      positions.set(g.attributes.position.array, offset);normals.set(g.attributes.normal.array, offset);
      offset += g.attributes.position.array.length;g.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.computeBoundingSphere();group.add(new THREE.Mesh(merged, mat));
  }
}

function eye(parent, x, y, z, glasses = false) {
  const group = joint(parent, [x, y, z]);
  part(group, '#fff3dd', [0, 0, 0], [.205, .25, .17]);
  const pupil = joint(group, [0, 0, 0]);
  part(pupil, '#122133', [0, 0, -.161], [.093, .143, .045]);
  part(pupil, '#ffffff', [-.026, .055, -.202], [.034, .043, .019]);
  if (glasses) part(parent, '#19253d', [x, y, z - .01], [.247, .286, .247], 'ring');
  batchJoint(pupil);
  return {group, pupil};
}

function leg(parent, x, color, pawColor, z = 0) {
  const group = joint(parent, [x, .56, z]);
  part(group, color, [0, -.15, 0], [.2, .32, .22]);
  part(group, color, [0, -.37, -.11], [.255, .17, .34]);
  if (pawColor) {
    part(group, pawColor, [0, -.41, -.385], [.10, .07, .024]);
    for (const dx of [-.085, .085]) part(group, pawColor, [dx, -.32, -.365], [.036, .041, .019]);
  }
  batchJoint(group);return group;
}

function arm(parent, x, y, color) {
  const group = joint(parent, [x, y, -.1]);
  part(group, color, [0, -.25, -.07], [.17, .37, .19]);
  return group;
}

function buildPobb(root) {
  const navy = '#243f58', cream = '#f5dfba', coral = '#ed927f';
  const torso = joint(root, [0, 0, 0]);
  part(torso, navy, [0, 1.18, .09], [.78, .98, .7]);
  part(torso, cream, [0, 1.08, -.47], [.55, .72, .255]);
  const tail = joint(torso, [0, .72, .62]);
  part(tail, navy, [0, -.10, .30], [.39, .30, .57]);batchJoint(tail);
  // Four large plates, from upper back toward the tail. Opaque gloss avoids transmission passes.
  for (const [y, z, radius] of [[1.97, .58, .35], [1.6, .77, .39], [1.20, .81, .37], [.80, .77, .30]]) {
    part(torso, '#238d9e', [0, y, z], [radius + .055, .265, .19], 'sphere', 'glass');
    part(torso, '#56e1da', [0, y + .018, z + .08], [radius, .215, .16], 'sphere', 'glass');
    part(torso, '#cefff0', [-radius * .35, y + .07, z + .215], [radius * .37, .065, .024]);
  }
  const head = joint(torso, [0, 2.03, -.25]);
  part(head, navy, [0, 0, 0], [.67, .66, .59]);
  part(head, cream, [0, -.23, -.43], [.54, .29, .285]);
  for (const side of [-1, 1]) {
    part(head, navy, [side * .49, .52, .01], [.255, .36, .18]);
    part(head, coral, [side * .49, .54, -.12], [.153, .237, .07]);
    part(head, cream, [side * .46, -.20, -.36], [.18, .13, .19]);
    part(head, cream, [side * .31, .31, -.49], [.065, .042, .027]);
  }
  for (const [x, y, tilt] of [[-.13, .62, -.28], [.04, .70, .12], [.19, .60, .35]]) {
    const tuft = part(head, navy, [x, y, -.01], [.12, .31, .17], 'cone');tuft.rotation.z = tilt;
  }
  part(head, coral, [0, -.18, -.713], [.085, .055, .037]);
  const eyes = [-1, 1].map(side => eye(head, side * .32, .085, -.495));
  const legs = [-1, 1].map(side => leg(root, side * .47, navy, coral, .05));
  const arms = [-1, 1].map(side => arm(torso, side * .70, 1.52, navy));
  arms.forEach(batchJoint);batchJoint(head);batchJoint(torso);
  return {torso, head, eyes, legs, arms, tail, height: 3.02};
}

function buildAubie(root) {
  const purple = '#693997';
  const torso = joint(root, [0, 0, 0]);
  part(torso, purple, [0, 1.20, .02], [.74, 1.03, .62]);
  const head = joint(torso, [0, 1.96, -.02]);
  part(head, purple, [0, -.08, 0], [.57, .64, .54]);
  for (const side of [-1, 1]) {
    part(head, '#bb79d1', [side * .40, -.29, -.46], [.10, .052, .026]);
    const leaf = part(head, '#4ca36f', [side * .17, .44, 0], [.14, .3, .11]);leaf.rotation.z = side * .7;
  }
  const eyes = [-1, 1].map(side => eye(head, side * .27, .04, -.485, true));
  part(head, '#19253d', [0, .06, -.58], [.17, .035, .04], 'box');
  const smile = new THREE.Mesh(new THREE.TorusGeometry(.105, .018, 5, 12, Math.PI), material('#19253d'));
  smile.position.set(0, -.27, -.55);smile.rotation.z=Math.PI;head.add(smile);batchJoint(head);smile.geometry.dispose();
  const hat = joint(head, [0, .50, 0]);
  part(hat, '#1c2742', [0, .02, 0], [.49, .17, .43]);
  const board = part(hat, '#253453', [0, .18, 0], [1.42, .105, 1.10], 'box');board.rotation.y = .14;
  part(hat, '#e5b746', [.05, .26, 0], [.045, .029, .045]);batchJoint(hat);
  const tassel = joint(hat, [.57, .19, -.03]);
  part(tassel, '#f1c34e', [0, -.21, 0], [.026, .24, .026]);
  part(tassel, '#f1c34e', [0, -.43, 0], [.065, .12, .065]);batchJoint(tassel);
  const legs = [-1, 1].map(side => leg(root, side * .35, '#4f2a73'));
  const arms = [-1, 1].map(side => arm(torso, side * .67, 1.48, purple));
  const book = joint(arms[0], [0, -.26, -.20]);
  part(book, '#c2524e', [0, 0, 0], [.36, .56, .18], 'box');
  part(book, '#f3dec2', [.035, 0, -.095], [.26, .46, .03], 'box');
  part(book, '#8c3c53', [-.14, 0, -.018], [.065, .57, .20], 'box');batchJoint(book);
  arms.forEach(batchJoint);batchJoint(torso);
  return {torso, head, eyes, legs, arms, tassel, height: 2.83};
}

export function makeRacePet(name) {
  const root = new THREE.Group();root.name = name;
  const rig = name === 'pobb' ? buildPobb(root) : buildAubie(root);
  Object.assign(rig, {name, root, pose: {stride: 0, gazeYaw: 0, gazePitch: 0, feet: [0, 0]}});
  rigs.add(rig);return rig;
}

export function animateRacePet(rig, {time, distance, phase, lookTarget, lateralSpeed, jumping}) {
  const stride = distance * 1.2 + phase, wave = Math.sin(stride);
  rig.torso.position.y = Math.abs(Math.cos(stride)) * .045;
  rig.torso.rotation.z = clamp(-lateralSpeed * .055, -.13, .13);
  rig.torso.rotation.x = -.08 + jumping * .08;
  rig.head.rotation.y = 0;
  rig.root.updateMatrixWorld(true);
  gaze.copy(lookTarget);rig.head.worldToLocal(gaze);
  const yaw = clamp(Math.atan2(gaze.x, -gaze.z), -.55, .55);
  const pitch = clamp(Math.atan2(gaze.y, Math.hypot(gaze.x, gaze.z)), -.22, .12);
  rig.head.rotation.y = -yaw * .52;
  // Pupils keep looking farther into the turn than the head, toward the road target.
  direction.set(Math.sin(yaw * .48), Math.sin(pitch), -Math.cos(yaw * .48)).normalize();
  const blinkPhase = (time + phase * .9) % 4.7;
  const blink = blinkPhase > 4.48 ? 1 - Math.sin((blinkPhase - 4.48) / .22 * Math.PI) * .93 : 1;
  for (const eye of rig.eyes) {
    eye.group.scale.y = blink;eye.pupil.quaternion.setFromUnitVectors(forward, direction);
  }
  rig.legs.forEach((leg, i) => {
    const phase = stride + i * Math.PI;
    const lift = Math.max(0, Math.cos(phase)) * .24, angle = Math.sin(phase) * .48;
    // The planted foot travels front to back; the raised foot returns forward.
    // Keep the foot ellipsoid on the road throughout the stance half of the gait.
    const c = Math.cos(angle), s = Math.sin(angle);
    const bottom = -.37 * c + .11 * s - Math.hypot(.17 * c, .34 * s);
    leg.position.y = -bottom + .02 + lift;leg.rotation.x = angle;
    rig.pose.feet[i] = Number(lift.toFixed(3));
  });
  rig.arms.forEach((arm, i) => {arm.rotation.x = -Math.sin(stride + i * Math.PI) * .48 - .12 - jumping * .4;});
  if (rig.tail) rig.tail.rotation.y = wave * .17;
  if (rig.tassel) {rig.tassel.rotation.x = wave * .22;rig.tassel.rotation.z = Math.cos(stride) * .12;}
  rig.pose.stride = Number(stride.toFixed(3));rig.pose.gazeYaw = Number(yaw.toFixed(3));rig.pose.gazePitch = Number(pitch.toFixed(3));
}

export function racePetStats() {
  let meshes = 0, triangles = 0;const geometries = new Set();
  for (const rig of rigs) rig.root.traverse(node => {
    if (!node.isMesh) return;meshes++;geometries.add(node.geometry);
    triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
  });
  return {kind: 'articulated-3d',characters: rigs.size,meshes,triangles,geometries: geometries.size,textures: 0};
}

export function disposeRacePets() {
  const geometries = new Set(geometryPool.values());
  for (const rig of rigs) rig.root.traverse(node => {if (node.geometry) geometries.add(node.geometry);});
  geometries.forEach(g => g.dispose());materialPool.forEach(m => m.dispose());
  rigs.clear();geometryPool.clear();materialPool.clear();
}
