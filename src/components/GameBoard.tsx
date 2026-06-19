import { useMemo, useState } from 'react'
import type { GameProfile } from '../core/profile/schema'
import type { ClimbingGameState, PlayAction, PlayerState } from '../core/types'
import {
  canPass,
  getLocalPlayer,
  getValidPlays,
  isLocallyControlledHuman,
} from '../core/engines/climbing'
import { LOCAL_PLAYER_SEAT } from '../core/session/types'
import { CardView, HandBacks } from './CardView'
import { HelpModal } from './HelpModal'
import { BackIcon, HelpIcon, IconButton, LeaveIcon } from './IconButton'
import { getOpponents, getSeatGridArea, getSeatPositionClass } from './table-layout'

interface GameBoardProps {
  profile: GameProfile
  state: ClimbingGameState
  onAction: (action: PlayAction | { type: 'pass' }) => void
  onBackToSetup: () => void
  onLeave: () => void
}

function OpponentSeat({
  player,
  isActive,
  isHandStarter,
}: {
  player: PlayerState
  totalPlayers: number
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
          {player.score} pts · {player.kind === 'ai' ? 'AI' : 'Human'}
        </span>
      </div>
      <div className="seat-cards centered-row">
        <HandBacks count={player.hand.length} />
      </div>
    </div>
  )
}

export function GameBoard({ profile, state, onAction, onBackToSetup, onLeave }: GameBoardProps) {
  const localPlayer = getLocalPlayer(state, LOCAL_PLAYER_SEAT)
  const [selected, setSelected] = useState<string[]>([])
  const [takeCardId, setTakeCardId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)

  const validPlays = useMemo(
    () => getValidPlays(state, localPlayer.hand),
    [state, localPlayer.hand],
  )

  const isHumanTurn = isLocallyControlledHuman(state, LOCAL_PLAYER_SEAT)
  const opponents = getOpponents(state.players)
  const logEntries = useMemo(() => [...state.log].reverse(), [state.log])
  const handStarter = state.players[state.handStarterIndex]
  const helpText = profile.metadata.help ?? profile.metadata.description ?? ''

  const matchingPlay = validPlays.find(
    (play) =>
      play.cardIds.length === selected.length &&
      play.cardIds.every((id) => selected.includes(id)),
  )

  const mustTake =
    Boolean(state.table && isHumanTurn) && localPlayer.hand.length > selected.length

  function toggleCard(id: string) {
    if (!isHumanTurn) return
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function submitPlay() {
    if (!matchingPlay) return
    if (mustTake && !takeCardId) return
    onAction({
      type: 'play',
      cardIds: selected,
      takeCardId: takeCardId ?? undefined,
    })
    setSelected([])
    setTakeCardId(null)
  }

  return (
    <div className="game-board">
      <header className="game-top-bar">
        <div className="game-title-block">
          <h2>{profile.metadata.name}</h2>
          <p className="game-hand-leader">
            First player this hand: <strong>{handStarter.name}</strong>
          </p>
        </div>
      </header>

      <HelpModal
        open={helpOpen}
        title={`${profile.metadata.name} — rules`}
        onClose={() => setHelpOpen(false)}
      >
        <div className="help-rules">{helpText}</div>
      </HelpModal>

      <div className="table-arena">
        <div className="table-grid">
          {opponents.map((player) => {
            const playerIndex = state.players.indexOf(player)
            const position = getSeatPositionClass(player.seatIndex, state.players.length)
            return (
              <div
                key={player.id}
                className={`seat-wrap seat-wrap--${position}`}
                style={{ gridArea: getSeatGridArea(position) }}
              >
                <OpponentSeat
                  player={player}
                  totalPlayers={state.players.length}
                  isActive={
                    state.currentPlayerIndex === playerIndex && state.phase === 'playing'
                  }
                  isHandStarter={playerIndex === state.handStarterIndex}
                />
              </div>
            )
          })}

          <div className="table-felt">
            {state.table ? (
              <>
                <p className="table-label">Table</p>
                <div className="card-row centered-row">
                  {state.table.cards.map((card) => (
                    <CardView
                      key={card.id}
                      card={card}
                      selected={takeCardId === card.id}
                      disabled={!mustTake}
                      onClick={() => mustTake && setTakeCardId(card.id)}
                    />
                  ))}
                </div>
                <p className="hint table-hint">
                  Play by {state.players.find((p) => p.id === state.table!.playedBy)?.name}
                  {mustTake && ' — pick a card to take'}
                </p>
              </>
            ) : (
              <p className="table-empty">Waiting for lead…</p>
            )}
          </div>
        </div>
      </div>

      <section
        className={`local-player ${isHumanTurn ? 'local-player--active' : ''} ${state.currentPlayerIndex === state.players.indexOf(localPlayer) && state.phase === 'playing' ? 'seat--active' : ''}`}
      >
        <div className="local-player-header">
          <span className="seat-name">
            {localPlayer.name}
            {state.handStarterIndex === state.players.indexOf(localPlayer) && (
              <span className="first-player-badge">First player</span>
            )}
          </span>
          <span className="seat-meta">
            {localPlayer.score} pts
            {isHumanTurn ? ' · your turn' : ''}
          </span>
        </div>

        <div className="card-row centered-row local-hand">
          {localPlayer.hand.map((card) => (
            <CardView
              key={card.id}
              card={card}
              selected={selected.includes(card.id)}
              disabled={!isHumanTurn}
              onClick={() => toggleCard(card.id)}
            />
          ))}
        </div>

        {state.phase === 'finished' ? (
          <p className="banner finished">Game over</p>
        ) : (
          <section className="actions centered-row">
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
              onClick={() => onAction({ type: 'pass' })}
            >
              Pass
            </button>
          </section>
        )}
      </section>

      <footer className="game-bottom-bar">
        <div className="game-toolbar-icons">
          <IconButton label="Help" onClick={() => setHelpOpen(true)}>
            <HelpIcon />
          </IconButton>
          <IconButton label="Back to setup" onClick={onBackToSetup}>
            <BackIcon />
          </IconButton>
          <IconButton label="Leave game" onClick={onLeave}>
            <LeaveIcon />
          </IconButton>
        </div>

        <section className="log log-notebook" aria-label="Game log">
          <ul>
            {logEntries.map((entry, i) => (
              <li key={`${entry}-${i}`}>{entry}</li>
            ))}
          </ul>
        </section>
      </footer>
    </div>
  )
}
