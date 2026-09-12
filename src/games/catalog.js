import { Blocks, Hexagon, Truck, DoorOpen, Cable, Server } from 'lucide-react'
import { GAMES as catalog } from '../../games/catalog.js'

const icons = { blocks: Blocks, hexagon: Hexagon, truck: Truck, door: DoorOpen, server: Server, cable: Cable }

export const GAMES = catalog.map(game => ({
  ...game,
  href: `/${game.id}/`,
  icon: icons[game.icon],
}))
