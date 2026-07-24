# Spec 02 — Niveles Progresivos con Dificultad Creciente

- **Estado:** Approved
- **Dependencias:** 01-mvp-arkanoid (requiere el MVP implementado)
- **Fecha:** 2026-07-24
- **Objetivo:** Implementar una progresión de 10 niveles generados automáticamente con dificultad creciente (bola más rápida y bloques indestructibles de distintos materiales), donde completar el nivel 10 gana el juego.

## Scope

### Incluido en este spec

- Generación procedural de 10 niveles con dificultad creciente (bola más rápida + bloques indestructibles).
- Los 48 bloques rompibles (cuadrícula 8x6 con colores por fila) se mantienen **intactos en todos los niveles** — los indestructibles nunca los reemplazan.
- Integración de los 4 bloques de material nuevos del spritesheet (madera, ladrillo rojizo, ladrillo morado, piedra gris) como bloques **indestructibles**: rebotan la bola (con `ball-bounce.mp3`), no se rompen, no otorgan puntos, no reproducen `break-sound.mp3` ni animación de explosión.
- Los bloques indestructibles se agregan como **filas extra debajo** de la cuadrícula de 6x8 existente, con un máximo de 2 filas extra (nunca más, dado el tope de la tabla de cantidades).
- Regla de accesibilidad: cada fila extra deja como mínimo 1 columna vacía (sin bloque) elegida al azar, con un máximo de 7 indestructibles por fila, garantizando siempre un camino libre hacia los bloques rompibles superiores.
- Patrón de introducción de materiales por nivel (alternando "solo el material nuevo" / "mezcla de los ya introducidos") según la tabla acordada.
- Tabla de cantidad de bloques indestructibles por nivel: `[0, 2, 4, 4, 7, 7, 10, 10, 12, 14]` (niveles 1-10).
- Fórmula de velocidad de bola por nivel: `BALL_SPEED = 4 + (nivel - 1) * 0.4`, con tope de `7`. Valores de partida sujetos a ajuste tras prueba manual dentro del plan de implementación.
- Vidas se restauran a `LIVES_START` (3) al iniciar cada nuevo nivel; el score se acumula y persiste entre niveles dentro de la misma partida.
- Pantalla "Nivel completado" (score acumulado + opción de continuar con click/tecla) al romper todos los bloques rompibles de los niveles 1-9.
- Pantalla "¡Ganaste!" final al completar el nivel 10, mostrando el score acumulado total.
- HUD actualizado: nivel actual visible junto a score y vidas durante `PLAYING`.
- El reinicio desde "Game Over" vuelve siempre al nivel 1 con score 0 y vidas completas (comportamiento ya existente, ahora también reinicia el nivel).

### Explícitamente fuera de este spec (para specs futuros)

- Diseño de niveles hechos a mano; todos los niveles de este spec son procedurales.
- Más de 10 niveles o un modo infinito más allá del nivel 10.
- Otros mecanismos de dificultad (paleta más angosta, menos vidas iniciales, límite de tiempo, etc.) — solo bola más rápida y bloques indestructibles.
- Persistencia de nivel alcanzado o progreso entre sesiones del navegador (sigue sin `localStorage`, heredado de la decisión del spec 01).
- Variación de ángulo de rebote según punto de impacto (sigue fuera, heredado del spec 01).
- Cualquier feedback sonoro o visual distinto para los bloques indestructibles más allá de reutilizar `ball-bounce.mp3` (sin sonido ni animación propia de "golpe sin romper").

## Data model

Extiende las estructuras ya definidas en el spec 01 (`CONFIG`, `game`, `Block`), sin reemplazarlas.

### Nuevas constantes en `CONFIG`

