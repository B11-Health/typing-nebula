import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FontLoader, TextGeometry } from 'three-stdlib';
import { loadSound } from '../utils/soundManager';

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
  const hudRef = useRef<THREE.Mesh | null>(null);
  const backgroundMusicRef = useRef<THREE.Audio | null>(null);
  const hitSoundRef = useRef<THREE.Audio | null>(null);
  const explosionSoundRef = useRef<THREE.Audio | null>(null);
  const bulletSoundRef = useRef<THREE.Audio | null>(null);
  const animationFrameIdRef = useRef<number>(0);
  const flashPlaneRef = useRef<THREE.Mesh | null>(null);
  const flashTimeRef = useRef(0);

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
  const healthRef = useRef(health);

  useEffect(() => {
    healthRef.current = health;
  }, [health]);

  const resetScene = () => {
    if (backgroundMusicRef.current?.isPlaying) {
      backgroundMusicRef.current.stop();
    }
    backgroundMusicRef.current = null;

    if (sceneRef.current) {
      lettersRef.current.forEach((item) => sceneRef.current?.remove(item.mesh));
      particlesRef.current.forEach((explosion) => sceneRef.current?.remove(explosion.points));
      fragmentsRef.current.forEach((fragment) => sceneRef.current?.remove(fragment.mesh));
      if (hudRef.current) sceneRef.current.remove(hudRef.current);
    }

    lettersRef.current = [];
    particlesRef.current = [];
    fragmentsRef.current = [];
    wordQueueRef.current = [];
    charQueueRef.current = [];
    difficultyRef.current = { fallingSpeed: 0.02, spawnInterval: 3000, comboMultiplier: 1 };
    comboCountRef.current = 0;
    healthRef.current = 100;
    if (spawnTimeoutRef.current) {
      clearTimeout(spawnTimeoutRef.current);
      spawnTimeoutRef.current = null;
    }
    shakeTimeRef.current = 0;
    shakeAmplitudeRef.current = 0;
    
    flashTimeRef.current = 0;
    if (flashPlaneRef.current) {
      const flashMaterial = flashPlaneRef.current.material as THREE.MeshBasicMaterial;
      flashMaterial.opacity = 0;
    }

    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 8);
    }
  };

  /** Scene Setup */
  useEffect(() => {
    console.log('Setting up Three.js scene...');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000428);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 8;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    if (mountRef.current) {
      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(renderer.domElement);
      console.log('Renderer canvas appended to DOM');
    }

    // Animated stars
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
      color: 0xaaaaaa,
      size: 0.1,
      sizeAttenuation: true,
      transparent: true,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    starsRef.current = stars;
    console.log('Stars added to scene');

    const textureLoader = new THREE.TextureLoader();

    // Nebula background
    textureLoader.load(
      '/nebula.jpg',
      (texture) => {
        console.log('nebula.jpg loaded');
        const aspect = window.innerWidth / window.innerHeight;
        const height = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.abs(camera.position.z - -100) * 2;
        const width = height * aspect;
        const scaleFactor = 1.2;
        const geometry = new THREE.PlaneGeometry(width * scaleFactor, height * scaleFactor);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.4,
          color: 0x666666,
        });
        const nebula = new THREE.Mesh(geometry, material);
        nebula.position.z = -100;
        scene.add(nebula);
        console.log('Nebula added to scene at z = -100');
      },
      undefined,
      (error) => {
        console.error('Error loading nebula.jpg:', error);
      }
    );

    // Spaceship HUD overlay
    // console.log('Attempting to load spaceshiphud.png...');
    // textureLoader.load(
    //   '/spaceshiphud.png',
    //   (texture) => {
    //     console.log('spaceshiphud.png loaded successfully. Texture details:', {
    //       width: texture.image.width,
    //       height: texture.image.height,
    //     });
    //     const geometry = new THREE.PlaneGeometry(10, 10);
    //     const material = new THREE.MeshBasicMaterial({
    //       map: texture,
    //       transparent: true,
    //       opacity: 1.0,
    //       side: THREE.DoubleSide,
    //     });
    //     const hud = new THREE.Mesh(geometry, material);
    //     hud.position.set(0, 0, 7.9);
    //     hud.renderOrder = 2000;
    //     hud.visible = true;
    //     scene.add(hud);
    //     hudRef.current = hud;
    //     console.log('HUD added with texture. Position:', hud.position);
    //   },
    //   (progress) => {
    //     console.log('Loading spaceshiphud.png progress:', progress.loaded / progress.total * 100, '%');
    //   },
    //   (error) => {
    //     console.error('Failed to load spaceshiphud.png:', error);
    //   }
    // );

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const pointLight1 = new THREE.PointLight(0xff6666, 1.5, 50);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x6666ff, 1.5, 50);
    pointLight2.position.set(-5, 5, 5);
    scene.add(pointLight2);

    const flashGeometry = new THREE.PlaneGeometry(20, 20);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0,
    });
    const flashPlane = new THREE.Mesh(flashGeometry, flashMaterial);
    flashPlane.position.z = 7;
    flashPlane.renderOrder = 1000;
    scene.add(flashPlane);
    flashPlaneRef.current = flashPlane;

    const listener = new THREE.AudioListener();
    camera.add(listener);

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current && hudRef.current) {
        const aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.aspect = aspect;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        console.log('Resize applied. HUD scale:', hudRef.current.scale);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
      if (mountRef.current) mountRef.current.innerHTML = '';
      resetScene();
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
    resetScene();

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!scene || !camera || !renderer) {
      console.error('Scene, camera, or renderer not initialized');
      return;
    }

    if (!gameStarted) {
      renderer.render(scene, camera);
      console.log('Rendered scene for start screen');
      return;
    }

    if (!backgroundMusicRef.current) {
      const audioLoader = new THREE.AudioLoader();
      const listener = camera.children.find(
        (child) => child instanceof THREE.AudioListener
      ) as THREE.AudioListener;
      loadSound(audioLoader, listener, '/Focus.mp3', 0.5, true).then((sound) => {
        backgroundMusicRef.current = sound;
        if (gameStarted) sound.play();
      });
      loadSound(audioLoader, listener, '/miss.mp3', 0.3, false).then((sound) => {
        hitSoundRef.current = sound;
      });
      loadSound(audioLoader, listener, '/explosion.mp3', 0.4, false).then((sound) => {
        explosionSoundRef.current = sound;
      });
      loadSound(audioLoader, listener, '/bullet.mp3', 0.3, false).then((sound) => {
        bulletSoundRef.current = sound;
      });
    }

    const loader = new FontLoader();

    const spawnLetter = (letter: string, font: any) => {
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

      const velocity = new THREE.Vector3(0, 0, difficultyRef.current.fallingSpeed);
      lettersRef.current.push({ letter, mesh, velocity });
      scene.add(mesh);
    };

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
        console.error('Error fetching spaceflight news:', error);
        charQueueRef.current = [getRandomLetter()];
      }
    };

    const spawnNextLetter = () => {
      if (!fontLoadedRef.current || !gameStarted) return;

      if (charQueueRef.current.length === 0 && wordQueueRef.current.length === 0) {
        fetchQuote().then(() => {
          if (charQueueRef.current.length > 0) {
            const letter = charQueueRef.current.shift()!;
            spawnLetter(letter, fontLoadedRef.current);
          } else {
            spawnLetter(getRandomLetter(), fontLoadedRef.current);
          }
        });
      } else if (charQueueRef.current.length > 0) {
        const letter = charQueueRef.current.shift()!;
        spawnLetter(letter, fontLoadedRef.current);
      } else if (wordQueueRef.current.length > 0) {
        charQueueRef.current = wordQueueRef.current[0].split('');
        wordQueueRef.current.shift();
        const letter = charQueueRef.current.shift()!;
        spawnLetter(letter, fontLoadedRef.current);
      } else {
        spawnLetter(getRandomLetter(), fontLoadedRef.current);
      }

      spawnTimeoutRef.current = setTimeout(spawnNextLetter, 1000);
    };

    loader.load('/font.json', (font: any) => {
      fontLoadedRef.current = font;
      fetchQuote().then(() => spawnNextLetter());
    });

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
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      window.addEventListener('keydown', handleKeyDown);
    }

    const animate = (time: number) => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      if (!gameStarted) {
        renderer.render(scene, camera);
        return;
      }

      // Debug HUD presence
      if (hudRef.current) {
        console.log('HUD in scene:', scene.children.includes(hudRef.current), 'Position:', hudRef.current.position, 'Visible:', hudRef.current.visible);
      } else {
        console.log('HUD not set in hudRef.current');
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

      const toRemove: number[] = [];
      lettersRef.current.forEach((item, index) => {
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
        const letter = lettersRef.current[index];
        scene.remove(letter.mesh);
        lettersRef.current.splice(index, 1);
        onHealthChange((prev) => Math.max(0, prev - 8));
        comboCountRef.current = 0;
        difficultyRef.current.comboMultiplier = 1;
        shakeTimeRef.current = 0.5;
        shakeAmplitudeRef.current = 0.5;
        flashTimeRef.current = 0.1;
        if (explosionSoundRef.current) explosionSoundRef.current.play();
      });

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
      if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
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