export interface JoystickMovement {
  dx: number
  dz: number
}

export class MobileJoystick {
  private moveX = 0
  private moveZ = 0

  private cameraDeltaYaw   = 0
  private cameraDeltaPitch = 0

  private onJump?: () => void

  private container!:    HTMLDivElement
  private joystickBase!: HTMLDivElement
  private joystickKnob!: HTMLDivElement
  private jumpBtn!:      HTMLDivElement
  private _cameraZone!:  HTMLDivElement

  private joystickTouchId: number | null = null
  private cameraTouchId:   number | null = null
  private joystickOriginX = 0
  private joystickOriginY = 0
  private cameraLastX     = 0
  private cameraLastY     = 0

  private readonly JOYSTICK_RADIUS = 36
  private readonly BASE_SIZE       = 88

  constructor(onJump?: () => void) {
    this.onJump = onJump
    if (!this.isTouchDevice()) return
    this.buildDOM()
    this.bindEvents()
  }

  private isTouchDevice(): boolean {
    if (window.matchMedia('(pointer: coarse)').matches) return true
    if (navigator.maxTouchPoints > 0 && !window.matchMedia('(hover: hover)').matches) return true
    return false
  }

  private buildDOM(): void {
    this.container = document.createElement('div')
    this.container.id = 'mobile-controls'
    Object.assign(this.container.style, {
      position:      'fixed',
      inset:         '0',
      zIndex:        '50',
      pointerEvents: 'none',
      display:       'none',
    })


    this.joystickBase = document.createElement('div')
    Object.assign(this.joystickBase.style, {
      position:       'absolute',
      bottom:         '90px',
      left:           '20px',
      width:          `${this.BASE_SIZE}px`,
      height:         `${this.BASE_SIZE}px`,
      borderRadius:   '50%',
      background:     'rgba(255,255,255,0.07)',
      border:         '1.5px solid rgba(255,215,0,0.35)',
      backdropFilter: 'blur(4px)',
      pointerEvents:  'all',
      touchAction:    'none',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
    })

    this.joystickKnob = document.createElement('div')
    Object.assign(this.joystickKnob.style, {
      width:          '36px',
      height:         '36px',
      borderRadius:   '50%',
      background:     'radial-gradient(circle at 35% 35%, rgba(255,215,0,0.85), rgba(200,130,0,0.65))',
      boxShadow:      '0 0 12px rgba(255,165,0,0.5)',
      pointerEvents:  'none',
      fontSize:       '1.1rem',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      transition:     'box-shadow 0.1s',
    })
    this.joystickKnob.textContent = '🐀'
    this.joystickBase.appendChild(this.joystickKnob)

    this._cameraZone = document.createElement('div')
    Object.assign(this._cameraZone.style, {
      position:      'absolute',
      left:          '50%',
      right:         '0',
      top:           '60px',
      bottom:        '240px',
      pointerEvents: 'all',
      touchAction:   'none',
    })

    const cameraHint = document.createElement('div')
    Object.assign(cameraHint.style, {
      position:      'absolute',
      bottom:        '8px',
      right:         '8px',
      color:         'rgba(255,215,0,0.18)',
      fontSize:      '0.5rem',
      letterSpacing: '1px',
      pointerEvents: 'none',
    })
    cameraHint.textContent = '⟵ CAMÉRA'
    this._cameraZone.appendChild(cameraHint)


    this.jumpBtn = document.createElement('div')
    Object.assign(this.jumpBtn.style, {
      position:       'absolute',
      bottom:         '160px',
      right:          '20px',
      width:          '54px',
      height:         '54px',
      borderRadius:   '50%',
      background:     'radial-gradient(circle, rgba(255,100,50,0.8), rgba(180,50,0,0.6))',
      border:         '1.5px solid rgba(255,150,80,0.45)',
      boxShadow:      '0 0 14px rgba(255,80,0,0.35)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontSize:       '1.4rem',
      pointerEvents:  'all',
      touchAction:    'none',
      userSelect:     'none',
      backdropFilter: 'blur(4px)',
      transition:     'transform 0.08s, box-shadow 0.08s',
    })
    this.jumpBtn.textContent = '🦘'

    const jumpLabel = document.createElement('div')
    Object.assign(jumpLabel.style, {
      position:      'absolute',
      bottom:        '145px',
      right:         '20px',
      width:         '54px',
      textAlign:     'center',
      color:         'rgba(255,150,80,0.4)',
      fontSize:      '0.5rem',
      letterSpacing: '1.5px',
      pointerEvents: 'none',
    })
    jumpLabel.textContent = 'SAUT'

    this.container.appendChild(this.joystickBase)
    this.container.appendChild(this._cameraZone)
    this.container.appendChild(this.jumpBtn)
    this.container.appendChild(jumpLabel)
    document.body.appendChild(this.container)
  }

