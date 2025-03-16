import * as THREE from 'three';

export async function loadSound(
  audioLoader: THREE.AudioLoader,
  listener: THREE.AudioListener,
  url: string,
  volume: number,
  loop: boolean
): Promise<THREE.Audio> {
  return new Promise((resolve, reject) => {
    audioLoader.load(
      url,
      (buffer) => {
        const sound = new THREE.Audio(listener);
        sound.setBuffer(buffer);
        sound.setVolume(volume);
        sound.setLoop(loop);
        resolve(sound);
      },
      undefined,
      (error) => reject(error)
    );
  });
}