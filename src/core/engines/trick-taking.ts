import {
  appendSpecialCards,
  cardKind,
  createDeck,
  removeCards,
  shuffle,
  sortCards,
} from '../cards'
import type { GameProfile } from '../profile/schema'
import type { SeatConfig, SessionSetup } from '../session/types'
import type {
  BidAction,
  Card,
  CardKind,
  HandScoreDelta,
  PlayerAction,
  PlayerState,
  TrickPlay,
  TrickPlayAction,
  TrickTakingGameState,
} from '../types'
import { createPlayersFromSeats } from '../players'

interface TrickTakingRules {
  roundCount: number
  dealMode: 'increment' | 'fixed'
  dealCap: 'deck-per-player' | null
  trumpSuit: string
  scoring: 'skull-king-classic'
  bonuses: boolean
  specialCards: {
    escape: number
    pirate: number
    skullKing: number
    mermaid: number
    tigress: number
  }
}

function getRules(profile: GameProfile): TrickTakingRules {
  const raw = profile.spec.rules.trickTaking ?? {}
  const special = (raw.specialCards ?? {}) as Record<string, number>
  return {
    roundCount: (raw.roundCount as number) ?? 10,
    dealMode: (raw.dealMode as 'increment' | 'fixed') ?? 'increment',
    dealCap: (raw.dealCap as 'deck-per-player' | undefined) ?? null,
    trumpSuit: (raw.trumpSuit as string) ?? 'jolly-roger',
    scoring: 'skull-king-classic',
    bonuses: raw.bonuses !== false,
    specialCards: {
      escape: special.escape ?? 5,
      pirate: special.pirate ?? 5,
      skullKing: special.skullKing ?? 1,
      mermaid: special.mermaid ?? 2,
      tigress: special.tigress ?? 1,
    },
  }
}

function buildDeck(profile: GameProfile): Card[] {
  const rules = getRules(profile)
  let deck = createDeck(
    profile.spec.deck.suits,
    profile.spec.deck.ranks,
    profile.spec.deck.copies ?? 1,
  )
  deck = appendSpecialCards(deck, rules.specialCards)
  return deck
}

function cardsToDeal(
  profile: GameProfile,
  roundNumber: number,
  playerCount: number,
): number {
  const rules = getRules(profile)
  const base =
    rules.dealMode === 'fixed' ? profile.spec.deal.cardsPerPlayer : roundNumber

  if (rules.dealCap === 'deck-per-player') {
    const cap = Math.floor(buildDeck(profile).length / playerCount)
    return Math.min(base, cap)
  }

  return base
}

function leftOf(dealerIndex: number, playerCount: number): number {
  return (dealerIndex + 1) % playerCount
}

function emptyRecord(players: PlayerState[]): Record<string, number> {
  return Object.fromEntries(players.map((p) => [p.id, 0]))
}

function emptyBidRecord(players: PlayerState[]): Record<string, number | null> {
  return Object.fromEntries(players.map((p) => [p.id, null]))
}

function emptyStackRecord(players: PlayerState[]): Record<string, Card[]> {
  return Object.fromEntries(players.map((p) => [p.id, []]))
}

function sortHand(hand: Card[]): Card[] {
  return sortCards(hand)
}

function dealRound(
  profile: GameProfile,
  players: PlayerState[],
  roundNumber: number,
): Card[] {
  const count = cardsToDeal(profile, roundNumber, players.length)
  let deck = shuffle(buildDeck(profile))
  const needed = count * players.length
  if (deck.length < needed) {
    throw new Error(
      `Not enough cards to deal ${count} to ${players.length} players (need ${needed}, have ${deck.length}).`,
    )
  }
  for (const player of players) {
    player.hand = sortHand(deck.splice(0, count))
    player.passed = false
  }
  return deck
}

