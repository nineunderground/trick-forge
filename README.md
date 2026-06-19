# TrickForge

Motor de juegos de cartas que corre **enteramente en el navegador**. Carga perfiles YAML para definir reglas, soporta jugadores humanos e IAs, y se puede publicar en **GitHub Pages** sin backend.

## Características

- Motor cliente en TypeScript (Vite + React)
- Perfiles de juego en YAML (`trickforge/v1`)
- Perfil incluido: **Odin** (juego de escalada / climbing)
- Carga de perfiles: incluidos, subida local, URL externa
- Jugador humano + IAs aleatorias (extensible)
- Despliegue estático en `https://<usuario>.github.io/trick-forge/`

## Desarrollo local

```bash
npm install
npm run dev
```

## Build y GitHub Pages

```bash
GITHUB_PAGES=true npm run build
```

El workflow `.github/workflows/deploy.yml` publica automáticamente en cada push a `main`.

### Crear repo privado en GitHub

```bash
cd trick-forge
git init
git add .
git commit -m "Initial TrickForge scaffold with Odin profile"
# Crear repo privado (requiere GitHub CLI: gh auth login)
gh repo create trick-forge --private --source=. --remote=origin --push
```

En **Settings → Pages → Build and deployment**, elige **GitHub Actions**.

## Perfiles

Ver [spec/profile-spec.md](./spec/profile-spec.md).

Ejemplo mínimo:

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

Los usuarios pueden crear perfiles siguiendo la especificación y compartirlos como archivos `.yaml`.

## Roadmap

- [ ] Familia `trick-taking` (Fishing, Skull King, …)
- [ ] IAs más inteligentes / LLM
- [ ] Multijugador en red (opcional, requeriría backend)

## Nota sobre Odin

Odin es un juego de **escalada** (climbing), no de bazas (trick-taking). TrickForge usa una abstracción por **familias** para soportar ambos estilos con el mismo cargador de perfiles.
