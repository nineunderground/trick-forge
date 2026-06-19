import type { CSSProperties } from 'react'
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

interface CardBackProps {
  small?: boolean
  style?: CSSProperties
}

export function CardBack({ small = false, style }: CardBackProps) {
  return (
    <div
      className={`card card-back ${small ? 'small' : ''}`}
      style={style}
      aria-hidden="true"
    />
  )
}

interface HandBacksProps {
  count: number
  small?: boolean
}

export function HandBacks({ count, small = true }: HandBacksProps) {
  if (count === 0) {
    return <span className="hand-empty-label">No cards</span>
  }

  const visible = Math.min(count, 7)

  return (
    <div className="hand-backs" aria-label={`${count} cards in hand`}>
      {Array.from({ length: visible }, (_, i) => (
        <CardBack
          key={i}
          small={small}
          style={{ zIndex: i, marginLeft: i === 0 ? 0 : small ? -14 : -18 }}
        />
      ))}
      <span className="card-count-badge">{count}</span>
    </div>
  )
}
