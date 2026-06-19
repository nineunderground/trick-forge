import type { GameProfile } from './profile/schema'
import {
  applyAction,
  chooseRandomAiAction,
  continueAfterRoundSummary,
  initClimbingGame,
  shouldAutoPlay,
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

  return initClimbingGame(
    profile,
    session.seats,
    resolveFirstPlayerSeat(session),
    session,
  )
}

export function runSingleAiTurn(
  state: ClimbingGameState,
  profile: GameProfile,
): ClimbingGameState {
  if (!shouldAutoPlay(state, LOCAL_PLAYER_SEAT)) {
    return state
  }
  return applyAction(state, profile, chooseRandomAiAction(state))
}

export function dispatchHumanAction(
  state: ClimbingGameState,
  profile: GameProfile,
  action: PlayerAction,
): ClimbingGameState {
  return applyAction(state, profile, action)
}

export function dispatchContinueRound(
  state: ClimbingGameState,
  profile: GameProfile,
): ClimbingGameState {
  return continueAfterRoundSummary(state, profile)
}

export function needsAiTurn(state: ClimbingGameState): boolean {
  return shouldAutoPlay(state, LOCAL_PLAYER_SEAT)
}
