import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProfile } from '../core/profile/schema'
import { needsAiTurn } from '../core/game-session'
import type { SessionSetup as SessionSetupState } from '../core/session/types'
import { LOCAL_PLAYER_SEAT } from '../core/session/types'
import { getSeatConfig, seatDisplayName } from '../core/session/setup'
import type { BidAction, PlayerState, TrickPlayAction, TrickTakingGameState } from '../core/types'
import {
  getLocalTrickPlayer,
  getPlayerBid,
  getValidTrickPlays,
  isLocallyControlledHumanTrick,
} from '../core/engines/trick-taking'
import { CardView, FactionBadge, HandBacks } from './CardView'
import { ConfirmModal } from './ConfirmModal'
import { DraggableHand } from './DraggableHand'
import { HelpModal } from './HelpModal'
import { GameScoreboard, ScoreSummaryModal } from './ScoreSummaryModal'
import { BackIcon, HelpIcon, IconButton, LeaveIcon } from './IconButton'
import { getSeatGridArea, getSeatPositionClass, getOpponents } from './table-layout'
import { syncHandDisplayOrder } from '../core/display'

const AI_TURN_DELAY_MS = 720

interface TrickTakingBoardProps {
  profile: GameProfile
  session: SessionSetupState
  state: TrickTakingGameState | null
  matchStarted: boolean
  onStartMatch: () => void
  onPlayAgain: () => void
  onAction: (action: BidAction | TrickPlayAction) => void
  onAiStep: () => void
  onContinueRound: () => void
  onBackToSetup: () => void
  onLeave: () => void
}

function SeatPanel({
  player,
  handCount,
  isActive,
  bid,
  tricksWon,
  isDealer,
}: {
  player: PlayerState | { name: string; faction: string; kind: string; isHost: boolean }
  handCount: number
  isActive: boolean
  bid: number | null
  tricksWon: number
  isDealer: boolean
}) {
  return (
    <div className={`seat ${isActive ? 'seat--active' : ''}`}>
      <div className="seat-info">
        <span className="seat-name">
          {player.name}
          {isDealer && <span className="first-player-badge">Dealer</span>}
        </span>
        <span className="seat-meta">
          <FactionBadge faction={player.faction} />
          {' · '}
          {player.kind === 'ai' ? 'AI' : 'Human'}
          {handCount >= 0 && ` · ${handCount} cards`}
          {bid !== null && ` · bid ${bid}`}
          {` · tricks ${tricksWon}`}
        </span>
      </div>
      <div className="seat-cards centered-row">
        <HandBacks count={handCount} faction={player.faction} />
      </div>
    </div>
  )
}

