import {
  cardsByIds,
  createDeck,
  isValidSet,
  removeCards,
  setValue,
  shuffle,
} from '../cards'
import type { GameProfile } from '../profile/schema'
import type {
  Card,
  ClimbingGameState,
  PlayAction,
  PlayerAction,
  PlayerState,
  ValidPlay,
} from '../types'

function handIsBomb(hand: Card[]): boolean {
  if (hand.length <= 1) return false
  const sameSuit = hand.every((c) => c.suit === hand[0].suit)
  const sameRank = hand.every((c) => c.rank === hand[0].rank)
  return sameSuit || sameRank
}

export function createPlayers(
  count: number,
  humanIndex = 0,
): PlayerState[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    name: i === humanIndex ? 'You' : `AI ${i}`,
    kind: i === humanIndex ? 'human' : 'ai',
    hand: [],
    score: 0,
    passed: false,
  }))
}

export function initClimbingGame(
  profile: GameProfile,
  playerCount: number,
  humanIndex = 0,
): ClimbingGameState {
  const players = createPlayers(playerCount, humanIndex)
  let deck = shuffle(
    createDeck(
      profile.spec.deck.suits,
      profile.spec.deck.ranks,
      profile.spec.deck.copies ?? 1,
    ),
  )

  const cardsPerPlayer = profile.spec.deal.cardsPerPlayer
  for (const player of players) {
    player.hand = sortHand(deck.splice(0, cardsPerPlayer))
  }

  return {
    family: 'climbing',
    phase: 'playing',
    players,
    deck,
    currentPlayerIndex: 0,
    handLeaderIndex: 0,
    table: null,
    consecutivePasses: 0,
    mustTakeFromPrevious: false,
    pendingTakeFrom: null,
    log: [`New hand. ${players[0].name} leads.`],
  }
}

function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit)
    return a.rank - b.rank
  })
}

function currentPlayer(state: ClimbingGameState): PlayerState {
  return state.players[state.currentPlayerIndex]
}

function tableCount(state: ClimbingGameState): number {
  return state.table?.cards.length ?? 0
}

function openingCounts(hand: Card[]): number[] {
  const counts = [1]
  if (handIsBomb(hand)) counts.push(hand.length)
  return counts
}

export function getValidPlays(state: ClimbingGameState, hand: Card[]): ValidPlay[] {
  const plays: ValidPlay[] = []
  const target = state.table ? setValue(state.table.cards) : null
  const requiredCounts = state.table
    ? [tableCount(state), tableCount(state) + 1]
    : openingCounts(hand)

  const n = hand.length
  for (const count of requiredCounts) {
    if (count < 1 || count > n) continue
    combine(hand, count, (combo) => {
      if (!isValidSet(combo)) return
      const value = setValue(combo)
      if (target === null || value > target) {
        plays.push({ cardIds: combo.map((c) => c.id), value })
      }
    })
  }

  return plays
}

function combine(cards: Card[], k: number, fn: (combo: Card[]) => void): void {
  if (k > cards.length) return

  function backtrack(start: number, combo: Card[]): void {
    if (combo.length === k) {
      fn(combo)
      return
    }
    for (let i = start; i <= cards.length - (k - combo.length); i += 1) {
      combo.push(cards[i])
      backtrack(i + 1, combo)
      combo.pop()
    }
  }

  backtrack(0, [])
}

export function canPass(state: ClimbingGameState): boolean {
  if (!state.table) return false
  const ownerId = state.table.playedBy
  return currentPlayer(state).id !== ownerId
}

function allOthersPassed(state: ClimbingGameState): boolean {
  if (!state.table) return false
  const ownerId = state.table.playedBy
  return state.players.every((p) => p.id === ownerId || p.passed)
}

export function applyAction(
  state: ClimbingGameState,
  profile: GameProfile,
  action: PlayerAction,
): ClimbingGameState {
  const next: ClimbingGameState = structuredClone(state)
  const player = next.players[next.currentPlayerIndex]

  if (action.type === 'pass') {
    if (!canPass(next)) {
      throw new Error('You cannot pass when you own the table')
    }
    player.passed = true
    next.log.push(`${player.name} passes.`)
    if (allOthersPassed(next)) {
      return resolveAllPass(next, profile)
    }
    return advanceTurn(next)
  }

  const previousTable = next.table
  const played = cardsByIds(player.hand, action.cardIds)
  const valid = getValidPlays(next, player.hand)
  const match = valid.find(
    (v) =>
      v.cardIds.length === action.cardIds.length &&
      [...v.cardIds].sort().join() === [...action.cardIds].sort().join(),
  )
  if (!match) {
    throw new Error('Invalid play')
  }

  if (previousTable) {
    const previous = previousTable.cards
    if (!action.takeCardId) {
      throw new Error('You must take a card from the previous play')
    }
    const taken = previous.find((c) => c.id === action.takeCardId)
    if (!taken) {
      throw new Error('Invalid card to take')
    }
    player.hand.push(taken)
    next.log.push(`${player.name} takes ${formatCard(taken)}.`)
  }

  player.hand = sortHand(removeCards(player.hand, action.cardIds))
  player.passed = false
  next.players.forEach((p) => {
    p.passed = false
  })
  next.table = { cards: played, playedBy: player.id }
  next.log.push(`${player.name} plays ${formatSet(played)} (${match.value}).`)

  if (player.hand.length === 0) {
    return endHand(next, profile)
  }

  return advanceTurn(next)
}

