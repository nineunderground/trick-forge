import type { Card } from './types'

export function createDeck(
  suits: string[],
  ranks: number[],
  copies = 1,
): Card[] {
  const deck: Card[] = []
  let id = 0
  for (let copy = 0; copy < copies; copy += 1) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          id: `c${id++}`,
          suit,
          rank,
        })
      }
    }
  }
  return deck
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function setValue(cards: Card[]): number {
  const digits = cards.map((c) => c.rank).sort((a, b) => b - a)
  return Number(digits.join(''))
}

export function isValidSet(cards: Card[]): boolean {
  if (cards.length === 0) return false
  const sameSuit = cards.every((c) => c.suit === cards[0].suit)
  const sameRank = cards.every((c) => c.rank === cards[0].rank)
  return sameSuit || sameRank
}

export function cardsByIds(hand: Card[], ids: string[]): Card[] {
  return ids.map((id) => {
    const card = hand.find((c) => c.id === id)
    if (!card) throw new Error(`Carta no encontrada: ${id}`)
    return card
  })
}

export function removeCards(hand: Card[], ids: string[]): Card[] {
  const idSet = new Set(ids)
  return hand.filter((c) => !idSet.has(c.id))
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit)
    return a.rank - b.rank
  })
}