export function TrickTakingBoard({
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
}: TrickTakingBoardProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [bidAmount, setBidAmount] = useState(0)
  const [helpOpen, setHelpOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [backOpen, setBackOpen] = useState(false)
  const [handOrder, setHandOrder] = useState<string[]>([])
  const logRef = useRef<HTMLUListElement>(null)
  const prevLogLen = useRef(0)

  const helpText = profile.metadata.help ?? profile.metadata.description ?? ''
  const playerCount = session.playerCount
  const previewSeats = session.seats.filter((s) => s.seatIndex !== LOCAL_PLAYER_SEAT)
  const localSeatConfig = getSeatConfig(session, LOCAL_PLAYER_SEAT)
  const localPlayer = state ? getLocalTrickPlayer(state, LOCAL_PLAYER_SEAT) : null

  useEffect(() => {
    if (!localPlayer) {
      setHandOrder([])
      return
    }
    setHandOrder((prev) => syncHandDisplayOrder(localPlayer.hand, prev))
    setBidAmount(Math.min(bidAmount, localPlayer.hand.length))
  }, [localPlayer])

  const isHumanTurn =
    Boolean(state && localPlayer) &&
    isLocallyControlledHumanTrick(state!, LOCAL_PLAYER_SEAT) &&
    (state!.phase === 'bidding' || state!.phase === 'playing')

  const opponents = state
    ? getOpponents(state.players)
    : previewSeats.map((seat) => ({
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

  const validPlays = useMemo(() => {
    if (!state || !localPlayer || state.phase !== 'playing') return []
    return getValidTrickPlays(state, localPlayer.hand)
  }, [state, localPlayer])

  const selectedCard = localPlayer?.hand.find((c) => c.id === selected) ?? null
  const needsTigressChoice = selectedCard?.kind === 'tigress'

  useEffect(() => {
    if (!matchStarted || !state) return
    if (state.phase !== 'bidding' && state.phase !== 'playing') return
    if (!needsAiTurn(state)) return

    const timer = window.setTimeout(() => {
      onAiStep()
    }, AI_TURN_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [state, matchStarted, onAiStep])

  useEffect(() => {
    if (!state || !logRef.current) return
    if (state.log.length > prevLogLen.current) {
      logRef.current.scrollTop = 0
    }
    prevLogLen.current = state.log.length
  }, [state?.log.length])

  function submitBid() {
    if (!localPlayer || !isHumanTurn || state?.phase !== 'bidding') return
    onAction({ type: 'bid', amount: bidAmount })
  }

  function submitPlay(tigressAs?: 'pirate' | 'escape') {
    if (!selected || !localPlayer || !isHumanTurn || state?.phase !== 'playing') return
    if (!validPlays.some((c) => c.id === selected)) return
    if (selectedCard?.kind === 'tigress' && !tigressAs) return
    onAction({ type: 'play-trick', cardId: selected, tigressAs })
    setSelected(null)
  }

  const showStartOverlay = !matchStarted
  const showPlayAgain = Boolean(state && state.phase === 'finished')

  const roundSummarySubtitle = state?.matchEnding
    ? 'Match complete. Highest total score wins.'
    : `Round ${state?.roundNumber ?? 0}: bid points plus bonuses (exact bid only).`

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
        onClose={() => setHelpOpen(false)}
      >
        <div className="help-rules help-rules--plain">{helpText}</div>
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
        subtitle={roundSummarySubtitle}
        players={state?.players ?? []}
        deltas={handScoreDeltas}
        continueLabel={state?.matchEnding ? 'Finish game' : 'Next round'}
        onContinue={onContinueRound}
      />

      <div className="table-arena">
        <div className={`table-grid table-grid--players-${playerCount}`}>
          {opponents.map((player) => {
            const playerState = player as PlayerState
            const playerIndex = state ? state.players.indexOf(playerState) : -1
            const position = getSeatPositionClass(player.seatIndex, playerCount)
            const handCount = state ? playerState.hand.length : 0

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
                    (state!.phase === 'bidding' || state!.phase === 'playing')
                  }
                  bid={state ? getPlayerBid(state, player.id) : null}
                  tricksWon={state?.tricksWon[player.id] ?? 0}
                  isDealer={Boolean(state && playerIndex === state.dealerIndex)}
                />
              </div>
            )
          })}

          <div className="table-felt">
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
                {state.phase === 'bidding' && (
                  <p className="table-empty">Bidding — {state.cardsDealt} card(s) this round</p>
                )}
                {state.currentTrick.length > 0 ? (
                  <>
                    <p className="table-label">Current trick</p>
                    <div className="card-row centered-row">
                      {state.currentTrick.map((play) => (
                        <div key={`${play.playerId}-${play.card.id}`} className="trick-play">
                          <CardView card={play.card} small />
                          <span className="hint">
                            {state.players.find((p) => p.id === play.playerId)?.name}
                            {play.tigressAs ? ` (${play.tigressAs})` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : state.phase === 'playing' ? (
                  <p className="table-empty">Waiting for lead…</p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {localSeatConfig && (
        <section
          className={`local-player ${isHumanTurn ? 'local-player--active' : ''} ${
            state &&
            state.currentPlayerIndex ===
              state.players.findIndex((p) => p.seatIndex === LOCAL_PLAYER_SEAT) &&
            (state.phase === 'bidding' || state.phase === 'playing')
              ? 'seat--active'
              : ''
          }`}
        >
          <div className="local-player-header">
            <span className="seat-name">
              {localSeatConfig.isHost ? 'You (host)' : seatDisplayName(localSeatConfig)}
            </span>
            <span className="seat-meta">
              <FactionBadge faction={localSeatConfig.faction} />
              {localPlayer && ` · ${localPlayer.score} pts`}
              {state && getPlayerBid(state, localPlayer?.id ?? '') !== null &&
                ` · bid ${getPlayerBid(state, localPlayer!.id)}`}
              {state && localPlayer && ` · tricks ${state.tricksWon[localPlayer.id] ?? 0}`}
              {isHumanTurn ? ' · your turn' : ''}
            </span>
          </div>

          <div className="local-hand">
            {matchStarted && localPlayer ? (
              <>
                <DraggableHand
                  className="centered-row"
                  cards={localPlayer.hand}
                  order={handOrder}
                  onOrderChange={setHandOrder}
                  selected={selected ? [selected] : []}
                  onToggleSelect={(id) =>
                    setSelected((prev) => (prev === id ? null : id))
                  }
                  selectDisabled={!isHumanTurn || state?.phase !== 'playing'}
                />
                <p className="hint local-hand-hint">Drag cards to reorder your hand.</p>
              </>
            ) : (
              <HandBacks count={1} faction={localSeatConfig.faction} small={false} />
            )}
          </div>

          {matchStarted && state && state.phase === 'bidding' && (
            <section className="actions centered-row">
              <p className="hint action-hint" aria-live="polite">
                {isHumanTurn
                  ? `Bid tricks (0–${localPlayer?.hand.length ?? 0})`
                  : '\u00A0'}
              </p>
              <div className="action-buttons">
                <input
                  type="range"
                  min={0}
                  max={localPlayer?.hand.length ?? 0}
                  value={bidAmount}
                  disabled={!isHumanTurn}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                />
                <span className="bid-display">{bidAmount}</span>
                <button type="button" disabled={!isHumanTurn} onClick={submitBid}>
                  Submit bid
                </button>
              </div>
            </section>
          )}

          {matchStarted && state && state.phase === 'playing' && (
            <section className="actions centered-row">
              <p className="hint action-hint" aria-live="polite">
                {isHumanTurn && !selected ? 'Select a card to play.' : '\u00A0'}
              </p>
              <div className="action-buttons">
                {needsTigressChoice && isHumanTurn ? (
                  <>
                    <button type="button" onClick={() => submitPlay('pirate')}>
                      Tigress as Pirate
                    </button>
                    <button type="button" onClick={() => submitPlay('escape')}>
                      Tigress as Escape
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={
                      !isHumanTurn ||
                      !selected ||
                      !validPlays.some((c) => c.id === selected)
                    }
                    onClick={() => submitPlay()}
                  >
                    Play card
                  </button>
                )}
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
              logEntries.map((entry, i) => (
                <li key={`${entry}-${i}`}>{entry}</li>
              ))
            )}
          </ul>
        </section>
      </footer>
    </div>
  )
}
