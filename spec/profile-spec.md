# TrickForge Profile Specification (v1)

Los perfiles definen un juego completo en YAML. El motor del cliente interpreta el perfil
y ejecuta las reglas sin código adicional para juegos soportados por la familia indicada.

## Estructura mínima

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
    climbing: { ... }   # si family = climbing
    trickTaking: { ... } # reservado para futuros perfiles
```

## Familias soportadas

| Familia        | Estado   | Descripción                                      |
|----------------|----------|--------------------------------------------------|
| `climbing`     | MVP      | Escalada / ladder (Odin, Big Two, etc.)          |
| `trick-taking` | planeado | Bazas, palo líder, obligación de seguir, etc.    |

## Carga de perfiles

1. **Incluidos**: archivos en `public/profiles/` servidos por GitHub Pages.
2. **Subida local**: el usuario selecciona un `.yaml` desde su dispositivo.
3. **URL externa**: fetch desde otra URL (requiere CORS en el servidor origen).

## Validación

El cliente valida el YAML con un esquema Zod antes de iniciar la partida.
Errores de validación se muestran en la UI sin ejecutar el motor.

## Perfil de referencia

Ver `public/profiles/odin.yaml`.
