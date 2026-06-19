import type { GameProfile } from '../core/profile/schema'
import {
  getSetupSteps,
  remoteHumanSeats,
  resizeSessionSetup,
  seatDisplayName,
  seatLabelForSetup,
  updateSeatKind,
  validateSessionSetup,
  updateSeatFaction,
  type SetupStepDefinition,
} from '../core/session/setup'
import type { FirstPlayerMode, GameEndMode, SessionSetup as SessionSetupState } from '../core/session/types'

interface SessionSetupProps {
  profile: GameProfile
  setup: SessionSetupState
  onChange: (setup: SessionSetupState) => void
  onStart: () => void
  onBack: () => void
}

export function SessionSetup({
  profile,
  setup,
  onChange,
  onStart,
  onBack,
}: SessionSetupProps) {
  const steps = getSetupSteps(profile)
  const errors = validateSessionSetup(profile, setup)
  const pendingRemoteHumans = remoteHumanSeats(setup, steps)
  const hostSeat = steps.find((s) => s.type === 'seatAssignment')?.hostSeat ?? 0
  const allowRemoteHumans =
    steps.find((s) => s.type === 'seatAssignment')?.allowRemoteHumans ?? false

  function setPlayerCount(count: number) {
    onChange(resizeSessionSetup(profile, setup, count))
  }

  function setSeatKind(seatIndex: number, kind: 'human' | 'ai') {
    onChange(updateSeatKind(setup, seatIndex, kind, steps))
  }

  function setFirstPlayerMode(mode: FirstPlayerMode) {
    onChange({ ...setup, firstPlayerMode: mode })
  }

  function setFirstPlayerSeat(seatIndex: number) {
    onChange({ ...setup, firstPlayerSeat: seatIndex })
  }

  function setSeatFaction(seatIndex: number, faction: string) {
    onChange(updateSeatFaction(setup, seatIndex, faction))
  }

  function setGameEndMode(mode: GameEndMode) {
    onChange({ ...setup, gameEndMode: mode })
  }

  function setGameEndRoundCount(count: number) {
    onChange({ ...setup, gameEndRoundCount: count })
  }

  function setGameEndPointThreshold(threshold: number) {
    onChange({ ...setup, gameEndPointThreshold: threshold })
  }

  return (
    <section className="session-setup panel">
      <h2>{profile.metadata.name} — session setup</h2>
      <p className="hint">
        Profile <code>{profile.metadata.id}</code> v{profile.metadata.version} ·{' '}
        {profile.spec.players.min}–{profile.spec.players.max} players
      </p>
      <p className="hint">Complete each step before starting the game.</p>

      {steps.map((step, index) => (
        <SetupStepPanel
          key={step.id}
          step={step}
          stepNumber={index + 1}
          profile={profile}
          setup={setup}
          hostSeat={hostSeat}
          allowRemoteHumans={allowRemoteHumans}
          onPlayerCountChange={setPlayerCount}
          onSeatKindChange={setSeatKind}
          onSeatFactionChange={setSeatFaction}
          onFirstPlayerModeChange={setFirstPlayerMode}
          onFirstPlayerSeatChange={setFirstPlayerSeat}
          onGameEndModeChange={setGameEndMode}
          onGameEndRoundCountChange={setGameEndRoundCount}
          onGameEndPointThresholdChange={setGameEndPointThreshold}
        />
      ))}

      {pendingRemoteHumans.length > 0 && (
        <p className="warning">
          {pendingRemoteHumans.length} seat(s) set to Human will use AI stand-ins until
          Join game is available.
        </p>
      )}

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <div className="setup-actions">
        <button type="button" disabled={errors.length > 0} onClick={onStart}>
          Continue to table
        </button>
        <button type="button" className="secondary" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  )
}

interface SetupStepPanelProps {
  step: SetupStepDefinition
  stepNumber: number
  profile: GameProfile
  setup: SessionSetupState
  hostSeat: number
  allowRemoteHumans: boolean
  onPlayerCountChange: (count: number) => void
  onSeatKindChange: (seatIndex: number, kind: 'human' | 'ai') => void
  onSeatFactionChange: (seatIndex: number, faction: string) => void
  onFirstPlayerModeChange: (mode: FirstPlayerMode) => void
  onFirstPlayerSeatChange: (seatIndex: number) => void
  onGameEndModeChange: (mode: GameEndMode) => void
  onGameEndRoundCountChange: (count: number) => void
  onGameEndPointThresholdChange: (threshold: number) => void
}

