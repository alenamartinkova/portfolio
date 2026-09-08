import {
  Blocks,
  RotateCw,
  Pipette,
  Trash2,
  Undo2,
  Redo2,
  Columns2,
  Lightbulb,
  Save,
  Code,
  Eraser,
} from 'lucide-react'
import { DIFFICULTIES } from '../persistence.js'
import { isSandbox } from '../state.js'
import { useT } from '../i18n'

export default function Toolbar({ state, dispatch }) {
  const t = useT()
  const tools = [
    {
      id: 'build',
      Icon: Blocks,
      action: { type: 'tool', tool: 'build' },
      active: state.tool === 'build',
    },
    { id: 'rotate', Icon: RotateCw, action: { type: 'rotate' }, shortcut: 'R' },
    {
      id: 'pick',
      Icon: Pipette,
      action: { type: 'tool', tool: 'pick' },
      active: state.tool === 'pick',
      shortcut: 'E',
    },
    {
      id: 'remove',
      Icon: Trash2,
      action: { type: 'tool', tool: 'remove' },
      active: state.tool === 'remove',
    },
    {
      id: 'undo',
      Icon: Undo2,
      action: { type: 'undo' },
      disabled: !state.undo.length,
      shortcut: 'Ctrl/⌘ Z',
    },
    {
      id: 'redo',
      Icon: Redo2,
      action: { type: 'redo' },
      disabled: !state.redo.length,
      shortcut: 'Ctrl/⌘ Y',
    },
    ...(isSandbox(state)
      ? [
          {
            id: 'save',
            Icon: Save,
            action: { type: 'dialog', dialog: 'saves' },
          },
          {
            id: 'code',
            Icon: Code,
            action: { type: 'dialog', dialog: 'code' },
          },
          {
            id: 'clear',
            Icon: Eraser,
            action: { type: 'dialog', dialog: 'clear' },
            disabled: !state.bricks.length,
          },
        ]
      : [
          {
            id: 'compare',
            Icon: Columns2,
            action: { type: 'compare' },
            active: state.compare,
          },
          {
            id: 'hint',
            Icon: Lightbulb,
            action: { type: 'hint' },
            disabled: state.hints >= DIFFICULTIES[state.difficulty].hints,
            count: DIFFICULTIES[state.difficulty].hints - state.hints,
          },
        ]),
  ]
  return (
    <div
      className="game-toolbar game-panel"
      role="group"
      aria-label={t.tools.build}
    >
      {tools.map(({ id, Icon, action, active, disabled, shortcut, count }) => (
        <button
          key={id}
          className={active ? 'is-active' : ''}
          aria-pressed={active}
          disabled={Boolean(state.result) || disabled}
          title={`${t.tools[id]}${shortcut ? ` (${shortcut})` : ''}`}
          onClick={() => dispatch(action)}
        >
          <Icon aria-hidden="true" />
          <span>
            {t.tools[id]}
            {count !== undefined ? ` ${count === Infinity ? '∞' : count}` : ''}
          </span>
        </button>
      ))}
    </div>
  )
}