function advanceTurn(state: ClimbingGameState): ClimbingGameState {
  const next = { ...state }
  next.currentPlayerIndex = (next.currentPlayerIndex + 1) % next.players.length
  return next
}

function resolveAllPass(
  state: ClimbingGameState,
  profile: GameProfile,
): ClimbingGameState {
  const next = structuredClone(state)
  const leaderId = next.table?.playedBy
  const leaderIndex = next.players.findIndex((p) => p.id === leaderId)
  next.table = null
  next.players.forEach((p) => {
    p.passed = false
  })
  next.log.push('Everyone passes. New round.')

  if (leaderIndex >= 0) {
    const leader = next.players[leaderIndex]
    if (handIsBomb(leader.hand)) {
      next.log.push(`${leader.name} plays a hand bomb (${leader.hand.length} cards).`)
      leader.hand = []
      return endHand(next, profile)
    }
    next.currentPlayerIndex = leaderIndex
    next.handLeaderIndex = leaderIndex
    next.log.push(`${leader.name} leads the round.`)
  }

  return next
}

function endHand(state: ClimbingGameState, profile: GameProfile): ClimbingGameState {
  const next = structuredClone(state)
  const perCard = profile.spec.scoring.pointsPerRemainingCard

  for (const player of next.players) {
    const penalty = player.hand.length * perCard
    player.score += penalty
    if (penalty > 0) {
      next.log.push(`${player.name} +${penalty} pts (${player.hand.length} cards).`)
    }
  }

  const threshold = profile.spec.scoring.gameEndThreshold
  const someoneReached = next.players.some((p) => p.score >= threshold)
  if (someoneReached) {
    next.phase = 'finished'
    const winner = [...next.players].sort((a, b) => a.score - b.score)[0]
    next.log.push(`Game over. ${winner.name} wins with ${winner.score} pts.`)
    return next
  }

  next.log.push('Hand over. Dealing...')
  return dealNextHand(next, profile)
}

function dealNextHand(state: ClimbingGameState, profile: GameProfile): ClimbingGameState {
  const next = structuredClone(state)
  let deck = shuffle(
    createDeck(
      profile.spec.deck.suits,
      profile.spec.deck.ranks,
      profile.spec.deck.copies ?? 1,
    ),
  )

  for (const player of next.players) {
    player.hand = sortHand(deck.splice(0, profile.spec.deal.cardsPerPlayer))
    player.passed = false
  }

  next.deck = deck
  next.phase = 'playing'
  next.table = null
  next.currentPlayerIndex = (next.handLeaderIndex + 1) % next.players.length
  next.handLeaderIndex = next.currentPlayerIndex
  next.log.push(`${next.players[next.currentPlayerIndex].name} leads the next hand.`)
  return next
}

function formatCard(card: Card): string {
  return `${card.suit}-${card.rank}`
}

function formatSet(cards: Card[]): string {
  return cards.map(formatCard).join(', ')
}

export function chooseRandomAiAction(state: ClimbingGameState): PlayerAction {
  const player = currentPlayer(state)
  const valid = getValidPlays(state, player.hand)

  if (valid.length === 0) {
    if (canPass(state)) return { type: 'pass' }
    throw new Error('AI has no legal opening plays')
  }

  const pick = valid[Math.floor(Math.random() * valid.length)]
  const action: PlayAction = { type: 'play', cardIds: pick.cardIds }

  if (state.table) {
    const previous = state.table.cards
    action.takeCardId = previous[Math.floor(Math.random() * previous.length)].id
  }

  return action
}

export function runAiTurnsWhileNeeded(
  state: ClimbingGameState,
  profile: GameProfile,
): ClimbingGameState {
  let next = state
  while (
    next.phase === 'playing' &&
    next.players[next.currentPlayerIndex].kind === 'ai'
  ) {
    const action = chooseRandomAiAction(next)
    next = applyAction(next, profile, action)
  }
  return next
}

export function getHumanPlayerIndex(state: ClimbingGameState): number {
  return state.players.findIndex((p) => p.kind === 'human')
}
