// src/utils/soundManager.ts
import * as THREE from 'three';

export const loadSound = (
  audioLoader: THREE.AudioLoader,
  listener: THREE.AudioListener,
  url: string,
  volume: number = 1.0,
  loop: boolean = false
): Promise<THREE.Audio> => {
  return new Promise((resolve, reject) => {
    const sound = new THREE.Audio(listener);
    audioLoader.load(
      url,
      (buffer) => {
        sound.setBuffer(buffer);
        sound.setVolume(volume);
        sound.setLoop(loop);
        resolve(sound);
      },
      undefined,
      (err) => reject(err)
    );
  });
};
