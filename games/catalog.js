// Shared by the game list and Vite. Each id matches its workspace directory
// and public URL; development ports must be unique.
export const GAMES = [
  { id: 'office-escape', title: 'Office Escape', icon: 'door', port: 4179, desktopOnly: true },
  { id: 'forklift', title: 'Forklift Certified', icon: 'truck', port: 4178, desktopOnly: true },
  { id: 'lego', title: 'Brick Break', icon: 'blocks', port: 4177 },
  { id: 'hexhaven', title: 'Hexhaven', icon: 'hexagon', port: 4174 },
  { id: 'deploy-friday', title: 'Deploy Friday', icon: 'server', port: 4180 },
  { id: 'cable-management', title: 'Cable Management', icon: 'cable', port: 4181 },
]
