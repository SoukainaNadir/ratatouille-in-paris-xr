import * as THREE from 'three'

export interface IngredientData {
  emoji: string
  name: string
  color: number
  position: THREE.Vector3
}

export class Ingredient {
  public mesh: THREE.Group
  public collected = false
  public data: IngredientData

  private particles: THREE.Points
  private floatTime = Math.random() * Math.PI * 2
  private label!: THREE.Sprite
  private glowRing!: THREE.Mesh
  private shadowMesh!: THREE.Mesh
  private bodyMesh!: THREE.Mesh

  constructor(data: IngredientData) {
    this.data = data
    this.mesh = new THREE.Group()
    this.particles = this.createParticles()
    this.buildMesh()
    this.mesh.position.copy(data.position)
  }

  private buildMesh(): void {
    const geo = new THREE.DodecahedronGeometry(0.05, 0)
    const mat = new THREE.MeshToonMaterial({
      color: this.data.color,
      emissive: this.data.color,
      emissiveIntensity: 0.4
    })
    this.bodyMesh = new THREE.Mesh(geo, mat)
    this.bodyMesh.castShadow = true

    // Ombre au sol
    const shadowGeo = new THREE.CircleGeometry(0.045, 16)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    })
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
    this.shadowMesh.rotation.x = -Math.PI / 2
    this.shadowMesh.position.y = -0.08

    // Glow ring
    const ringGeo = new THREE.TorusGeometry(0.075, 0.006, 8, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.data.color,
      transparent: true,
      opacity: 0.6
    })
    this.glowRing = new THREE.Mesh(ringGeo, ringMat)
    this.glowRing.rotation.x = Math.PI / 2

    // Emoji label
    const canvas = document.createElement('canvas')
    canvas.width = 128; canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.font = '80px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.data.emoji, 64, 64)
    const texture = new THREE.CanvasTexture(canvas)
    this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }))
    this.label.position.set(0, 0.12, 0)
    this.label.scale.set(0.14, 0.14, 1)

    this.mesh.add(this.bodyMesh, this.shadowMesh, this.glowRing, this.label, this.particles)
  }

  private createParticles(): THREE.Points {
    const count = 12
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const r = 0.08 + Math.random() * 0.04
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi)
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: this.data.color,
      size: 0.018,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    })
    return new THREE.Points(geo, mat)
  }

  update(dt: number): void {
    if (this.collected) return
    this.floatTime += dt

    // Flottement vertical
    const floatY = Math.sin(this.floatTime * 2.5) * 0.03
    this.mesh.position.y = this.data.position.y + 0.1 + floatY

    // Ombre dynamique
    const height = 0.1 + floatY
    const shadowScale = Math.max(0.4, 1 - height * 3)
    this.shadowMesh.scale.setScalar(shadowScale)
    ;(this.shadowMesh.material as THREE.MeshBasicMaterial).opacity = 0.1 + shadowScale * 0.25
    this.shadowMesh.position.y = -height

    // Rotation corps
    this.bodyMesh.rotation.y += dt * 2.0
    this.bodyMesh.rotation.x = Math.sin(this.floatTime * 1.5) * 0.3

    // Glow ring pulse
    const pulse = 1 + Math.sin(this.floatTime * 4) * 0.25
    this.glowRing.scale.set(pulse, pulse, pulse)
    ;(this.glowRing.material as THREE.MeshBasicMaterial).opacity =
      0.3 + Math.sin(this.floatTime * 4) * 0.3

    // Particules
    this.particles.rotation.y += dt * 0.8
    this.particles.rotation.x += dt * 0.5
  }

  collect(): void {
    this.collected = true
    this.mesh.visible = false
  }

  getPosition(): THREE.Vector3 {
    return this.mesh.position.clone()
  }

  getCollectionRadius(): number {
    return 0.3
  }

  resetIngredient(): void {
    this.collected = false
    this.mesh.visible = true
    this.floatTime = 0
  }
}

export const INGREDIENTS_DATA: Omit<IngredientData, 'position'>[] = [
  { emoji: '🧀', name: 'Fromage de Paris',   color: 0xFFD700 },
  { emoji: '🍅', name: 'Tomate Bio',          color: 0xFF4444 },
  { emoji: '🧈', name: 'Beurre Normand',      color: 0xFFF176 },
  { emoji: '🌿', name: 'Herbes de Provence',  color: 0x44CC44 },
  { emoji: '🍄', name: 'Truffe Noire',        color: 0x8B4513 }
]