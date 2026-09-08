import { useEffect, useRef } from 'react'

export default function useAudio(muted, sound, revision) {
  const context = useRef(null)
  useEffect(() => {
    const unlock = () => {
      if (muted) return
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        context.current ||= new AudioContext()
        if (context.current.state === 'suspended')
          context.current.resume().catch(() => {})
      } catch {
        /* Audio is optional. */
      }
    }
    const visibility = () => {
      if (document.hidden || muted) context.current?.suspend().catch(() => {})
      else unlock()
    }
    if (muted) context.current?.suspend().catch(() => {})
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [muted])
  useEffect(
    () => () => {
      context.current?.close().catch(() => {})
      context.current = null
    },
    []
  )
  useEffect(() => {
    const audio = context.current
    if (muted || !sound || audio?.state !== 'running') return
    const tone = (frequency, duration, gain = 0.04, delay = 0) => {
      const oscillator = audio.createOscillator(),
        amp = audio.createGain(),
        time = audio.currentTime + delay
      oscillator.frequency.setValueAtTime(frequency, time)
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(40, frequency * 0.65),
        time + duration
      )
      amp.gain.setValueAtTime(0.001, time)
      amp.gain.exponentialRampToValueAtTime(gain, time + 0.008)
      amp.gain.exponentialRampToValueAtTime(0.001, time + duration)
      oscillator.connect(amp)
      amp.connect(audio.destination)
      oscillator.start(time)
      oscillator.stop(time + duration + 0.02)
      oscillator.onended = () => {
        oscillator.disconnect()
        amp.disconnect()
      }
    }
    if (sound === 'win')
      [523, 659, 784, 1047].forEach((note, index) =>
        tone(note, 0.48, 0.04, index * 0.1)
      )
    else if (sound === 'place') {
      tone(620, 0.065)
      tone(1600, 0.025, 0.02)
    } else tone(sound === 'remove' ? 290 : 150, 0.1)
  }, [sound, revision, muted])
}
