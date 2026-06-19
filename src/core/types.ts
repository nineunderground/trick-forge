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
  faction: string
  hand: Card[]
  score: number
  passed: boolean
}

export type GamePhase =
  | 'setup'
  | 'playing'
  | 'round-summary'
  | 'hand-scoring'
  | 'finished'

export interface HandScoreDelta {
  playerId: string
  delta: number
}

export interface GameEndConfig {
  mode: 'roundCount' | 'pointThreshold'
  roundCount: number
  pointThreshold: number
}

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
  /** Cards removed from play (rest of beaten sets, cleared table, etc.). */
  discard: Card[]
  /** Scoring round number (each round ends when a player empties their hand). */
  roundNumber: number
  gameEnd: GameEndConfig
  /** True when the round just ended triggers match end after the summary. */
  matchEnding: boolean
  lastHandDeltas: HandScoreDelta[]
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

export type PlayerAction = PlayAction | PassAction | ContinueAction

export interface ContinueAction {
  type: 'continue'
  step: 'round'
}

export interface ValidPlay {
  cardIds: string[]
  value: number
}
