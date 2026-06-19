import type { CSSProperties } from 'react'
import type { Card } from '../core/types'
import { factionColor } from '../core/colors'

interface CardViewProps {
  card: Card
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  small?: boolean
  className?: string
  style?: CSSProperties
}

export function CardView({
  card,
  selected = false,
  disabled = false,
  onClick,
  small = false,
  className = '',
  style,
}: CardViewProps) {
  const color = factionColor(card.suit)

  return (
    <button
      type="button"
      className={`card ${selected ? 'selected' : ''} ${small ? 'small' : ''} ${className}`.trim()}
      style={{ borderColor: color, color, ...style }}
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
  faction?: string
  style?: CSSProperties
}

export function CardBack({ small = false, faction, style }: CardBackProps) {
  const accent = faction ? factionColor(faction) : undefined

  return (
    <div
      className={`card card-back ${small ? 'small' : ''}`}
      style={{
        ...style,
        boxShadow: accent ? `inset 0 4px 0 0 ${accent}` : undefined,
      }}
      aria-hidden="true"
    />
  )
}

interface HandBacksProps {
  count: number
  small?: boolean
  faction?: string
}

export function HandBacks({ count, small = true, faction }: HandBacksProps) {
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
          faction={faction}
          style={{ zIndex: i, marginLeft: i === 0 ? 0 : small ? -14 : -18 }}
        />
      ))}
      <span className="card-count-badge">{count}</span>
    </div>
  )
}

export function FactionBadge({ faction }: { faction: string }) {
  return (
    <span
      className="faction-badge"
      style={{ backgroundColor: factionColor(faction), borderColor: factionColor(faction) }}
      title={faction}
    >
      {faction}
    </span>
  )
}
