

import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

let container;
let camera : THREE.PerspectiveCamera, scene : THREE.Scene, renderer : THREE.WebGLRenderer;
let controller1, controller2;

let reticle: THREE.Mesh;

let hitTestSource: XRHitTestSource | null  = null;
let hitTestSourceRequested = false;

init();

function init() {

  container = document.createElement( 'div' );
  document.body.appendChild( container );

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );

  const light = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 3 );
  light.position.set( 0.5, 1, 0.25 );
  scene.add( light );

  //

  renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  renderer.xr.enabled = true;
  container.appendChild( renderer.domElement );

  //

  document.body.appendChild( ARButton.createButton( renderer, { requiredFeatures: [ 'hit-test' ] } ) );

  //

    const INGREDIENTS = [
    { name: 'Tomate',    color: 0xff2222, shape: 'sphere'   },
    { name: 'Fromage',   color: 0xffdd00, shape: 'box'      },
    { name: 'Champignon',color: 0xaa6633, shape: 'cylinder' },
    { name: 'Herbes',    color: 0x33cc44, shape: 'cone'     },
    ]
    function makeIngredient() {
        const ing = INGREDIENTS[ Math.floor( Math.random() * INGREDIENTS.length ) ]
        let geo: THREE.BufferGeometry

        if ( ing.shape === 'sphere' )
            geo = new THREE.SphereGeometry( 0.08, 16, 16 )
        else if ( ing.shape === 'box' )
            geo = new THREE.BoxGeometry( 0.12, 0.08, 0.12 )
        else if ( ing.shape === 'cone' )
            geo = new THREE.ConeGeometry( 0.07, 0.15, 16 )
        else
            geo = new THREE.CylinderGeometry( 0.06, 0.08, 0.12, 16 )

        const mat  = new THREE.MeshPhongMaterial({ color: ing.color, shininess: 80 })
        const mesh = new THREE.Mesh( geo, mat )

        const canvas  = document.createElement('canvas')
        canvas.width  = 256
        canvas.height = 64
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle    = 'rgba(0,0,0,0.6)'
        ctx.roundRect(4, 4, 248, 56, 12)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font      = 'bold 28px Arial'
        ctx.textAlign = 'center'
        ctx.fillText( ing.name, 128, 40 )

        const tex    = new THREE.CanvasTexture( canvas )
        const label  = new THREE.Mesh(
            new THREE.PlaneGeometry( 0.2, 0.05 ),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
        )
        label.position.y = 0.15
        label.rotation.x = -0.3
        mesh.add( label )

        return { mesh, name: ing.name }
        }

        let score = 0
        const scoreDiv = document.createElement('div')
        scoreDiv.style.cssText = `
        position:fixed; top:20px; left:50%; transform:translateX(-50%);
        color:white; font-size:1.4rem; font-family:Arial; font-weight:bold;
        background:rgba(0,0,0,0.5); padding:8px 20px; border-radius:20px;
        pointer-events:none;
        `
        scoreDiv.textContent = '🧀 Ingrédients : 0'
        document.body.appendChild( scoreDiv )

        // Liste des ingrédients posés (pour détection collecte)
        const placed: { mesh: THREE.Mesh, name: string }[] = []

        function onSelect() {
        if ( reticle.visible ) {
            const { mesh, name } = makeIngredient()
            reticle.matrix.decompose( mesh.position, mesh.quaternion, mesh.scale )
            mesh.position.y += 0.06
            scene.add( mesh )
            placed.push({ mesh, name })
        }
    }

  controller1 = renderer.xr.getController( 0 );
  controller1.addEventListener( 'select', onSelect );
  scene.add( controller1 );

  controller2 = renderer.xr.getController( 1 );
  controller2.addEventListener( 'select', onSelect );
  scene.add( controller2 );

  reticle = new THREE.Mesh(
    new THREE.RingGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
    new THREE.MeshBasicMaterial()
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add( reticle );

  //

  window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}

//

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

  renderer.render(scene, camera);
}