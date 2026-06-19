import type { CSSProperties, DragEvent } from 'react'
import type { Card } from '../core/types'
import { cardKind } from '../core/cards'
import { factionColor } from '../core/colors'

function cardDisplay(card: Card): { rank: string; suit: string } {
  const kind = cardKind(card)
  switch (kind) {
    case 'escape':
      return { rank: 'Esc', suit: 'escape' }
    case 'pirate':
      return { rank: 'Pir', suit: `#${card.rank}` }
    case 'skull-king':
      return { rank: 'SK', suit: 'king' }
    case 'mermaid':
      return { rank: 'Mer', suit: `#${card.rank}` }
    case 'tigress':
      return { rank: 'Tig', suit: 'ress' }
    default:
      return { rank: String(card.rank), suit: card.suit.slice(0, 4) }
  }
}

interface CardViewProps {
  card: Card
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  small?: boolean
  className?: string
  style?: CSSProperties
  draggable?: boolean
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void
  onDragEnd?: (event: DragEvent<HTMLButtonElement>) => void
  onDragOver?: (event: DragEvent<HTMLButtonElement>) => void
  onDragLeave?: (event: DragEvent<HTMLButtonElement>) => void
  onDrop?: (event: DragEvent<HTMLButtonElement>) => void
}

export function CardView({
  card,
  selected = false,
  disabled = false,
  onClick,
  small = false,
  className = '',
  style,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: CardViewProps) {
  const color = factionColor(card.suit)
  const display = cardDisplay(card)

  return (
    <button
      type="button"
      className={`card ${selected ? 'selected' : ''} ${small ? 'small' : ''} ${draggable ? 'card--draggable' : ''} ${className}`.trim()}
      style={{ borderColor: color, color, ...style }}
      disabled={disabled}
      draggable={draggable}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-pressed={selected}
    >
      <span className="rank">{display.rank}</span>
      <span className="suit">{display.suit}</span>
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
