import type { GameProfile } from './profile/schema'
import {
  applyAction,
  chooseRandomAiAction,
  continueAfterRoundSummary,
  initClimbingGame,
  shouldAutoPlay,
} from './engines/climbing'
import {
  applyTrickTakingAction,
  chooseRandomAiTrickAction,
  continueAfterTrickRoundSummary,
  initTrickTakingGame,
  shouldAutoPlayTrickTaking,
} from './engines/trick-taking'
import type { SessionSetup } from './session/types'
import { LOCAL_PLAYER_SEAT } from './session/types'
import { validateSessionSetup, resolveFirstPlayerSeat } from './session/setup'
import type { ClimbingGameState, GameState, PlayerAction, TrickTakingGameState } from './types'

export function createGame(profile: GameProfile, session: SessionSetup): GameState {
  const errors = validateSessionSetup(profile, session)
  if (errors.length > 0) {
    throw new Error(errors.join(' '))
  }

  if (profile.spec.family === 'climbing') {
    return initClimbingGame(
      profile,
      session.seats,
      resolveFirstPlayerSeat(session),
      session,
    )
  }

  if (profile.spec.family === 'trick-taking') {
    return initTrickTakingGame(
      profile,
      session.seats,
      resolveFirstPlayerSeat(session),
      session,
    )
  }

  throw new Error(`Unsupported family: ${profile.spec.family}`)
}

export function runSingleAiTurn(state: GameState, profile: GameProfile): GameState {
  if (state.family === 'climbing') {
    if (!shouldAutoPlay(state, LOCAL_PLAYER_SEAT)) {
      return state
    }
    return applyAction(state, profile, chooseRandomAiAction(state))
  }

  if (!shouldAutoPlayTrickTaking(state, LOCAL_PLAYER_SEAT)) {
    return state
  }
  return applyTrickTakingAction(state, profile, chooseRandomAiTrickAction(state))
}

export function dispatchHumanAction(
  state: GameState,
  profile: GameProfile,
  action: PlayerAction,
): GameState {
  if (state.family === 'climbing') {
    return applyAction(state, profile, action)
  }
  return applyTrickTakingAction(state, profile, action)
}

export function dispatchContinueRound(state: GameState, profile: GameProfile): GameState {
  if (state.family === 'climbing') {
    return continueAfterRoundSummary(state, profile)
  }
  return continueAfterTrickRoundSummary(state, profile)
}

export function needsAiTurn(state: GameState): boolean {
  if (state.family === 'climbing') {
    return shouldAutoPlay(state, LOCAL_PLAYER_SEAT)
  }
  return shouldAutoPlayTrickTaking(state, LOCAL_PLAYER_SEAT)
}

export function isClimbingState(state: GameState): state is ClimbingGameState {
  return state.family === 'climbing'
}

export function isTrickTakingState(state: GameState): state is TrickTakingGameState {
  return state.family === 'trick-taking'
}
