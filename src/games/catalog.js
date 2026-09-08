import { Blocks, Hexagon } from 'lucide-react'
import { GAMES as catalog } from '../../games/catalog.js'

const icons = { blocks: Blocks, hexagon: Hexagon }

export const GAMES = catalog.map(game => ({
  ...game,
  href: `/${game.id}/`,
  icon: icons[game.icon],
}))
