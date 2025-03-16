import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three-stdlib';
import { setupScene } from '../utils/sceneManager';
import { spawnLetter, updateLetters } from '../utils/letterGenerator';
import { createParticleExplosion, updateParticles, createTextExplosion, updateFragments } from '../utils/particleManager';
import { loadGameSounds } from '../utils/soundLoader';
import { Letter, ParticleExplosion, TextFragment } from '../types/game';

interface ThreeSceneProps {
  gameStarted: boolean;
  onScoreChange: React.Dispatch<React.SetStateAction<number>>;
  onHealthChange: React.Dispatch<React.SetStateAction<number>>;
  health: number;
  onGameOver: () => void;
  resetSignal: number;
  onComboChange: React.Dispatch<React.SetStateAction<number>>;
  onDamage: () => void;
  level: number;
}

const ThreeScene: React.FC<ThreeSceneProps> = ({
  gameStarted,
  onScoreChange,
  onHealthChange,
  health,
  onGameOver,
  resetSignal,
  onComboChange,
  onDamage,
  level,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const flashPlaneRef = useRef<THREE.Mesh | null>(null);
  const listenerRef = useRef<THREE.AudioListener | null>(null);
  const backgroundMusicRef = useRef<THREE.Audio | null>(null);
  const hitSoundRef = useRef<THREE.Audio | null>(null);
  const explosionSoundRef = useRef<THREE.Audio | null>(null);
  const bulletSoundRef = useRef<THREE.Audio | null>(null);
  const animationFrameIdRef = useRef<number>(0);
  const lettersRef = useRef<Letter[]>([]);
  const particlesRef = useRef<ParticleExplosion[]>([]);
  const fragmentsRef = useRef<TextFragment[]>([]);
  const fontLoadedRef = useRef<any>(null);
  const wordQueueRef = useRef<string[]>([]);
  const charQueueRef = useRef<string[]>([]);
  const difficultyRef = useRef({
    fallingSpeed: 0.02,
    spawnInterval: 3000,
    comboMultiplier: 1,
  });
  const comboCountRef = useRef(0);
  const spawnTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shakeTimeRef = useRef(0);
  const shakeAmplitudeRef = useRef(0);
  const flashTimeRef = useRef(0);
  const healthRef = useRef(health);

  useEffect(() => {
    healthRef.current = health;
  }, [health]);

  const resetScene = () => {
    if (resetSignal > 0 && backgroundMusicRef.current?.isPlaying) {
      backgroundMusicRef.current.stop();
      backgroundMusicRef.current = null;
    }

    if (sceneRef.current) {
      lettersRef.current.forEach((item) => sceneRef.current?.remove(item.mesh));
      particlesRef.current.forEach((explosion) => sceneRef.current?.remove(explosion.points));
      fragmentsRef.current.forEach((fragment) => sceneRef.current?.remove(fragment.mesh));
    }

    lettersRef.current = [];
    particlesRef.current = [];
    fragmentsRef.current = [];
    wordQueueRef.current = [];
    charQueueRef.current = [];
    difficultyRef.current = { fallingSpeed: 0.02, spawnInterval: 3000, comboMultiplier: 1 };
    comboCountRef.current = 0;
    onComboChange(1);
    healthRef.current = 100;
    if (spawnTimeoutRef.current) {
      clearTimeout(spawnTimeoutRef.current);
      spawnTimeoutRef.current = null;
    }
    shakeTimeRef.current = 0;
    shakeAmplitudeRef.current = 0;
    flashTimeRef.current = 0;
    if (flashPlaneRef.current) {
      (flashPlaneRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
    }
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 8);
    }
  };

  useEffect(() => {
    const { scene, camera, renderer, stars, flashPlane, listener } = setupScene(mountRef);
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    starsRef.current = stars;
    flashPlaneRef.current = flashPlane;
    listenerRef.current = listener;

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        const aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.aspect = aspect;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
      resetScene();
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!scene || !camera || !renderer) return;

    if (!gameStarted) {
      renderer.render(scene, camera);
      return;
    }

    if (!backgroundMusicRef.current) {
      loadGameSounds(listenerRef.current!).then((sounds) => {
        backgroundMusicRef.current = sounds.backgroundMusic;
        hitSoundRef.current = sounds.hitSound;
        explosionSoundRef.current = sounds.explosionSound;
        bulletSoundRef.current = sounds.bulletSound;
        if (gameStarted) sounds.backgroundMusic.play();
      });
    }

    if (resetSignal > 0 || level === 1) {
      resetScene();
    }

    const getRandomLetter = () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return letters[Math.floor(Math.random() * letters.length)];
    };

    const fetchQuote = async () => {
      try {
        const response = await fetch('https://api.spaceflightnewsapi.net/v4/articles/?limit=10');
        const data = await response.json();
        const text = data.results
          .map((article: any) => `${article.title} ${article.summary}`)
          .join(' ')
          .toUpperCase()
          .replace(/[^A-Z\s]/g, '')
          .split(/\s+/)
          .filter((word: string) => word.length > 0);
        wordQueueRef.current = text;
        if (charQueueRef.current.length === 0 && text.length > 0) {
          charQueueRef.current = text[0].split('');
          wordQueueRef.current.shift();
        }
      } catch (error) {
        console.error('Error fetching quote:', error);
        charQueueRef.current = [getRandomLetter()];
      }
    };

    const spawnNextLetter = () => {
      if (!fontLoadedRef.current || !gameStarted) return;

      const lettersToSpawn = level;
      for (let i = 0; i < lettersToSpawn; i++) {
        if (charQueueRef.current.length === 0 && wordQueueRef.current.length === 0) {
          fetchQuote().then(() => {
            if (charQueueRef.current.length > 0) {
              const letter = charQueueRef.current.shift()!;
              lettersRef.current.push(spawnLetter(letter, fontLoadedRef.current, scene, difficultyRef.current));
            } else {
              lettersRef.current.push(spawnLetter(getRandomLetter(), fontLoadedRef.current, scene, difficultyRef.current));
            }
          });
        } else if (charQueueRef.current.length > 0) {
          const letter = charQueueRef.current.shift()!;
          lettersRef.current.push(spawnLetter(letter, fontLoadedRef.current, scene, difficultyRef.current));
        } else if (wordQueueRef.current.length > 0) {
          charQueueRef.current = wordQueueRef.current[0].split('');
          wordQueueRef.current.shift();
          const letter = charQueueRef.current.shift()!;
          lettersRef.current.push(spawnLetter(letter, fontLoadedRef.current, scene, difficultyRef.current));
        } else {
          lettersRef.current.push(spawnLetter(getRandomLetter(), fontLoadedRef.current, scene, difficultyRef.current));
        }
      }

      spawnTimeoutRef.current = setTimeout(spawnNextLetter, 1000);
    };

    const loader = new FontLoader();
    loader.load('/font.json', (font) => {
      fontLoadedRef.current = font;
      fetchQuote().then(() => spawnNextLetter());
    });

    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const processKey = (key: string) => {
      if (key && key.length === 1 && key >= 'A' && key <= 'Z') {
        const matchingIndex = lettersRef.current.findIndex(
          (item) => item.letter.toUpperCase() === key
        );
        if (matchingIndex !== -1) {
          const matchedLetter = lettersRef.current[matchingIndex];
          const letterPos = matchedLetter.mesh.position.clone();
          const baseColor = (matchedLetter.mesh.material as THREE.MeshPhongMaterial).color.clone();
          const letterString = matchedLetter.letter;

          const cameraPos = camera.position.clone();
          const direction = new THREE.Vector3().subVectors(letterPos, cameraPos).normalize();
          const distance = cameraPos.distanceTo(letterPos);
          const geometry = new THREE.CylinderGeometry(0.05, 0.05, distance, 8, 1, false);
          const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8,
          });
          const laser = new THREE.Mesh(geometry, material);
          laser.position.copy(cameraPos).add(letterPos).multiplyScalar(0.5);
          const up = new THREE.Vector3(0, 1, 0);
          const axis = new THREE.Vector3().crossVectors(up, direction).normalize();
          const angle = Math.acos(up.dot(direction));
          if (axis.length() > 0) {
            laser.quaternion.setFromAxisAngle(axis, angle);
          } else {
            if (direction.y < 0) {
              laser.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
            }
          }
          scene.add(laser);

          scene.remove(matchedLetter.mesh);
          lettersRef.current.splice(matchingIndex, 1);

          if (bulletSoundRef.current) bulletSoundRef.current.play();

          setTimeout(() => {
            scene.remove(laser);
            particlesRef.current.push(createParticleExplosion(letterPos, baseColor, scene));
            if (fontLoadedRef.current) {
              fragmentsRef.current.push(...createTextExplosion(letterPos, letterString, fontLoadedRef.current, scene));
            }
          }, 100);

          comboCountRef.current += 1;
          difficultyRef.current.comboMultiplier = Math.min(3, 1 + comboCountRef.current * 0.1);
          onComboChange(difficultyRef.current.comboMultiplier);
          const scoreIncrease = Math.round(10 * difficultyRef.current.comboMultiplier);
          onScoreChange((prev) => prev + scoreIncrease);

          if (hitSoundRef.current) hitSoundRef.current.play();
          shakeTimeRef.current = 0.2;
          shakeAmplitudeRef.current = 0.2;

          difficultyRef.current.fallingSpeed += 0.004;
          difficultyRef.current.spawnInterval = Math.max(600, difficultyRef.current.spawnInterval * 0.95);
        } else {
          comboCountRef.current = 0;
          difficultyRef.current.comboMultiplier = 1;
          onComboChange(1);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const pressedKey = event.key.toUpperCase();
      processKey(pressedKey);
    };

    const handleInput = (e: Event) => {
      const input = e.target as HTMLInputElement;
      const char = input.value.toUpperCase();
      processKey(char);
      input.value = '';
    };

    if (isMobile && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.addEventListener('input', handleInput);
      inputRef.current.addEventListener('touchstart', () => inputRef.current?.focus());
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      window.addEventListener('keydown', handleKeyDown);
    }

    const handleDamageEffects = () => {
      comboCountRef.current = 0;
      difficultyRef.current.comboMultiplier = 1;
      onComboChange(1);
      shakeTimeRef.current = 0.5;
      shakeAmplitudeRef.current = 0.5;
      flashTimeRef.current = 0.1;
      if (explosionSoundRef.current) explosionSoundRef.current.play();
      onDamage();
    };

    const animate = (time: number) => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      if (!gameStarted) {
        renderer.render(scene, camera);
        return;
      }

      if (starsRef.current) {
        const starPositions = starsRef.current.geometry.attributes.position.array;
        for (let i = 2; i < starPositions.length; i += 3) {
          starPositions[i] += 0.1;
          if (starPositions[i] > 10) {
            starPositions[i] = -100;
            starPositions[i - 2] = (Math.random() - 0.5) * 150;
            starPositions[i - 1] = (Math.random() - 0.5) * 150;
          }
        }
        starsRef.current.geometry.attributes.position.needsUpdate = true;
      }

      updateLetters(lettersRef.current, scene, camera, onHealthChange, time, handleDamageEffects);
      updateParticles(particlesRef.current, scene, time);
      updateFragments(fragmentsRef.current, scene);

      if (healthRef.current <= 0) {
        if (backgroundMusicRef.current?.isPlaying) backgroundMusicRef.current.stop();
        onGameOver();
        cancelAnimationFrame(animationFrameIdRef.current);
        return;
      }

      if (shakeTimeRef.current > 0) {
        camera.position.x = Math.sin(time * 0.05) * shakeAmplitudeRef.current;
        camera.position.y = Math.cos(time * 0.05) * shakeAmplitudeRef.current;
        shakeTimeRef.current -= 0.016;
        if (shakeTimeRef.current <= 0) {
          camera.position.x = 0;
          camera.position.y = 0;
        }
      }

      if (flashTimeRef.current > 0 && flashPlaneRef.current) {
        const flashMaterial = flashPlaneRef.current.material as THREE.MeshBasicMaterial;
        flashMaterial.opacity = 0.5 * (flashTimeRef.current / 0.1);
        flashTimeRef.current -= 0.016;
        if (flashTimeRef.current <= 0) {
          flashMaterial.opacity = 0;
        }
      }

      renderer.render(scene, camera);
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (isMobile && inputRef.current) {
        inputRef.current.removeEventListener('input', handleInput);
        inputRef.current.removeEventListener('touchstart', () => {});
      } else {
        window.removeEventListener('keydown', handleKeyDown);
      }
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
    };
  }, [gameStarted, onScoreChange, onHealthChange, onGameOver, resetSignal, onComboChange, onDamage, level]);

  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {isMobile && (
        <input
          ref={inputRef}
          type="text"
          style={{
            position: 'absolute',
            bottom: '10px',
            width: '100%',
            opacity: 0.1,
            zIndex: 1000,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            color: 'white',
          }}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck="false"
          autoFocus={true}
          inputMode="text"
        />
      )}
    </div>
  );
};

export default ThreeScene;