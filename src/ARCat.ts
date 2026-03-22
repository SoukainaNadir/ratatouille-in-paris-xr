import * as THREE from 'three'

export class ARCat {
  public mesh: THREE.Group
  private target: THREE.Vector3 | null = null
  private animTime = 0
  private bodyMesh!: THREE.Mesh
  private tailMesh!: THREE.Mesh
  private headMesh!: THREE.Mesh
  private speechBubble: THREE.Sprite | null = null
  private speed = 0.4

  constructor() {
    this.mesh = new THREE.Group()
    this.buildMesh()
  }

  hasTarget(): boolean { return this.target !== null }

updateTarget(pos: THREE.Vector3) {
  if (this.target) this.target.copy(pos)  // met à jour sans reset la bubble
}

  private buildMesh(): void {
    const catMat   = new THREE.MeshToonMaterial({ color: 0x444444 })
    const whiteMat = new THREE.MeshToonMaterial({ color: 0xeeeeee })

    this.bodyMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.1, 0.16, 4, 8), catMat)
    this.bodyMesh.rotation.x = Math.PI / 2
    this.bodyMesh.castShadow = true

    this.headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), catMat)
    this.headMesh.position.set(0, 0.04, 0.14)

    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), whiteMat)
    muzzle.position.set(0, -0.015, 0.07)
    muzzle.scale.set(1.1, 0.8, 1)
    this.headMesh.add(muzzle)

    const eyeGeo   = new THREE.SphereGeometry(0.022, 8, 8)
    const eyeMat   = new THREE.MeshToonMaterial({ color: 0x88ff00 })
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 })

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
    leftEye.position.set(-0.037, 0.03, 0.067)
    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), pupilMat)
    leftPupil.position.z = 0.018
    leftEye.add(leftPupil)
    this.headMesh.add(leftEye)

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
    rightEye.position.set(0.037, 0.03, 0.067)
    const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), pupilMat)
    rightPupil.position.z = 0.018
    rightEye.add(rightPupil)
    this.headMesh.add(rightEye)

    const earGeo   = new THREE.ConeGeometry(0.03, 0.065, 4)
    const leftEar  = new THREE.Mesh(earGeo, catMat)
    leftEar.position.set(-0.052, 0.095, 0.015)
    leftEar.rotation.z = -0.2
    const rightEar = new THREE.Mesh(earGeo, catMat)
    rightEar.position.set(0.052, 0.095, 0.015)
    rightEar.rotation.z = 0.2
    this.headMesh.add(leftEar, rightEar)

    const tailPoints = []
    for (let i = 0; i <= 8; i++)
      tailPoints.push(new THREE.Vector3(
        Math.sin(i * 0.5) * 0.055,
        i * 0.03,
        -0.11 - i * 0.03
      ))
    this.tailMesh = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(tailPoints), 12, 0.015, 6, false), catMat)

    const legGeo = new THREE.CapsuleGeometry(0.026, 0.075, 4, 6)
    for (const [x, y, z] of [
      [-0.075, -0.082, 0.056],
      [ 0.075, -0.082, 0.056],
      [-0.067, -0.082,-0.056],
      [ 0.067, -0.082,-0.056]
    ]) {
      const leg = new THREE.Mesh(legGeo, catMat)
      leg.position.set(x, y, z)
      this.mesh.add(leg)
    }

    this.mesh.add(this.bodyMesh, this.headMesh, this.tailMesh)
    this.mesh.scale.setScalar(0.6)
  }

  setTarget(pos: THREE.Vector3) {
    this.target = pos.clone()
    this.showSpeechBubble('😾 MON INGRÉDIENT !')
  }

  update(dt: number): boolean {
    this.animTime += dt

    // Animation
    this.tailMesh.rotation.y = Math.sin(this.animTime * 10) * 0.5
    this.bodyMesh.position.y = Math.sin(this.animTime * 8) * 0.015
    this.headMesh.position.y = 0.04 + Math.sin(this.animTime * 8) * 0.01

    if (!this.target) return false

    // Déplacement vers la cible
    const dir = new THREE.Vector3().subVectors(this.target, this.mesh.position)
    dir.y = 0
    const dist = dir.length()

    if (dist < 0.4  ) {
      // Arrivé à l'ingrédient
      this.target = null
      this.showSpeechBubble('😸 NOM NOM !')
      return true // ingrédient volé
    }

    dir.normalize()
    this.mesh.position.addScaledVector(dir, this.speed * dt)
    this.mesh.rotation.y = Math.atan2(dir.x, dir.z)

    return false
  }

  private showSpeechBubble(text: string): void {
    if (this.speechBubble) {
      this.mesh.remove(this.speechBubble)
      this.speechBubble.material.map?.dispose()
      this.speechBubble.material.dispose()
      this.speechBubble = null
    }

    const canvas  = document.createElement('canvas')
    canvas.width  = 256; canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle   = 'rgba(255,255,255,0.9)'
    ctx.strokeStyle = '#333'
    ctx.lineWidth   = 3
    ctx.beginPath()
    ctx.roundRect(4, 4, 248, 56, 12)
    ctx.fill(); ctx.stroke()
    ctx.fillStyle    = '#222'
    ctx.font         = '20px Arial'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 32)

    const texture = new THREE.CanvasTexture(canvas)
    this.speechBubble = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true }))
    this.speechBubble.position.set(0, 0.6, 0)
    this.speechBubble.scale.set(1.2, 0.3, 1)
    this.mesh.add(this.speechBubble)

    setTimeout(() => {
      if (this.speechBubble) {
        this.mesh.remove(this.speechBubble)
        this.speechBubble.material.map?.dispose()
        this.speechBubble.material.dispose()
        this.speechBubble = null
      }
    }, 2000)
  }
}