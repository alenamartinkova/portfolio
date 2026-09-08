import { ArrowRight, ArrowUpRight, Play } from 'lucide-react'
import { LEVELS } from '../levels.js'
import { DIFFICULTIES } from '../persistence.js'
import { useT } from '../i18n'
import BrickPreview from './BrickPreview'

export default function Collection({ state, dispatch }) {
  const t = useT()
  return (
    <main className="game-collection">
      <div className="game-collection-heading">
        <div>
          <h1>{t.collectionTitle}</h1>
          <p>{t.collectionIntro}</p>
        </div>
        <div>
          <div className="game-segment" role="group" aria-label={t.difficulty}>
            {Object.keys(DIFFICULTIES).map(value => (
              <button
                key={value}
                className={state.difficulty === value ? 'is-active' : ''}
                aria-pressed={state.difficulty === value}
                onClick={() => dispatch({ type: 'difficulty', value })}
              >
                {t.difficulties[value]}
              </button>
            ))}
          </div>
          <p className="game-difficulty-note">
            {t.difficultyDescriptions[state.difficulty]}
          </p>
        </div>
      </div>
      {state.saved.draft && (
        <button
          className="game-secondary game-resume"
          onClick={() => dispatch({ type: 'resume' })}
        >
          <Play aria-hidden="true" />
          {t.resume}
        </button>
      )}
      {t.tiers.map((tier, index) => (
        <section
          className="game-tier"
          key={index}
          aria-labelledby={`tier-${index}`}
        >
          <div className="game-tier-heading">
            <span>0{index + 1}</span>
            <h2 id={`tier-${index}`}>{tier}</h2>
            <p>{t.tierNotes[index]}</p>
          </div>
          <div className="game-model-grid">
            {LEVELS.filter(level => level.tier === index + 1).map(level => {
              const stars =
                state.saved.progress[level.id]?.[state.difficulty] || 0
              const name = t.modelNames[level.id]
              return (
                <button
                  className="game-model-card"
                  key={level.id}
                  onClick={() => dispatch({ type: 'start', levelId: level.id })}
                  aria-label={`${t.buildModel(name)}, ${t.pieces(level.bricks.length)}, ${t.stars(stars)}`}
                >
                  <div className="game-model-preview">
                    <span>
                      {String(LEVELS.indexOf(level) + 1).padStart(2, '0')}
                    </span>
                    <BrickPreview bricks={level.bricks} />
                  </div>
                  <div className="game-model-details">
                    <h3>
                      {name}
                      <ArrowUpRight aria-hidden="true" />
                    </h3>
                    <p>
                      <span>{t.pieces(level.bricks.length)}</span>
                      <span className="game-stars" aria-hidden="true">
                        {'★'.repeat(stars)}
                        <span>{'☆'.repeat(3 - stars)}</span>
                      </span>
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      ))}
      <aside className="game-sandbox-banner">
        <div>
          <h2>{t.sandboxTitle}</h2>
          <p>{t.sandboxIntro}</p>
        </div>
        <button
          className="game-secondary"
          onClick={() => dispatch({ type: 'start', levelId: 'sandbox' })}
        >
          {t.sandboxStart}
          <ArrowRight aria-hidden="true" />
        </button>
      </aside>
    </main>
  )
}