export function initTrickTakingGame(
  profile: GameProfile,
  seats: SeatConfig[],
  dealerIndex: number,
  session: SessionSetup,
): TrickTakingGameState {
  const players = createPlayersFromSeats(seats)
  const dealer = Math.min(Math.max(0, dealerIndex), players.length - 1)
  const roundNumber = 1
  const deck = dealRound(profile, players, roundNumber)
  const rules = getRules(profile)
  const bidStart = leftOf(dealer, players.length)

  return {
    family: 'trick-taking',
    phase: 'bidding',
    players,
    deck,
    currentPlayerIndex: bidStart,
    dealerIndex: dealer,
    roundNumber,
    cardsDealt: cardsToDeal(profile, roundNumber, players.length),
    trumpSuit: rules.trumpSuit,
    bids: emptyBidRecord(players),
    tricksWon: emptyRecord(players),
    trickStacks: emptyStackRecord(players),
    currentTrick: [],
    completedTricks: [],
    leadSuit: null,
    trickLeadKind: null,
    gameEnd: {
      mode: session.gameEndMode,
      roundCount: session.gameEndRoundCount,
      pointThreshold: session.gameEndPointThreshold,
    },
    matchEnding: false,
    lastHandDeltas: [],
    lastRoundBonuses: {},
    lastRoundBidPoints: {},
    log: [
      `Round ${roundNumber}: ${cardsToDeal(profile, roundNumber, players.length)} card(s) dealt. ${players[bidStart].name} bids first.`,
    ],
  }
}

function currentPlayer(state: TrickTakingGameState): PlayerState {
  return state.players[state.currentPlayerIndex]
}

function effectiveKind(play: TrickPlay): CardKind {
  if (play.card.kind === 'tigress') {
    return play.tigressAs === 'pirate' ? 'pirate' : 'escape'
  }
  return cardKind(play.card)
}

function isSpecial(card: Card): boolean {
  return cardKind(card) !== 'numbered'
}

function isCharacterKind(kind: CardKind): boolean {
  return kind === 'pirate' || kind === 'skull-king' || kind === 'mermaid' || kind === 'tigress'
}

function firstPlayWithKind(trick: TrickPlay[], kind: CardKind): TrickPlay | undefined {
  return trick.find((p) => effectiveKind(p) === kind)
}

function resolveTrickWinner(
  trick: TrickPlay[],
  trumpSuit: string,
  leadSuit: string | null,
): TrickPlay {
  if (trick.length === 0) {
    throw new Error('Cannot resolve empty trick')
  }

  const allEscape = trick.every((p) => effectiveKind(p) === 'escape')
  if (allEscape) {
    return trick[0]
  }

  const contenders = trick.filter((p) => effectiveKind(p) !== 'escape')
  const hasMermaid = contenders.some((p) => effectiveKind(p) === 'mermaid')
  const hasSkullKing = contenders.some((p) => effectiveKind(p) === 'skull-king')
  const hasPirate = contenders.some((p) => effectiveKind(p) === 'pirate')

  if (hasMermaid && hasSkullKing && hasPirate) {
    return firstPlayWithKind(trick, 'mermaid') ?? trick[0]
  }

  if (hasSkullKing && hasMermaid) {
    return firstPlayWithKind(trick, 'mermaid') ?? trick[0]
  }

  if (hasSkullKing) {
    return firstPlayWithKind(trick, 'skull-king') ?? trick[0]
  }

  if (hasPirate) {
    return firstPlayWithKind(trick, 'pirate') ?? trick[0]
  }

  if (hasMermaid) {
    return firstPlayWithKind(trick, 'mermaid') ?? trick[0]
  }

  const numbered = contenders.filter((p) => effectiveKind(p) === 'numbered')
  const trumps = numbered.filter((p) => p.card.suit === trumpSuit)
  if (trumps.length > 0) {
    return trumps.reduce((best, p) => (p.card.rank > best.card.rank ? p : best))
  }

  if (leadSuit) {
    const suited = numbered.filter((p) => p.card.suit === leadSuit)
    if (suited.length > 0) {
      return suited.reduce((best, p) => (p.card.rank > best.card.rank ? p : best))
    }
  }

  return numbered[0] ?? trick[0]
}

function specialCardsInHand(hand: Card[]): Card[] {
  return hand.filter((c) => cardKind(c) !== 'numbered')
}

export function getValidTrickPlays(
  state: TrickTakingGameState,
  hand: Card[],
): Card[] {
  if (state.currentTrick.length === 0) {
    return hand
  }

  if (state.trickLeadKind === 'character') {
    return hand
  }

  if (state.trickLeadKind === 'escape' && !state.leadSuit) {
    return hand
  }

  if (state.leadSuit) {
    const matching = hand.filter(
      (c) => cardKind(c) === 'numbered' && c.suit === state.leadSuit,
    )
    if (matching.length > 0) {
      return [...matching, ...specialCardsInHand(hand)]
    }
  }

  return hand
}

