import type { GameProfile } from './profile/schema'
import {
  applyAction,
  initClimbingGame,
  runAiTurnsWhileNeeded,
} from './engines/climbing'
import type { ClimbingGameState, PlayerAction } from './types'

export function createGame(
  profile: GameProfile,
  playerCount?: number,
  humanIndex = 0,
): ClimbingGameState {
  const count = playerCount ?? profile.spec.players.default
  const clamped = Math.min(
    profile.spec.players.max,
    Math.max(profile.spec.players.min, count),
  )

  if (profile.spec.family !== 'climbing') {
    throw new Error(`Familia no soportada: ${profile.spec.family}`)
  }

  const state = initClimbingGame(profile, clamped, humanIndex)
  return runAiTurnsWhileNeeded(state, profile)
}

export function dispatchHumanAction(
  state: ClimbingGameState,
  profile: GameProfile,
  action: PlayerAction,
): ClimbingGameState {
  const afterHuman = applyAction(state, profile, action)
  return runAiTurnsWhileNeeded(afterHuman, profile)
}
