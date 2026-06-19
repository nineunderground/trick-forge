import { useState } from 'react'
import { GameBoard } from './components/GameBoard'
import { Lobby } from './components/Lobby'
import { ProfilePicker } from './components/ProfilePicker'
import { SessionSetup } from './components/SessionSetup'
import { createGame, dispatchHumanAction } from './core/game-session'
import type { LoadedProfile } from './core/profile/loader'
import { createDefaultSessionSetup } from './core/session/setup'
import type { SessionSetup as SessionSetupState } from './core/session/types'
import type { ClimbingGameState } from './core/types'
import './App.css'

type AppScreen = 'lobby' | 'profile' | 'setup' | 'game'

function App() {
  const [screen, setScreen] = useState<AppScreen>('lobby')
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null)
  const [sessionSetup, setSessionSetup] = useState<SessionSetupState | null>(null)
  const [gameState, setGameState] = useState<ClimbingGameState | null>(null)

  function handleProfileLoaded(next: LoadedProfile) {
    setLoaded(next)
    setSessionSetup(createDefaultSessionSetup(next.profile))
    setGameState(null)
    setScreen('setup')
  }

  function startGame() {
    if (!loaded || !sessionSetup) return
    setGameState(createGame(loaded.profile, sessionSetup))
    setScreen('game')
  }

  function handleAction(action: Parameters<typeof dispatchHumanAction>[2]) {
    if (!loaded || !gameState) return
    setGameState(dispatchHumanAction(gameState, loaded.profile, action))
  }

  function resetToLobby() {
    setScreen('lobby')
    setLoaded(null)
    setSessionSetup(null)
    setGameState(null)
  }

  return (
    <div className={`app ${screen === 'game' ? 'app--game' : ''}`}>
      {screen !== 'game' && (
        <header className="hero">
          <h1>TrickForge</h1>
          <p>Browser card engine · YAML profiles · humans and AIs</p>
        </header>
      )}

      {screen === 'lobby' && <Lobby onCreateGame={() => setScreen('profile')} />}

      {screen === 'profile' && (
        <>
          <ProfilePicker onLoaded={handleProfileLoaded} />
          <button type="button" className="secondary back-link" onClick={() => setScreen('lobby')}>
            Back to lobby
          </button>
        </>
      )}

      {screen === 'setup' && loaded && sessionSetup && (
        <SessionSetup
          profile={loaded.profile}
          setup={sessionSetup}
          onChange={setSessionSetup}
          onStart={startGame}
          onBack={() => setScreen('profile')}
        />
      )}

      {screen === 'game' && loaded && gameState && (
        <div className="game-shell">
          <GameBoard
            profile={loaded.profile}
            state={gameState}
            onAction={handleAction}
          />
          <div className="game-shell-actions centered-row">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setGameState(null)
                setScreen('setup')
              }}
            >
              Back to setup
            </button>
            <button type="button" className="secondary" onClick={resetToLobby}>
              Leave game
            </button>
          </div>
        </div>
      )}

      {screen !== 'game' && (
        <footer>
          <small>
            TrickForge — the full engine runs in your browser. Deploy on GitHub Pages with no backend.
          </small>
        </footer>
      )}
    </div>
  )
}

export default App
