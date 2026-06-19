export type SeatKind = 'human' | 'ai'

export interface SeatConfig {
  seatIndex: number
  kind: SeatKind
  isHost: boolean
}

export interface SessionSetup {
  playerCount: number
  seats: SeatConfig[]
}

/** Seat index controlled by this browser session (the game creator). */
export const LOCAL_PLAYER_SEAT = 0
