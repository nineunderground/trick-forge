import {
  cardsByIds,
  createDeck,
  isValidSet,
  removeCards,
  setValue,
  shuffle,
} from '../cards'
import type { GameProfile } from '../profile/schema'
import type { SeatConfig } from '../session/types'
import type { SessionSetup } from '../session/types'
import { seatDisplayName } from '../session/setup'
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

export function createPlayersFromSeats(seats: SeatConfig[]): PlayerState[] {
  return seats.map((seat) => ({
    id: `p${seat.seatIndex}`,
    seatIndex: seat.seatIndex,
    name: seatDisplayName(seat),
    kind: seat.kind,
    isHost: seat.isHost,
    faction: seat.faction,
    hand: [],
    score: 0,
    passed: false,
  }))
}

function dealHands(profile: GameProfile, players: PlayerState[]): Card[] {
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
    player.passed = false
  }

  return deck
}

export function initClimbingGame(
  profile: GameProfile,
  seats: SeatConfig[],
  handStarterIndex: number,
  session: SessionSetup,
): ClimbingGameState {
  const players = createPlayersFromSeats(seats)
  const deck = dealHands(profile, players)
  const starter = Math.min(Math.max(0, handStarterIndex), players.length - 1)

  return {
    family: 'climbing',
    phase: 'playing',
    players,
    deck,
    currentPlayerIndex: starter,
    handStarterIndex: starter,
    table: null,
    allowHandBombOnOpen: false,
    discard: [],
    roundNumber: 1,
    gameEnd: {
      mode: session.gameEndMode,
      roundCount: session.gameEndRoundCount,
      pointThreshold: session.gameEndPointThreshold,
    },
    matchEnding: false,
    lastHandDeltas: [],
    log: [`New hand. ${players[starter].name} leads the first round.`],
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

function openingCounts(state: ClimbingGameState, hand: Card[]): number[] {
  if (state.allowHandBombOnOpen && handIsBomb(hand)) {
    return [1, hand.length]
  }
  return [1]
}

export function getValidPlays(state: ClimbingGameState, hand: Card[]): ValidPlay[] {
  const plays: ValidPlay[] = []
  const target = state.table ? setValue(state.table.cards) : null
  const requiredCounts = state.table
    ? [tableCount(state), tableCount(state) + 1]
    : openingCounts(state, hand)

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

export function mustTakeFromTable(state: ClimbingGameState, handSize: number, playSize: number): boolean {
  if (!state.table) return false
  return handSize - playSize > 0
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
  if (action.type === 'continue') {
    if (action.step === 'round') return continueAfterRoundSummary(state, profile)
    throw new Error('Unknown continue step')
  }

  const next: ClimbingGameState = structuredClone(state)
  const player = next.players[next.currentPlayerIndex]

  if (action.type === 'pass') {
    if (!canPass(next)) {
      throw new Error('You cannot pass when you own the table')
    }
    player.passed = true
    next.log.push(`${player.name} passes.`)
    if (allOthersPassed(next)) {
      return resolveAllPass(next)
    }
    return advanceTurn(next)
  }

  if (action.type !== 'play') {
    throw new Error(`Unsupported climbing action: ${action.type}`)
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

  player.hand = sortHand(removeCards(player.hand, action.cardIds))
  player.passed = false
  next.players.forEach((p) => {
    p.passed = false
  })
  next.table = { cards: played, playedBy: player.id }
  next.allowHandBombOnOpen = false
  next.log.push(`${player.name} plays ${formatSet(played)} (${match.value}).`)

  if (player.hand.length === 0) {
    next.log.push(`${player.name} emptied their hand.`)
    return endHand(next, profile)
  }

  if (previousTable && player.hand.length > 0) {
    const previous = previousTable.cards
    if (!action.takeCardId) {
      throw new Error('You must take a card from the previous play')
    }
    const taken = previous.find((c) => c.id === action.takeCardId)
    if (!taken) {
      throw new Error('Invalid card to take')
    }
    const discarded = previous.filter((card) => card.id !== taken.id)
    if (discarded.length > 0) {
      next.discard.push(...discarded)
    }
    player.hand = sortHand([...player.hand, taken])
    next.log.push(`${player.name} takes ${formatCard(taken)}.`)
  }

  return advanceTurn(next)
}

function advanceTurn(state: ClimbingGameState): ClimbingGameState {
  const next = { ...state }
  next.currentPlayerIndex = (next.currentPlayerIndex + 1) % next.players.length
  return next
}

function resolveAllPass(state: ClimbingGameState): ClimbingGameState {
  const next = structuredClone(state)
  const leaderId = next.table?.playedBy
  const leaderIndex = next.players.findIndex((p) => p.id === leaderId)
  if (next.table?.cards.length) {
    next.discard.push(...next.table.cards)
  }
  next.table = null
  next.players.forEach((p) => {
    p.passed = false
  })
  next.log.push('Round ends. Table cleared.')

  if (leaderIndex >= 0) {
    const leader = next.players[leaderIndex]
    next.allowHandBombOnOpen = true
    next.currentPlayerIndex = leaderIndex
    next.log.push(`${leader.name} starts the new round.`)
  }

  return next
}

function endHand(state: ClimbingGameState, profile: GameProfile): ClimbingGameState {
  const next = structuredClone(state)
  if (next.table?.cards.length) {
    next.discard.push(...next.table.cards)
  }
  next.table = null
  next.allowHandBombOnOpen = false
  const perCard = profile.spec.scoring.pointsPerRemainingCard
  next.lastHandDeltas = []

  for (const player of next.players) {
    const penalty = player.hand.length * perCard
    if (penalty > 0) {
      next.lastHandDeltas.push({ playerId: player.id, delta: penalty })
      player.score += penalty
      next.log.push(`${player.name} +${penalty} pts (${player.hand.length} cards).`)
    }
  }

  next.matchEnding = shouldEndMatch(next)
  next.phase = 'round-summary'
  next.log.push('Round over.')
  return next
}

function shouldEndMatch(state: ClimbingGameState): boolean {
  const { gameEnd } = state
  if (gameEnd.mode === 'roundCount') {
    return state.roundNumber >= gameEnd.roundCount
  }
  return state.players.some((p) => p.score >= gameEnd.pointThreshold)
}

function determineWinners(
  players: PlayerState[],
  rule: 'lowest' | 'highest',
): PlayerState[] {
  const target =
    rule === 'lowest'
      ? Math.min(...players.map((p) => p.score))
      : Math.max(...players.map((p) => p.score))
  return players.filter((p) => p.score === target)
}

function finishMatch(state: ClimbingGameState, profile: GameProfile): ClimbingGameState {
  const next = structuredClone(state)
  next.phase = 'finished'
  next.matchEnding = false
  const winners = determineWinners(next.players, profile.spec.scoring.winner)
  const winningScore = winners[0]?.score ?? 0
  if (winners.length > 1) {
    next.log.push(
      `Game over. Tie: ${winners.map((w) => w.name).join(', ')} with ${winningScore} pts.`,
    )
  } else if (winners[0]) {
    next.log.push(`Game over. ${winners[0].name} wins with ${winningScore} pts.`)
  }
  return next
}

export function continueAfterRoundSummary(
  state: ClimbingGameState,
  profile: GameProfile,
): ClimbingGameState {
  if (state.phase !== 'round-summary') {
    throw new Error('Not waiting for round summary')
  }
  const next = structuredClone(state)
  next.lastHandDeltas = []

  if (next.matchEnding) {
    next.log.push('Match complete.')
    return finishMatch(next, profile)
  }

  next.roundNumber += 1
  next.log.push('Dealing next round...')
  return dealNextHand(next, profile)
}

function dealNextHand(state: ClimbingGameState, profile: GameProfile): ClimbingGameState {
  const next = structuredClone(state)
  next.deck = dealHands(profile, next.players)
  next.phase = 'playing'
  next.table = null
  next.discard = []
  next.allowHandBombOnOpen = false
  next.handStarterIndex = (next.handStarterIndex + 1) % next.players.length
  next.currentPlayerIndex = next.handStarterIndex
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

  if (state.table && player.hand.length > pick.cardIds.length) {
    const previous = state.table.cards
    action.takeCardId = previous[Math.floor(Math.random() * previous.length)].id
  }

  return action
}

export function isLocallyControlledHuman(
  state: ClimbingGameState,
  localSeatIndex: number,
): boolean {
  const player = state.players[state.currentPlayerIndex]
  return (
    player.kind === 'human' &&
    player.seatIndex === localSeatIndex &&
    state.phase === 'playing'
  )
}

export function shouldAutoPlay(state: ClimbingGameState, localSeatIndex: number): boolean {
  if (state.phase !== 'playing') return false
  const player = state.players[state.currentPlayerIndex]
  if (player.kind === 'ai') return true
  return player.kind === 'human' && player.seatIndex !== localSeatIndex
}

export function runAiTurnsWhileNeeded(
  state: ClimbingGameState,
  profile: GameProfile,
  localSeatIndex: number,
): ClimbingGameState {
  let next = state
  while (shouldAutoPlay(next, localSeatIndex)) {
    const action = chooseRandomAiAction(next)
    next = applyAction(next, profile, action)
  }
  return next
}

export function getLocalPlayer(state: ClimbingGameState, localSeatIndex: number): PlayerState {
  const player = state.players.find((p) => p.seatIndex === localSeatIndex)
  if (!player) throw new Error(`Local seat ${localSeatIndex} not found`)
  return player
}
