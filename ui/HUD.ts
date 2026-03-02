import * as THREE from 'three'

export class HUD {
  private livesEl: HTMLElement
  private timerEl: HTMLElement
  private scoreEl: HTMLElement
  private messageEl: HTMLElement
  private minimapCanvas: HTMLCanvasElement
  private minimapCtx: CanvasRenderingContext2D
  private messageTimeout: number | null = null

  constructor() {
    this.livesEl = document.getElementById('lives')!
    this.timerEl = document.getElementById('timer')!
    this.scoreEl = document.getElementById('score-val')!
    this.messageEl = document.getElementById('message-box')!
    this.minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement
    this.minimapCtx = this.minimapCanvas.getContext('2d')!
  }

  updateLives(lives: number): void {
    const emojis = ['', '🐀', '🐀🐀', '🐀🐀🐀']
    this.livesEl.textContent = emojis[Math.max(0, Math.min(3, lives))]
    this.livesEl.style.animation = 'none'
    void this.livesEl.offsetWidth
    this.livesEl.style.animation = 'collectPop 0.5s ease'
  }

  updateTimer(seconds: number): void {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const str = `${mins}:${secs.toString().padStart(2, '0')}`
    this.timerEl.textContent = str

    if (seconds <= 30) {
      this.timerEl.style.color = '#ff4444'
      this.timerEl.style.textShadow = '0 0 20px rgba(255,50,50,0.7)'
    } else if (seconds <= 60) {
      this.timerEl.style.color = '#ffaa00'
    } else {
      this.timerEl.style.color = '#FFD700'
    }
  }

  updateScore(score: number): void {
    this.scoreEl.textContent = score.toString()
  }

  collectIngredient(index: number): void {
    const slot = document.getElementById(`slot-${index}`)
    if (slot) {
      slot.classList.add('collected')
    }
  }

  showMessage(text: string, duration = 2500): void {
    this.messageEl.textContent = text
    this.messageEl.classList.add('show')

    if (this.messageTimeout !== null) {
      clearTimeout(this.messageTimeout)
    }
    this.messageTimeout = window.setTimeout(() => {
      this.messageEl.classList.remove('show')
    }, duration)
  }

  updateMinimap(
    ratX: number,
    ratZ: number,
    ingredientPositions: Array<{ x: number; z: number; collected: boolean }>,
    catPositions: Array<{ x: number; z: number }>,
    mapSize = 80
  ): void {
    const ctx = this.minimapCtx
    const w = this.minimapCanvas.width
    const h = this.minimapCanvas.height
    const half = mapSize / 2

    ctx.clearRect(0, 0, w, h)

    // Background
    ctx.fillStyle = 'rgba(10,5,0,0.85)'
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2)
    ctx.fill()

    const toMap = (wx: number, wz: number) => {
      const clamped_x = Math.max(-half, Math.min(half, wx))
      const clamped_z = Math.max(-half, Math.min(half, wz))
      return {
        px: ((clamped_x + half) / mapSize) * w,
        py: ((clamped_z + half) / mapSize) * h
      }
    }
    // Grid lines
    ctx.strokeStyle = 'rgba(100,90,70,0.3)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 5; i++) {
      ctx.beginPath()
      ctx.moveTo((i / 5) * w, 0)
      ctx.lineTo((i / 5) * w, h)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, (i / 5) * h)
      ctx.lineTo(w, (i / 5) * h)
      ctx.stroke()
    }

    // Ingredients
    for (const ing of ingredientPositions) {
      if (!ing.collected) {
        const { px, py } = toMap(ing.x, ing.z)
        ctx.fillStyle = '#FFD700'
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,215,0,0.3)'
        ctx.beginPath()
        ctx.arc(px, py, 7, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Cats
    for (const cat of catPositions) {
      const { px, py } = toMap(cat.x, cat.z)
      ctx.fillStyle = '#ff4444'
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Player (rat)
    const ratPx = toMap(ratX, ratZ)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(ratPx.px, ratPx.py, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Clip to circle
    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  showWin(score: number): void {
  document.getElementById('final-score')!.textContent = Math.round(score).toString()
    const win = document.getElementById('win-screen')!
    win.style.display = 'flex'
  }

  showLose(reason: 'cat' | 'time'): void {
  const id = reason === 'cat' ? 'lose-screen-cat' : 'lose-screen-time'
  document.getElementById(id)!.style.display = 'flex'
}
}