import type { GameProfile } from '../core/profile/schema'
import {
  getSetupSteps,
  remoteHumanSeats,
  resizeSessionSetup,
  seatDisplayName,
  updateSeatKind,
  validateSessionSetup,
  type SetupStepDefinition,
} from '../core/session/setup'
import type { SessionSetup as SessionSetupState } from '../core/session/types'

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

  return (
    <section className="session-setup panel">
      <h2>{profile.metadata.name} — session setup</h2>
      <p className="hint">Complete each step before starting the game.</p>

      {steps.map((step) => (
        <SetupStepPanel
          key={step.id}
          step={step}
          profile={profile}
          setup={setup}
          hostSeat={hostSeat}
          allowRemoteHumans={allowRemoteHumans}
          onPlayerCountChange={setPlayerCount}
          onSeatKindChange={setSeatKind}
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
          Start game
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
  profile: GameProfile
  setup: SessionSetupState
  hostSeat: number
  allowRemoteHumans: boolean
  onPlayerCountChange: (count: number) => void
  onSeatKindChange: (seatIndex: number, kind: 'human' | 'ai') => void
}

function SetupStepPanel({
  step,
  profile,
  setup,
  hostSeat,
  allowRemoteHumans,
  onPlayerCountChange,
  onSeatKindChange,
}: SetupStepPanelProps) {
  if (step.type === 'playerCount') {
    return (
      <div className="setup-step">
        <h3>1. Player count</h3>
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

  return (
    <div className="setup-step">
      <h3>2. Seat assignment</h3>
      <p className="hint">
        The host creates the session. Assign each seat to a human or AI player.
      </p>
      <div className="seat-table">
        <div className="seat-row seat-header">
          <span>Seat</span>
          <span>Player</span>
          <span>Type</span>
        </div>
        {setup.seats.map((seat) => {
          const isHost = seat.seatIndex === hostSeat
          const humanDisabled = !isHost && !allowRemoteHumans

          return (
            <div key={seat.seatIndex} className="seat-row">
              <span>#{seat.seatIndex + 1}</span>
              <span>{seatDisplayName(seat)}</span>
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
