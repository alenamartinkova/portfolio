import { useEffect } from 'react'
import { activeTimelineIndex, clamp, countAtProgress, entranceProgress } from './motionMath'

/** Native scrolling owns the timeline. No wheel interception or React renders per frame. */
export default function useMotion(root, enabled, locale) {
  useEffect(() => {
    const page = root.current
    if (!page) return
    let frame = 0
    let pointerFrame = 0
    let disposed = false
    let tilted = null
    let pointer = null
    const scenes = [...page.querySelectorAll('[data-scene]')]
    const projects = [...page.querySelectorAll('[data-project]')]
    const reveals = [...page.querySelectorAll('[data-reveal]')]
    // Measure stable wrappers, never the children being transformed.
    const items = [...page.querySelectorAll('[data-motion-item]')].map(element => ({
      element,
      count: element.querySelector('[data-count]'),
    }))
    const timeline = [...page.querySelectorAll('.m-timeline > li')]
    const career = page.querySelector('.m-career')

    if (!enabled) {
      items.forEach(({ count }) => {
        if (count) count.textContent = count.dataset.count
      })
    }

    const update = () => {
      frame = 0
      const height = window.innerHeight
      const max = document.documentElement.scrollHeight - height
      // Read geometry together before writing animation styles.
      const sceneRects = enabled ? scenes.map(scene => scene.getBoundingClientRect()) : []
      const projectRects = enabled ? projects.map(project => project.getBoundingClientRect()) : []
      const projectHeights = enabled ? projects.map(project => project.offsetHeight) : []
      const itemRects = enabled ? items.map(({ element }) => element.getBoundingClientRect()) : []
      const timelineRects = enabled ? timeline.map(item => item.getBoundingClientRect()) : []
      page.style.setProperty('--page-progress', clamp(window.scrollY / Math.max(1, max)))
      if (!enabled) return

      scenes.forEach((scene, i) => {
        const rect = sceneRects[i]
        const progress = scene.dataset.scene === 'hero'
          ? clamp(-rect.top / Math.max(1, rect.height))
          : clamp((height * .8 - rect.top) / Math.max(1, rect.height))
        scene.style.setProperty('--scene-progress', progress.toFixed(4))
      })
      items.forEach(({ element, count }, index) => {
        const progress = entranceProgress(itemRects[index].top, height)
        element.style.setProperty('--enter', progress.toFixed(4))
        if (count) {
          const value = String(countAtProgress(Number(count.dataset.count), progress))
          if (count.textContent !== value) count.textContent = value
        }
      })
      const active = activeTimelineIndex(timelineRects, height)
      career?.style.setProperty('--active-index', active)
      timeline.forEach((item, index) => { item.dataset.active = String(index === active) })
      projects.forEach((project, i) => {
        const fits = projectHeights[i] < height - 140 && window.innerWidth > 1100
        project.dataset.pin = fits ? 'true' : 'false'
        const next = projectRects[i + 1]
        const covered = fits && next ? clamp((height - next.top) / Math.max(1, height - 100)) : 0
        project.style.setProperty('--covered', covered.toFixed(4))
      })
    }
    const schedule = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(update)
    }

    const resetTilt = () => {
      if (!tilted) return
      tilted.style.setProperty('--tilt-x', '0deg')
      tilted.style.setProperty('--tilt-y', '0deg')
      delete tilted.dataset.hover
      tilted = null
    }
    const paintPointer = () => {
      pointerFrame = 0
      const card = pointer?.target.closest?.('[data-tilt]')
      if (card !== tilted) resetTilt()
      if (!card || !page.contains(card)) return
      tilted = card
      const rect = card.getBoundingClientRect()
      const x = clamp((pointer.x - rect.left) / Math.max(1, rect.width))
      const y = clamp((pointer.y - rect.top) / Math.max(1, rect.height))
      card.style.setProperty('--tilt-x', `${(y - .5) * -12}deg`)
      card.style.setProperty('--tilt-y', `${(x - .5) * 14}deg`)
      card.style.setProperty('--light-x', `${x * 100}%`)
      card.style.setProperty('--light-y', `${y * 100}%`)
      card.dataset.hover = 'true'
    }
    const onPointerMove = event => {
      if (event.pointerType !== 'mouse') return
      pointer = { x: event.clientX, y: event.clientY, target: event.target }
      if (!pointerFrame) pointerFrame = requestAnimationFrame(paintPointer)
    }
    const onPointerLeave = () => {
      cancelAnimationFrame(pointerFrame)
      pointerFrame = 0
      pointer = null
      resetTilt()
    }

    // Visible content is the baseline; only enable entrance effects after observing.
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.dataset.visible = 'true'
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: .08 })
    if (enabled) reveals.forEach(element => observer.observe(element))
    page.dataset.ready = 'true'
    const resize = new ResizeObserver(schedule)
    resize.observe(page)
    document.fonts.ready.then(schedule)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    if (enabled) {
      page.addEventListener('pointermove', onPointerMove, { passive: true })
      page.addEventListener('pointerleave', onPointerLeave)
    }
    update()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      cancelAnimationFrame(pointerFrame)
      resetTilt()
      observer.disconnect()
      resize.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      page.removeEventListener('pointermove', onPointerMove)
      page.removeEventListener('pointerleave', onPointerLeave)
      delete page.dataset.ready
    }
  }, [root, enabled, locale])
}
