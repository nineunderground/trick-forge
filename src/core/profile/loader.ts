import yaml from 'js-yaml'
import { validateProfile, type GameProfile } from './schema'

export interface LoadedProfile {
  profile: GameProfile
  source: 'builtin' | 'upload' | 'url'
  sourceLabel: string
}

export function parseProfileYaml(text: string): LoadedProfile | { errors: string[] } {
  let parsed: unknown
  try {
    parsed = yaml.load(text)
  } catch (error) {
    return { errors: [`Invalid YAML: ${(error as Error).message}`] }
  }

  const validation = validateProfile(parsed)
  if (!validation.ok) {
    return { errors: validation.errors }
  }

  return {
    profile: validation.profile,
    source: 'upload',
    sourceLabel: validation.profile.metadata.name,
  }
}

export async function loadBuiltinProfile(profileId: string): Promise<LoadedProfile | { errors: string[] }> {
  const base = import.meta.env.BASE_URL
  const url = `${base}profiles/${profileId}.yaml`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { errors: [`Could not load profile "${profileId}" (${response.status})`] }
    }
    const text = await response.text()
    const result = parseProfileYaml(text)
    if ('errors' in result) return result
    return { ...result, source: 'builtin', sourceLabel: `${result.profile.metadata.name} (bundled)` }
  } catch (error) {
    return { errors: [`Error loading profile: ${(error as Error).message}`] }
  }
}

export async function loadProfileFromUrl(url: string): Promise<LoadedProfile | { errors: string[] }> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { errors: [`Fetch failed (${response.status})`] }
    }
    const text = await response.text()
    const result = parseProfileYaml(text)
    if ('errors' in result) return result
    return { ...result, source: 'url', sourceLabel: url }
  } catch (error) {
    return {
      errors: [
        `Could not fetch URL. Is CORS enabled on the server? ${(error as Error).message}`,
      ],
    }
  }
}

export async function loadProfileFromFile(file: File): Promise<LoadedProfile | { errors: string[] }> {
  const text = await file.text()
  const result = parseProfileYaml(text)
  if ('errors' in result) return result
  return { ...result, source: 'upload', sourceLabel: file.name }
}
