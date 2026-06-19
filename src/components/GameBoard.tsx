import { useMemo, useState } from 'react'
import type { GameProfile } from '../core/profile/schema'
import type { ClimbingGameState, PlayAction } from '../core/types'
import {
  canPass,
  getHumanPlayerIndex,
  getValidPlays,
} from '../core/engines/climbing'
import { CardView } from './CardView'

interface GameBoardProps {
  profile: GameProfile
  state: ClimbingGameState
  onAction: (action: PlayAction | { type: 'pass' }) => void
}

export function GameBoard({ profile, state, onAction }: GameBoardProps) {
  const humanIndex = getHumanPlayerIndex(state)
  const human = state.players[humanIndex]
  const [selected, setSelected] = useState<string[]>([])
  const [takeCardId, setTakeCardId] = useState<string | null>(null)

  const validPlays = useMemo(
    () => getValidPlays(state, human.hand),
    [state, human.hand],
  )

  const isHumanTurn =
    state.phase === 'playing' && state.currentPlayerIndex === humanIndex

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
        {state.players.map((player) => (
          <div
            key={player.id}
            className={`score-row ${state.currentPlayerIndex === state.players.indexOf(player) && state.phase === 'playing' ? 'active' : ''}`}
          >
            <span>{player.name}</span>
            <span>{player.score} pts</span>
            <span>{player.hand.length} cartas</span>
          </div>
        ))}
      </section>

      {state.table && (
        <section className="table-area">
          <h3>Mesa</h3>
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
            Jugada de {state.players.find((p) => p.id === state.table!.playedBy)?.name}
            {mustTake && ' — elige una carta para tomar'}
          </p>
        </section>
      )}

      <section className="hand-area">
        <h3>Tu mano {isHumanTurn ? '(tu turno)' : ''}</h3>
        <div className="card-row">
          {human.hand.map((card) => (
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
        <p className="banner finished">Partida terminada</p>
      ) : (
        <section className="actions">
          <button
            type="button"
            disabled={!isHumanTurn || !matchingPlay || (mustTake && !takeCardId)}
            onClick={submitPlay}
          >
            Jugar selección
          </button>
          <button
            type="button"
            disabled={!isHumanTurn || !canPass(state)}
            onClick={() => onAction({ type: 'pass' })}
          >
            Pasar
          </button>
        </section>
      )}

      <section className="log">
        <h3>Registro</h3>
        <ul>
          {[...state.log].reverse().slice(0, 12).map((entry, i) => (
            <li key={`${entry}-${i}`}>{entry}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
