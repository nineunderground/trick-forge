export interface Card {
  id: string
  suit: string
  rank: number
}

export interface PlayerState {
  id: string
  seatIndex: number
  name: string
  kind: 'human' | 'ai'
  isHost: boolean
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
  /** First player of the current hand (used to rotate starters between hands). */
  handStarterIndex: number
  table: TableSet | null
  /** True when the table leader may open with a hand bomb (after all other players pass). */
  allowHandBombOnOpen: boolean
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
