import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { GameProfile } from '../core/profile/schema'
import { needsAiTurn } from '../core/game-session'
import type { SessionSetup as SessionSetupState } from '../core/session/types'
import { LOCAL_PLAYER_SEAT } from '../core/session/types'
import { getSeatConfig, seatDisplayName } from '../core/session/setup'
import type { ClimbingGameState, PlayAction, PlayerState } from '../core/types'
import {
  canPass,
  getLocalPlayer,
  getValidPlays,
  isLocallyControlledHuman,
  mustTakeFromTable,
} from '../core/engines/climbing'
import { CardView, FactionBadge, HandBacks } from './CardView'
import { ConfirmModal } from './ConfirmModal'
import { DiscardPile } from './DiscardPile'
import { DraggableHand } from './DraggableHand'
import { HelpModal } from './HelpModal'
import { RulesHelpPanel } from './RulesHelpPanel'
import { GameScoreboard, ScoreSummaryModal } from './ScoreSummaryModal'
import { BackIcon, HelpIcon, IconButton, LeaveIcon } from './IconButton'
import {
  animationOriginForPosition,
  getOpponents,
  getSeatGridArea,
  getSeatPositionClass,
} from './table-layout'
import { getProfileRules } from '../content/odin-rules'
import { sortCardsForTableDisplay, syncHandDisplayOrder } from '../core/display'

const PLAY_ANIM_MS = 520
const AI_TURN_DELAY_MS = 720

