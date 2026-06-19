import { useMemo, useState } from 'react'
import type { GameProfile } from '../core/profile/schema'
import type { ClimbingGameState, PlayAction } from '../core/types'
import {
  canPass,
  getLocalPlayer,
  getValidPlays,
  isLocallyControlledHuman,
} from '../core/engines/climbing'
import { LOCAL_PLAYER_SEAT } from '../core/session/types'
import { CardView } from './CardView'

interface GameBoardProps {
  profile: GameProfile
  state: ClimbingGameState
  onAction: (action: PlayAction | { type: 'pass' }) => void
}

export function GameBoard({ profile, state, onAction }: GameBoardProps) {
  const localPlayer = getLocalPlayer(state, LOCAL_PLAYER_SEAT)
  const [selected, setSelected] = useState<string[]>([])
  const [takeCardId, setTakeCardId] = useState<string | null>(null)

  const validPlays = useMemo(
    () => getValidPlays(state, localPlayer.hand),
    [state, localPlayer.hand],
  )

  const isHumanTurn = isLocallyControlledHuman(state, LOCAL_PLAYER_SEAT)

  const matchingPlay = validPlays.find(
    (play) =>
      play.cardIds.length === selected.length &&
      play.cardIds.every((id) => selected.includes(id)),
  )

  const mustTake = Boolean(state.table && isHumanTurn)

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
      <header className="game-header">
        <h2>{profile.metadata.name}</h2>
        <p className="subtitle">{profile.metadata.description}</p>
      </header>

      <section className="scoreboard">
        {state.players.map((player, index) => (
          <div
            key={player.id}
            className={`score-row ${state.currentPlayerIndex === index && state.phase === 'playing' ? 'active' : ''}`}
          >
            <span>
              {player.name}
              {player.kind === 'human' && !player.isHost ? ' · remote' : ''}
            </span>
            <span>{player.kind === 'ai' ? 'AI' : 'Human'}</span>
            <span>{player.score} pts</span>
            <span>{player.hand.length} cards</span>
          </div>
        ))}
      </section>

      {state.table && (
        <section className="table-area">
          <h3>Table</h3>
          <div className="card-row">
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
          <p className="hint">
            Play by {state.players.find((p) => p.id === state.table!.playedBy)?.name}
            {mustTake && ' — pick a card to take'}
          </p>
        </section>
      )}

      <section className="hand-area">
        <h3>Your hand {isHumanTurn ? '(your turn)' : ''}</h3>
        <div className="card-row">
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
      </section>

      {state.phase === 'finished' ? (
        <p className="banner finished">Game over</p>
      ) : (
        <section className="actions">
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

      <section className="log">
        <h3>Log</h3>
        <ul>
          {[...state.log].reverse().slice(0, 12).map((entry, i) => (
            <li key={`${entry}-${i}`}>{entry}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