```js
CONFIG.MAX_LEVEL = 10;
CONFIG.BALL_SPEED_BASE = 4;
CONFIG.BALL_SPEED_INCREMENT = 0.4;
CONFIG.BALL_SPEED_MAX = 7;               // tope, sujeto a ajuste tras prueba manual
CONFIG.EXTRA_ROW_MAX_PER_ROW = 7;        // máximo de indestructibles por fila extra (deja ≥1 columna libre)

CONFIG.INDESTRUCTIBLE_COUNTS = [0, 2, 4, 4, 7, 7, 10, 10, 12, 14]; // índice 0 = nivel 1

// Materiales activos (utilizables) por nivel, según el patrón alterno confirmado
CONFIG.LEVEL_MATERIALS = [
  [],                                            // nivel 1
  ['wood'],                                      // nivel 2 (solo el nuevo)
  ['wood'],                                      // nivel 3 (mezcla de lo introducido)
  ['brick_red'],                                 // nivel 4 (solo el nuevo)
  ['wood', 'brick_red'],                         // nivel 5 (mezcla)
  ['brick_purple'],                               // nivel 6 (solo el nuevo)
  ['wood', 'brick_red', 'brick_purple'],          // nivel 7 (mezcla)
  ['gray'],                                       // nivel 8 (solo el nuevo)
  ['wood', 'brick_red', 'brick_purple', 'gray'],  // nivel 9 (mezcla, los 4)
  ['wood', 'brick_red', 'brick_purple', 'gray'],  // nivel 10 (mezcla, máxima dificultad)
];
```

Nota: `gray` reutiliza el sprite de piedra ya definido en `SPRITES.blocks.gray` (existente pero no usado en spec 01); `wood`, `brick_red` y `brick_purple` son sprites nuevos que hay que agregar.

### Nuevas entradas en `SPRITES.blocks` (`assets/spritesheet.js`)

```js
wood:         { sx: 32, sy: 272, sw: 32, sh: 16 },
brick_red:    { sx: 64, sy: 272, sw: 32, sh: 16 },
brick_purple: { sx: 64, sy: 288, sw: 32, sh: 16 },
// 'gray' ya existe: { sx: 32, sy: 288, sw: 32, sh: 16 }
```

### Estado del juego (extendido)

```js
const game = {
  status: 'START',   // 'START' | 'PLAYING' | 'LEVEL_COMPLETE' | 'WON' | 'GAME_OVER'  (se agrega 'LEVEL_COMPLETE')
  level: 1,           // nuevo campo, 1-10
  score: 0,
  lives: CONFIG.LIVES_START,
  blocks: [],
  paddle: null,
  ball: null,
};
```

### Estructura `Block` (extendida)

```js
{
  x, y, width, height,
  color,               // nombre del color (destructible) o del material (indestructible) — mismo campo, distinto namespace de sprites
  destructible,        // boolean nuevo: true = bloque de color normal, false = bloque de material indestructible
  destroyed,            // siempre false y nunca cambia si destructible === false
  exploding,             // siempre false si destructible === false
  explosionStartTime,
}
```

## Implementation plan

1. **Extender assets y configuración base.** Agregar los sprites `wood`, `brick_red`, `brick_purple` a `SPRITES.blocks` en `assets/spritesheet.js`. Agregar a `CONFIG` las nuevas constantes (`MAX_LEVEL`, `BALL_SPEED_BASE`, `BALL_SPEED_INCREMENT`, `BALL_SPEED_MAX`, `EXTRA_ROW_MAX_PER_ROW`, `INDESTRUCTIBLE_COUNTS`, `LEVEL_MATERIALS`) y `level: 1` al objeto `game`.
   - *Deja el sistema funcional en:* el MVP del spec 01 sigue funcionando igual; las nuevas constantes y sprites existen pero no se usan todavía.

2. **Generación de bloques indestructibles por nivel.** Crear una función que, dado `game.level`, genere las filas extra (máximo 2) con los materiales activos (`CONFIG.LEVEL_MATERIALS[level-1]`) y la cantidad (`CONFIG.INDESTRUCTIBLE_COUNTS[level-1]`), respetando la regla de mínimo 1 columna libre por fila. Extender `createBlocks()`/`initGame()` para incluir estos bloques junto a los 48 rompibles existentes.
   - *Deja el sistema funcional en:* forzando `game.level` manualmente se ven los bloques indestructibles correctos al iniciar; en nivel 1 (0 indestructibles) se ve igual que antes.

3. **Renderizado y colisión de bloques indestructibles.** Dibujar los bloques indestructibles con su sprite de material (sin animación de explosión). En `handleBlockCollision()`, diferenciar por `block.destructible`: si es `false`, solo rebota la bola y reproduce `ball-bounce.mp3` (sin sumar score, sin `break-sound.mp3`, sin `exploding`/`destroyed`).
   - *Deja el sistema funcional en:* la bola rebota contra bloques indestructibles sin romperlos ni sumar puntos, y sigue rompiendo los bloques de color con normalidad.