function allBidsIn(state: TrickTakingGameState): boolean {
  return state.players.every((p) => state.bids[p.id] !== null)
}

function applyBid(state: TrickTakingGameState, playerId: string, amount: number): TrickTakingGameState {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) throw new Error('Unknown player')

  const maxBid = player.hand.length
  if (amount < 0 || amount > maxBid || !Number.isInteger(amount)) {
    throw new Error(`Bid must be between 0 and ${maxBid}`)
  }

  const bids = { ...state.bids, [playerId]: amount }
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length
  const log = [...state.log, `${player.name} bids ${amount}.`]

  if (!state.players.every((p) => bids[p.id] !== null)) {
    return {
      ...state,
      bids,
      currentPlayerIndex: nextIndex,
      log,
    }
  }

  const leader = leftOf(state.dealerIndex, state.players.length)
  return {
    ...state,
    phase: 'playing',
    bids,
    currentPlayerIndex: leader,
    log: [...log, `${state.players[leader].name} leads the first trick.`],
  }
}

function leadKindForCard(card: Card, tigressAs?: 'pirate' | 'escape'): 'numbered' | 'escape' | 'character' {
  if (card.kind === 'tigress') {
    return tigressAs === 'pirate' ? 'character' : 'escape'
  }
  const kind = cardKind(card)
  if (kind === 'escape') return 'escape'
  if (isCharacterKind(kind)) return 'character'
  return 'numbered'
}

function applyPlay(
  state: TrickTakingGameState,
  profile: GameProfile,
  action: TrickPlayAction,
): TrickTakingGameState {
  const player = currentPlayer(state)
  const card = player.hand.find((c) => c.id === action.cardId)
  if (!card) throw new Error('Card not in hand')

  if (card.kind === 'tigress' && !action.tigressAs) {
    throw new Error('Tigress requires pirate or escape declaration')
  }

  const valid = getValidTrickPlays(state, player.hand)
  if (!valid.some((c) => c.id === card.id)) {
    throw new Error('Illegal card play')
  }

  const play: TrickPlay = {
    playerId: player.id,
    card,
    tigressAs: action.tigressAs,
  }

  let leadSuit = state.leadSuit
  let trickLeadKind = state.trickLeadKind

  if (state.currentTrick.length === 0) {
    trickLeadKind = leadKindForCard(card, action.tigressAs)
    if (trickLeadKind === 'numbered') {
      leadSuit = card.suit
    } else {
      leadSuit = null
    }
  } else if (trickLeadKind === 'escape' && !leadSuit && cardKind(card) === 'numbered') {
    leadSuit = card.suit
  }

  const nextHand = removeCards(player.hand, [card.id])
  const players = state.players.map((p) =>
    p.id === player.id ? { ...p, hand: nextHand } : p,
  )

  const currentTrick = [...state.currentTrick, play]
  const log = [...state.log, `${player.name} plays ${describeCard(card, action.tigressAs)}.`]

  if (currentTrick.length < state.players.length) {
    return {
      ...state,
      players,
      currentTrick,
      leadSuit,
      trickLeadKind,
      currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
      log,
    }
  }

  const winnerPlay = resolveTrickWinner(currentTrick, state.trumpSuit, leadSuit)
  const winnerId = winnerPlay.playerId
  const winner = state.players.find((p) => p.id === winnerId)
  const trickCards = currentTrick.map((p) => p.card)

  const tricksWon = { ...state.tricksWon, [winnerId]: (state.tricksWon[winnerId] ?? 0) + 1 }
  const trickStacks = {
    ...state.trickStacks,
    [winnerId]: [...(state.trickStacks[winnerId] ?? []), ...trickCards],
  }

  const winnerIndex = state.players.findIndex((p) => p.id === winnerId)
  const handsEmpty = players.every((p) => p.hand.length === 0)

  const completedTricks = [...state.completedTricks, currentTrick]

  if (handsEmpty) {
    return finishRound({
      ...state,
      players,
      tricksWon,
      trickStacks,
      completedTricks,
      currentTrick: [],
      leadSuit: null,
      trickLeadKind: null,
      log: [...log, `${winner?.name ?? 'Player'} wins the trick.`],
    }, profile)
  }

  return {
    ...state,
    players,
    tricksWon,
    trickStacks,
    completedTricks,
    currentTrick: [],
    leadSuit: null,
    trickLeadKind: null,
    currentPlayerIndex: winnerIndex,
    log: [...log, `${winner?.name ?? 'Player'} wins the trick and leads.`],
  }
}

