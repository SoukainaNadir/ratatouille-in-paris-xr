import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { PhysicsWorld } from '../engine/PhysicsWorld'

export interface RatState {
  isGrounded:   boolean
  isRunning:    boolean
  isSliding:    boolean
  lives:        number
  isInvincible: boolean
}

export class Rat {
  public mesh:  THREE.Group
  public body!: CANNON.Body
  public state: RatState

  private physics:    PhysicsWorld
  private moveSpeed = 8
  private jumpForce = 8
  private keys:       Set<string> = new Set()

  private joystickDx = 0
  private joystickDz = 0

  private bodyGroup!:     THREE.Group
  private headGroup!:     THREE.Group
  private tail!:          THREE.Mesh
  private legs:           THREE.Group[] = []
  private chefHat!:       THREE.Group
  private leftEyeGroup!:  THREE.Group
  private rightEyeGroup!: THREE.Group

  private animTime        = 0
  private invincibleTimer = 0
  private blinkTimer      = 0
  private hatTiltTarget   = 0
  private hatTilt         = 0

  private toonMaterials:      THREE.MeshToonMaterial[] = []
  private baseMaterialColors: number[]                 = []
  private indoorFactor = 0   
  private targetIndoor = 0

  constructor(physics: PhysicsWorld) {
    this.physics = physics
    this.mesh    = new THREE.Group()
    this.state   = { isGrounded: true, isRunning: false, isSliding: false, lives: 3, isInvincible: false }
    this.buildMesh()
    this.buildPhysics()
    this.setupControls()
  }

