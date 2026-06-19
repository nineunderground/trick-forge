import type { PlayerState } from '../core/types'
import { LOCAL_PLAYER_SEAT } from '../core/session/types'

const SEAT_LAYOUT: Record<number, string[]> = {
  2: ['bottom', 'top'],
  3: ['bottom', 'top-left', 'top-right'],
  4: ['bottom', 'left', 'top', 'right'],
  5: ['bottom', 'bottom-left', 'top-left', 'top-right', 'bottom-right'],
  6: ['bottom', 'left', 'top-left', 'top', 'top-right', 'right'],
}

export function getSeatPositionClass(
  seatIndex: number,
  totalPlayers: number,
  localSeat = LOCAL_PLAYER_SEAT,
): string {
  const layout = SEAT_LAYOUT[totalPlayers] ?? SEAT_LAYOUT[4]
  const relative = (seatIndex - localSeat + totalPlayers) % totalPlayers
  return layout[relative] ?? 'top'
}

export function orderPlayersForTable(
  players: PlayerState[],
  localSeat = LOCAL_PLAYER_SEAT,
): PlayerState[] {
  const n = players.length
  return Array.from({ length: n }, (_, i) => {
    const seatIndex = (localSeat + i) % n
    return players.find((p) => p.seatIndex === seatIndex)!
  })
}

export function getOpponents(
  players: PlayerState[],
  localSeat = LOCAL_PLAYER_SEAT,
): PlayerState[] {
  return players.filter((p) => p.seatIndex !== localSeat)
}
