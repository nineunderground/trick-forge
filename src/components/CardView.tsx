import type { Card } from '../core/types'

const SUIT_COLORS: Record<string, string> = {
  red: '#e74c3c',
  blue: '#3498db',
  green: '#2ecc71',
  yellow: '#f1c40f',
  purple: '#9b59b6',
  orange: '#e67e22',
}

interface CardViewProps {
  card: Card
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  small?: boolean
}

export function CardView({
  card,
  selected = false,
  disabled = false,
  onClick,
  small = false,
}: CardViewProps) {
  const color = SUIT_COLORS[card.suit] ?? '#95a5a6'

  return (
    <button
      type="button"
      className={`card ${selected ? 'selected' : ''} ${small ? 'small' : ''}`}
      style={{ borderColor: color, color }}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="rank">{card.rank}</span>
      <span className="suit">{card.suit.slice(0, 3)}</span>
    </button>
  )
}