4. **Velocidad de bola por nivel.** Aplicar la fórmula `BALL_SPEED = min(BALL_SPEED_BASE + (nivel - 1) * BALL_SPEED_INCREMENT, BALL_SPEED_MAX)` en `createBall()`, usando `game.level` actual.
   - *Deja el sistema funcional en:* la bola es visiblemente más rápida en niveles altos (probado forzando `game.level`).

5. **Nivel completado y transición al siguiente.** Modificar `checkWinCondition()` para evaluar solo bloques `destructible`. Si todos están destruidos y `game.level < MAX_LEVEL`, cambiar a `game.status = 'LEVEL_COMPLETE'`. Implementar la pantalla correspondiente (score acumulado + "continuar") y `startNextLevel()`: incrementa `game.level`, restaura `game.lives` a `LIVES_START`, regenera bloques/paleta/bola con la dificultad del nuevo nivel, y vuelve a `PLAYING`.
   - *Deja el sistema funcional en:* se puede jugar el nivel 1, completarlo, y continuar al nivel 2 con la dificultad ya incrementada.

6. **Condición de victoria final.** Si todos los bloques destructibles están destruidos y `game.level === MAX_LEVEL`, cambiar a `game.status = 'WON'` (reutilizando la pantalla existente del spec 01), mostrando el score acumulado total de los 10 niveles.
   - *Deja el sistema funcional en:* se puede completar el nivel 10 y ver la pantalla de victoria final del juego completo.

7. **HUD y reinicio.** Agregar "Nivel: X" al HUD junto a score y vidas. Ajustar `resetGame()` para reiniciar también `game.level` a 1.
   - *Deja el sistema funcional en:* el HUD muestra el nivel actual durante `PLAYING`, y reiniciar desde "Game Over" siempre vuelve al nivel 1 con score 0.

8. **Prueba manual y balance.** Jugar (o simular) los 10 niveles verificando que la dificultad suba de forma gradual y que el nivel 10 sea difícil pero jugable. Ajustar `BALL_SPEED_INCREMENT`/`BALL_SPEED_MAX` y/o `INDESTRUCTIBLE_COUNTS` si el balance lo requiere.
   - *Deja el sistema funcional en:* el juego completo con niveles progresivos, balanceado y jugable de principio a fin.

## Acceptance criteria

- [ ] Al iniciar una partida, el nivel 1 no tiene bloques indestructibles — solo los 48 bloques de color habituales.
- [ ] A partir del nivel 2, aparecen bloques indestructibles en filas extra debajo de la cuadrícula de 6x8, con el material y la cantidad correspondientes a la tabla `LEVEL_MATERIALS`/`INDESTRUCTIBLE_COUNTS` de cada nivel.
- [ ] En cada fila extra de indestructibles siempre queda al menos 1 columna sin bloque, garantizando un camino libre hacia los bloques rompibles superiores.
- [ ] Los bloques indestructibles rebotan la bola (reproduciendo `ball-bounce.mp3`) pero nunca se destruyen, no otorgan puntos y no reproducen `break-sound.mp3` ni animación de explosión.
- [ ] La velocidad de la bola aumenta en cada nivel siguiendo `BALL_SPEED = min(4 + (nivel-1)*0.4, 7)`, siendo perceptiblemente más rápida en niveles altos que en el nivel 1.
- [ ] Al destruir todos los bloques rompibles de un nivel entre 1 y 9, se muestra la pantalla "Nivel completado" con el score acumulado y una opción de continuar.
- [ ] Al continuar desde "Nivel completado", se carga el siguiente nivel: vidas restauradas a 3, score conservado, bloques regenerados con la dificultad del nuevo nivel.
- [ ] Al destruir todos los bloques rompibles del nivel 10, se muestra la pantalla "¡Ganaste!" con el score acumulado total de todos los niveles.
- [ ] El HUD muestra el nivel actual (junto a score y vidas) en todo momento durante `PLAYING`.
- [ ] Al llegar a 0 vidas en cualquier nivel, se muestra "Game Over" con el score acumulado hasta ese punto.
- [ ] Reiniciar desde "Game Over" vuelve siempre al nivel 1, con score en 0 y vidas completas.
- [ ] El juego sigue funcionando abriendo `index.html` directamente en el navegador, sin dependencias externas ni paso de build.

## Decisiones tomadas y descartadas

