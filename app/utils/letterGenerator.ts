import * as THREE from 'three';
import { TextGeometry } from 'three-stdlib';
import { Letter } from '../types/game';

export function spawnLetter(letter: string, font: any, scene: THREE.Scene, difficulty: { fallingSpeed: number }) {
  const mesh = new THREE.Mesh(
    new TextGeometry(letter, {
      font,
      size: 1,
      height: 0.2,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.02,
      bevelOffset: 0,
    }),
    new THREE.MeshPhongMaterial()
  );
  mesh.position.x = (Math.random() - 0.5) * 20;
  mesh.position.y = (Math.random() - 0.5) * 20;
  mesh.position.z = -50;

  const baseColor = new THREE.Color().setHSL(Math.random(), 0.8, 0.7);
  const phongMaterial = new THREE.MeshPhongMaterial({
    color: baseColor,
    shininess: 200,
    specular: 0xffffff,
    emissive: baseColor.clone().multiplyScalar(0.8),
    emissiveIntensity: 1.2,
  });
  mesh.material = phongMaterial;

  const outlineMaterial1 = new THREE.MeshBasicMaterial({
    color: baseColor.clone().offsetHSL(0, 0, 0.2),
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
  const outlineMesh1 = new THREE.Mesh(mesh.geometry, outlineMaterial1);
  outlineMesh1.scale.multiplyScalar(1.1);
  mesh.add(outlineMesh1);

  const outlineMaterial2 = new THREE.MeshBasicMaterial({
    color: baseColor.clone().offsetHSL(0, 0, 0.4),
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
  const outlineMesh2 = new THREE.Mesh(mesh.geometry, outlineMaterial2);
  outlineMesh2.scale.multiplyScalar(1.15);
  mesh.add(outlineMesh2);

  const velocity = new THREE.Vector3(0, 0, difficulty.fallingSpeed);
  const newLetter: Letter = { letter, mesh, velocity };
  scene.add(mesh);
  return newLetter;
}

export function updateLetters(
  letters: Letter[],
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  onHealthChange: React.Dispatch<React.SetStateAction<number>>,
  time: number,
  onDamageEffects: () => void // Add this parameter
) {
  const toRemove: number[] = [];
  letters.forEach((item, index) => {
    if (item.mesh.position.z > 10) {
      toRemove.push(index);
    } else {
      item.mesh.position.add(item.velocity);
      item.mesh.lookAt(camera.position);
      const scale = 1 + (item.mesh.position.z + 50) * 0.05;
      item.mesh.scale.setScalar(scale);
      const material = item.mesh.material as THREE.MeshPhongMaterial;
      material.emissiveIntensity = 1.2 + Math.sin(time * 0.002) * 0.3;
    }
  });
  toRemove.reverse().forEach((index) => {
    const letter = letters[index];
    scene.remove(letter.mesh);
    letters.splice(index, 1);
    onHealthChange((prev) => Math.max(0, prev - 8));
    onDamageEffects(); // Call the callback
  });
}