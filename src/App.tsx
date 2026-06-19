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
        <p>Motor de cartas en el navegador · perfiles YAML · humanos e IAs</p>
      </header>

      {!loaded ? (
        <ProfilePicker onLoaded={handleProfileLoaded} />
      ) : !gameState ? (
        <section className="setup">
          <h2>{loaded.profile.metadata.name}</h2>
          <p>Fuente: {loaded.sourceLabel}</p>
          <p>Familia: {loaded.profile.spec.family}</p>
          <label>
            Jugadores ({loaded.profile.spec.players.min}–{loaded.profile.spec.players.max})
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
              Empezar partida
            </button>
            <button type="button" className="secondary" onClick={() => setLoaded(null)}>
              Cambiar perfil
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
            Nueva partida
          </button>
        </>
      )}

      <footer>
        <small>
          TrickForge — todo el motor corre en tu navegador. Despliega en GitHub Pages sin backend.
        </small>
      </footer>
    </div>
  )
}

export default App
