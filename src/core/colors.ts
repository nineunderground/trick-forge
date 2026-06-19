export const SUIT_COLORS: Record<string, string> = {
  red: '#e74c3c',
  blue: '#3498db',
  green: '#2ecc71',
  yellow: '#f1c40f',
  purple: '#9b59b6',
  orange: '#e67e22',
  parrot: '#2ecc71',
  map: '#9b59b6',
  chest: '#f1c40f',
  'jolly-roger': '#2c3e50',
  escape: '#7f8c8d',
  pirate: '#c0392b',
  'skull-king': '#1a1a2e',
  mermaid: '#16a085',
  tigress: '#d35400',
}

export function factionColor(faction: string): string {
  return SUIT_COLORS[faction] ?? '#95a5a6'
}
