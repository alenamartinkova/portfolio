import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { MORE } from './projects'

export default function ClientWork({ t, locale, motion }) {
  const [expanded, setExpanded] = useState(false)
  const viewport = useRef(null)
  const grid = useRef(null)
  const animations = useRef([])

  const cancelAnimations = useCallback(() => {
    animations.current.forEach(animation => animation.cancel())
    animations.current = []
    viewport.current?.removeAttribute('data-animating')
    grid.current?.querySelectorAll('[data-exiting]').forEach(card => {
      card.removeAttribute('data-exiting')
      card.inert = false
    })
  }, [])

  useEffect(() => {
    // Width and language changes can alter row heights during an expansion.
    cancelAnimations()
    window.addEventListener('resize', cancelAnimations)
    return () => {
      cancelAnimations()
      window.removeEventListener('resize', cancelAnimations)
    }
  }, [motion, locale, cancelAnimations])

  function toggle() {
    const frame = viewport.current
    const cards = [...grid.current.children]
    const before = frame.getBoundingClientRect().height
    const visible = new Set(cards.filter(card => card.getClientRects().length))
    cancelAnimations()

    // Read the new natural height before painting, then animate from the current
    // painted height. Repeated clicks can reverse an unfinished expansion.
    flushSync(() => setExpanded(value => !value))
    const after = grid.current.getBoundingClientRect().height
    if (!motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !frame.animate) return

    const changingCards = cards.filter(card => expanded
      ? !card.getClientRects().length
      : !visible.has(card) && card.getClientRects().length)
    const stagger = i => Math.min(i * 45, 270)
    const exitDuration = expanded && changingCards.length ? 440 + stagger(changingCards.length - 1) : 0

    // Keep outgoing cards in the layout until their entrance animation has
    // played backwards, then close the space they occupied.
    if (expanded) changingCards.forEach(card => {
      card.dataset.exiting = 'true'
      card.inert = true
    })

    frame.dataset.animating = 'true'
    const resize = frame.animate([{ height: `${before}px` }, { height: `${after}px` }], {
      duration: 560, delay: exitDuration, fill: 'both', easing: 'cubic-bezier(.22, 1, .36, 1)',
    })
    animations.current.push(resize)
    resize.onfinish = () => {
      if (expanded) cancelAnimations()
      else {
        frame.removeAttribute('data-animating')
        resize.cancel()
      }
    }

    changingCards.forEach((card, i) => {
      animations.current.push(card.animate([
        { opacity: 0, transform: 'translateY(24px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], {
        duration: 440,
        delay: stagger(expanded ? changingCards.length - 1 - i : i),
        easing: 'cubic-bezier(.16, 1, .3, 1)',
        direction: expanded ? 'reverse' : 'normal',
        fill: 'both',
      }))
    })
  }

  return <section className="m-more" aria-labelledby="client-work-title">
    <div className="m-more-heading">
      <h3 id="client-work-title">{t.work.moreLabel}<span className="m-more-count">{MORE.length}</span></h3>
      <button className="m-more-toggle" aria-expanded={expanded} aria-controls="client-work-grid" onClick={toggle}>
        {locale === 'sk' ? (expanded ? 'Zobraziť menej' : 'Zobraziť všetky projekty') : (expanded ? 'Show less' : 'Show all projects')}
        <ArrowDown size={16} aria-hidden="true" />
      </button>
    </div>
    <div className="m-client-window" ref={viewport}>
      <div className="m-client-grid" id="client-work-grid" data-expanded={expanded} ref={grid}>
        {MORE.map((project, i) => <article key={project.name}>
          <h4><a className="m-link" href={project.link} target="_blank" rel="noreferrer">{project.name}<ArrowUpRight size={19} aria-hidden="true" /></a></h4>
          <p>{t.work.more[i].summary}</p>
          <span className="m-mono">{project.stack}</span>
        </article>)}
      </div>
    </div>
  </section>
}
