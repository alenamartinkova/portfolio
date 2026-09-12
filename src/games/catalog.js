import { Blocks, Hexagon, Truck, DoorOpen, Server } from 'lucide-react'
import { GAMES as catalog } from '../../games/catalog.js'

const icons = { blocks: Blocks, hexagon: Hexagon, truck: Truck, door: DoorOpen, server: Server }

export const GAMES = catalog.map(game => ({
  ...game,
  href: `/${game.id}/`,
  icon: icons[game.icon],
}))
