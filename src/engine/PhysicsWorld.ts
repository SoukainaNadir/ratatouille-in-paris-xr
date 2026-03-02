import * as CANNON from 'cannon-es'
import * as THREE from 'three'

export class PhysicsWorld {
  public world: CANNON.World
  private bodies: Map<string, CANNON.Body> = new Map()
  private meshBodyPairs: Array<{ mesh: THREE.Object3D; body: CANNON.Body }> = []

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -20, 0)
    })
    this.world.broadphase = new CANNON.SAPBroadphase(this.world)
    this.world.allowSleep = true

    const groundMaterial = new CANNON.Material('ground')
    const ratMaterial = new CANNON.Material('rat')
    const butterMaterial = new CANNON.Material('butter')

    const ratGround = new CANNON.ContactMaterial(ratMaterial, groundMaterial, {
      friction: 0.4,
      restitution: 0.1
    })
    const ratButter = new CANNON.ContactMaterial(ratMaterial, butterMaterial, {
      friction: 0.02,
      restitution: 0.3
    })

    this.world.addContactMaterial(ratGround)
    this.world.addContactMaterial(ratButter)
  }

  createGroundPlane(y: number = 0): CANNON.Body {
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: new CANNON.Material('ground')
    })
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    groundBody.position.set(0, y, 0)
    this.world.addBody(groundBody)
    return groundBody
  }

  createBox(
    size: CANNON.Vec3,
    position: CANNON.Vec3,
    mass: number = 0,
    materialName: string = 'ground'
  ): CANNON.Body {
    const body = new CANNON.Body({
      mass,
      shape: new CANNON.Box(size),
      material: new CANNON.Material(materialName)
    })
    body.position.copy(position)
    this.world.addBody(body)
    return body
  }

  createSphere(radius: number, position: CANNON.Vec3, mass: number = 1): CANNON.Body {
    const body = new CANNON.Body({
      mass,
      shape: new CANNON.Sphere(radius),
      linearDamping: 0.3,
      angularDamping: 0.3
    })
    body.position.copy(position)
    this.world.addBody(body)
    return body
  }

  linkMeshToBody(mesh: THREE.Object3D, body: CANNON.Body): void {
    this.meshBodyPairs.push({ mesh, body })
  }

  step(dt: number): void {
    this.world.step(1 / 60, dt, 3)

    for (const { mesh, body } of this.meshBodyPairs) {
      mesh.position.copy(body.position as unknown as THREE.Vector3)
      mesh.quaternion.copy(body.quaternion as unknown as THREE.Quaternion)
    }
  }

  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body)
    this.meshBodyPairs = this.meshBodyPairs.filter(pair => pair.body !== body)
  }
}