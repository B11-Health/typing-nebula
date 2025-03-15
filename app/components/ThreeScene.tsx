// src/components/ThreeScene.tsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FontLoader, TextGeometry } from 'three-stdlib';
import { loadSound } from '../utils/soundManager';
import { generateLetterMesh } from '../utils/letterGenerator';

interface ThreeSceneProps {
  gameStarted: boolean;
  onScoreChange: React.Dispatch<React.SetStateAction<number>>;
  onHealthChange: React.Dispatch<React.SetStateAction<number>>;
  health: number;
  onGameOver: () => void;
  resetSignal: number;
}

interface Letter {
  letter: string;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
}

interface ParticleExplosion {
  points: THREE.Points;
  velocities: THREE.Vector3[];
  lifetime: number;
  color: THREE.Color;
}

interface TextFragment {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  lifetime: number;
}

const ThreeScene: React.FC<ThreeSceneProps> = ({
  gameStarted,
  onScoreChange,
  onHealthChange,
  health,
  onGameOver,
  resetSignal,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const backgroundMusicRef = useRef<THREE.Audio | null>(null);
  const hitSoundRef = useRef<THREE.Audio | null>(null);
  const explosionSoundRef = useRef<THREE.Audio | null>(null); // New explosion sound
  const bulletSoundRef = useRef<THREE.Audio | null>(null);   // New bullet sound
  const animationFrameIdRef = useRef<number>(0);
  const healthBarRef = useRef<THREE.Mesh | null>(null);
  const flashPlaneRef = useRef<THREE.Mesh | null>(null);
  const flashTimeRef = useRef(0);

  const lettersRef = useRef<Letter[]>([]);
  const particlesRef = useRef<ParticleExplosion[]>([]);
  const fragmentsRef = useRef<TextFragment[]>([]);
  const fontLoadedRef = useRef<any>(null);

  const difficultyRef = useRef({
    fallingSpeed: 0.02,
    spawnInterval: 3000,
    comboMultiplier: 1,
  });

  const comboCountRef = useRef(0);
  const spawnTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shakeTimeRef = useRef(0);
  const shakeAmplitudeRef = useRef(0);
  const healthRef = useRef(health);

  useEffect(() => {
    healthRef.current = health;
  }, [health]);

  const resetScene = () => {
    if (sceneRef.current) {
      lettersRef.current.forEach((item) => sceneRef.current?.remove(item.mesh));
      particlesRef.current.forEach((explosion) => sceneRef.current?.remove(explosion.points));
      fragmentsRef.current.forEach((fragment) => sceneRef.current?.remove(fragment.mesh));
    }
    lettersRef.current = [];
    particlesRef.current = [];
    fragmentsRef.current = [];
    difficultyRef.current = { fallingSpeed: 0.02, spawnInterval: 3000, comboMultiplier: 1 };
    comboCountRef.current = 0;
    if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
    if (backgroundMusicRef.current?.isPlaying) backgroundMusicRef.current.stop();
  };

  /** Scene Setup */
  useEffect(() => {
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, '#1a0933');
      gradient.addColorStop(0.5, '#2a1a66');
      gradient.addColorStop(1, '#000428');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < 1000; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
    }
    scene.background = new THREE.CanvasTexture(canvas);

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 150;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 150;
      starPositions[i * 3 + 2] = -Math.random() * 100;
      starSizes[i] = Math.random() * 0.2 + 0.05;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      sizeAttenuation: true,
      transparent: true,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    starsRef.current = stars;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/nebula.jpg', (texture) => {
      const geometry = new THREE.PlaneGeometry(200, 200);
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const nebula = new THREE.Mesh(geometry, material);
      nebula.position.z = -100;
      scene.add(nebula);
    });

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;

    if (mountRef.current) {
      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(renderer.domElement);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const pointLight1 = new THREE.PointLight(0xff6666, 1, 50);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x6666ff, 1, 50);
    pointLight2.position.set(-5, 5, 5);
    scene.add(pointLight2);

    const healthBarGeometry = new THREE.PlaneGeometry(8, 0.5);
    const healthBarMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ff00,
      emissive: 0x00aa00,
      shininess: 100,
    });
    const healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
    healthBar.position.set(0, 4.5, 0);
    healthBarRef.current = healthBar;
    scene.add(healthBar);

    const flashGeometry = new THREE.PlaneGeometry(20, 20);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0,
    });
    const flashPlane = new THREE.Mesh(flashGeometry, flashMaterial);
    flashPlane.position.z = 9;
    scene.add(flashPlane);
    flashPlaneRef.current = flashPlane;

    const listener = new THREE.AudioListener();
    camera.add(listener);

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, []);

  const createParticleExplosion = (position: THREE.Vector3, baseColor: THREE.Color) => {
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
    sceneRef.current?.add(points);
    particlesRef.current.push({ points, velocities, lifetime: 1.5, color: baseColor });
  };

  const createTextExplosion = (position: THREE.Vector3, letter: string, font: any) => {
    const fragmentCount = 6;
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
      fragmentsRef.current.push({ mesh: fragmentMesh, velocity, lifetime: 1.0 });
      sceneRef.current?.add(fragmentMesh);
    }
  };

  /** Game Logic */
  useEffect(() => {
    if (!gameStarted || resetSignal) {
      resetScene();
      if (!gameStarted) return;
    }

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!scene || !camera || !renderer) return;

    if (!backgroundMusicRef.current) {
      const audioLoader = new THREE.AudioLoader();
      const listener = camera.children.find(
        (child) => child instanceof THREE.AudioListener
      ) as THREE.AudioListener;
      loadSound(audioLoader, listener, '/Focus.mp3', 0.5, true).then((sound) => {
        backgroundMusicRef.current = sound;
        sound.play();
      });
      loadSound(audioLoader, listener, '/miss.mp3', 0.3, false).then((sound) => {
        hitSoundRef.current = sound;
      });
      loadSound(audioLoader, listener, '/explosion.mp3', 0.4, false).then((sound) => {
        explosionSoundRef.current = sound; // Load explosion sound
      });
      loadSound(audioLoader, listener, '/bullet.mp3', 0.3, false).then((sound) => {
        bulletSoundRef.current = sound; // Load bullet sound
      });
    }

    const loader = new FontLoader();

    const spawnLetter = (font: any) => {
      const { letter, mesh } = generateLetterMesh(font, 5);
      mesh.position.x = (Math.random() - 0.5) * 20;
      mesh.position.y = (Math.random() - 0.5) * 20;
      mesh.position.z = -50;
      const baseColor = new THREE.Color().setHSL(Math.random(), 1, 0.7);
      const phongMaterial = new THREE.MeshPhongMaterial({
        color: baseColor,
        shininess: 150,
        specular: 0xffffff,
        emissive: baseColor.clone().multiplyScalar(0.5),
      });
      mesh.material = phongMaterial;
      const outlineMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      });
      const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMaterial);
      outlineMesh.scale.multiplyScalar(1.1);
      mesh.add(outlineMesh);
      const velocity = new THREE.Vector3(0, 0, difficultyRef.current.fallingSpeed);
      lettersRef.current.push({ letter, mesh, velocity });
      scene.add(mesh);
    };

    const spawnNextLetter = () => {
      if (fontLoadedRef.current) {
        spawnLetter(fontLoadedRef.current);
      } else {
        loader.load('/font.json', (font: any) => {
          fontLoadedRef.current = font;
          spawnLetter(font);
        });
      }
      spawnTimeoutRef.current = setTimeout(spawnNextLetter, difficultyRef.current.spawnInterval);
    };

    spawnNextLetter();

    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

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

          // Play bullet sound when hitting a letter
          if (bulletSoundRef.current) bulletSoundRef.current.play();

          setTimeout(() => {
            scene.remove(laser);
            createParticleExplosion(letterPos, baseColor);
            if (fontLoadedRef.current) {
              createTextExplosion(letterPos, letterString, fontLoadedRef.current);
            }
          }, 100);

          comboCountRef.current += 1;
          difficultyRef.current.comboMultiplier = Math.min(3, 1 + comboCountRef.current * 0.1);
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
        }
      }
    };

    if (isMobile && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.addEventListener('input', handleInput);
      inputRef.current.addEventListener('touchstart', () => {
        inputRef.current?.focus();
      });
    } else {
      window.addEventListener('keydown', handleKeyDown);
    }

    const animate = (time: number) => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

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

      const toRemove: number[] = [];
      lettersRef.current.forEach((item, index) => {
        if (item.mesh.position.z > 10) {
          toRemove.push(index);
        } else {
          item.mesh.position.add(item.velocity);
          item.mesh.lookAt(camera.position);
          const scale = 1 + (item.mesh.position.z + 50) * 0.05;
          item.mesh.scale.setScalar(scale);
        }
      });
      toRemove.reverse().forEach((index) => {
        const letter = lettersRef.current[index];
        scene.remove(letter.mesh);
        lettersRef.current.splice(index, 1);
        onHealthChange((prev) => Math.max(0, prev - 8));
        comboCountRef.current = 0;
        difficultyRef.current.comboMultiplier = 1;
        shakeTimeRef.current = 0.5;
        shakeAmplitudeRef.current = 0.5;
        flashTimeRef.current = 0.1;
        // Play explosion sound when a letter is missed
        if (explosionSoundRef.current) explosionSoundRef.current.play();
      });

      if (healthBarRef.current) {
        const healthScale = healthRef.current / 100;
        healthBarRef.current.scale.x = healthScale;
        healthBarRef.current.position.x = (healthScale - 1) * 4;
        const material = healthBarRef.current.material as THREE.MeshPhongMaterial;
        material.color.setHSL(healthRef.current / 300, 1, 0.5);
        material.emissive.setHSL(healthRef.current / 300, 1, 0.3);
        if (healthRef.current < 30) {
          material.emissiveIntensity = 1 + Math.sin(time * 0.01) * 0.5;
        } else {
          material.emissiveIntensity = 1;
        }
      }

      if (healthRef.current <= 0) {
        if (backgroundMusicRef.current?.isPlaying) backgroundMusicRef.current.stop();
        onGameOver();
        cancelAnimationFrame(animationFrameIdRef.current);
        return;
      }

      particlesRef.current.forEach((explosion, index) => {
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
          particlesRef.current.splice(index, 1);
        }
      });

      fragmentsRef.current.forEach((fragment, index) => {
        fragment.lifetime -= 0.016;
        fragment.mesh.position.add(fragment.velocity);
        fragment.mesh.rotation.x += fragment.velocity.x * 0.1;
        fragment.mesh.rotation.y += fragment.velocity.y * 0.1;
        (fragment.mesh.material as THREE.MeshBasicMaterial).opacity = fragment.lifetime;
        if (fragment.lifetime <= 0) {
          scene.remove(fragment.mesh);
          fragmentsRef.current.splice(index, 1);
        }
      });

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
      resetScene();
    };
  }, [gameStarted, onScoreChange, onHealthChange, onGameOver, resetSignal]);

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
            opacity: 0,
            zIndex: 1000,
            border: 'none',
            background: 'transparent',
            outline: 'none',
          }}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          autoFocus={true}
        />
      )}
    </div>
  );
};

export default ThreeScene;