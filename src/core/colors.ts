export const SUIT_COLORS: Record<string, string> = {
  red: '#e74c3c',
  blue: '#3498db',
  green: '#2ecc71',
  yellow: '#f1c40f',
  purple: '#9b59b6',
  orange: '#e67e22',
}

export function factionColor(faction: string): string {
  return SUIT_COLORS[faction] ?? '#95a5a6'
}
