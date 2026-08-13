import { useEffect, useRef } from 'react'

/**
 * Fades content in once as it enters the viewport, then stops observing.
 * Honours prefers-reduced-motion through the .reveal CSS rules.
 */
export default function Reveal({ as: Tag = 'div', delay = 0, ...props }) {
  const ref = useRef(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    if (!('IntersectionObserver' in window)) {
      element.classList.add('is-visible')
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        element.classList.add('is-visible')
        observer.disconnect()
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      {...props}
      className={['reveal', props.className].filter(Boolean).join(' ')}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...props.style }}
    />
  )
}