  setJoystickInput(dx: number, dz: number): void {
    this.joystickDx = dx
    this.joystickDz = dz
  }


private toon(hex: number): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({ color: hex })
  this.toonMaterials.push(mat)
  this.baseMaterialColors.push(hex)
  return mat
}
  private glossy(hex: number, shin = 80) { return new THREE.MeshPhongMaterial({ color: hex, shininess: shin, specular: 0xffffff }) }

  private buildMesh(): void {
    const FUR = 0x5b6a7d

const FUR_LT = 0x6b7a8d
const FUR_DK = 0x3f4b59
    const BELLY = 0xf5e6c8, EAR_MID = 0xf088aa, EAR_DEEP = 0xcc5070
    const HAT_W = 0xf0ece0, HAT_BD = 0xc8b89a, TAIL_C = 0xb89888
    const NOSE_P = 0xee5566, CHEEK_B = 0xf09898, PAW_C = 0xccc0a0

    this.bodyGroup = new THREE.Group()
    this.bodyGroup.position.set(0, -0.02, 0)

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.30, 32, 24), this.toon(FUR))
                                                       
    body.scale.set(1.0, 0.80, 1.10)  
    body.castShadow = true

    const dorsalPatch = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), this.toon(FUR_LT))
    dorsalPatch.scale.set(0.72, 0.38, 0.80); dorsalPatch.position.set(0, 0.18, 0)
    body.add(dorsalPatch)

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), this.toon(BELLY))
    belly.scale.set(0.78, 0.80, 0.45); belly.position.set(0, -0.06, 0.20)
    body.add(belly)

    this.bodyGroup.add(body)
    this.mesh.add(this.bodyGroup)

    this.headGroup = new THREE.Group()
    this.headGroup.position.set(0, 0.18, 0.30) 
    this.headGroup.rotation.x = -0.20

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.310, 36, 28), this.toon(FUR))
    skull.scale.set(1.0, 1.0, 0.94); skull.castShadow = true
    this.headGroup.add(skull)

    const headTop = new THREE.Mesh(new THREE.SphereGeometry(0.230, 22, 16), this.toon(FUR_LT))
    headTop.scale.set(0.82, 0.52, 0.68); headTop.position.set(0, 0.20, 0.02)
    this.headGroup.add(headTop)

    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.185, 20, 16), this.toon(FUR_LT))
      cheek.scale.set(0.82, 0.72, 0.52); cheek.position.set(side * 0.240, -0.04, 0.190)
      this.headGroup.add(cheek)
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), this.toon(CHEEK_B))
      blush.scale.set(1.10, 0.55, 0.22); blush.position.set(side * 0.255, -0.055, 0.238)
      this.headGroup.add(blush)
    }

    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.155, 24, 18), this.toon(BELLY))
    muzzle.scale.set(1.0, 0.65, 0.90); muzzle.position.set(0, -0.105, 0.268)
    this.headGroup.add(muzzle)

    const muzzleTop = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 14), this.toon(BELLY))
    muzzleTop.scale.set(0.86, 0.52, 0.82); muzzleTop.position.set(0, -0.050, 0.265)
    this.headGroup.add(muzzleTop)

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.058, 18, 14), this.glossy(NOSE_P, 120))
    nose.scale.set(1.0, 0.88, 0.88); nose.position.set(0, -0.070, 0.395)
    this.headGroup.add(nose)

    const noseShine = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }))
    noseShine.position.set(-0.018, -0.048, 0.446)
    this.headGroup.add(noseShine)

    const smile = new THREE.Mesh(new THREE.SphereGeometry(0.020, 10, 6), this.toon(0xcc8888))
    smile.scale.set(2.8, 0.42, 0.50); smile.position.set(0, -0.130, 0.355)
    this.headGroup.add(smile)

    // Yeux
    for (const side of [-1, 1]) {
      const eyeG = new THREE.Group()
      eyeG.position.set(side * 0.138, 0.072, 0.252)
      const outline = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 14), new THREE.MeshBasicMaterial({ color: 0x111111 }))
      outline.scale.set(1.05, 1.05, 0.38); eyeG.add(outline)
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.068, 18, 14), this.toon(0x1b1717))
      iris.scale.set(1.0, 1.0, 0.40); iris.position.z = 0.008; eyeG.add(iris)
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.038, 14, 12), new THREE.MeshBasicMaterial({ color: 0x050508 }))
      pupil.scale.set(1.0, 1.2, 0.35); pupil.position.z = 0.020; eyeG.add(pupil)
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }))
      shine.position.set(-0.020, 0.022, 0.052); eyeG.add(shine)
      if (side === -1) this.leftEyeGroup = eyeG; else this.rightEyeGroup = eyeG
      this.headGroup.add(eyeG)
    }

    // Oreilles
    for (const side of [-1, 1]) {
      const earG = new THREE.Group()
      earG.position.set(side * 0.240, 0.260, -0.055)
      earG.rotation.z = side * 0.28; earG.rotation.x = -0.15
      const earOuter = new THREE.Mesh(new THREE.SphereGeometry(0.175, 22, 16), this.toon(FUR))
      earOuter.scale.set(0.80, 1.20, 0.22); earG.add(earOuter)
      const eMid = new THREE.Mesh(new THREE.SphereGeometry(0.148, 22, 16), this.toon(EAR_MID))
      eMid.scale.set(0.76, 1.10, 0.18); eMid.position.z = 0.025; earG.add(eMid)
      const eDeep = new THREE.Mesh(new THREE.SphereGeometry(0.084, 16, 12), this.toon(EAR_DEEP))
      eDeep.scale.set(0.65, 0.88, 0.12); eDeep.position.z = 0.038; earG.add(eDeep)
      this.headGroup.add(earG)
    }

    // Moustaches
    const wMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee })
    for (const side of [-1, 1]) {
      for (let w = 0; w < 3; w++) {
        const wm = new THREE.Mesh(new THREE.CylinderGeometry(0.0030, 0.0008, 0.32, 4), wMat)
        wm.rotation.z = (side * Math.PI / 2) + (w - 1) * 0.20
        wm.rotation.x = (w - 1) * 0.08
        wm.position.set(side * 0.108, -0.090 + w * 0.024, 0.350)
        this.headGroup.add(wm)
      }
    }

    // Chapeau de chef
    this.chefHat = new THREE.Group()
    const hBand = new THREE.Mesh(new THREE.CylinderGeometry(0.250, 0.250, 0.060, 28), this.toon(HAT_BD))
    hBand.position.y = 0.316; this.chefHat.add(hBand)
    const hBot = new THREE.Mesh(new THREE.CylinderGeometry(0.222, 0.243, 0.096, 28), this.toon(HAT_W))
    hBot.position.y = 0.402; this.chefHat.add(hBot)
    const hMid = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.222, 0.152, 28), this.toon(HAT_W))
    hMid.position.y = 0.530; this.chefHat.add(hMid)
    const hDome = new THREE.Mesh(new THREE.SphereGeometry(0.235, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), this.toon(HAT_W))
    hDome.position.y = 0.606; this.chefHat.add(hDome)
    this.headGroup.add(this.chefHat)
    this.mesh.add(this.headGroup)

    // Pattes
    const legDef = [
      { x: -0.220, z:  0.140, rotZ:  0.25, front: true  }, 
      { x:  0.220, z:  0.140, rotZ: -0.25, front: true  },
      { x: -0.205, z: -0.140, rotZ:  0.20, front: false },  
      { x:  0.205, z: -0.140, rotZ: -0.20, front: false },
    ]
    for (const def of legDef) {
      const lg = new THREE.Group(); lg.position.set(def.x, 0, def.z)
      const upperG = new THREE.Group()
      upperG.rotation.z = def.rotZ; upperG.rotation.x = def.front ? 0.15 : -0.15
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.060, 0.100, 8, 12), this.toon(FUR_DK))
      upper.position.y = -0.05; upper.castShadow = true; upperG.add(upper)
      const lowerG = new THREE.Group()
      lowerG.position.y = -0.115; lowerG.rotation.z = -def.rotZ * 1.6; lowerG.rotation.x = 0.5
      const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.105, 8, 12), this.toon(FUR_DK))
      lower.position.y = -0.052; lower.castShadow = true; lowerG.add(lower)
      const pawG = new THREE.Group(); pawG.position.y = -0.115; pawG.rotation.x = -0.5
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.065, 18, 14), this.toon(PAW_C))
      paw.scale.set(1.10, 0.42, 1.40); paw.castShadow = true; pawG.add(paw)
      for (let t = 0; t < 3; t++) {
        const toe = new THREE.Mesh(new THREE.SphereGeometry(0.020, 10, 8), this.toon(PAW_C))
        toe.position.set((t - 1) * 0.040, 0, 0.058); pawG.add(toe)
      }
      lowerG.add(pawG); upperG.add(lowerG); lg.add(upperG)
      this.legs.push(lg); this.mesh.add(lg)
    }

    // Queue 
    const tPts: THREE.Vector3[] = []
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      tPts.push(new THREE.Vector3(
        Math.sin(t * Math.PI * 2.2) * 0.24 * t,
        0.0 - t * 0.055,
        -0.20 - t * 0.55  
      ))
    }
    this.tail = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tPts), 28, 0.022, 8, false), this.toon(TAIL_C)
    )
    this.tail.castShadow = true
    this.mesh.add(this.tail)
    this.mesh.position.set(0, 0.5, 0)
    this.mesh.castShadow = true
  }

  private buildPhysics(): void {
    this.body = new CANNON.Body({
      mass: 5, shape: new CANNON.Sphere(0.36),
      linearDamping: 0.9, angularDamping: 1.0,
    })
    this.body.position.set(0, 1, 0)
    this.body.fixedRotation = true
    this.physics.world.addBody(this.body)
  }

  private setupControls(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code)
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault()
      if (e.code === 'Space' && this.state.isGrounded) this.jump()
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
  }

  jump(): void {
    if (!this.state.isGrounded) return
    this.body.velocity.y  = this.jumpForce
    this.state.isGrounded = false
    this.hatTiltTarget    = 0.55
  }

  update(dt: number, cameraYaw: number): void {
    this.animTime        += dt
    this.invincibleTimer -= dt
    if (this.invincibleTimer <= 0) this.state.isInvincible = false

    if (this.body.position.y <= 0.5) {
      this.state.isGrounded = true
      this.body.position.y  = 0.5
      if (this.body.velocity.y < 0) this.body.velocity.y = 0
    } else {
      this.state.isGrounded = false
    }

    let dx = this.joystickDx
    let dz = this.joystickDz

    if (this.keys.has('KeyW')     || this.keys.has('ArrowUp'))    dz -= 1
    if (this.keys.has('KeyS')     || this.keys.has('ArrowDown'))  dz += 1
    if (this.keys.has('KeyA')     || this.keys.has('ArrowLeft'))  dx -= 1
    if (this.keys.has('KeyD')     || this.keys.has('ArrowRight')) dx += 1

    const len = Math.sqrt(dx*dx + dz*dz)
    if (len > 1) { dx /= len; dz /= len }

    const moving = len > 0.05
    this.state.isRunning = moving

if (moving) {
  const cos = Math.cos(cameraYaw)
  const sin = Math.sin(cameraYaw)
  const wx = -sin * dz - cos * dx
  const wz = -cos * dz + sin * dx
  const wlen = Math.sqrt(wx*wx + wz*wz)
  this.body.velocity.x = (wx / wlen) * this.moveSpeed
  this.body.velocity.z = (wz / wlen) * this.moveSpeed
  this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, Math.atan2(wx, wz), 0.18)
} else {
  this.body.velocity.x *= 0.7
  this.body.velocity.z *= 0.7
}

    this.mesh.position.set(this.body.position.x, this.body.position.y - 0.15, this.body.position.z)
    this.animLegs()
    this.animHat()
    this.animEyes()
    this.updateShading(dt)
    this.tail.rotation.y = Math.sin(this.animTime * 2.5) * 0.42
    this.tail.rotation.x = Math.sin(this.animTime * 1.8) * 0.10

    if (this.state.isInvincible) {
      this.blinkTimer    += dt * 15
      this.mesh.visible   = Math.sin(this.blinkTimer) > 0
    } else {
      this.mesh.visible = true
    }
  }

  private animLegs(): void {
    if (this.state.isRunning) {
      const t = this.animTime * 9, amp = 0.45
      this.legs[0].children[0].rotation.x =  Math.sin(t)           * amp
      this.legs[1].children[0].rotation.x =  Math.sin(t + Math.PI) * amp
      this.legs[2].children[0].rotation.x =  Math.sin(t + Math.PI) * amp
      this.legs[3].children[0].rotation.x =  Math.sin(t)           * amp
      this.bodyGroup.position.y = -0.02 + Math.sin(t * 2) * 0.015
      this.headGroup.position.y =  0.18 + Math.sin(t * 2 + 0.4) * 0.012
    } else {
      const b = Math.sin(this.animTime * 1.5) * 0.010
      this.bodyGroup.position.y = -0.02 + b * 0.5
      this.headGroup.position.y =  0.18 + b * 0.7
      for (const lg of this.legs)
        lg.children[0].rotation.x = THREE.MathUtils.lerp(lg.children[0].rotation.x as number, 0, 0.10)
    }
  }

  private animHat(): void {
    this.hatTilt       = THREE.MathUtils.lerp(this.hatTilt,       this.hatTiltTarget, 0.10)
    this.hatTiltTarget = THREE.MathUtils.lerp(this.hatTiltTarget, 0,                  0.05)
    this.chefHat.rotation.z = this.hatTilt
    if (this.state.isRunning) this.chefHat.rotation.x = Math.sin(this.animTime * 9) * 0.020
  }

  private animEyes(): void {
    const phase = (this.animTime % 3.8) / 3.8
    const blink = phase > 0.93 ? Math.sin(((phase - 0.93) / 0.07) * Math.PI) : 0
    this.leftEyeGroup.scale.y  = 1 - blink * 0.96
    this.rightEyeGroup.scale.y = 1 - blink * 0.96
  }

  takeDamage(): void {
    if (this.state.isInvincible) return
    this.state.lives--
    this.state.isInvincible = true
    this.invincibleTimer    = 2.5
    this.hatTiltTarget      = 1.5
    this.body.velocity.y    = 5
    this.body.velocity.x   += (Math.random() - 0.5) * 8
  }



  setIndoor(inside: boolean): void {
    this.targetIndoor = inside ? 1 : 0
  }

  private updateShading(dt: number): void {
    this.indoorFactor = THREE.MathUtils.lerp(this.indoorFactor, this.targetIndoor, dt * 3.0)

    const dark = this.indoorFactor * 0.55

    for (let i = 0; i < this.toonMaterials.length; i++) {
      const base = new THREE.Color(this.baseMaterialColors[i])
const shaded = base.clone().lerp(new THREE.Color(0x000000), dark)
this.toonMaterials[i].color.copy(shaded)
      this.toonMaterials[i].needsUpdate = true
    }
  }

  getPosition(): THREE.Vector3 { return this.mesh.position.clone() }
  setPosition(pos: THREE.Vector3): void {
    this.body.position.set(pos.x, this.body.position.y, pos.z)
    this.body.velocity.x = 0
    this.body.velocity.z = 0
    this.mesh.position.set(pos.x, this.mesh.position.y, pos.z)
  }
  reset(): void {
    this.body.position.set(0, 1, 0)
    this.body.velocity.set(0, 0, 0)
    this.state.lives        = 3
    this.state.isInvincible = false
    this.joystickDx         = 0
    this.joystickDz         = 0
  }
}