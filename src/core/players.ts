import { seatDisplayName } from './session/setup'
import type { SeatConfig } from './session/types'
import type { PlayerState } from './types'

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
