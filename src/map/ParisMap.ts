import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { PhysicsWorld } from '../engine/PhysicsWorld'

export class ParisMap {
  private scene: THREE.Scene
  private physics: PhysicsWorld
  public buildings: THREE.Group = new THREE.Group()
  private balloon!: THREE.Group
  private fountainWater!: THREE.Mesh
  public ambushSpots: THREE.Vector3[] = []
  private buildingBounds: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }> = []

  private readonly MAP_SIZE = 120

  private readonly C = {
    road:     0x8a7a6a,
    sidewalk: 0xe8d0a8,
    trunk:    0x8a6a45,
    leaves:   0x5a9a50,
    stone:    0xddd0c0,
    water:    0x5a8eaa,
    lamp:     0x4a3a28,
  }

  constructor(scene: THREE.Scene, physics: PhysicsWorld) {
    this.scene = scene
    this.physics = physics
  }

  build(): void {
    this.setupAtmosphere()
    this.createGround()
    this.createSeine()
    this.createMergedCity()
    this.createAlleyways()
    this.createButterPuddles()
    this.createStreetLights()
    this.createCentralFountain()
    this.createTrees()
    this.createHotAirBalloon()
    this.scene.add(this.buildings)
    this.loadEiffelTower()
  }

  update(t: number): void {
    if (this.fountainWater) {
      this.fountainWater.scale.x = 1 + Math.sin(t * 2.5) * 0.04
      this.fountainWater.scale.z = 1 + Math.cos(t * 2.5) * 0.04
    }
    if (this.balloon) {
      this.balloon.position.y = 32 + Math.sin(t * 0.35) * 2.5
      this.balloon.rotation.y += 0.002
    }
  }

  private setupAtmosphere(): void {
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(200, 12, 6),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          topColor:    { value: new THREE.Color(0x7a4a8a) },
          bottomColor: { value: new THREE.Color(0xffb347) },
          offset:      { value: 20.0 },
          exponent:    { value: 0.5 },
        },
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 topColor; uniform vec3 bottomColor;
          uniform float offset; uniform float exponent;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition + offset).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0),exponent),0.0)),1.0);
          }`,
      })
    )
    skyDome.frustumCulled = false
    this.scene.add(skyDome)

    this.scene.fog = new THREE.Fog(0xffb060, 40, 110)

    const sun = new THREE.DirectionalLight(0xff8822, 2.5)
    sun.position.set(40, 60, 20)
    sun.castShadow = true
    sun.shadow.mapSize.width  = 512
    sun.shadow.mapSize.height = 512
    sun.shadow.camera.near   = 1
    sun.shadow.camera.far    = 120
    sun.shadow.camera.left   = -50
    sun.shadow.camera.right  =  50
    sun.shadow.camera.top    =  50
    sun.shadow.camera.bottom = -50
    sun.shadow.autoUpdate = false
    sun.shadow.needsUpdate = true
    this.scene.add(sun)

    const fill = new THREE.DirectionalLight(0x9966cc, 0.4)
    fill.position.set(-30, 20, -20)
    this.scene.add(fill)
    this.scene.add(new THREE.AmbientLight(0xffd6a5, 0.5))
  }

  private createGround(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshLambertMaterial({ color: this.C.road })
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)
    this.physics.createGroundPlane(0)

    const swGeos: THREE.BufferGeometry[] = []
    const dummy = new THREE.Object3D()
    for (const r of [0, 18, -18, 36, -36, 54, -54]) {
      const hg = new THREE.PlaneGeometry(300, 4.5)
      dummy.position.set(0, 0.01, r); dummy.rotation.x = -Math.PI / 2; dummy.updateMatrix()
      hg.applyMatrix4(dummy.matrix); swGeos.push(hg)
      const vg = new THREE.PlaneGeometry(4.5, 300)
      dummy.position.set(r, 0.01, 0); dummy.updateMatrix()
      vg.applyMatrix4(dummy.matrix); swGeos.push(vg)
    }
    dummy.rotation.set(0, 0, 0)
    const swMerged = mergeGeometries(swGeos, false)
    if (swMerged) {
      const sw = new THREE.Mesh(swMerged, new THREE.MeshLambertMaterial({ color: this.C.sidewalk }))
      sw.receiveShadow = true
      this.scene.add(sw)
    }
  }

  private createSeine(): void {
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 20),
      new THREE.MeshLambertMaterial({ color: this.C.water, transparent: true, opacity: 0.9 })
    )
    river.rotation.x = -Math.PI / 2
    river.position.set(0, 0.02, -35)
    this.scene.add(river)

    const stoneGeos: THREE.BufferGeometry[] = []
    const dummy = new THREE.Object3D()
    for (const side of [-1, 1]) {
      const qg = new THREE.PlaneGeometry(300, 5)
      dummy.position.set(0, 0.03, -35 + side * 12)
      dummy.rotation.x = -Math.PI / 2; dummy.updateMatrix()
      qg.applyMatrix4(dummy.matrix); stoneGeos.push(qg)
    }
    dummy.rotation.set(0, 0, 0)
    for (const bx of [8, -8]) {
      const dg = new THREE.BoxGeometry(7, 0.5, 22)
      dummy.position.set(bx, 0.9, -35); dummy.updateMatrix()
      dg.applyMatrix4(dummy.matrix); stoneGeos.push(dg)
    }
    for (const [bx, pz] of [[8,-7],[8,0],[8,7],[-8,-7],[-8,0],[-8,7]] as [number,number][]) {
      const pg = new THREE.CylinderGeometry(0.55, 0.65, 2.5, 6)
      dummy.position.set(bx, 0.5, -35 + pz); dummy.updateMatrix()
      pg.applyMatrix4(dummy.matrix); stoneGeos.push(pg)
    }
    const stoneMerged = mergeGeometries(stoneGeos, false)
    if (stoneMerged)
      this.scene.add(new THREE.Mesh(stoneMerged, new THREE.MeshLambertMaterial({ color: this.C.stone })))
  }

  private createMergedCity(): void {
    const blocks: [number, number, number, number, number][] = [
      [ 10,  15,  8,  6,  14], [ 20,  15,  7,  7,  18], [ 30,  15,  8,  6,  12],
      [ 10,  25,  6,  5,  10], [ 20,  25,  8,  6,  16], [ 30,  25,  6,  6,  14],
      [ 10,  35,  7,  6,  11], [ 20,  35,  6,  5,  13], [ 30,  35,  7,  6,   9],
      [-10,  15,  8,  6,  16], [-20,  15,  7,  7,  14], [-30,  15,  8,  6,  18],
      [-10,  25,  6,  5,  12], [-20,  25,  8,  6,  10], [-30,  25,  6,  6,  15],
      [-10,  35,  7,  6,   9], [-20,  35,  6,  5,  11], [-30,  35,  7,  6,  13],
      [ 38,   5,  6,  6,  12], [ 38,  15,  5,  5,   9], [ 38,  25,  6,  5,  11],
      [ 38,  -5,  6,  6,  10], [ 38, -15,  5,  5,  13], [ 38, -25,  6,  5,   8],
      [-38,   5,  6,  6,  11], [-38,  15,  5,  5,  10], [-38,  25,  6,  5,  14],
      [-38,  -5,  6,  6,   9], [-38, -15,  5,  5,  12], [-38, -25,  6,  5,   8],
      [ 10, -15,  8,  6,  15], [ 20, -15,  7,  7,  11], [ 30, -15,  8,  6,  14],
      [ 10, -25,  6,  5,  10], [ 20, -25,  7,  6,  13],
      [-10, -15,  8,  6,  12], [-20, -15,  7,  7,  16],
      [-10, -25,  6,  5,  14], [-20, -25,  7,  6,  11],
      [  7,   7,  5,  5,  10], [ -7,   7,  5,  5,  12], [  7,  -7,  5,  5,   9], [ -7,  -7,  5,  5,  11],
      [ 46,  10,  5,  5,   8], [-46,  10,  5,  5,   9], [ 46, -10,  5,  5,   7], [-46, -10,  5,  5,   8],
      [ 46,  28,  5,  5,   7], [-46,  28,  5,  5,   8],
    ]

    const geoBody: THREE.BufferGeometry[]    = []
    const geoBand: THREE.BufferGeometry[]    = []
    const geoMansard: THREE.BufferGeometry[] = []
    const geoChimney: THREE.BufferGeometry[] = []
    const geoDoor: THREE.BufferGeometry[]    = []
    const geoWinLit: THREE.BufferGeometry[]  = []
    const geoWinDark: THREE.BufferGeometry[] = []
    const geoWinWarm: THREE.BufferGeometry[] = []
    const geoBalcony: THREE.BufferGeometry[] = []
    const geoAwning: THREE.BufferGeometry[]  = []
    const dummy = new THREE.Object3D()

    for (const [x, z, w, d, h] of blocks) {
      this.physics.createBox(new CANNON.Vec3(w/2, h/2, d/2), new CANNON.Vec3(x, h/2, z))
      this.buildingBounds.push({ minX: x-w/2, maxX: x+w/2, minZ: z-d/2, maxZ: z+d/2 })

      dummy.position.set(x, h/2, z); dummy.updateMatrix()
      const body = new THREE.BoxGeometry(w, h, d)
      body.applyMatrix4(dummy.matrix); geoBody.push(body)

      const bandCount = Math.floor(h / 2.5)
      for (let f = 1; f < bandCount; f++) {
        const band = new THREE.BoxGeometry(w+0.12, 0.12, d+0.12)
        dummy.position.set(x, f*2.5, z); dummy.updateMatrix()
        band.applyMatrix4(dummy.matrix); geoBand.push(band)
      }

      const r1 = new THREE.BoxGeometry(w+0.4, h*0.18, d+0.4)
      dummy.position.set(x, h+h*0.09, z); dummy.updateMatrix()
      r1.applyMatrix4(dummy.matrix); geoMansard.push(r1)

      const r2 = new THREE.BoxGeometry(w*0.58, h*0.12, d*0.58)
      dummy.position.set(x, h+h*0.23, z); dummy.updateMatrix()
      r2.applyMatrix4(dummy.matrix); geoMansard.push(r2)

      const chimneyCount = 1 + Math.floor(Math.random() * 2)
      for (let c = 0; c < chimneyCount; c++) {
        const chimneyH = 1.0 + Math.random() * 1.2
        const cx = x + (Math.random()-0.5)*w*0.7
        const cz = z + (Math.random()-0.5)*d*0.7
        const baseY = h + h*0.3
        const ch = new THREE.BoxGeometry(0.35, chimneyH, 0.35)
        dummy.position.set(cx, baseY+chimneyH/2, cz); dummy.updateMatrix()
        ch.applyMatrix4(dummy.matrix); geoChimney.push(ch)
      }

      const doorX = x + (Math.random()-0.5)*(w-1.5)
      const door = new THREE.BoxGeometry(0.9, 1.9, 0.12)
      dummy.position.set(doorX, 0.95, z+d/2+0.06); dummy.updateMatrix()
      door.applyMatrix4(dummy.matrix); geoDoor.push(door)

      if (Math.random() > 0.5) {
        const awn = new THREE.BoxGeometry(w*0.65, 0.14, 1.6)
        dummy.position.set(x, 2.35, z+d/2+0.8)
        dummy.rotation.set(0.3, 0, 0); dummy.updateMatrix()
        awn.applyMatrix4(dummy.matrix); geoAwning.push(awn)
        dummy.rotation.set(0, 0, 0)
      }

      const floors = Math.floor(h/2.5)
      for (let f = 1; f < floors; f += 3) {
        const slab = new THREE.BoxGeometry(w*0.55, 0.12, 0.7)
        dummy.position.set(x, f*2.5+0.04, z+d/2+0.35); dummy.updateMatrix()
        slab.applyMatrix4(dummy.matrix); geoBalcony.push(slab)
      }

      const rows = Math.min(Math.floor(h/2.5), 4)
      const cols = Math.min(Math.floor(w/1.8), 4)
      const winGeo = new THREE.PlaneGeometry(0.52, 0.72)
      for (let row = 1; row <= rows; row++) {
        for (let col = 0; col < cols; col++) {
          const wx = x - w/2 + (col+0.7)*(w/cols)
          const wy = row * 2.5
          const wz = z + d/2 + 0.01
          const r  = Math.random()
          const win = winGeo.clone()
          dummy.position.set(wx, wy, wz); dummy.updateMatrix()
          win.applyMatrix4(dummy.matrix)
          if (r > 0.85) geoWinWarm.push(win)
          else if (r > 0.25) geoWinLit.push(win)
          else geoWinDark.push(win)
        }
      }
    }

    const flush = (geos: THREE.BufferGeometry[], mat: THREE.Material, shadow = true) => {
      if (!geos.length) return
      const merged = mergeGeometries(geos, false)
      if (!merged) return
      const mesh = new THREE.Mesh(merged, mat)
      if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true }
      this.buildings.add(mesh)
    }

    flush(geoBody,    new THREE.MeshLambertMaterial({ color: 0xe8c898 }))
    flush(geoBand,    new THREE.MeshLambertMaterial({ color: 0xe8d5b0 }))
    flush(geoMansard, new THREE.MeshLambertMaterial({ color: 0x9b6b8a }))
    flush(geoChimney, new THREE.MeshLambertMaterial({ color: 0x8a6a5a }))
    flush(geoDoor,    new THREE.MeshLambertMaterial({ color: 0x3a2010 }))
    flush(geoBalcony, new THREE.MeshLambertMaterial({ color: 0xd8c8a8 }))
    flush(geoAwning,  new THREE.MeshLambertMaterial({ color: 0xc87820 }))
    flush(geoWinLit,  new THREE.MeshBasicMaterial({ color: 0xff9944, transparent: true, opacity: 0.95 }), false)
    flush(geoWinWarm, new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.88 }), false)
    flush(geoWinDark, new THREE.MeshBasicMaterial({ color: 0x2a3040, transparent: true, opacity: 0.85 }), false)
  }

  private createAlleyways(): void {
    const archways: [number, number, number][] = [
      [ 15,  20,   0], [-15,  20, Math.PI],
      [ 25,  -5,   0], [-25,  -5, Math.PI],
      [  0,  30, Math.PI/2], [  0, -20, Math.PI/2],
      [ 35,  20,   0], [-35,  20, Math.PI],
    ]
    const geoArch: THREE.BufferGeometry[] = []
    const geoDark: THREE.BufferGeometry[] = []
    const dummy = new THREE.Object3D()

    for (const [x, z, ry] of archways) {
      const place = (geo: THREE.BufferGeometry, lx: number, ly: number, lz: number, arr: THREE.BufferGeometry[]) => {
        const g = geo.clone()
        const local = new THREE.Object3D()
        local.position.set(lx, ly, lz); local.updateMatrix()
        dummy.position.set(x, 0, z); dummy.rotation.y = ry; dummy.updateMatrix()
        g.applyMatrix4(dummy.matrix.clone().multiply(local.matrix))
        arr.push(g)
      }
      place(new THREE.BoxGeometry(1.3, 5.5, 1.3), -2.2, 2.75, 0, geoArch)
      place(new THREE.BoxGeometry(1.3, 5.5, 1.3),  2.2, 2.75, 0, geoArch)
      place(new THREE.BoxGeometry(5.8, 1.6, 1.3),  0.0, 5.80, 0, geoArch)
      place(new THREE.BoxGeometry(2.6, 3.8, 0.9),  0.0, 2.90, 0.2, geoDark)

      const off = new THREE.Vector3(0, 0.5, 1.8).applyEuler(new THREE.Euler(0, ry, 0))
      this.ambushSpots.push(new THREE.Vector3(x+off.x, 0.5, z+off.z))
      this.physics.createBox(new CANNON.Vec3(0.65, 2.75, 0.65), new CANNON.Vec3(x-2.2, 2.75, z))
      this.physics.createBox(new CANNON.Vec3(0.65, 2.75, 0.65), new CANNON.Vec3(x+2.2, 2.75, z))
    }

    dummy.rotation.set(0, 0, 0)
    const mArch = mergeGeometries(geoArch, false)
    if (mArch) this.scene.add(new THREE.Mesh(mArch, new THREE.MeshLambertMaterial({ color: 0xd0c0a8 })))
    const mDark = mergeGeometries(geoDark, false)
    if (mDark) this.scene.add(new THREE.Mesh(mDark, new THREE.MeshLambertMaterial({ color: 0x3a3028 })))
  }

  private createButterPuddles(): void {
    const spots: [number, number, number][] = [
      [15,20,1.1],[-15,20,0.9],[25,-5,1.0],[-25,-5,1.1],[0,30,0.8],[0,-20,1.0],
      [3,4,0.7],[-3,-4,0.9],[5,-3,0.8],[-5,3,0.7],[7,-23,1.0],[-7,-23,0.9],
      [18,8,0.8],[-18,-8,1.0],[12,-10,0.9],[-12,10,0.8],
    ]
    const geos: THREE.BufferGeometry[] = []
    const dummy = new THREE.Object3D()
    for (const [px, pz, r] of spots) {
      const g = new THREE.CircleGeometry(r, 7)
      dummy.position.set(px, 0.03, pz); dummy.rotation.x = -Math.PI/2; dummy.updateMatrix()
      g.applyMatrix4(dummy.matrix); geos.push(g)
    }
    dummy.rotation.set(0, 0, 0)
    const merged = mergeGeometries(geos, false)
    if (merged)
      this.scene.add(new THREE.Mesh(merged,
        new THREE.MeshBasicMaterial({ color: 0xffe880, transparent: true, opacity: 0.72 })))
  }

  private createStreetLights(): void {
    const positions: [number, number][] = [
      [6,6],[-6,6],[6,-6],[-6,-6],
      [14,14],[-14,14],[14,-14],[-14,-14],
      [0,22],[0,-22],[22,0],[-22,0],
      [22,18],[-22,18],[22,-18],[-22,-18],
      [36,5],[-36,5],[36,-5],[-36,-5],
    ]
    const geoPole: THREE.BufferGeometry[] = []
    const geoBulb: THREE.BufferGeometry[] = []
    const dummy = new THREE.Object3D()

    for (const [x, z] of positions) {
      const pole = new THREE.CylinderGeometry(0.06, 0.1, 5.5, 5)
      dummy.position.set(x, 2.75, z); dummy.rotation.set(0,0,0); dummy.updateMatrix()
      pole.applyMatrix4(dummy.matrix); geoPole.push(pole)

      const arm = new THREE.BoxGeometry(1.2, 0.07, 0.07)
      dummy.position.set(x+0.6, 5.6, z); dummy.updateMatrix()
      arm.applyMatrix4(dummy.matrix); geoPole.push(arm)

      const bulb = new THREE.SphereGeometry(0.15, 5, 4)
      dummy.position.set(x+1.2, 5.42, z); dummy.updateMatrix()
      bulb.applyMatrix4(dummy.matrix); geoBulb.push(bulb)
    }

    const mPole = mergeGeometries(geoPole, false)
    if (mPole) this.scene.add(new THREE.Mesh(mPole, new THREE.MeshLambertMaterial({ color: this.C.lamp })))
    const mBulb = mergeGeometries(geoBulb, false)
    if (mBulb) this.scene.add(new THREE.Mesh(mBulb, new THREE.MeshBasicMaterial({ color: 0xff9933 })))

    for (const [x, z] of [[6,6],[-6,-6]] as [number,number][]) {
      const light = new THREE.PointLight(0xff8833, 3.0, 25, 2)
      light.position.set(x+1.2, 5.4, z)
      this.scene.add(light)
    }
  }

  private createCentralFountain(): void {
    const stone = new THREE.MeshLambertMaterial({ color: this.C.stone })
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(11, 16),
      new THREE.MeshLambertMaterial({ color: 0xeeddc8 }))
    plaza.rotation.x = -Math.PI/2; plaza.position.y = 0.02; this.scene.add(plaza)

    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.32, 5, 16), stone)
    rim.rotation.x = Math.PI/2; rim.position.y = 0.38; this.scene.add(rim)

    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.8, 0.5, 12), stone)
    base.position.y = 0.25; this.scene.add(base)

    this.fountainWater = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 3.5, 0.15, 14),
      new THREE.MeshLambertMaterial({ color: this.C.water, transparent: true, opacity: 0.8 }))
    this.fountainWater.position.y = 0.55; this.scene.add(this.fountainWater)

    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 4.5, 7), stone)
    col.position.y = 2.75; this.scene.add(col)

    const top = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 5), stone)
    top.position.y = 5.5; this.scene.add(top)

    const fLight = new THREE.PointLight(0x88ccff, 1.2, 12)
    fLight.position.set(0, 1.5, 0); this.scene.add(fLight)
  }

  private createTrees(): void {
    const positions: [number, number][] = [
      [-8,8],[8,8],[-8,-8],[8,-8],[15,0],[-15,0],[0,15],[0,-14],
      [12,24],[-12,24],[28,10],[-28,10],[32,-8],[-32,-8],
      [18,30],[-18,30],[40,18],[-40,18],
    ]
    const geoTrunks: THREE.BufferGeometry[] = []
    const geoLeaves: THREE.BufferGeometry[] = []
    const dummy = new THREE.Object3D()

    for (const [x, z] of positions) {
      const trunk = new THREE.CylinderGeometry(0.16, 0.23, 2.4, 5)
      dummy.position.set(x, 1.2, z); dummy.rotation.set(0,0,0); dummy.updateMatrix()
      trunk.applyMatrix4(dummy.matrix); geoTrunks.push(trunk)

      const bot = new THREE.DodecahedronGeometry(1.6, 0)
      dummy.position.set(x, 3.2, z); dummy.updateMatrix()
      bot.applyMatrix4(dummy.matrix); geoLeaves.push(bot)

      const top = new THREE.DodecahedronGeometry(1.05, 0)
      dummy.position.set(x, 4.5, z); dummy.updateMatrix()
      top.applyMatrix4(dummy.matrix); geoLeaves.push(top)
    }

    const mTrunk = mergeGeometries(geoTrunks, false)
    if (mTrunk) this.scene.add(new THREE.Mesh(mTrunk, new THREE.MeshLambertMaterial({ color: this.C.trunk })))
    const mLeaf = mergeGeometries(geoLeaves, false)
    if (mLeaf) {
      const m = new THREE.Mesh(mLeaf, new THREE.MeshToonMaterial({ color: this.C.leaves }))
      m.castShadow = true
      this.scene.add(m)
    }
  }

  private createHotAirBalloon(): void {
    this.balloon = new THREE.Group()
    const colors = [0xff7090, 0xffc0d0, 0xff7090, 0xffc0d0]
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(3.2, 4, 8, (i/4)*Math.PI*2, Math.PI/2),
        new THREE.MeshToonMaterial({ color: colors[i], side: THREE.DoubleSide }))
      p.scale.y = 1.4; this.balloon.add(p)
    }
    const basket = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.5),
      new THREE.MeshLambertMaterial({ color: 0xc09050 }))
    basket.position.y = -5.6; this.balloon.add(basket)
    this.balloon.position.set(14, 32, 0); this.scene.add(this.balloon)
  }

private loadEiffelTower(): void {
  const BASE = '/ratatouille-in-paris/'

  new GLTFLoader().load(`${BASE}eiffel_tower.glb`, (gltf) => {
    const tower = gltf.scene
    const box = new THREE.Box3().setFromObject(tower)
    const size = new THREE.Vector3(); box.getSize(size)
    tower.scale.setScalar(38 / size.y)
    box.setFromObject(tower)
    tower.position.set(0, -box.min.y, -55)
    tower.traverse(c => { if ((c as THREE.Mesh).isMesh) c.castShadow = true })
    this.scene.add(tower)
    this.physics.createBox(new CANNON.Vec3(4, 19, 4), new CANNON.Vec3(0, 19, -55))
  }, undefined, (err) => {
    console.error('Eiffel GLB failed:', err) 
    this.createEiffelFallback()
  })
}

  private createEiffelFallback(): void {
    const grp = new THREE.Group()
    const mat = new THREE.MeshLambertMaterial({ color: 0x4a4a5a })
    for (const [lx, lz] of [[1,1],[-1,1],[1,-1],[-1,-1]] as [number,number][]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.8, 9, 5), mat)
      leg.position.set(lx*3.5, 4.5, lz*3.5); grp.add(leg)
    }
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 7), mat); p1.position.y = 9; grp.add(p1)
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 2.8, 9, 7), mat); mid.position.y = 14; grp.add(mid)
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.8, 16, 5), mat); spire.position.y = 27; grp.add(spire)
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 5, 4),
      new THREE.MeshBasicMaterial({ color: 0xff3333 }))
    tip.position.y = 35; grp.add(tip)
    grp.position.set(0, 0, -55); this.scene.add(grp)
    this.physics.createBox(new CANNON.Vec3(4, 18, 4), new CANNON.Vec3(0, 18, -55))
  }

  getBounds() {
    const h = this.MAP_SIZE / 2
    return { min: new THREE.Vector3(-h, 0, -h), max: new THREE.Vector3(h, 0, h) }
  }

  getIngredientSpawnPositions(): THREE.Vector3[] {
     return [
    new THREE.Vector3( 15, 0.5,  20),  
    new THREE.Vector3(-22, 0.5, -20),  
    new THREE.Vector3(  0, 0.5, -14),  
    new THREE.Vector3(-35, 0.5,  22),  
    new THREE.Vector3( 30, 0.5, -27), 
  ]
}

  getCatPatrolRoutes(): THREE.Vector3[][] {
    return [
      [new THREE.Vector3(10,0.5,15), new THREE.Vector3(30,0.5,15), new THREE.Vector3(30,0.5,35), new THREE.Vector3(10,0.5,35)],
      [new THREE.Vector3(-10,0.5,-15), new THREE.Vector3(-30,0.5,-15), new THREE.Vector3(-30,0.5,-25), new THREE.Vector3(-10,0.5,-25)],
      [new THREE.Vector3(12,0.5,0), new THREE.Vector3(12,0.5,-22), new THREE.Vector3(-12,0.5,-22), new THREE.Vector3(-12,0.5,0)],
    ]
  }

  isInsideBuilding(x: number, z: number): boolean {
    for (const bb of this.buildingBounds) {
      if (x > bb.minX && x < bb.maxX && z > bb.minZ && z < bb.maxZ) return true
    }
    return false
  }


  resolveCollision(pos: THREE.Vector3, radius = 0.4): THREE.Vector3 {
  const out = pos.clone()
  for (const bb of this.buildingBounds) {
    const margin = radius
    if (
      out.x > bb.minX - margin && out.x < bb.maxX + margin &&
      out.z > bb.minZ - margin && out.z < bb.maxZ + margin
    ) {
      const overlapLeft  = out.x - (bb.minX - margin)
      const overlapRight = (bb.maxX + margin) - out.x
      const overlapFront = out.z - (bb.minZ - margin)
      const overlapBack  = (bb.maxZ + margin) - out.z

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapFront, overlapBack)

      if (minOverlap === overlapLeft)  out.x = bb.minX - margin
      else if (minOverlap === overlapRight) out.x = bb.maxX + margin
      else if (minOverlap === overlapFront) out.z = bb.minZ - margin
      else out.z = bb.maxZ + margin
    }
  }
  return out
}
  getAmbushPositions(): THREE.Vector3[] { return this.ambushSpots }
}