function describeCard(card: Card, tigressAs?: 'pirate' | 'escape'): string {
  if (card.kind === 'tigress') {
    return tigressAs === 'pirate' ? 'Tigress (Pirate)' : 'Tigress (Escape)'
  }
  if (isSpecial(card)) {
    return cardKind(card).replace('-', ' ')
  }
  return `${card.suit} ${card.rank}`
}

function computeBonuses(
  playerId: string,
  bid: number,
  tricksWon: number,
  trickStack: Card[],
  trickPlaysByRound: TrickPlay[][],
  profile: GameProfile,
  trumpSuit: string,
): number {
  const rules = getRules(profile)
  if (!rules.bonuses || bid !== tricksWon) {
    return 0
  }

  let bonus = 0
  for (const card of trickStack) {
    if (cardKind(card) === 'numbered' && card.rank === 14) {
      bonus += card.suit === trumpSuit ? 20 : 10
    }
  }

  for (const trick of trickPlaysByRound) {
    const winner = resolveTrickWinner(
      trick,
      trumpSuit,
      inferLeadSuit(trick),
    )
    if (winner.playerId !== playerId) continue

    const kinds = trick.map((p) => effectiveKind(p))
    const hasPirate = kinds.includes('pirate')
    const hasSkullKing = kinds.includes('skull-king')
    const hasMermaid = kinds.includes('mermaid')
    const winnerKind = effectiveKind(winner)

    if (winnerKind === 'mermaid' && hasSkullKing) bonus += 40
    else if (winnerKind === 'skull-king' && hasPirate) bonus += 30
    else if (winnerKind === 'pirate' && hasMermaid) bonus += 20
  }

  return bonus
}

function inferLeadSuit(trick: TrickPlay[]): string | null {
  let trickLeadKind: 'numbered' | 'escape' | 'character' | null = null
  let leadSuit: string | null = null

  for (const play of trick) {
    if (trickLeadKind === null) {
      trickLeadKind = leadKindForCard(play.card, play.tigressAs)
      if (trickLeadKind === 'numbered') {
        leadSuit = play.card.suit
      }
      continue
    }

    if (trickLeadKind === 'escape' && !leadSuit && cardKind(play.card) === 'numbered') {
      leadSuit = play.card.suit
    }
  }

  return leadSuit
}

function scoreSkullKingRound(
  state: TrickTakingGameState,
  profile: GameProfile,
): {
  deltas: HandScoreDelta[]
  bidPoints: Record<string, number>
  bonuses: Record<string, number>
} {
  const n = state.cardsDealt
  const deltas: HandScoreDelta[] = []
  const bidPoints: Record<string, number> = {}
  const bonuses: Record<string, number> = {}

  for (const player of state.players) {
    const bid = state.bids[player.id] ?? 0
    const won = state.tricksWon[player.id] ?? 0
    let bp = 0

    if (bid === 0) {
      bp = won === 0 ? 10 * n : -10 * n
    } else if (bid === won) {
      bp = 20 * bid
    } else {
      bp = -10 * Math.abs(bid - won)
    }

    const bonus = computeBonuses(
      player.id,
      bid,
      won,
      state.trickStacks[player.id] ?? [],
      state.completedTricks,
      profile,
      state.trumpSuit,
    )

    bidPoints[player.id] = bp
    bonuses[player.id] = bonus
    deltas.push({ playerId: player.id, delta: bp + bonus })
  }

  return { deltas, bidPoints, bonuses }
}

function finishRound(
  state: TrickTakingGameState,
  profile: GameProfile,
): TrickTakingGameState {
  const { deltas, bidPoints, bonuses } = scoreSkullKingRound(state, profile)
  const players = state.players.map((p) => {
    const delta = deltas.find((d) => d.playerId === p.id)?.delta ?? 0
    return { ...p, score: p.score + delta }
  })

  const rules = getRules(profile)
  const roundLimit =
    state.gameEnd.mode === 'roundCount'
      ? state.gameEnd.roundCount
      : rules.roundCount
  const matchEnding = state.roundNumber >= roundLimit

  const summaryParts = players.map((p) => {
    const bid = state.bids[p.id] ?? 0
    const won = state.tricksWon[p.id] ?? 0
    return `${p.name}: bid ${bid}, took ${won}`
  })

  return {
    ...state,
    phase: 'round-summary',
    players,
    matchEnding,
    lastHandDeltas: deltas,
    lastRoundBidPoints: bidPoints,
    lastRoundBonuses: bonuses,
    log: [
      ...state.log,
      `Round ${state.roundNumber} complete. ${summaryParts.join('; ')}.`,
    ],
  }
}

