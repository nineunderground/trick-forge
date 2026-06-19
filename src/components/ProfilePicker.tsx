import { useRef, useState } from 'react'
import type { LoadedProfile } from '../core/profile/loader'
import {
  loadBuiltinProfile,
  loadProfileFromFile,
  loadProfileFromUrl,
} from '../core/profile/loader'

interface ProfilePickerProps {
  onLoaded: (loaded: LoadedProfile) => void
}

export function ProfilePicker({ onLoaded }: ProfilePickerProps) {
  const [url, setUrl] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleBuiltin(id: string) {
    setLoading(true)
    setErrors([])
    const result = await loadBuiltinProfile(id)
    setLoading(false)
    if ('errors' in result) {
      setErrors(result.errors)
      return
    }
    onLoaded(result)
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setLoading(true)
    setErrors([])
    const result = await loadProfileFromFile(file)
    setLoading(false)
    if ('errors' in result) {
      setErrors(result.errors)
      return
    }
    onLoaded(result)
  }

  async function handleUrl() {
    if (!url.trim()) return
    setLoading(true)
    setErrors([])
    const result = await loadProfileFromUrl(url.trim())
    setLoading(false)
    if ('errors' in result) {
      setErrors(result.errors)
      return
    }
    onLoaded(result)
  }

  return (
    <div className="profile-picker">
      <h2>Load game profile</h2>
      <p>
        Profiles define game rules in YAML. Use the bundled one, upload your own,
        or load one from an external URL.
      </p>

      <div className="picker-actions">
        <button type="button" disabled={loading} onClick={() => handleBuiltin('odin')}>
          Odin (bundled)
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => fileRef.current?.click()}
        >
          Upload YAML
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".yaml,.yml"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <div className="url-load">
        <input
          type="url"
          placeholder="https://example.com/my-game.yaml"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="button" disabled={loading || !url.trim()} onClick={handleUrl}>
          Load URL
        </button>
      </div>

      {loading && <p className="hint">Loading profile…</p>}

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <p className="hint">
        YAML format specification: <code>spec/profile-spec.md</code> in the repository.
      </p>
    </div>
  )
}
