import { useEffect } from 'react'
import { setStyle, setData } from '../../shared/dom.js'
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
    const stackEnd = page.querySelector('[data-stack-end]')
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
      const rects = new Map()
      const measure = element => {
        if (!rects.has(element)) rects.set(element, element.getBoundingClientRect())
        return rects.get(element)
      }
      const sceneRects = enabled ? scenes.map(measure) : []
      const projectRects = enabled ? projects.map(measure) : []
      const projectHeights = enabled ? projects.map(project => project.offsetHeight) : []
      const itemRects = enabled ? items.map(({ element }) => measure(element)) : []
      const timelineRects = enabled ? timeline.map(measure) : []
      setStyle(page, '--page-progress', clamp(window.scrollY / Math.max(1, max)).toFixed(4))
      if (!enabled) return

      if (stackEnd && projectHeights.length) {
        setStyle(stackEnd, '--stack-last-height', `${projectHeights.at(-1)}px`)
      }

      scenes.forEach((scene, i) => {
        const rect = sceneRects[i]
        const progress = scene.dataset.scene === 'hero'
          ? clamp(-rect.top / Math.max(1, rect.height))
          : clamp((height * .8 - rect.top) / Math.max(1, rect.height))
        setStyle(scene, '--scene-progress', progress.toFixed(4))
      })
      items.forEach(({ element, count }, index) => {
        const progress = entranceProgress(itemRects[index].top, height)
        setStyle(element, '--enter', progress.toFixed(4))
        if (count) {
          const value = String(countAtProgress(Number(count.dataset.count), progress))
          if (count.textContent !== value) count.textContent = value
        }
      })
      const active = activeTimelineIndex(timelineRects, height)
      if (career) setStyle(career, '--active-index', active)
      timeline.forEach((item, index) => { setData(item, 'active', String(index === active)) })
      projects.forEach((project, i) => {
        const fits = projectHeights[i] < height - 140 && window.innerWidth > 1100
        setData(project, 'pin', fits ? 'true' : 'false')
        const next = projectRects[i + 1]
        const covered = fits && next ? clamp((height - next.top) / Math.max(1, height - 100)) : 0
        setStyle(project, '--covered', covered.toFixed(4))
      })
    }
    const schedule = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(update)
    }

    const resetTilt = () => {
      if (!tilted) return
      setStyle(tilted, '--tilt-x', '0deg')
      setStyle(tilted, '--tilt-y', '0deg')
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
      setStyle(card, '--tilt-x', `${(y - .5) * -12}deg`)
      setStyle(card, '--tilt-y', `${(x - .5) * 14}deg`)
      setStyle(card, '--light-x', `${x * 100}%`)
      setStyle(card, '--light-y', `${y * 100}%`)
      setData(card, 'hover', 'true')
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
