# TrickForge Profile Specification (v1)

Profiles define a complete game in YAML. The client engine interprets the profile
and runs the rules without extra code for games supported by the declared family.

## Minimum structure

```yaml
apiVersion: trickforge/v1
kind: GameProfile
metadata:
  id: unique-id
  name: Human readable name
  version: "1.0"
spec:
  family: climbing | trick-taking
  players:
    min: 3
    max: 5
    default: 4
  deck:
    suits: [red, blue]
    ranks: [1, 2, 3]
    copies: 1
  deal:
    cardsPerPlayer: 9
  scoring: { ... }
  rules:
    climbing: { ... }    # when family = climbing
    trickTaking: { ... } # reserved for future profiles
```

## Supported families

| Family         | Status   | Description                                      |
|----------------|----------|--------------------------------------------------|
| `climbing`     | MVP      | Climbing / ladder games (Odin, Big Two, etc.)    |
| `trick-taking` | planned  | Tricks, lead suit, follow suit, etc.             |

## Loading profiles

1. **Bundled**: files under `public/profiles/` served by GitHub Pages.
2. **Local upload**: user selects a `.yaml` file from their device.
3. **External URL**: fetch from another URL (origin server must allow CORS).

## Validation

The client validates YAML with a Zod schema before starting a game.
Validation errors are shown in the UI without running the engine.

## Reference profile

See `public/profiles/odin.yaml`.
