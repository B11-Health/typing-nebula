import * as THREE from 'three';
import { loadSound } from './soundManager'; // Adjust path based on actual location

export async function loadGameSounds(listener: THREE.AudioListener) {
  const audioLoader = new THREE.AudioLoader();
  const backgroundMusic = await loadSound(audioLoader, listener, '/Focus.mp3', 0.5, true);
  const hitSound = await loadSound(audioLoader, listener, '/miss.mp3', 0.3, false);
  const explosionSound = await loadSound(audioLoader, listener, '/explosion.mp3', 0.4, false);
  const bulletSound = await loadSound(audioLoader, listener, '/bullet.mp3', 0.3, false);
  return { backgroundMusic, hitSound, explosionSound, bulletSound };
}