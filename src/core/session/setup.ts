import type { GameProfile } from '../profile/schema'
import type { SeatConfig, SessionSetup } from './types'

export interface SetupStepDefinition {
  id: string
  type: 'playerCount' | 'seatAssignment' | 'firstPlayer'
  hostSeat?: number
  allowRemoteHumans?: boolean
}

const DEFAULT_SETUP_STEPS: SetupStepDefinition[] = [
  { id: 'playerCount', type: 'playerCount' },
  { id: 'seatAssignment', type: 'seatAssignment', hostSeat: 0, allowRemoteHumans: false },
  { id: 'firstPlayer', type: 'firstPlayer' },
]

export function getSetupSteps(profile: GameProfile): SetupStepDefinition[] {
  return profile.spec.session?.setupSteps ?? DEFAULT_SETUP_STEPS
}

export function defaultFaction(factions: string[], seatIndex: number): string {
  return factions[seatIndex % factions.length] ?? factions[0] ?? 'red'
}

export function createDefaultSessionSetup(profile: GameProfile): SessionSetup {
  const playerCount = profile.spec.players.default
  const factions = profile.spec.deck.suits
  return {
    playerCount,
    seats: buildSeats(playerCount, getSetupSteps(profile), factions),
    firstPlayerMode: 'random',
    firstPlayerSeat: 0,
  }
}

export function resolveFirstPlayerSeat(session: SessionSetup): number {
  if (session.firstPlayerMode === 'random') {
    return Math.floor(Math.random() * session.playerCount)
  }
  return session.firstPlayerSeat
}

export function seatLabelForSetup(seat: SeatConfig): string {
  return seatDisplayName(seat)
}

export function buildSeats(
  playerCount: number,
  steps: SetupStepDefinition[],
  factions: string[],
): SeatConfig[] {
  const seatStep = steps.find((s) => s.type === 'seatAssignment')
  const hostSeat = seatStep?.hostSeat ?? 0

  return Array.from({ length: playerCount }, (_, seatIndex) => ({
    seatIndex,
    isHost: seatIndex === hostSeat,
    kind: seatIndex === hostSeat ? 'human' : 'ai',
    faction: defaultFaction(factions, seatIndex),
  }))
}

export function resizeSessionSetup(
  profile: GameProfile,
  setup: SessionSetup,
  playerCount: number,
): SessionSetup {
  const clamped = Math.min(
    profile.spec.players.max,
    Math.max(profile.spec.players.min, playerCount),
  )
  const steps = getSetupSteps(profile)
  const hostSeat = steps.find((s) => s.type === 'seatAssignment')?.hostSeat ?? 0
  const factions = profile.spec.deck.suits
  const previous = new Map(setup.seats.map((s) => [s.seatIndex, s]))

  const seats = Array.from({ length: clamped }, (_, seatIndex) => {
    const existing = previous.get(seatIndex)
    if (existing && seatIndex !== hostSeat) {
      return { ...existing, isHost: false }
    }
    if (seatIndex === hostSeat) {
      return {
        seatIndex,
        isHost: true,
        kind: 'human' as const,
        faction: existing?.faction ?? defaultFaction(factions, seatIndex),
      }
    }
    return {
      seatIndex,
      isHost: false,
      kind: 'ai' as const,
      faction: existing?.faction ?? defaultFaction(factions, seatIndex),
    }
  })

  return {
    ...setup,
    playerCount: clamped,
    seats,
    firstPlayerSeat: Math.min(setup.firstPlayerSeat, clamped - 1),
  }
}

export function updateSeatKind(
  setup: SessionSetup,
  seatIndex: number,
  kind: SeatConfig['kind'],
  steps: SetupStepDefinition[],
): SessionSetup {
  const hostSeat = steps.find((s) => s.type === 'seatAssignment')?.hostSeat ?? 0
  if (seatIndex === hostSeat) {
    return setup
  }

  return {
    ...setup,
    seats: setup.seats.map((seat) =>
      seat.seatIndex === seatIndex ? { ...seat, kind } : seat,
    ),
  }
}

export function updateSeatFaction(
  setup: SessionSetup,
  seatIndex: number,
  faction: string,
): SessionSetup {
  return {
    ...setup,
    seats: setup.seats.map((seat) =>
      seat.seatIndex === seatIndex ? { ...seat, faction } : seat,
    ),
  }
}

export function validateSessionSetup(
  profile: GameProfile,
  setup: SessionSetup,
): string[] {
  const errors: string[] = []
  const { min, max } = profile.spec.players
  const factions = new Set(profile.spec.deck.suits)

  if (setup.playerCount < min || setup.playerCount > max) {
    errors.push(`Player count must be between ${min} and ${max}.`)
  }

  if (setup.seats.length !== setup.playerCount) {
    errors.push('Seat configuration must match player count.')
  }

  const hostCount = setup.seats.filter((s) => s.isHost).length
  if (hostCount !== 1) {
    errors.push('Exactly one host seat is required.')
  }

  const host = setup.seats.find((s) => s.isHost)
  if (host && host.kind !== 'human') {
    errors.push('The host must be a human player.')
  }

  const humanCount = setup.seats.filter((s) => s.kind === 'human').length
  if (humanCount < 1) {
    errors.push('At least one human player is required.')
  }

  if (setup.firstPlayerSeat < 0 || setup.firstPlayerSeat >= setup.playerCount) {
    errors.push('First player seat is out of range.')
  }

  for (const seat of setup.seats) {
    if (!factions.has(seat.faction)) {
      errors.push(`Invalid faction for seat ${seat.seatIndex + 1}.`)
    }
  }

  return errors
}

export function remoteHumanSeats(
  setup: SessionSetup,
  steps: SetupStepDefinition[],
): SeatConfig[] {
  const allowRemote = steps.find((s) => s.type === 'seatAssignment')?.allowRemoteHumans
  if (allowRemote) return []

  const hostSeat = steps.find((s) => s.type === 'seatAssignment')?.hostSeat ?? 0
  return setup.seats.filter((s) => s.kind === 'human' && s.seatIndex !== hostSeat)
}

export function seatDisplayName(seat: SeatConfig): string {
  if (seat.isHost) return 'You (host)'
  if (seat.kind === 'ai') return `AI ${seat.seatIndex}`
  return `Player ${seat.seatIndex + 1}`
}

export function getSeatConfig(session: SessionSetup, seatIndex: number): SeatConfig | undefined {
  return session.seats.find((s) => s.seatIndex === seatIndex)
}