interface GameBoardProps {
  profile: GameProfile
  session: SessionSetupState
  state: ClimbingGameState | null
  matchStarted: boolean
  onStartMatch: () => void
  onPlayAgain: () => void
  onAction: (action: PlayAction | { type: 'pass' }) => void
  onAiStep: () => void
  onContinueRound: () => void
  onBackToSetup: () => void
  onLeave: () => void
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function SeatPanel({
  player,
  handCount,
  isActive,
  isHandStarter,
}: {
  player: PlayerState | { name: string; faction: string; kind: string; isHost: boolean }
  handCount: number
  isActive: boolean
  isHandStarter: boolean
}) {
  return (
    <div className={`seat ${isActive ? 'seat--active' : ''}`}>
      <div className="seat-info">
        <span className="seat-name">
          {player.name}
          {isHandStarter && <span className="first-player-badge">First player</span>}
        </span>
        <span className="seat-meta">
          <FactionBadge faction={player.faction} />
          {' · '}
          {player.kind === 'ai' ? 'AI' : 'Human'}
          {handCount >= 0 && ` · ${handCount} cards`}
        </span>
      </div>
      <div className="seat-cards centered-row">
        <HandBacks count={handCount} faction={player.faction} />
      </div>
    </div>
  )
}

export function GameBoard({
  profile,
  session,
  state,
  matchStarted,
  onStartMatch,
  onPlayAgain,
  onAction,
  onAiStep,
  onContinueRound,
  onBackToSetup,
  onLeave,
}: GameBoardProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [takeCardId, setTakeCardId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [backOpen, setBackOpen] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [handOrder, setHandOrder] = useState<string[]>([])
  const logRef = useRef<HTMLUListElement>(null)
  const prevLogLen = useRef(0)

  const helpText = profile.metadata.help ?? profile.metadata.description ?? ''
  const rulesDocument = getProfileRules(profile.metadata.id)
  const playerCount = session.playerCount

  const previewSeats = session.seats.filter((s) => s.seatIndex !== LOCAL_PLAYER_SEAT)
  const localSeatConfig = getSeatConfig(session, LOCAL_PLAYER_SEAT)

  const localPlayer = state ? getLocalPlayer(state, LOCAL_PLAYER_SEAT) : null

  useEffect(() => {
    if (!localPlayer) {
      setHandOrder([])
      return
    }
    setHandOrder((prev) => syncHandDisplayOrder(localPlayer.hand, prev))
  }, [localPlayer])

  const tableCardsDisplay = useMemo(
    () => (state?.table ? sortCardsForTableDisplay(state.table.cards, profile) : []),
    [state?.table?.cards, profile],
  )
  const validPlays = useMemo(
    () => (state && localPlayer ? getValidPlays(state, localPlayer.hand) : []),
    [state, localPlayer],
  )

  const isHumanTurn =
    Boolean(state && localPlayer) &&
    isLocallyControlledHuman(state!, LOCAL_PLAYER_SEAT) &&
    !animating

  const opponents = state ? getOpponents(state.players) : previewSeats.map((seat) => ({
    id: `preview-${seat.seatIndex}`,
    seatIndex: seat.seatIndex,
    name: seatDisplayName(seat),
    kind: seat.kind,
    isHost: seat.isHost,
    faction: seat.faction,
    hand: [],
    score: 0,
    passed: false,
  }))

  const logEntries = useMemo(() => (state ? [...state.log].reverse() : []), [state?.log])

  const handScoreDeltas = useMemo(() => {
    if (!state?.lastHandDeltas.length) return undefined
    return new Map(state.lastHandDeltas.map((entry) => [entry.playerId, entry.delta]))
  }, [state?.lastHandDeltas])

  const matchingPlay = validPlays.find(
    (play) =>
      play.cardIds.length === selected.length &&
      play.cardIds.every((id) => selected.includes(id)),
  )

  const mustTake = Boolean(
    matchingPlay &&
      state?.table &&
      isHumanTurn &&
      localPlayer &&
      mustTakeFromTable(state, localPlayer.hand.length, matchingPlay.cardIds.length),
  )

  const actionHintMessage = useMemo(() => {
    if (!isHumanTurn || !state || state.phase !== 'playing') return ''
    if (selected.length > 0 && !matchingPlay) {
      const countHint = state.table
        ? ` ${state.table.cards.length} or ${state.table.cards.length + 1}`
        : ''
      return `Cards must share the same colour or number, beat the table, and use${countHint} cards.`
    }
    if (matchingPlay && mustTake && state.table!.cards.length > 1 && !takeCardId) {
      return 'Click a table card to take into your hand.'
    }
    return ''
  }, [isHumanTurn, state, selected.length, matchingPlay, mustTake, takeCardId])

  useEffect(() => {
    if (!state?.table || !matchingPlay || !isHumanTurn || !localPlayer) {
      setTakeCardId(null)
      return
    }

    if (!mustTakeFromTable(state, localPlayer.hand.length, matchingPlay.cardIds.length)) {
      setTakeCardId(null)
      return
    }

    if (state.table.cards.length === 1) {
      setTakeCardId(state.table.cards[0].id)
      return
    }

    setTakeCardId((current) =>
      current && state.table!.cards.some((card) => card.id === current) ? current : null,
    )
  }, [state?.table, matchingPlay, isHumanTurn, localPlayer])

  const tableAnimStyle = useMemo(() => {
    if (!state?.table) return {}
    const player = state.players.find((p) => p.id === state.table!.playedBy)
    if (!player) return {}
    const position = getSeatPositionClass(player.seatIndex, state.players.length)
    return animationOriginForPosition(position)
  }, [state?.table, state?.log.length, state?.players.length])

  useEffect(() => {
    if (!matchStarted || !state || state.phase !== 'playing') return
    if (!needsAiTurn(state)) return
    if (animating) return

    const timer = window.setTimeout(() => {
      setAnimating(true)
      onAiStep()
      window.setTimeout(() => setAnimating(false), PLAY_ANIM_MS)
    }, AI_TURN_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [state, matchStarted, animating, onAiStep])

  useEffect(() => {
    if (!state || !logRef.current) return
    if (state.log.length > prevLogLen.current) {
      logRef.current.scrollTop = 0
    }
    prevLogLen.current = state.log.length
  }, [state?.log.length])

  function toggleCard(id: string) {
    if (!isHumanTurn) return
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function submitPlay() {
    if (!matchingPlay || !localPlayer) return
    if (mustTake && !takeCardId) return
    setAnimating(true)
    await delay(PLAY_ANIM_MS)
    onAction({
      type: 'play',
      cardIds: matchingPlay.cardIds,
      takeCardId: takeCardId ?? undefined,
    })
    setSelected([])
    setTakeCardId(null)
    setAnimating(false)
  }

  async function submitPass() {
    setAnimating(true)
    await delay(PLAY_ANIM_MS * 0.6)
    onAction({ type: 'pass' })
    setAnimating(false)
  }

  const showStartOverlay = !matchStarted
  const showPlayAgain = Boolean(state && state.phase === 'finished')

  return (
    <div className="game-board">
      <header className="game-top-bar">
        <h2 className="game-top-title">{profile.metadata.name}</h2>
        {matchStarted && state && (
          <GameScoreboard
            roundNumber={state.roundNumber}
            players={state.players}
            gameEnd={state.gameEnd}
            winnerRule={profile.spec.scoring.winner}
          />
        )}
      </header>

      <HelpModal
        open={helpOpen}
        title={`${profile.metadata.name} — rules`}
        variant={rulesDocument ? 'rules' : 'default'}
        onClose={() => setHelpOpen(false)}
      >
        {rulesDocument ? (
          <RulesHelpPanel document={rulesDocument} />
        ) : (
          <div className="help-rules help-rules--plain">{helpText}</div>
        )}
      </HelpModal>

      <ConfirmModal
        open={leaveOpen}
        title="Leave game?"
        message="You will return to the lobby and lose the current table."
        confirmLabel="Leave"
        onConfirm={() => {
          setLeaveOpen(false)
          onLeave()
        }}
        onCancel={() => setLeaveOpen(false)}
      />

      <ConfirmModal
        open={backOpen}
        title="Back to setup?"
        message="You will leave the current match and lose all progress in this game."
        confirmLabel="Back to setup"
        onConfirm={() => {
          setBackOpen(false)
          onBackToSetup()
        }}
        onCancel={() => setBackOpen(false)}
      />

      <ScoreSummaryModal
        open={Boolean(state && state.phase === 'round-summary')}
        title={
          state?.matchEnding
            ? `Final round (${state.roundNumber})`
            : `Round ${state?.roundNumber ?? 0} complete`
        }
        subtitle={
          state?.matchEnding
            ? profile.spec.scoring.winner === 'lowest'
              ? 'Match ends now. Lowest total score wins — ties share victory.'
              : 'Match ends now. Highest total score wins — ties share victory.'
            : 'Points added for cards left in hand.'
        }
        players={state?.players ?? []}
        deltas={handScoreDeltas}
        continueLabel={state?.matchEnding ? 'Finish game' : 'Next round'}
        onContinue={onContinueRound}
      />

      <div className="table-arena">
        {matchStarted && state && (
          <DiscardPile cards={state.discard} />
        )}
        <div className={`table-grid table-grid--players-${playerCount}`}>
          {opponents.map((player) => {
            const playerIndex = state ? state.players.indexOf(player as PlayerState) : -1
            const position = getSeatPositionClass(player.seatIndex, playerCount)
            const handCount = state ? (player as PlayerState).hand.length : profile.spec.deal.cardsPerPlayer

            return (
              <div
                key={player.id}
                className={`seat-wrap seat-wrap--${position}`}
                style={{ gridArea: getSeatGridArea(position) }}
              >
                <SeatPanel
                  player={player}
                  handCount={handCount}
                  isActive={
                    Boolean(state) &&
                    playerIndex === state!.currentPlayerIndex &&
                    state!.phase === 'playing'
                  }
                  isHandStarter={Boolean(state) && playerIndex === state!.handStarterIndex}
                />
              </div>
            )
          })}

          <div className="table-felt" style={tableAnimStyle as CSSProperties}>
            {showStartOverlay && (
              <div className="table-overlay">
                <p>Table is ready. Press Start when everyone is set.</p>
                <button type="button" onClick={onStartMatch}>
                  Start
                </button>
              </div>
            )}

            {showPlayAgain && (
              <div className="table-overlay table-overlay--finished">
                <p>Game over</p>
                <button type="button" onClick={onPlayAgain}>
                  Play again
                </button>
              </div>
            )}

            {!showStartOverlay && !showPlayAgain && state && (
              <>
                {state.table ? (
                  <>
                    <p className="table-label">Table</p>
                    <div
                      key={`table-${state.log.length}`}
                      className="card-row centered-row table-cards-animated"
                    >
                      {tableCardsDisplay.map((card, index) => (
                        <CardView
                          key={card.id}
                          card={card}
                          className="card-animate-in"
                          selected={takeCardId === card.id}
                          disabled={!mustTake}
                          onClick={() => mustTake && setTakeCardId(card.id)}
                          style={{ animationDelay: `${index * 70}ms` }}
                        />
                      ))}
                    </div>
                    <p className="hint table-hint">
                      Play by {state.players.find((p) => p.id === state.table!.playedBy)?.name}
                      {mustTake && state.table.cards.length === 1 && ' — you will take the table card'}
                      {mustTake && state.table.cards.length > 1 && ' — pick a card to take'}
                    </p>
                  </>
                ) : (
                  <p className="table-empty">Waiting for lead…</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {localSeatConfig && (
        <section
          className={`local-player ${
            isHumanTurn ? 'local-player--active' : ''
          } ${
            state &&
            state.currentPlayerIndex === state.players.findIndex((p) => p.seatIndex === LOCAL_PLAYER_SEAT) &&
            state.phase === 'playing'
              ? 'seat--active'
              : ''
          }`}
        >
          <div className="local-player-header">
            <span className="seat-name">
              {localSeatConfig.isHost ? 'You (host)' : seatDisplayName(localSeatConfig)}
              {state && state.handStarterIndex === state.players.findIndex((p) => p.seatIndex === LOCAL_PLAYER_SEAT) && (
                <span className="first-player-badge">First player</span>
              )}
            </span>
            <span className="seat-meta">
              <FactionBadge faction={localSeatConfig.faction} />
              {localPlayer && ` · ${localPlayer.score} pts`}
              {isHumanTurn ? ' · your turn' : ''}
            </span>
          </div>

          <div className={`local-hand ${animating ? 'hand-animating' : ''}`}>
            {matchStarted && localPlayer ? (
              <>
                <DraggableHand
                  className="centered-row"
                  cards={localPlayer.hand}
                  order={handOrder}
                  onOrderChange={setHandOrder}
                  selected={selected}
                  onToggleSelect={toggleCard}
                  selectDisabled={!isHumanTurn}
                />
                <p className="hint local-hand-hint">Drag cards to reorder your hand.</p>
              </>
            ) : (
              <HandBacks
                count={profile.spec.deal.cardsPerPlayer}
                faction={localSeatConfig.faction}
                small={false}
              />
            )}
          </div>

          {matchStarted && state && state.phase === 'playing' && (
            <section className="actions centered-row">
              <p className="hint action-hint" aria-live="polite">
                {actionHintMessage || '\u00A0'}
              </p>
              <div className="action-buttons">
                <button
                  type="button"
                  disabled={!isHumanTurn || !matchingPlay || (mustTake && !takeCardId)}
                  onClick={submitPlay}
                >
                  Play selection
                </button>
                <button
                  type="button"
                  disabled={!isHumanTurn || !canPass(state)}
                  onClick={submitPass}
                >
                  Pass
                </button>
              </div>
            </section>
          )}
        </section>
      )}

      <footer className="game-bottom-bar">
        <div className="game-toolbar-icons">
          <IconButton label="Help" onClick={() => setHelpOpen(true)}>
            <HelpIcon />
          </IconButton>
          <IconButton label="Back to setup" onClick={() => setBackOpen(true)}>
            <BackIcon />
          </IconButton>
          <IconButton label="Leave game" onClick={() => setLeaveOpen(true)}>
            <LeaveIcon />
          </IconButton>
        </div>

        <section className="log log-notebook" aria-label="Game log">
          <ul ref={logRef}>
            {logEntries.length === 0 ? (
              <li className="log-placeholder">The log will update after you press Start.</li>
            ) : (
              logEntries.map((entry, i) => <li key={`${entry}-${i}`}>{entry}</li>)
            )}
          </ul>
        </section>
      </footer>
    </div>
  )
}