function startNextRound(
  state: TrickTakingGameState,
  profile: GameProfile,
): TrickTakingGameState {
  const nextRound = state.roundNumber + 1
  const nextDealer = leftOf(state.dealerIndex, state.players.length)
  const players = state.players.map((p) => ({ ...p, hand: [] }))
  const deck = dealRound(profile, players, nextRound)
  const bidStart = leftOf(nextDealer, players.length)

  return {
    ...state,
    phase: 'bidding',
    players,
    deck,
    dealerIndex: nextDealer,
    roundNumber: nextRound,
    cardsDealt: cardsToDeal(profile, nextRound, players.length),
    bids: emptyBidRecord(players),
    tricksWon: emptyRecord(players),
    trickStacks: emptyStackRecord(players),
    currentTrick: [],
    completedTricks: [],
    leadSuit: null,
    trickLeadKind: null,
    currentPlayerIndex: bidStart,
    matchEnding: false,
    lastHandDeltas: [],
    lastRoundBonuses: {},
    lastRoundBidPoints: {},
    log: [
      ...state.log,
      `Round ${nextRound}: ${cardsToDeal(profile, nextRound, players.length)} card(s) dealt. ${players[bidStart].name} bids first.`,
    ],
  }
}

export function applyTrickTakingAction(
  state: TrickTakingGameState,
  profile: GameProfile,
  action: PlayerAction,
): TrickTakingGameState {
  if (action.type === 'continue') {
    if (state.phase === 'round-summary') {
      if (state.matchEnding) {
        return { ...state, phase: 'finished' }
      }
      return startNextRound(state, profile)
    }
    return state
  }

  if (action.type === 'bid') {
    if (state.phase !== 'bidding') {
      throw new Error('Not in bidding phase')
    }
    const player = currentPlayer(state)
    return applyBid(state, player.id, action.amount)
  }

  if (action.type === 'play-trick') {
    if (state.phase !== 'playing') {
      throw new Error('Not in playing phase')
    }
    return applyPlay(state, profile, action)
  }

  throw new Error(`Unsupported action: ${(action as PlayerAction).type}`)
}

export function chooseRandomAiTrickAction(
  state: TrickTakingGameState,
): BidAction | TrickPlayAction {
  const player = currentPlayer(state)

  if (state.phase === 'bidding') {
    const amount = Math.floor(Math.random() * (player.hand.length + 1))
    return { type: 'bid', amount }
  }

  const valid = getValidTrickPlays(state, player.hand)
  const card = valid[Math.floor(Math.random() * valid.length)]
  if (card.kind === 'tigress') {
    return {
      type: 'play-trick',
      cardId: card.id,
      tigressAs: Math.random() < 0.5 ? 'pirate' : 'escape',
    }
  }
  return { type: 'play-trick', cardId: card.id }
}

export function shouldAutoPlayTrickTaking(
  state: TrickTakingGameState,
  localSeat: number,
): boolean {
  if (state.phase !== 'bidding' && state.phase !== 'playing') {
    return false
  }
  const player = currentPlayer(state)
  return player.seatIndex !== localSeat || player.kind === 'ai'
}

export function getLocalTrickPlayer(
  state: TrickTakingGameState,
  localSeat: number,
): PlayerState | undefined {
  return state.players.find((p) => p.seatIndex === localSeat)
}

export function isLocallyControlledHumanTrick(
  state: TrickTakingGameState,
  localSeat: number,
): boolean {
  const player = getLocalTrickPlayer(state, localSeat)
  return Boolean(player && player.kind === 'human' && player.seatIndex === localSeat)
}

export function continueAfterTrickRoundSummary(
  state: TrickTakingGameState,
  profile: GameProfile,
): TrickTakingGameState {
  return applyTrickTakingAction(state, profile, { type: 'continue', step: 'round' })
}

export function getPlayerBid(state: TrickTakingGameState, playerId: string): number | null {
  return state.bids[playerId] ?? null
}

export function allPlayersBid(state: TrickTakingGameState): boolean {
  return allBidsIn(state)
}