function SetupStepPanel({
  step,
  stepNumber,
  profile,
  setup,
  hostSeat,
  allowRemoteHumans,
  onPlayerCountChange,
  onSeatKindChange,
  onSeatFactionChange,
  onFirstPlayerModeChange,
  onFirstPlayerSeatChange,
  onGameEndModeChange,
  onGameEndRoundCountChange,
  onGameEndPointThresholdChange,
}: SetupStepPanelProps) {
  if (step.type === 'playerCount') {
    return (
      <div className="setup-step">
        <h3>{stepNumber}. Player count</h3>
        <label>
          Players ({profile.spec.players.min}–{profile.spec.players.max})
          <input
            type="number"
            min={profile.spec.players.min}
            max={profile.spec.players.max}
            value={setup.playerCount}
            onChange={(e) => onPlayerCountChange(Number(e.target.value))}
          />
        </label>
      </div>
    )
  }

  if (step.type === 'gameEnd') {
    const minRounds = step.minRoundCount ?? 1
    const maxRounds = step.maxRoundCount ?? 30
    const minPoints = step.minPointThreshold ?? 1
    const maxPoints = step.maxPointThreshold ?? 50
    const winnerHint =
      profile.spec.scoring.winner === 'lowest'
        ? 'Lowest total score wins (fewest penalty points in Odin).'
        : 'Highest total score wins.'

    return (
      <div className="setup-step">
        <h3>{stepNumber}. Game end</h3>
        <p className="hint">Choose how this match ends. {winnerHint}</p>
        <div className="first-player-options">
          <label className="inline">
            <input
              type="radio"
              name="game-end-mode"
              checked={setup.gameEndMode === 'pointThreshold'}
              onChange={() => onGameEndModeChange('pointThreshold')}
            />
            Point threshold
          </label>
          <label className="inline">
            <input
              type="radio"
              name="game-end-mode"
              checked={setup.gameEndMode === 'roundCount'}
              onChange={() => onGameEndModeChange('roundCount')}
            />
            Number of rounds
          </label>
        </div>
        {setup.gameEndMode === 'pointThreshold' ? (
          <>
            <label>
              End after a round where someone reaches
              <input
                type="number"
                min={minPoints}
                max={maxPoints}
                value={setup.gameEndPointThreshold}
                onChange={(e) => onGameEndPointThresholdChange(Number(e.target.value))}
              />
              {' '}points or more
            </label>
            <p className="hint">
              The full round is scored first. If several players reach this value in the
              same round, the winner is decided by total score, not who reached it first.
            </p>
          </>
        ) : (
          <label>
            Play exactly
            <input
              type="number"
              min={minRounds}
              max={maxRounds}
              value={setup.gameEndRoundCount}
              onChange={(e) => onGameEndRoundCountChange(Number(e.target.value))}
            />
            {' '}rounds
          </label>
        )}
      </div>
    )
  }

  if (step.type === 'firstPlayer') {
    const manualSeat = setup.seats.find((s) => s.seatIndex === setup.firstPlayerSeat)

    return (
      <div className="setup-step">
        <h3>{stepNumber}. First player</h3>
        <p className="hint">Who leads the first round of the first hand?</p>
        <div className="first-player-options">
          <label className="inline">
            <input
              type="radio"
              name="first-player-mode"
              checked={setup.firstPlayerMode === 'random'}
              onChange={() => onFirstPlayerModeChange('random')}
            />
            Random
          </label>
          <label className="inline">
            <input
              type="radio"
              name="first-player-mode"
              checked={setup.firstPlayerMode === 'manual'}
              onChange={() => onFirstPlayerModeChange('manual')}
            />
            Manual
          </label>
        </div>
        {setup.firstPlayerMode === 'manual' ? (
          <label>
            Starting seat
            <select
              value={setup.firstPlayerSeat}
              onChange={(e) => onFirstPlayerSeatChange(Number(e.target.value))}
            >
              {setup.seats.map((seat) => (
                <option key={seat.seatIndex} value={seat.seatIndex}>
                  Seat #{seat.seatIndex + 1} — {seatLabelForSetup(seat)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="hint">The starting player will be chosen randomly when the game begins.</p>
        )}
        {setup.firstPlayerMode === 'manual' && manualSeat && (
          <p className="first-player-preview">
            First player: <strong>{seatLabelForSetup(manualSeat)}</strong>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="setup-step">
      <h3>{stepNumber}. Seat assignment</h3>
      <p className="hint">
        The host creates the session. Assign each seat to a human or AI player.
      </p>
      <div className="seat-table">
        <div className="seat-row seat-header">
          <span>Seat</span>
          <span>Player</span>
          <span>Faction</span>
          <span>Type</span>
        </div>
        {setup.seats.map((seat) => {
          const isHost = seat.seatIndex === hostSeat
          const humanDisabled = !isHost && !allowRemoteHumans

          return (
            <div key={seat.seatIndex} className="seat-row">
              <span>#{seat.seatIndex + 1}</span>
              <span>{seatDisplayName(seat)}</span>
              <span>
                <select
                  value={seat.faction}
                  onChange={(e) => onSeatFactionChange(seat.seatIndex, e.target.value)}
                  aria-label={`Faction for seat ${seat.seatIndex + 1}`}
                >
                  {profile.spec.deck.suits.map((suit) => (
                    <option key={suit} value={suit}>
                      {suit}
                    </option>
                  ))}
                </select>
              </span>
              <span className="seat-controls">
                {isHost ? (
                  <span className="badge">Human (host)</span>
                ) : (
                  <>
                    <label className="inline">
                      <input
                        type="radio"
                        name={`seat-${seat.seatIndex}`}
                        checked={seat.kind === 'human'}
                        disabled={humanDisabled}
                        onChange={() => onSeatKindChange(seat.seatIndex, 'human')}
                      />
                      Human
                    </label>
                    <label className="inline">
                      <input
                        type="radio"
                        name={`seat-${seat.seatIndex}`}
                        checked={seat.kind === 'ai'}
                        onChange={() => onSeatKindChange(seat.seatIndex, 'ai')}
                      />
                      AI
                    </label>
                    {humanDisabled && seat.kind === 'ai' && (
                      <span className="hint inline-hint">Join required for Human</span>
                    )}
                  </>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
