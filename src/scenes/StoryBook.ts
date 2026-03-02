
interface Slide {
  image: string
  title: string
  subtitle: string
  align: 'top' | 'bottom'
}
const BASE = '/ratatouille-in-paris/'
const SLIDES: Slide[] = [
  {
    image: `${BASE}story1.png`,
    title: 'Le restaurant de Gusteau ferme ce soir à minuit.',
    subtitle: 'Des années de gloire... sur le point de s\'éteindre pour toujours.',
    align: 'bottom'
  },
  {
    image: `${BASE}story2.png`,
    title: 'La Ratatouille Impériale — la seule recette qui peut le sauver.',
    subtitle: '5 ingrédients légendaires, éparpillés aux quatre coins de Paris.',
    align: 'bottom'
  },
  {
    image: `${BASE}story3.png`,
    title: 'Quelqu\'un doit les récupérer.',
    subtitle: 'Tu connais ces toits comme ta poche. C\'est l\'heure de prouver ton talent.',
    align: 'bottom'
  },
  {
    image: `${BASE}story4.png`,
    title: 'Mais Skinner a lâché ses chats dans toute la ville.',
    subtitle: 'Ils patrouillent. Ils traquent. Un seul contact — et c\'est terminé.',
    align: 'top'
  }, 
  {
    image: `${BASE}story5.png`,
    title: '2 minutes. C\'est tout ce qu\'il te reste.',
    subtitle: 'C\'est maintenant ou jamais, Chef.',
    align: 'bottom'
  }
]

export class StoryBook {
  private container: HTMLElement
  private current = 0
  private transitioning = false
  private onComplete: () => void

  constructor(onComplete: () => void) {
    this.onComplete = onComplete
    this.container = document.createElement('div')
    this.container.id = 'storybook'
    this.injectStyles()
    document.body.appendChild(this.container)
    this.render()
    this.bindKeys()
  }

  private injectStyles(): void {
    if (document.getElementById('sb-styles')) return
    const s = document.createElement('style')
    s.id = 'sb-styles'
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&display=swap');

      #storybook {
        position: fixed; inset: 0; z-index: 500;
        background: #000;
        font-family: 'Playfair Display', Georgia, serif;
        cursor: pointer;
        user-select: none;
      }

      .sb-slide {
        position: absolute; inset: 0;
        opacity: 0;
        transition: opacity 0.9s ease;
      }
      .sb-slide.active  { opacity: 1; }
      .sb-slide.leaving { opacity: 0; }

      .sb-img {
        position: absolute; inset: 0;
        background-size: cover;
        background-position: center;
        animation: sbKenBurns 9s ease-out forwards;
      }
      @keyframes sbKenBurns {
        from { transform: scale(1);    filter: brightness(0.45); }
        to   { transform: scale(1.07); filter: brightness(0.72); }
      }

      .sb-grad-bottom {
        position: absolute; inset: 0;
        background: linear-gradient(
          to top,
          rgba(0,0,0,0.95) 0%,
          rgba(0,0,0,0.45) 38%,
          transparent      62%
        );
      }
      .sb-grad-top {
        position: absolute; inset: 0;
        background: linear-gradient(
          to bottom,
          rgba(0,0,0,0.95) 0%,
          rgba(0,0,0,0.45) 38%,
          transparent      62%
        );
      }