- **10 niveles procedurales con tope fijo**, en vez de niveles infinitos o hechos a mano. Se prioriza tener un final claro ("ganar" en el nivel 10) y evitar el trabajo de diseñar niveles manualmente; queda abierto para un spec futuro extender o rediseñar el sistema si se desea.
- **Bloques indestructibles (no multi-golpe).** Se descartó que resistieran varios golpes antes de romperse porque no hay sprites de "daño progresivo" en el spritesheet para esos materiales, y porque simplifica la lógica de colisión (una sola condición booleana `destructible`).
- **Los indestructibles se agregan en filas extra, sin reemplazar bloques rompibles.** Se descartó la idea original de reemplazar bloques de color por indestructibles porque el usuario pidió explícitamente mantener siempre los 48 bloques rompibles por nivel, para no reducir el "contenido" jugable a medida que sube la dificultad.
- **Regla de accesibilidad: máximo 7 indestructibles por fila extra, mínimo 1 columna libre.** Se adoptó para garantizar que ninguna fila bloquee por completo el paso de la bola hacia los bloques rompibles. Esto obligó a bajar el tope original de 16 a 14 indestructibles en el nivel 10.
- **Patrón alterno de introducción de materiales** ("solo el nuevo" → "mezcla de los introducidos" → repetir). Se eligió para que el jugador reconozca visualmente cada material nuevo antes de verlo combinado con los demás, en vez de introducir los 4 de golpe.
- **Fórmula de velocidad de bola con incremento fijo y tope** (`4 + (nivel-1)*0.4`, máx `7`), en vez de una curva más compleja (exponencial, por tramos, etc.). Se prioriza simplicidad; el propio usuario indicó que estos valores son un punto de partida sujeto a ajuste tras prueba manual (ver paso 8 del plan de implementación).
- **Vidas se restauran por nivel, pero el score se acumula.** Decisión explícita del usuario: cada nivel da un "respiro" de vidas completas para que la dificultad creciente no se sienta punitiva, sin perder el progreso de puntuación ya conseguido.
- **Reiniciar desde "Game Over" siempre vuelve al nivel 1**, en vez de continuar desde el nivel alcanzado. Se mantiene consistente con el comportamiento de reinicio ya existente en el spec 01 (reinicio total del estado del juego).
- **Sin persistencia de nivel o progreso entre sesiones.** Heredado de la decisión del spec 01 de no usar `localStorage`; el progreso vive solo en memoria durante la partida.

## Riesgos identificados

- **Balance de dificultad incorrecto.** Pese al tope de velocidad (`BALL_SPEED_MAX = 7`) y la regla de accesibilidad, el nivel 10 podría resultar demasiado fácil o casi imposible en la práctica. Mitigación: el paso 8 del plan de implementación incluye prueba manual explícita y ajuste de `BALL_SPEED_INCREMENT`/`BALL_SPEED_MAX`/`INDESTRUCTIBLE_COUNTS` antes de dar el spec por terminado.
- **Columnas libres desalineadas entre las 2 filas extra.** La regla garantiza ≥1 columna libre por fila, pero si la columna libre de la fila 1 no coincide con la de la fila 2 (ej. libre en columna 3 vs columna 6), la sensación de "camino directo" hacia arriba puede no ser obvia a simple vista, aunque la bola siempre puede alcanzar cualquier columna rebotando en diagonal. No bloquea el juego, pero puede sentirse más difícil de lo previsto en algunas generaciones aleatorias. Mitigación: validar visualmente en el paso 8 y, si se siente injusto, considerar alinear las columnas libres entre filas como ajuste menor.
- **Menor espacio de juego en niveles altos.** Los niveles 7-10 usan 2 filas extra, acercando los bloques indestructibles a la paleta y reduciendo el tiempo de reacción del jugador más de lo que el aumento de velocidad por sí solo sugiere. Mitigación: evaluar en la prueba manual del paso 8 si el nivel 10 sigue siendo jugable con ambos factores combinados (velocidad + espacio reducido), y ajustar si es necesario.
- **Confusión auditiva entre rebote en pared/paleta y rebote en bloque indestructible.** Al reutilizar `ball-bounce.mp3` para ambos casos, el jugador no distingue por sonido qué golpeó. Es una decisión aceptada explícitamente en el scope (fuera de este spec agregar sonido diferenciado), pero se documenta como riesgo de UX menor.
