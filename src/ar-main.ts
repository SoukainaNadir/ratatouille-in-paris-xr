import * as THREE from 'three'
import { ARButton } from 'three/addons/webxr/ARButton.js'

const scene  = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.xr.enabled = true
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff, 1.0))
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
dirLight.position.set(1, 2, 1)
scene.add(dirLight)

document.body.appendChild(
  ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test"],
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: document.body }
  })
)

const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.08, 0.10, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide })
)
reticle.matrixAutoUpdate = false
reticle.visible = false
scene.add(reticle)

const cylinder = new THREE.Mesh(
  new THREE.CylinderGeometry(0.05, 0.05, 0.15, 32),
  new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.5 })
)
cylinder.visible = false
scene.add(cylinder)

let hitTestSource: any = null
let hitTestRequested   = false

const controller = renderer.xr.getController(0)
scene.add(controller)

controller.addEventListener("select", () => {
  if (!reticle.visible) return
  cylinder.position.setFromMatrixPosition(reticle.matrix)
  cylinder.position.y += 0.075
  cylinder.visible = true
  cylinder.scale.set(0, 0, 0)
  const start = performance.now()
  const pop = (now: number) => {
    const t = Math.min((now - start) / 400, 1)
    cylinder.scale.setScalar(1 - Math.pow(1 - t, 3))
    if (t < 1) requestAnimationFrame(pop)
  }
  requestAnimationFrame(pop)
})

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

renderer.setAnimationLoop((_t: number, frame: any) => {
  if (frame) {
    const refSpace = renderer.xr.getReferenceSpace()
    const session  = renderer.xr.getSession()

    if (!hitTestRequested && session) {
      session.requestReferenceSpace("viewer").then((viewerSpace: any) => {
        session.requestHitTestSource?.({ space: viewerSpace })?.then((src: any) => {
          hitTestSource = src
        })
      })
      session.addEventListener("end", () => {
        hitTestRequested = false
        hitTestSource    = null
        reticle.visible  = false
      })
      hitTestRequested = true
    }

    if (hitTestSource && refSpace) {
      const hits = frame.getHitTestResults(hitTestSource)
      if (hits.length > 0) {
        const pose = hits[0].getPose(refSpace)
        if (pose) {
          reticle.visible = true
          reticle.matrix.fromArray(pose.transform.matrix)
        }
      } else {
        reticle.visible = false
      }
    }
  }

  if (cylinder.visible) cylinder.rotation.y += 0.01
  renderer.render(scene, camera)
})