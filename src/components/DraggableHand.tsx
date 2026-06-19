import { useMemo, useRef, useState, type DragEvent } from 'react'
import type { Card } from '../core/types'
import { moveCardInOrder, orderHandByIds } from '../core/display'
import { CardView } from './CardView'

interface DraggableHandProps {
  cards: Card[]
  order: string[]
  onOrderChange: (order: string[]) => void
  selected: string[]
  onToggleSelect: (id: string) => void
  selectDisabled?: boolean
  className?: string
}

export function DraggableHand({
  cards,
  order,
  onOrderChange,
  selected,
  onToggleSelect,
  selectDisabled = false,
  className = '',
}: DraggableHandProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const skipClickRef = useRef(false)

  const orderedCards = useMemo(() => orderHandByIds(cards, order), [cards, order])

  function handleDragStart(event: DragEvent<HTMLButtonElement>, cardId: string) {
    skipClickRef.current = false
    setDragId(cardId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', cardId)
  }

  function handleDragEnd() {
    setDragId(null)
    setDropTargetId(null)
    skipClickRef.current = true
    window.setTimeout(() => {
      skipClickRef.current = false
    }, 0)
  }

  function handleDragOver(event: DragEvent, targetId: string) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dragId && dragId !== targetId) {
      setDropTargetId(targetId)
    }
  }

  function handleDrop(event: DragEvent, targetId: string) {
    event.preventDefault()
    const fromId = event.dataTransfer.getData('text/plain')
    if (!fromId) return
    onOrderChange(moveCardInOrder(order, fromId, targetId))
    setDragId(null)
    setDropTargetId(null)
  }

  function handleTailDragOver(event: DragEvent) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTargetId('__tail__')
  }

  function handleTailDrop(event: DragEvent) {
    event.preventDefault()
    const fromId = event.dataTransfer.getData('text/plain')
    if (!fromId) return
    const without = order.filter((id) => id !== fromId)
    without.push(fromId)
    onOrderChange(without)
    setDragId(null)
    setDropTargetId(null)
  }

  return (
    <div className={`draggable-hand ${className}`.trim()}>
      {orderedCards.map((card) => (
        <CardView
          key={card.id}
          card={card}
          selected={selected.includes(card.id)}
          disabled={false}
          draggable
          className={[
            selectDisabled ? 'card--select-disabled' : '',
            dragId === card.id ? 'card--dragging' : '',
            dropTargetId === card.id ? 'card--drop-target' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => {
            if (skipClickRef.current || selectDisabled) return
            onToggleSelect(card.id)
          }}
          onDragStart={(event) => handleDragStart(event, card.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(event) => handleDragOver(event, card.id)}
          onDragLeave={() => {
            if (dropTargetId === card.id) setDropTargetId(null)
          }}
          onDrop={(event) => handleDrop(event, card.id)}
        />
      ))}
      <div
        className={`hand-drop-tail ${dropTargetId === '__tail__' ? 'hand-drop-tail--active' : ''}`}
        onDragOver={handleTailDragOver}
        onDragLeave={() => {
          if (dropTargetId === '__tail__') setDropTargetId(null)
        }}
        onDrop={handleTailDrop}
        aria-hidden="true"
      />
    </div>
  )
}
