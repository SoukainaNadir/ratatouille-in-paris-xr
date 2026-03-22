import * as THREE from 'three'
import { ARCat } from './ARCat'
import { Ingredient, INGREDIENTS_DATA } from './entities/Ingredient'
import * as CANNON from 'cannon-es'

type GameMode = 'menu' | 'cacher' | 'trouver'

interface ARIngredient {
  ingredient: Ingredient
  mesh: THREE.Group
  name: string
  collected: boolean
}

export class ARGameManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private ingredients: ARIngredient[] = []
  private score = 0
  private timeLeft = 60
  private mode: GameMode = 'menu'
  private lastTime = 0
  private overlayEl!: HTMLElement
  private messageEl!: HTMLElement
  private audioCtx: AudioContext | null = null

  private cat: ARCat | null = null
  private catSpawnTimer = 0
  private readonly CAT_SPAWN_DELAY = 5

  
  private gazeTarget: ARIngredient | null = null
  private gazeTimer = 0
  private readonly GAZE_DURATION = 2.0
  private gazeRing!: THREE.Mesh


  private physicsWorld!: CANNON.World
  private physicsBodies: Map<ARIngredient, CANNON.Body> = new Map()
  private floorBody: CANNON.Body | null = null

constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
  this.scene = scene
  this.camera = camera
  this.renderer = renderer
  this.createUI()
  this.createGazeRing()

  this.physicsWorld = new CANNON.World({ gravity: new CANNON.Vec3(0, -4, 0) })
  this.physicsWorld.broadphase = new CANNON.NaiveBroadphase()
}

  isPlacing() { return this.mode === 'cacher' }


  private unlockAudio() {
    if (this.audioCtx) return
    this.audioCtx = new AudioContext()
    this.audioCtx.resume()
  }

  private playSound(freq: number, duration: number, type: 'collect' | 'discover' | 'end' | 'fail') {
    if (!this.audioCtx) return
    const ctx = this.audioCtx

    if (type === 'collect') {
      ;[0, 100, 200].forEach((delay, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'square'
        const note = freq * [1, 1.26, 1.5][i]
        osc.frequency.setValueAtTime(note, ctx.currentTime + delay / 1000)
        gain.gain.setValueAtTime(0.15, ctx.currentTime + delay / 1000)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.15)
        osc.start(ctx.currentTime + delay / 1000)
        osc.stop(ctx.currentTime + delay / 1000 + 0.15)
      })

    } else if (type === 'discover') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4)

    } else if (type === 'end') {
      const notes = [523, 659, 784, 659, 1047]
      notes.forEach((note, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'square'
        osc.frequency.setValueAtTime(note, ctx.currentTime + i * 0.12)
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.15)
        osc.start(ctx.currentTime + i * 0.12)
        osc.stop(ctx.currentTime + i * 0.12 + 0.15)
      })

    } else if (type === 'fail') {
      const notes = [330, 277, 220, 185]
      notes.forEach((note, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(note, ctx.currentTime + i * 0.18)
        osc.frequency.exponentialRampToValueAtTime(note * 0.85, ctx.currentTime + i * 0.18 + 0.2)
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.18)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.22)
        osc.start(ctx.currentTime + i * 0.18)
        osc.stop(ctx.currentTime + i * 0.18 + 0.22)
      })
    }
  }

  private vibrate(pattern: number | number[]) {
    if ('vibrate' in navigator) navigator.vibrate(pattern)
  }


  private createGazeRing() {
    const geo = new THREE.RingGeometry(0.004, 0.006, 32)
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide
    })
    this.gazeRing = new THREE.Mesh(geo, mat)
    this.gazeRing.position.set(0, 0, -0.3)
    this.camera.add(this.gazeRing)
  }

