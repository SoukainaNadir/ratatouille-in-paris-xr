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

  constructor(data: IngredientData) {
    this.data = data
    this.mesh = new THREE.Group()
    this.particles = this.createParticles()
    this.buildMesh()
    this.mesh.position.copy(data.position)
  }

  private buildMesh(): void {
    const geo = new THREE.DodecahedronGeometry(0.3, 0)
    const mat = new THREE.MeshToonMaterial({
      color: this.data.color,
      emissive: this.data.color,
      emissiveIntensity: 0.3
    })
    const sphere = new THREE.Mesh(geo, mat)
    sphere.castShadow = true

    const ringGeo = new THREE.TorusGeometry(0.45, 0.03, 8, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.data.color,
      transparent: true,
      opacity: 0.6
    })
    this.glowRing = new THREE.Mesh(ringGeo, ringMat)
    this.glowRing.rotation.x = Math.PI / 2

    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.font = '80px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.data.emoji, 64, 64)
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMat = new THREE.SpriteMaterial({ map: texture })
    this.label = new THREE.Sprite(spriteMat)
    this.label.position.set(0, 0.8, 0)
    this.label.scale.set(0.8, 0.8, 1)

    this.mesh.add(sphere, this.glowRing, this.label, this.particles)
  }

  private createParticles(): THREE.Points {
    const count = 20
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const r = 0.5 + Math.random() * 0.3
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi)
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: this.data.color,
      size: 0.08,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true
    })
    return new THREE.Points(geo, mat)
  }

  update(dt: number): void {
    if (this.collected) return
    this.floatTime += dt

    this.mesh.position.y = this.data.position.y + 0.5 + Math.sin(this.floatTime * 1.5) * 0.2

    this.mesh.rotation.y += dt * 1.2

    const scale = 1 + Math.sin(this.floatTime * 3) * 0.15
    this.glowRing.scale.set(scale, scale, scale)
    ;(this.glowRing.material as THREE.MeshBasicMaterial).opacity =
      0.4 + Math.sin(this.floatTime * 3) * 0.3

    this.particles.rotation.y += dt * 0.5
    this.particles.rotation.x += dt * 0.3
  }

  collect(): void {
    this.collected = true
    this.mesh.visible = false
  }

  getPosition(): THREE.Vector3 {
    return this.mesh.position.clone()
  }

  getCollectionRadius(): number {
    return 1.2
  }
  resetIngredient(): void {
    this.collected = false
    this.mesh.visible = true
    this.floatTime = 0
  }
}

export const INGREDIENTS_DATA: Omit<IngredientData, 'position'>[] = [
  { emoji: '🧀', name: 'Fromage de Paris', color: 0xFFD700 },
  { emoji: '🍅', name: 'Tomate Bio',        color: 0xFF4444 },
  { emoji: '🧈', name: 'Beurre Normand',    color: 0xFFF176 },
  { emoji: '🌿', name: 'Herbes de Provence',color: 0x44CC44 },
  { emoji: '🍄', name: 'Truffe Noire',      color: 0x8B4513 }
]