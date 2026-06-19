export type SeatKind = 'human' | 'ai'

export type FirstPlayerMode = 'random' | 'manual'

export interface SeatConfig {
  seatIndex: number
  kind: SeatKind
  isHost: boolean
}

export interface SessionSetup {
  playerCount: number
  seats: SeatConfig[]
  firstPlayerMode: FirstPlayerMode
  firstPlayerSeat: number
}

/** Seat index controlled by this browser session (the game creator). */
export const LOCAL_PLAYER_SEAT = 0
