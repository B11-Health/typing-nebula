// src/utils/letterGenerator.ts
import * as THREE from 'three';
import { TextGeometry } from 'three-stdlib'

export const generateLetterMesh = (
  font: any,
  letterY: number
): { letter: string; mesh: THREE.Mesh } => {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const geometry = new TextGeometry(letter, {
    font: font,
    size: 1,
    height: 0.2,
  } as any);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, letterY, 0);
  return { letter, mesh };
};