private updateGaze(dt: number) {
  if (this.mode !== 'trouver') return

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera)

  const visibleMeshes = this.ingredients
    .filter(i => !i.collected && i.mesh.visible)
    .map(i => i.mesh)

  const hits = raycaster.intersectObjects(visibleMeshes, true)

  if (hits.length > 0) {
    const hitMesh = hits[0].object
    const ing = this.ingredients.find(
      i => i.mesh === hitMesh || i.mesh.children.includes(hitMesh as THREE.Object3D)
    )
    if (ing && this.gazeTarget !== ing) {
      this.gazeTarget = ing
      this.gazeTimer = 0
    }
  } else {
    this.gazeTarget = null
    this.gazeTimer = 0
  }

  ;(this.gazeRing.material as THREE.MeshBasicMaterial).color.set(0xffffff)
  this.gazeRing.scale.setScalar(1)
}


  onTap(position: THREE.Vector3) {
    this.unlockAudio()
    if (this.mode === 'cacher') {
      this.spawnIngredient(position)
    }
  }

  setMode(mode: 'cacher' | 'trouver') {
    this.unlockAudio()
    this.mode = mode
    if (mode === 'cacher') {
      this.ingredients = []
      this.score = 0
      this.showOverlay(`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;">
          <div>
            <p style="font-size:0.9rem;margin:0;">📍 Tape sur le sol pour cacher</p>
            <p id="ar-count" style="font-size:0.8rem;color:rgba(255,255,255,0.7);margin:0;">0/5 caché</p>
          </div>
          <button id="btn-done" style="${this.btnStyle('#27ae60')}">✅ Terminé</button>
        </div>
      `)
      document.getElementById('btn-done')?.addEventListener('click', () => {
        if (this.ingredients.length < 5) {
          this.showMessage(`Cache encore ${5 - this.ingredients.length} ingrédient(s) !`)
          return
        }
        this.finishCacher()
      })
    }
  }

update(timestamp: number) {
  if (this.mode !== 'trouver') {
    if (this.mode === 'cacher') {
      const dt = (timestamp - this.lastTime) / 1000
      this.lastTime = timestamp
      this.physicsWorld.step(1 / 60, Math.min(dt, 0.1), 3)
      this.syncPhysics()
    } else {
      this.lastTime = timestamp
    }
    return
  }

  const dt = (timestamp - this.lastTime) / 1000
  this.lastTime = timestamp
  this.timeLeft -= dt

  const timerEl = document.getElementById('ar-timer')
  if (timerEl) {
    const t = Math.ceil(this.timeLeft)
    timerEl.textContent = `⏱ ${t}s`
    timerEl.style.color = t <= 10 ? '#e74c3c' : '#f39c12'
  }

  if (this.timeLeft <= 0) {
    this.endGame()
    return
  }

  this.physicsWorld.step(1 / 60, Math.min(dt, 0.1), 3)
  this.syncPhysics()

  this.updateGaze(dt)

  this.catSpawnTimer -= dt
  if (this.catSpawnTimer <= 0 && !this.cat && this.ingredients.some(i => !i.collected)) {
    this.spawnCat()
  }

  if (this.cat) {
    const currentTarget = this.ingredients.find(i => !i.collected)
    if (currentTarget) {
      if (!this.cat.hasTarget()) {
        this.cat.setTarget(currentTarget.mesh.position)
      } else {
        this.cat.updateTarget(currentTarget.mesh.position)
      }
    }

    const stole = this.cat.update(dt)
    if (stole) {
      const target = this.ingredients.find(i => !i.collected)
      if (target) {
        this.showMessage('😾 Le chat a volé un ingrédient !')
        this.vibrate(300)
        this.playSound(200, 0.4, 'fail')
        target.collected = true
        this.scene.remove(target.mesh)

        const el = document.getElementById('ar-score')
        if (el) el.textContent = `🧀 ${this.score} / ${this.ingredients.length}`

        const next = this.ingredients.find(i => !i.collected)
        if (next) {
          this.cat.setTarget(next.mesh.position)
        } else {
          this.scene.remove(this.cat.mesh)
          this.cat = null
        }

        if (this.ingredients.filter(i => !i.collected).length === 0) {
          setTimeout(() => this.endGame(), 1500)
        }
      }
    }
  }

  const camPos = this.camera.position
  for (const ing of this.ingredients) {
    if (ing.collected) continue
    ing.ingredient.update(dt)

    const dist = camPos.distanceTo(ing.mesh.position)
    if (dist < 1.5 && !ing.mesh.visible) {
      ing.mesh.visible = true
      this.showMessage('👀 Ingrédient nearby !')
      this.playSound(270, 0.2, 'discover')
      this.vibrate(40)
    } else if (dist >= 1.5 && ing.mesh.visible) {
      ing.mesh.visible = false
    }
  }
}

  private spawnCat() {
    this.cat = new ARCat()
    const camPos = this.camera.position.clone()
    const camDir = new THREE.Vector3()
    this.camera.getWorldDirection(camDir)
    camDir.negate()
    camPos.addScaledVector(camDir, 2)
    camPos.y = this.ingredients.find(i => !i.collected)?.mesh.position.y ?? 0.1
    this.cat.mesh.position.copy(camPos)
    this.scene.add(this.cat.mesh)

    const target = this.ingredients.find(i => !i.collected)
    if (target) this.cat.setTarget(target.mesh.position)

    this.showMessage('🐱 Un chat arrive !')
    this.vibrate([100, 50, 100])
    this.playSound(150, 0.5, 'discover')
    this.catSpawnTimer = this.CAT_SPAWN_DELAY + 10
  }

  private syncPhysics() {
  const floorY = this.floorBody?.position.y ?? 0

  for (const [ing, body] of this.physicsBodies) {
    if (ing.collected) continue
    if (body.mass === 0) continue 

    ing.mesh.position.set(body.position.x, body.position.y, body.position.z)

    if (body.position.y <= floorY + 0.1 && body.velocity.length() < 0.08) {
      body.mass = 0
      body.updateMassProperties()
      body.velocity.set(0, 0, 0)
      ing.ingredient.data.position.copy(ing.mesh.position)
    }
  }
}

