# TrickForge

A **client-side** card game engine. Load YAML profiles to define rules, support human and AI players, and deploy on **GitHub Pages** with no backend.

## Features

- Client engine in TypeScript (Vite + React)
- YAML game profiles (`trickforge/v1`)
- Bundled profile: **Odin** (climbing game)
- Profile loading: bundled, local upload, external URL
- Human player + random AIs (extensible)
- Static deploy at `https://<user>.github.io/trick-forge/`

## Local development

```bash
npm install
npm run dev
```

## Build and GitHub Pages

```bash
GITHUB_PAGES=true npm run build
```

The workflow in `.github/workflows/deploy.yml` publishes automatically on every push to `main`.

### Create a GitHub repository

```bash
git init
git add .
git commit -m "Initial TrickForge scaffold with Odin profile"
gh repo create trick-forge --public --source=. --remote=origin --push
```

In **Settings → Pages → Build and deployment**, choose **GitHub Actions**.

## Profiles

See [spec/profile-spec.md](./spec/profile-spec.md).

Minimal example:

```yaml
apiVersion: trickforge/v1
kind: GameProfile
metadata:
  id: odin
  name: Odin
  version: "1.0"
spec:
  family: climbing
  # ...
```

Users can author profiles following the spec and share them as `.yaml` files.

## Roadmap

- [ ] `trick-taking` family (Fishing, Skull King, …)
- [ ] Smarter AIs / LLM players
- [ ] Online multiplayer (optional, would require a backend)

## Note on Odin

Odin is a **climbing** game, not trick-taking. TrickForge uses **families** so both styles can share the same profile loader.
