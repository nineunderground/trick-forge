export interface Card {
  id: string
  suit: string
  rank: number
}

export interface PlayerState {
  id: string
  name: string
  kind: 'human' | 'ai'
  hand: Card[]
  score: number
  passed: boolean
}

export type GamePhase = 'setup' | 'playing' | 'hand-scoring' | 'finished'

export interface TableSet {
  cards: Card[]
  playedBy: string
}

export interface ClimbingGameState {
  family: 'climbing'
  phase: GamePhase
  players: PlayerState[]
  deck: Card[]
  currentPlayerIndex: number
  handLeaderIndex: number
  table: TableSet | null
  consecutivePasses: number
  mustTakeFromPrevious: boolean
  pendingTakeFrom: Card[] | null
  log: string[]
}

export type GameState = ClimbingGameState

export interface PlayAction {
  type: 'play'
  cardIds: string[]
  takeCardId?: string
}

export interface PassAction {
  type: 'pass'
}

export type PlayerAction = PlayAction | PassAction

export interface ValidPlay {
  cardIds: string[]
  value: number
}
