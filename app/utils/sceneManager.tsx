import * as THREE from 'three';

export function setupScene(mountRef: React.RefObject<HTMLDivElement | null>) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000428);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 8;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  if (mountRef.current) { // Already safe, but TypeScript needs the type to match
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);
  } else {
    throw new Error('Mount reference is null; cannot append renderer.');
  }

  // Rest of the setup code remains unchanged...
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

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('/nebula.jpg', (texture) => {
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
  });

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

  const listener = new THREE.AudioListener();
  camera.add(listener);

  return { scene, camera, renderer, stars, flashPlane, listener };
}