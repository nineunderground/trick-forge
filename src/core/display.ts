import type { GameProfile } from './profile/schema'
import type { Card } from './types'

export function syncHandDisplayOrder(hand: Card[], previousOrder: string[]): string[] {
  const ids = new Set(hand.map((c) => c.id))
  const kept = previousOrder.filter((id) => ids.has(id))
  const known = new Set(kept)
  const added = hand.filter((c) => !known.has(c.id)).map((c) => c.id)
  return [...kept, ...added]
}

export function orderHandByIds(hand: Card[], order: string[]): Card[] {
  const byId = new Map(hand.map((c) => [c.id, c]))
  const ordered: Card[] = []
  const seen = new Set<string>()

  for (const id of order) {
    const card = byId.get(id)
    if (card) {
      ordered.push(card)
      seen.add(id)
    }
  }

  for (const card of hand) {
    if (!seen.has(card.id)) {
      ordered.push(card)
    }
  }

  return ordered
}

export function moveCardInOrder(order: string[], dragId: string, beforeId: string): string[] {
  if (dragId === beforeId) return order
  const without = order.filter((id) => id !== dragId)
  const targetIndex = without.indexOf(beforeId)
  if (targetIndex === -1) {
    return [...without, dragId]
  }
  without.splice(targetIndex, 0, dragId)
  return without
}

export function sortCardsForTableDisplay(cards: Card[], profile: GameProfile): Card[] {
  const config = profile.spec.display?.tableCards
  if (!config?.sortBy || config.sortBy === 'none') {
    return cards
  }

  const direction = config.direction ?? 'desc'
  const primaryMul = direction === 'desc' ? -1 : 1
  const tieBreak = config.tieBreakBy ?? 'suit'
  const tieMul = direction === 'desc' ? 1 : -1

  return [...cards].sort((a, b) => {
    let cmp = 0
    if (config.sortBy === 'rank') {
      cmp = (a.rank - b.rank) * primaryMul
    } else if (config.sortBy === 'suit') {
      cmp = a.suit.localeCompare(b.suit) * primaryMul
    }

    if (cmp !== 0) return cmp

    if (tieBreak === 'rank') {
      return (a.rank - b.rank) * tieMul
    }
    return a.suit.localeCompare(b.suit) * tieMul
  })
}
