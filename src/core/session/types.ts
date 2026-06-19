export type SeatKind = 'human' | 'ai'

export type FirstPlayerMode = 'random' | 'manual'

export type GameEndMode = 'roundCount' | 'pointThreshold'

export interface SeatConfig {
  seatIndex: number
  kind: SeatKind
  isHost: boolean
  faction: string
}

export interface SessionSetup {
  playerCount: number
  seats: SeatConfig[]
  firstPlayerMode: FirstPlayerMode
  firstPlayerSeat: number
  gameEndMode: GameEndMode
  gameEndRoundCount: number
  gameEndPointThreshold: number
}

/** Seat index controlled by this browser session (the game creator). */
export const LOCAL_PLAYER_SEAT = 0