  private bindEvents(): void {
    this.joystickBase.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const touch = e.changedTouches[0]
      this.joystickTouchId = touch.identifier
      const rect = this.joystickBase.getBoundingClientRect()
      this.joystickOriginX = rect.left + rect.width  / 2
      this.joystickOriginY = rect.top  + rect.height / 2
    }, { passive: false })

    window.addEventListener('touchmove', (e) => {
      e.preventDefault()
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === this.joystickTouchId) {
          const dx = touch.clientX - this.joystickOriginX
          const dy = touch.clientY - this.joystickOriginY
          const dist = Math.sqrt(dx*dx + dy*dy)
          const clamped = Math.min(dist, this.JOYSTICK_RADIUS)
          const angle = Math.atan2(dy, dx)
          const kx = Math.cos(angle) * clamped
          const ky = Math.sin(angle) * clamped
          this.joystickKnob.style.transform = `translate(${kx}px, ${ky}px)`
          this.moveX = (clamped / this.JOYSTICK_RADIUS) * Math.cos(angle)
          this.moveZ = (clamped / this.JOYSTICK_RADIUS) * Math.sin(angle)
        }
        if (touch.identifier === this.cameraTouchId) {
          this.cameraDeltaYaw   -= (touch.clientX - this.cameraLastX) * 0.007
          this.cameraDeltaPitch += (touch.clientY - this.cameraLastY) * 0.005
          this.cameraLastX = touch.clientX
          this.cameraLastY = touch.clientY
        }
      }
    }, { passive: false })

    window.addEventListener('touchend', (e) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === this.joystickTouchId) {
          this.joystickTouchId = null
          this.moveX = 0
          this.moveZ = 0
          this.joystickKnob.style.transform = 'translate(0,0)'
        }
        if (touch.identifier === this.cameraTouchId) {
          this.cameraTouchId = null
        }
      }
    })

    this._cameraZone.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const touch = e.changedTouches[0]
      this.cameraTouchId = touch.identifier
      this.cameraLastX   = touch.clientX
      this.cameraLastY   = touch.clientY
    }, { passive: false })

    this.jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault()
      this.jumpBtn.style.transform = 'scale(0.88)'
      this.jumpBtn.style.boxShadow = '0 0 6px rgba(255,80,0,0.25)'
      this.onJump?.()
    }, { passive: false })

    this.jumpBtn.addEventListener('touchend', () => {
      this.jumpBtn.style.transform = 'scale(1)'
      this.jumpBtn.style.boxShadow = '0 0 14px rgba(255,80,0,0.35)'
    })
  }

  getMovement(): JoystickMovement {
    return { dx: this.moveX, dz: this.moveZ }
  }

  consumeCameraInput(): { dyaw: number; dpitch: number } {
    const out = { dyaw: this.cameraDeltaYaw, dpitch: this.cameraDeltaPitch }
    this.cameraDeltaYaw   = 0
    this.cameraDeltaPitch = 0
    return out
  }

  hide(): void { if (this.container) this.container.style.display = 'none' }
  show(): void { if (this.container) this.container.style.display = 'block' }
  destroy(): void { this.container?.remove() }
}