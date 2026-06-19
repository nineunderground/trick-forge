import type { GameProfile } from './profile/schema'
import {
  applyAction,
  initClimbingGame,
  runAiTurnsWhileNeeded,
} from './engines/climbing'
import type { SessionSetup } from './session/types'
import { LOCAL_PLAYER_SEAT } from './session/types'
import { validateSessionSetup, resolveFirstPlayerSeat } from './session/setup'
import type { ClimbingGameState, PlayerAction } from './types'

export function createGame(
  profile: GameProfile,
  session: SessionSetup,
): ClimbingGameState {
  if (profile.spec.family !== 'climbing') {
    throw new Error(`Unsupported family: ${profile.spec.family}`)
  }

  const errors = validateSessionSetup(profile, session)
  if (errors.length > 0) {
    throw new Error(errors.join(' '))
  }

  const state = initClimbingGame(
    profile,
    session.seats,
    resolveFirstPlayerSeat(session),
  )
  return runAiTurnsWhileNeeded(state, profile, LOCAL_PLAYER_SEAT)
}

export function dispatchHumanAction(
  state: ClimbingGameState,
  profile: GameProfile,
  action: PlayerAction,
): ClimbingGameState {
  const afterHuman = applyAction(state, profile, action)
  return runAiTurnsWhileNeeded(afterHuman, profile, LOCAL_PLAYER_SEAT)
}
