import type { Card } from '../core/types'
import { CardView } from './CardView'

interface DiscardPileProps {
  cards: Card[]
}

const MAX_VISIBLE = 5

export function DiscardPile({ cards }: DiscardPileProps) {
  const visible = cards.slice(-MAX_VISIBLE)

  return (
    <aside className="discard-pile" aria-label={`Discard pile, ${cards.length} cards`}>
      <span className="discard-pile-label">Discard</span>
      <div className="discard-pile-cards">
        {visible.length === 0 ? (
          <div className="discard-pile-empty" aria-hidden="true" />
        ) : (
          visible.map((card, index) => (
            <CardView
              key={card.id}
              card={card}
              small
              disabled
              className="discard-pile-card"
              style={{
                zIndex: index,
                marginLeft: index === 0 ? 0 : -22,
              }}
            />
          ))
        )}
      </div>
      {cards.length > 0 && <span className="discard-pile-count">{cards.length}</span>}
    </aside>
  )
}
