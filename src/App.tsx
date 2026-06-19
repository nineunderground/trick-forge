import { useState } from 'react'
import { GameBoard } from './components/GameBoard'
import { ProfilePicker } from './components/ProfilePicker'
import { createGame, dispatchHumanAction } from './core/game-session'
import type { LoadedProfile } from './core/profile/loader'
import type { ClimbingGameState } from './core/types'
import './App.css'

function App() {
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null)
  const [gameState, setGameState] = useState<ClimbingGameState | null>(null)
  const [playerCount, setPlayerCount] = useState<number | null>(null)

  function startGame(profile: LoadedProfile['profile'], count: number) {
    setGameState(createGame(profile, count))
    setPlayerCount(count)
  }

  function handleProfileLoaded(next: LoadedProfile) {
    setLoaded(next)
    setPlayerCount(next.profile.spec.players.default)
    setGameState(null)
  }

  function handleAction(action: Parameters<typeof dispatchHumanAction>[2]) {
    if (!loaded || !gameState) return
    setGameState(dispatchHumanAction(gameState, loaded.profile, action))
  }

  return (
    <div className="app">
      <header className="hero">
        <h1>TrickForge</h1>
        <p>Browser card engine · YAML profiles · humans and AIs</p>
      </header>

      {!loaded ? (
        <ProfilePicker onLoaded={handleProfileLoaded} />
      ) : !gameState ? (
        <section className="setup">
          <h2>{loaded.profile.metadata.name}</h2>
          <p>Source: {loaded.sourceLabel}</p>
          <p>Family: {loaded.profile.spec.family}</p>
          <label>
            Players ({loaded.profile.spec.players.min}–{loaded.profile.spec.players.max})
            <input
              type="number"
              min={loaded.profile.spec.players.min}
              max={loaded.profile.spec.players.max}
              value={playerCount ?? loaded.profile.spec.players.default}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
            />
          </label>
          <div className="setup-actions">
            <button
              type="button"
              onClick={() =>
                startGame(loaded.profile, playerCount ?? loaded.profile.spec.players.default)
              }
            >
              Start game
            </button>
            <button type="button" className="secondary" onClick={() => setLoaded(null)}>
              Change profile
            </button>
          </div>
        </section>
      ) : (
        <>
          <GameBoard
            profile={loaded.profile}
            state={gameState}
            onAction={handleAction}
          />
          <button type="button" className="secondary reset" onClick={() => setGameState(null)}>
            New game
          </button>
        </>
      )}

      <footer>
        <small>
          TrickForge — the full engine runs in your browser. Deploy on GitHub Pages with no backend.
        </small>
      </footer>
    </div>
  )
}

export default App
