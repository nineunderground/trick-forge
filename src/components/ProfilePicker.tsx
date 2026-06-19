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
      <h2>Cargar perfil de juego</h2>
      <p>
        Los perfiles definen las reglas en YAML. Puedes usar el incluido, subir uno
        propio o cargarlo desde una URL externa.
      </p>

      <div className="picker-actions">
        <button type="button" disabled={loading} onClick={() => handleBuiltin('odin')}>
          Odin (incluido)
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => fileRef.current?.click()}
        >
          Subir YAML
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
          placeholder="https://ejemplo.com/mi-juego.yaml"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="button" disabled={loading || !url.trim()} onClick={handleUrl}>
          Cargar URL
        </button>
      </div>

      {loading && <p className="hint">Cargando perfil…</p>}

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <p className="hint">
        Especificación del formato YAML: <code>spec/profile-spec.md</code> en el repositorio.
      </p>
    </div>
  )
}
