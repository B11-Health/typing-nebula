import * as THREE from 'three';
import { TextGeometry } from 'three-stdlib';
import { ParticleExplosion, TextFragment } from '../types/game';

export function createParticleExplosion(position: THREE.Vector3, baseColor: THREE.Color, scene: THREE.Scene) {
  const particleCount = 200;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities: THREE.Vector3[] = [];
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.4
    );
    velocities.push(velocity);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: baseColor,
    size: 0.25,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return { points, velocities, lifetime: 1.5, color: baseColor };
}

export function updateParticles(particles: ParticleExplosion[], scene: THREE.Scene, time: number) {
  particles.forEach((explosion, index) => {
    explosion.lifetime -= 0.016;
    const positions = (explosion.points.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < explosion.velocities.length; i++) {
      explosion.velocities[i].y -= 0.002;
      positions[i * 3] += explosion.velocities[i].x;
      positions[i * 3 + 1] += explosion.velocities[i].y;
      positions[i * 3 + 2] += explosion.velocities[i].z;
    }
    explosion.points.geometry.attributes.position.needsUpdate = true;
    const material = explosion.points.material as THREE.PointsMaterial;
    material.opacity = Math.max(0, explosion.lifetime);
    material.size = 0.25 + Math.sin(time * 0.01) * 0.1;
    if (explosion.lifetime <= 0) {
      scene.remove(explosion.points);
      particles.splice(index, 1);
    }
  });
}

export function createTextExplosion(position: THREE.Vector3, letter: string, font: any, scene: THREE.Scene) {
  const fragmentCount = 6;
  const fragments: TextFragment[] = [];
  for (let i = 0; i < fragmentCount; i++) {
    const textGeometry = new TextGeometry(letter, {
      font,
      size: 0.3,
      height: 0.1,
    });
    const fragmentMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(Math.random(), Math.random(), Math.random()),
      transparent: true,
      opacity: 1,
    });
    const fragmentMesh = new THREE.Mesh(textGeometry, fragmentMaterial);
    fragmentMesh.position.copy(position);
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5
    );
    const fragment: TextFragment = { mesh: fragmentMesh, velocity, lifetime: 1.0 };
    scene.add(fragmentMesh);
    fragments.push(fragment);
  }
  return fragments;
}

export function updateFragments(fragments: TextFragment[], scene: THREE.Scene) {
  fragments.forEach((fragment, index) => {
    fragment.lifetime -= 0.016;
    fragment.mesh.position.add(fragment.velocity);
    fragment.mesh.rotation.x += fragment.velocity.x * 0.1;
    fragment.mesh.rotation.y += fragment.velocity.y * 0.1;
    (fragment.mesh.material as THREE.MeshBasicMaterial).opacity = fragment.lifetime;
    if (fragment.lifetime <= 0) {
      scene.remove(fragment.mesh);
      fragments.splice(index, 1);
    }
  });
}