private spawnIngredient(position: THREE.Vector3) {
  if (this.ingredients.length >= 5) {
    this.showMessage('Maximum 5 ingrédients !')
    return
  }

  const usedNames = this.ingredients.map(i => i.name)
  const available = INGREDIENTS_DATA.filter(d => !usedNames.includes(d.name))
  if (available.length === 0) return

  const data = available[Math.floor(Math.random() * available.length)]
  const spawnPos = position.clone()
  spawnPos.y += 0.5 

  const ing = new Ingredient({ ...data, position: spawnPos.clone() })
  ing.mesh.position.copy(spawnPos)
  this.scene.add(ing.mesh)

  const body = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Sphere(0.05),
    position: new CANNON.Vec3(spawnPos.x, spawnPos.y, spawnPos.z),
    linearDamping: 0.3,
    angularDamping: 0.6,
  })
  body.material = new CANNON.Material({ restitution: 0.6 })
  this.physicsWorld.addBody(body)

  if (!this.floorBody) {
    const floorMat = new CANNON.Material({ restitution: 0.6 })
    this.floorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: floorMat })
    this.floorBody.position.set(position.x, position.y, position.z)
    this.floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this.physicsWorld.addBody(this.floorBody)
  }

  const arIng: ARIngredient = {
    ingredient: ing,
    mesh: ing.mesh,
    name: data.name,
    collected: false
  }
  this.physicsBodies.set(arIng, body)
  this.ingredients.push(arIng)

  this.vibrate(40)

  const remaining = 5 - this.ingredients.length
  const el = document.getElementById('ar-count')
  if (el) el.textContent = `${this.ingredients.length}/5 caché${this.ingredients.length > 1 ? 's' : ''}${remaining > 0 ? ` — encore ${remaining}` : ' ✅'}`
}
  private finishCacher() {
    for (const ing of this.ingredients) ing.mesh.visible = false
    this.showOverlay(`
      <div style="text-align:center;padding:1.5rem;">
        <p style="font-size:1.1rem;font-weight:bold;margin:0 0 8px;">🐀 Passe le téléphone au Rat !</p>
        <p style="font-size:0.85rem;color:rgba(255,255,255,0.7);margin:0 0 20px;">${this.ingredients.length} ingrédients cachés</p>
        <button id="btn-start-find" style="${this.btnStyle('#e74c3c')}">🔍 Je suis le Rat — Commencer</button>
      </div>
    `)
    document.getElementById('btn-start-find')?.addEventListener('click', () => this.startTrouver())
  }

