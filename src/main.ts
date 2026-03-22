import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XREstimatedLight } from 'three/addons/webxr/XREstimatedLight.js'
import { ARGameManager } from './ARGameManager'

let container: HTMLDivElement;
let camera: THREE.PerspectiveCamera, scene: THREE.Scene, renderer: THREE.WebGLRenderer;
let controller1: THREE.XRTargetRaySpace, controller2: THREE.XRTargetRaySpace;
let reticle: THREE.Mesh;
let hitTestSource: XRHitTestSource | null = null;
let hitTestSourceRequested = false;
let gameManager: ARGameManager
let xrLight: XREstimatedLight | null = null
let ambientLight: THREE.HemisphereLight

function onSelect() {
  if (reticle.visible && gameManager.isPlacing()) {
    const pos = new THREE.Vector3()
    reticle.matrix.decompose(pos, new THREE.Quaternion(), new THREE.Vector3())
    gameManager.onTap(pos)
  }
}

function setupTapToPlace() {
  renderer.domElement.addEventListener('touchend', (e) => {
    e.preventDefault()
    if (reticle.visible && gameManager.isPlacing()) {
      const pos = new THREE.Vector3()
      reticle.matrix.decompose(pos, new THREE.Quaternion(), new THREE.Vector3())
      gameManager.onTap(pos)
    }
  }, { passive: false })
}

function showStartMenu() {
  const menu = document.createElement('div')
  menu.id = 'start-menu'
  Object.assign(menu.style, {
    position: 'fixed', bottom: '0', left: '0', right: '0',
    background: 'rgba(0,0,0,0.85)',
    color: 'white', fontFamily: 'monospace',
    padding: '2rem 1rem', textAlign: 'center',
    zIndex: '99999'
  })
  menu.innerHTML = `
    <p style="font-size:1.3rem;font-weight:bold;margin:0 0 6px;">🐀 Chef en Fuite AR</p>
    <p style="font-size:0.85rem;color:rgba(255,255,255,0.7);margin:0 0 20px;">Jeu à 2 joueurs</p>
    <div style="display:flex;gap:12px;justify-content:center;">
      <button id="btn-cacher" style="background:#2980b9;color:white;border:none;padding:14px 22px;border-radius:12px;font-size:1rem;font-family:monospace;">📦 Je cache</button>
      <button id="btn-cherche" style="background:#27ae60;color:white;border:none;padding:14px 22px;border-radius:12px;font-size:1rem;font-family:monospace;">🔍 Je cherche</button>
    </div>
  `
  document.body.appendChild(menu)

  document.getElementById('btn-cacher')?.addEventListener('click', () => {
    document.body.removeChild(menu)
    gameManager.setMode('cacher')
    const arButton = document.getElementById('ar-button') as HTMLButtonElement
    arButton?.click()
  })

  document.getElementById('btn-cherche')?.addEventListener('click', () => {
    document.body.removeChild(menu)
    gameManager.setMode('trouver')
    const arButton = document.getElementById('ar-button') as HTMLButtonElement
    arButton?.click()
  })
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(timestamp: number, frame?: XRFrame) {
  if (frame) {
    const referenceSpace: XRReferenceSpace = renderer.xr.getReferenceSpace()!;
    const session: XRSession = renderer.xr.getSession()!;

    if (hitTestSourceRequested === false) {
      session.requestReferenceSpace('viewer').then((referenceSpace: XRReferenceSpace) => {
        session.requestHitTestSource?.({ space: referenceSpace })?.then((source: XRHitTestSource) => {
          hitTestSource = source;
        });
      });
      session.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });
      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        if (pose) {
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
        }
      } else {
        reticle.visible = false;
      }
    }
  }

  gameManager.update(timestamp)
  renderer.render(scene, camera);
}

function init() {
  container = document.createElement('div');
  document.body.appendChild(container);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  ambientLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
  ambientLight.position.set(0.5, 1, 0.25);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(1, 3, 1);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 512;
  dirLight.shadow.mapSize.height = 512;
  dirLight.shadow.camera.near = 0.01;
  dirLight.shadow.camera.far = 10;
  dirLight.shadow.camera.left = -2;
  dirLight.shadow.camera.right = 2;
  dirLight.shadow.camera.top = 2;
  dirLight.shadow.camera.bottom = -2;
  scene.add(dirLight);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  xrLight = new XREstimatedLight(renderer)
  xrLight.addEventListener('estimationstart', () => {
    scene.add(xrLight!)
    scene.remove(ambientLight)
  })
  xrLight.addEventListener('estimationend', () => {
    scene.remove(xrLight!)
    scene.add(ambientLight)
  })

  gameManager = new ARGameManager(scene, camera, renderer)

  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay', 'light-estimation'],
    domOverlay: { root: document.body }
  })
  arButton.style.display = 'none'
  arButton.id = 'ar-button'
  document.body.appendChild(arButton)

  showStartMenu()

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener('select', onSelect);
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener('select', onSelect);
  scene.add(controller2);

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial()
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  setupTapToPlace()
  window.addEventListener('resize', onWindowResize);
}

init();