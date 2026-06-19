interface LobbyProps {
  onCreateGame: () => void
}

export function Lobby({ onCreateGame }: LobbyProps) {
  return (
    <section className="lobby panel">
      <h2>Play TrickForge</h2>
      <p>Choose how you want to enter a game.</p>

      <div className="lobby-actions">
        <button type="button" onClick={onCreateGame}>
          Create game
        </button>
        <button type="button" disabled title="Coming soon">
          Join game
        </button>
      </div>

      <p className="hint">
        Join game will let you enter a session created by another player. Multiplayer
        support is not available yet.
      </p>
    </section>
  )
}
