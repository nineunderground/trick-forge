import type { GameEndConfig, PlayerState } from '../core/types'
import { FactionBadge } from './CardView'

interface ScoreSummaryModalProps {
  open: boolean
  title: string
  subtitle?: string
  players: PlayerState[]
  deltas?: Map<string, number>
  continueLabel?: string
  onContinue: () => void
}

export function ScoreSummaryModal({
  open,
  title,
  subtitle,
  players,
  deltas,
  continueLabel = 'Continue',
  onContinue,
}: ScoreSummaryModalProps) {
  if (!open) return null

  return (
    <div className="modal-overlay" role="presentation">
      <div
        className="modal modal-score-summary"
        role="dialog"
        aria-modal="true"
        aria-labelledby="score-summary-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h3 id="score-summary-title">{title}</h3>
        </header>
        {subtitle && <p className="score-summary-subtitle">{subtitle}</p>}
        <ul className="score-summary-list">
          {players.map((player) => {
            const delta = deltas?.get(player.id)
            return (
              <li key={player.id} className="score-summary-row">
                <span className="score-summary-player">
                  <FactionBadge faction={player.faction} />
                  {player.name}
                </span>
                <span className="score-summary-score">
                  {delta !== undefined && delta > 0 && (
                    <span className="score-summary-delta">+{delta}</span>
                  )}
                  <strong>{player.score} pts</strong>
                </span>
              </li>
            )
          })}
        </ul>
        <div className="modal-actions">
          <button type="button" onClick={onContinue}>
            {continueLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

interface GameScoreboardProps {
  roundNumber: number
  players: PlayerState[]
  gameEnd: GameEndConfig
  winnerRule: 'lowest' | 'highest'
}

export function GameScoreboard({
  roundNumber,
  players,
  gameEnd,
  winnerRule,
}: GameScoreboardProps) {
  const endLabel =
    gameEnd.mode === 'roundCount'
      ? `Round ${roundNumber} / ${gameEnd.roundCount}`
      : `Round ${roundNumber} · End at ${gameEnd.pointThreshold}+ pts`

  return (
    <div className="game-scoreboard" aria-label="Match scoreboard">
      <div className="game-scoreboard-meta">
        <span>{endLabel}</span>
        <span className="game-scoreboard-sep">·</span>
        <span>{winnerRule === 'lowest' ? 'Lowest wins' : 'Highest wins'}</span>
      </div>
      <div className="game-scoreboard-players">
        {players.map((player) => (
          <span key={player.id} className="scoreboard-chip">
            <FactionBadge faction={player.faction} />
            <span className="scoreboard-chip-name">{player.name}</span>
            <strong className="scoreboard-chip-score">{player.score}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}
