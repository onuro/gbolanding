import * as THREE from 'three';
import type { FaceMeshData } from './lab-mesh';

// Head geometry (position, normal, baked light, eye axis, morph targets) + pose.
// Units: W. Origin = midpoint between the pupils, +Y up, +Z toward the camera.

export interface HeadPose {
  yaw: number; // radians, + turns the face to the viewer's right
  pitch: number; // radians, + nods down
  roll: number; // radians
  x: number; // W, screen right
  y: number; // W, up
  z: number; // W, toward camera
  scale: number;
}

export const REST_POSE: HeadPose = { yaw: 0, pitch: 0, roll: 0, x: 0, y: 0, z: 0, scale: 1 };

// Rotation pivot roughly at the top of the neck (atlas joint), in W relative to the eye origin.
export const HEAD_PIVOT = new THREE.Vector3(0, -0.36, -0.5);

export function createHeadGeometry(data: FaceMeshData): { geometry: THREE.BufferGeometry; morphIndex: Record<string, number> } {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(data.position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(data.normal, 3));
  g.setAttribute('aBake', new THREE.BufferAttribute(data.bake, 4));
  g.setAttribute('aEye', new THREE.BufferAttribute(data.eye, 1));
  g.setAttribute('aCurv', new THREE.BufferAttribute(data.curv, 1));
  g.setAttribute('aFeat', new THREE.BufferAttribute(data.feat, 4));
  g.setIndex(new THREE.BufferAttribute(data.index, 1));
  const morphIndex: Record<string, number> = {};
  if (data.morphs.length) {
    g.morphAttributes.position = data.morphs.map((m) => new THREE.BufferAttribute(m.position, 3));
    // lip rounding (pucker / funnel) keeps its full normal change on the lips, but only 12 % of it on the cheeks:
    // with the full change the cheek highlights flashed on and off with every rounded vowel (and speech drives pucker
    // up to ~1.8 for a visibly rounded mouth)
    const soft = new Set(['mouthPucker', 'mouthFunnel', 'mouthUpperUpLeft', 'mouthUpperUpRight']);
    g.morphAttributes.normal = data.morphs.map((m) => {
      if (!soft.has(m.name)) return new THREE.BufferAttribute(m.normal, 3);
      const n = m.normal.slice();
      for (let v = 0; v < n.length / 3; v++) {
        const lip = Math.min(1, Math.max(0, data.feat[4 * v]! / 0.5));
        const k = lip * lip; // (only the lips: the cheek / nasolabial fold flared with every strong pucker)
        n[3 * v]! *= k; n[3 * v + 1]! *= k; n[3 * v + 2]! *= k;
      }
      return new THREE.BufferAttribute(n, 3);
    });
    g.morphTargetsRelative = true;
    data.morphs.forEach((m, i) => (morphIndex[m.name] = i));
  }
  g.computeBoundingSphere();
  return { geometry: g, morphIndex };
}

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _m = new THREE.Matrix4();

export function poseMatrix(p: HeadPose, out: THREE.Matrix4): THREE.Matrix4 {
  _e.set(p.pitch, p.yaw, p.roll, 'YXZ');
  _q.setFromEuler(_e);
  out.makeTranslation(-HEAD_PIVOT.x, -HEAD_PIVOT.y, -HEAD_PIVOT.z);
  _m.compose(new THREE.Vector3(0, 0, 0), _q, new THREE.Vector3(p.scale, p.scale, p.scale));
  out.premultiply(_m);
  _m.makeTranslation(HEAD_PIVOT.x + p.x, HEAD_PIVOT.y + p.y, HEAD_PIVOT.z + p.z);
  out.premultiply(_m);
  return out;
}
