import type { PlayerState } from '../core/types'
import { LOCAL_PLAYER_SEAT } from '../core/session/types'

const SEAT_LAYOUT: Record<number, string[]> = {
  2: ['bottom', 'top'],
  3: ['bottom', 'top-left', 'top-right'],
  4: ['bottom', 'bottom-left', 'top', 'bottom-right'],
  5: ['bottom', 'bottom-left', 'top-left', 'top-right', 'bottom-right'],
  6: ['bottom', 'bottom-left', 'top-left', 'top', 'top-right', 'bottom-right'],
  7: ['bottom', 'bottom-left', 'top-left', 'top', 'top-right', 'right', 'bottom-right'],
  8: [
    'bottom',
    'bottom-left',
    'top-left',
    'left',
    'top',
    'top-right',
    'right',
    'bottom-right',
  ],
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

/** Maps a seat position to a CSS grid area (see .table-grid in App.css). */
export function getSeatGridArea(position: string): string {
  return `seat-${position}`
}

export function getOpponents(
  players: PlayerState[],
  localSeat = LOCAL_PLAYER_SEAT,
): PlayerState[] {
  return players.filter((p) => p.seatIndex !== localSeat)
}

export function animationOriginForPosition(position: string): Record<string, string> {
  switch (position) {
    case 'top':
      return { '--from-x': '0px', '--from-y': '-56px' }
    case 'left':
      return { '--from-x': '-80px', '--from-y': '0px' }
    case 'right':
      return { '--from-x': '80px', '--from-y': '0px' }
    case 'top-left':
      return { '--from-x': '-56px', '--from-y': '-48px' }
    case 'top-right':
      return { '--from-x': '56px', '--from-y': '-48px' }
    case 'bottom-left':
      return { '--from-x': '-56px', '--from-y': '48px' }
    case 'bottom-right':
      return { '--from-x': '56px', '--from-y': '48px' }
    default:
      return { '--from-x': '0px', '--from-y': '56px' }
  }
}