private startTrouver() {
  this.mode = 'trouver'
  this.score = 0
  this.timeLeft = 60
  this.lastTime = performance.now()
  this.catSpawnTimer = this.CAT_SPAWN_DELAY

  this.showOverlay(`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;">
      <span id="ar-score" style="font-size:1.1rem;font-weight:bold;">🧀 0 / ${this.ingredients.length}</span>
      <span id="ar-timer" style="font-size:1.1rem;font-weight:bold;color:#f39c12;">⏱ 60s</span>
    </div>
  `)

  const raycaster = new THREE.Raycaster()
  raycaster.far = 5

  this.renderer.domElement.addEventListener('touchend', (e) => {
    if (this.mode !== 'trouver') return
    e.stopPropagation()

    const touch = e.changedTouches[0]
    const x = (touch.clientX / window.innerWidth) * 2 - 1
    const y = -(touch.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera)

    const visibleIngredients = this.ingredients.filter(i => !i.collected && i.mesh.visible)
    const meshes = visibleIngredients.map(i => i.mesh)

    const hits = raycaster.intersectObjects(meshes, true)
      .filter(h => !(h.object instanceof THREE.Points)) 
      .sort((a, b) => a.distance - b.distance)        

    if (hits.length > 0) {
      const hitObj = hits[0].object
      const ing = visibleIngredients.find(i => {
        let obj: THREE.Object3D | null = hitObj
        while (obj) {
          if (obj === i.mesh) return true
          obj = obj.parent
        }
        return false
      })
      if (ing) this.collect(ing)
    }
  }, { passive: false })
}

  private collect(ing: ARIngredient) {
    ing.collected = true
    this.score++
    ing.mesh.visible = true
    ing.mesh.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshToonMaterial)
        obj.material.transparent = true
    })
    this.showMessage(`✅ ${ing.name} trouvé !`)
    this.playSound(537, 0.3, 'collect')
    this.vibrate(80)

    const el = document.getElementById('ar-score')
    if (el) el.textContent = `🧀 ${this.score} / ${this.ingredients.length}`

    let opacity = 1
    const fade = () => {
      opacity -= 0.04
      ing.mesh.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshToonMaterial)
          obj.material.opacity = opacity
      })
      if (opacity > 0) requestAnimationFrame(fade)
      else { ing.mesh.visible = false; this.scene.remove(ing.mesh) }
    }
    fade()

    if (this.ingredients.filter(i => !i.collected).length === 0) {
      setTimeout(() => this.endGame(), 1500)
    }
  }

  private endGame() {
    this.mode = 'menu'
    const total = this.ingredients.length
    const found = this.score
    const missed = total - found

    if (found >= total) {
      this.playSound(440, 0.8, 'end')
      this.vibrate([80, 40, 80, 40, 200])
    } else {
      this.playSound(330, 0.8, 'fail')
      this.vibrate([400, 100, 200])
    }

    for (const ing of this.ingredients) {
      if (!ing.collected) this.scene.remove(ing.mesh)
    }

    this.showOverlay(`
      <div style="text-align:center;padding:1.5rem;">
        <p style="font-size:1.4rem;font-weight:bold;margin:0 0 8px;">${found >= total ? '🏆 Bravo !' : '🏁 Terminé !'}</p>
        <p style="font-size:1rem;margin:0 0 4px;">🧀 Trouvés : ${found} / ${total}</p>
        <p style="font-size:0.9rem;color:rgba(255,255,255,0.7);margin:0 0 16px;">😿 Manqués : ${missed}</p>
        <button id="btn-replay" style="${this.btnStyle('#8e44ad')}">🔄 Rejouer</button>
      </div>
    `)
    document.getElementById('btn-replay')?.addEventListener('click', () => window.location.reload())
  }


  private createUI() {
    this.overlayEl = document.createElement('div')
    Object.assign(this.overlayEl.style, {
      position: 'fixed', bottom: '20px', left: '10px', right: '10px',
      background: 'rgba(0,0,0,0.75)',
      color: 'white', fontFamily: 'monospace',
      pointerEvents: 'auto', zIndex: '99999',
      borderRadius: '16px', overflow: 'hidden'
    })
    document.body.appendChild(this.overlayEl)

    this.messageEl = document.createElement('div')
    Object.assign(this.messageEl.style, {
      position: 'fixed', top: '40%', left: '50%',
      transform: 'translateX(-50%)',
      color: 'white', fontFamily: 'monospace', fontWeight: 'bold',
      fontSize: '1.1rem', textShadow: '0 0 8px black',
      pointerEvents: 'none', zIndex: '99999'
    })
    document.body.appendChild(this.messageEl)
  }

  private showOverlay(html: string) { this.overlayEl.innerHTML = html }

  private showMessage(text: string) {
    this.messageEl.textContent = text
    setTimeout(() => { this.messageEl.textContent = '' }, 1500)
  }

  private btnStyle(color: string) {
    return `background:${color};color:white;border:none;padding:12px 20px;border-radius:12px;font-size:1rem;font-family:monospace;cursor:pointer;`
  }
}