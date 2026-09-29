---
description: Crea un git worktree en .worktrees/<nombre> basado en el contexto dado
---

Genera un nombre de worktree a partir del siguiente contexto: $ARGUMENTS

Reglas para el nombre:
- Formato kebab-case: minúsculas, espacios → guiones
- Sin acentos ni ñ (á→a, é→e, ñ→n), sin caracteres especiales
- Nombre de rama git válido, corto y descriptivo, basado en el contexto

Luego ejecuta exactamente UNA vez, desde el directorio actual:
`git worktree add .worktrees/<nombre>`

Restricciones estrictas:
- NO cambies de directorio (ni `cd` ni equivalente)
- NO hagas nada más: sin commits, sin edits, sin abrir el worktree
- Solo ejecuta el comando git y reporta el resultado