      .sb-text-bottom {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        padding: 70px 12% 55px;
        text-align: center;
        animation: sbFadeUp 1.3s 0.4s ease both;
      }
      .sb-text-top {
        position: absolute;
        top: 0; left: 0; right: 0;
        padding: 55px 12% 70px;
        text-align: center;
        animation: sbFadeDown 1.3s 0.4s ease both;
      }
      @keyframes sbFadeUp {
        from { opacity: 0; transform: translateY(28px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes sbFadeDown {
        from { opacity: 0; transform: translateY(-28px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .sb-title {
        font-size: clamp(1.2rem, 2.8vw, 1.9rem);
        font-weight: 700;
        color: #fff;
        text-shadow: 0 2px 24px rgba(0,0,0,1), 0 0 60px rgba(0,0,0,0.9);
        line-height: 1.45;
        margin-bottom: 14px;
        font-style: italic;
      }

      .sb-subtitle {
        font-size: clamp(0.82rem, 1.6vw, 1rem);
        color: rgba(255, 215, 160, 0.8);
        text-shadow: 0 2px 14px rgba(0,0,0,1);
        font-weight: 400;
        font-style: italic;
        line-height: 1.65;
      }

      .sb-play {
        display: inline-block;
        margin-top: 28px;
        padding: 15px 48px;
        background: rgba(160,100,20,0.75);
        border: 1.5px solid rgba(255,200,80,0.5);
        color: #fff8e8;
        font-family: 'Playfair Display', serif;
        font-size: 1rem; font-weight: 700;
        letter-spacing: 3px; border-radius: 50px;
        cursor: pointer;
        backdrop-filter: blur(8px);
        animation: sbPulse 2s ease-in-out infinite;
        white-space: nowrap;
        text-shadow: 0 2px 8px rgba(0,0,0,0.8);
        box-shadow: 0 6px 25px rgba(0,0,0,0.5);
      }
      @keyframes sbPulse {
        0%,100% { box-shadow: 0 6px 25px rgba(0,0,0,0.5); }
        50%      { box-shadow: 0 6px 35px rgba(0,0,0,0.6), 0 0 25px rgba(180,120,30,0.35); }
      }

      .sb-ui {
        position: absolute;
        bottom: 22px; left: 50%; transform: translateX(-50%);
        display: flex; align-items: center; gap: 10px;
        z-index: 10;
      }

      .sb-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: rgba(255,255,255,0.25);
        transition: all 0.4s; cursor: pointer;
      }
      .sb-dot.on {
        background: rgba(255,255,255,0.9);
        transform: scale(1.5);
      }

      .sb-skip {
        position: absolute; top: 22px; right: 24px;
        background: rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.18);
        color: rgba(255,255,255,0.45);
        font-size: 0.72rem; letter-spacing: 2px;
        padding: 7px 16px; border-radius: 20px;
        cursor: pointer; z-index: 20;
        font-family: 'Playfair Display', serif;
        transition: all 0.3s;
        backdrop-filter: blur(4px);
      }
      .sb-skip:hover { color: rgba(255,255,255,0.85); border-color: rgba(255,255,255,0.4); }

      .sb-hint {
        position: absolute; bottom: 56px; right: 28px;
        color: rgba(255,255,255,0.28);
        font-size: 0.68rem; letter-spacing: 2px;
        animation: sbBlink 2.2s ease-in-out infinite;
        z-index: 10; pointer-events: none;
      }
      @keyframes sbBlink {
        0%,100% { opacity: 0.25; } 50% { opacity: 0.75; }
      }

      .sb-counter {
        position: absolute; top: 26px; left: 24px;
        color: rgba(255,255,255,0.3);
        font-size: 0.72rem; letter-spacing: 3px;
        z-index: 20;
      }
    `
    document.head.appendChild(s)
  }

  private render(): void {
    const slide = SLIDES[this.current]
    const isLast = this.current === SLIDES.length - 1

    this.container.innerHTML = `
      <button class="sb-skip" id="sb-skip">PASSER ›</button>
      <div class="sb-counter">${this.current + 1} / ${SLIDES.length}</div>

      <div class="sb-slide active" id="sb-slide">
        <div class="sb-img" style="background-image:url('${slide.image}')"></div>
        <div class="${slide.align === 'bottom' ? 'sb-grad-bottom' : 'sb-grad-top'}"></div>
        <div class="${slide.align === 'bottom' ? 'sb-text-bottom' : 'sb-text-top'}">
          <div class="sb-title">${slide.title}</div>
          <div class="sb-subtitle">${slide.subtitle}</div>
          ${isLast ? `<br><button class="sb-play" id="sb-play">🎮 COMMENCER L'AVENTURE</button>` : ''}
        </div>
      </div>

      ${!isLast ? `<div class="sb-hint">cliquer pour continuer →</div>` : ''}

      <div class="sb-ui">
        ${SLIDES.map((_, i) =>
          `<div class="sb-dot ${i === this.current ? 'on' : ''}" data-i="${i}"></div>`
        ).join('')}
      </div>
    `

    document.getElementById('sb-skip')?.addEventListener('click', e => {
      e.stopPropagation(); this.close()
    })
    document.getElementById('sb-play')?.addEventListener('click', e => {
      e.stopPropagation(); this.close()
    })
    this.container.querySelectorAll('.sb-dot').forEach(dot => {
      dot.addEventListener('click', e => {
        e.stopPropagation()
        const i = parseInt((dot as HTMLElement).dataset.i ?? '0')
        if (i !== this.current) this.goTo(i)
      })
    })
    this.container.addEventListener('click', () => {
      if (!this.transitioning) isLast ? this.close() : this.goTo(this.current + 1)
    })
  }

  private goTo(index: number): void {
  if (this.transitioning) return
  if (index < 0 || index >= SLIDES.length) return  
  this.transitioning = true

  const oldSlide = document.getElementById('sb-slide')
  oldSlide?.classList.remove('active')
  oldSlide?.classList.add('leaving')

  setTimeout(() => {
    if (!document.body.contains(this.container)) return  
    this.current = index
    this.transitioning = false
    this.render()
  }, 600)
}


  private bindKeys(): void {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        this.current < SLIDES.length - 1 ? this.goTo(this.current + 1) : this.close()
      }
      if (e.key === 'ArrowLeft' && this.current > 0) this.goTo(this.current - 1)
      if (e.key === 'Escape') this.close()
    }
    window.addEventListener('keydown', handler)
  }

  private close(): void {
  this.transitioning = true 
  this.container.style.transition = 'opacity 1s'
  this.container.style.opacity = '0'
  setTimeout(() => {
    this.container.remove()
    this.onComplete()
  }, 1000)
}
}