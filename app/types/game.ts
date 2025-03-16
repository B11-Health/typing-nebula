import * as THREE from 'three';

export interface Letter {
  letter: string;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
}

export interface ParticleExplosion {
  points: THREE.Points;
  velocities: THREE.Vector3[];
  lifetime: number;
  color: THREE.Color;
}

export interface TextFragment {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  lifetime: number;
}