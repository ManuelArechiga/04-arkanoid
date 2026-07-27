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
- Regla de accesibilidad: se elige **una sola columna libre por nivel** (no por fila), reutilizada en todas las filas extra, con un máximo de 7 indestructibles por fila, garantizando un corredor vertical continuo y sin bolsillos cerrados hacia los bloques rompibles superiores.
- Patrón de introducción de materiales por nivel (alternando "solo el material nuevo" / "mezcla de los ya introducidos") según la tabla acordada.
- Tabla de cantidad de bloques indestructibles por nivel: `[0, 2, 4, 4, 7, 7, 10, 10, 12, 14]` (niveles 1-10).
- Fórmula de velocidad de bola por nivel: `BALL_SPEED = 4 + (nivel - 1) * 0.4`, con tope de `7`. Valores de partida sujetos a ajuste tras prueba manual dentro del plan de implementación.
- Vidas se restauran a `LIVES_START` (3) al iniciar cada nuevo nivel; el score se acumula y persiste entre niveles dentro de la misma partida.
- Pantalla "Nivel completado" (score acumulado + opción de continuar con click/tecla) al romper todos los bloques rompibles de los niveles 1-9.
- Pantalla "¡Ganaste!" final al completar el nivel 10, mostrando el score acumulado total.
- HUD actualizado: nivel actual visible junto a score y vidas durante `PLAYING`.
- El reinicio desde "Game Over" vuelve siempre al nivel 1 con score 0 y vidas completas (comportamiento ya existente, ahora también reinicia el nivel).
- **Variación de ángulo de rebote en la paleta, según punto de impacto.** Se revierte parcialmente la decisión del spec 01 de "rebote espejo puro" (solo para el rebote contra la paleta; paredes y bloques mantienen el rebote espejo). Golpear el centro exacto de la paleta no modifica el ángulo con el que llegó la bola (rebote espejo normal, sin perturbación); alejarse del centro hacia cualquiera de las orillas suma o resta grados a ese ángulo base, de forma proporcional a la distancia, hasta un máximo de ±15° en las orillas extremas, con un clamp de seguridad final en 30°-150°. Ver fórmula concreta en Data model. Motivo: ver Decisiones tomadas y descartadas.
- **Red de seguridad anti-atasco en tiempo de ejecución.** Independientemente de la variación de ángulo en la paleta, la bola puede quedar en un ciclo cerrado que nunca vuelve a tocar la paleta (rebotando solo entre paredes/bloques, que mantienen el rebote espejo puro). Si transcurre `CONFIG.STUCK_TIMEOUT_MS` sin que se destruya un bloque ni se toque la paleta, se aplica un pequeño empujón aleatorio a la dirección de la bola (preserva su velocidad) y se reinicia el contador. No cambia el rebote normal de paredes/bloques; es una salvaguarda que en juego normal no debería activarse. Ver fórmula en Data model.

### Explícitamente fuera de este spec (para specs futuros)

- Diseño de niveles hechos a mano; todos los niveles de este spec son procedurales.
- Más de 10 niveles o un modo infinito más allá del nivel 10.
- Otros mecanismos de dificultad (paleta más angosta, menos vidas iniciales, límite de tiempo, etc.) — solo bola más rápida y bloques indestructibles.
- Persistencia de nivel alcanzado o progreso entre sesiones del navegador (sigue sin `localStorage`, heredado de la decisión del spec 01).
- Variación de ángulo de rebote contra **paredes o bloques** (solo se agrega variación en el rebote de la **paleta**; el resto de superficies mantiene el rebote espejo puro).
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

### Fórmula de rebote con ángulo variable en la paleta

El ángulo de salida es una **perturbación del rebote espejo puro** (no un mapeo absoluto a un rango fijo): golpear el centro exacto de la paleta no modifica el ángulo con el que llegó la bola (rebote espejo normal); alejarse del centro suma o resta grados a ese ángulo base, proporcional a la distancia, hasta un máximo en las orillas extremas.

```js
CONFIG.PADDLE_BOUNCE_MIN_ANGLE = 30;              // clamp de seguridad (evita trayectorias muy horizontales)
CONFIG.PADDLE_BOUNCE_MAX_ANGLE = 150;             // clamp de seguridad (evita trayectorias muy horizontales)
CONFIG.PADDLE_BOUNCE_MAX_OFFSET_DEGREES = 15;     // ajuste máx. respecto al ángulo espejo, en la orilla extrema

// Ángulo base = rebote espejo puro, a partir del ángulo de llegada de la bola.
// ball.dy > 0 en este punto (la bola venía bajando), así que el resultado siempre cae en (0°, 180°).
mirrorAngleDeg = atan2( ball.dy, ball.dx ) * 180 / Math.PI

// offset: -1 (orilla izquierda) a +1 (orilla derecha), 0 = centro exacto
offset = clamp( ( ball.centerX - paddle.centerX ) / ( paddle.width / 2 ), -1, 1 )

// Orilla derecha resta grados (trayectoria más plana hacia la derecha),
// orilla izquierda suma grados (trayectoria más plana hacia la izquierda).
angleDeg = clamp(
  mirrorAngleDeg - offset * CONFIG.PADDLE_BOUNCE_MAX_OFFSET_DEGREES,
  CONFIG.PADDLE_BOUNCE_MIN_ANGLE,
  CONFIG.PADDLE_BOUNCE_MAX_ANGLE
)
angleRad = angleDeg * Math.PI / 180

speed = ballSpeedForLevel( game.level )  // magnitud constante, ya usada en createBall()
ball.dx = speed * Math.cos( angleRad )
ball.dy = -speed * Math.sin( angleRad )  // siempre negativo (hacia arriba)
```

Solo aplica al rebote contra la **paleta**. Paredes y bloques (destructibles e indestructibles) mantienen el rebote espejo puro sin cambios.

### Red de seguridad anti-atasco

```js
CONFIG.STUCK_TIMEOUT_MS = 8000;        // sin romper bloque ni tocar paleta en este tiempo → se activa
CONFIG.STUCK_NUDGE_MAX_DEGREES = 20;   // rango del empujón aleatorio aplicado

// game.lastProgressTime se actualiza a Date.now() cada vez que:
//   - se destruye un bloque destructible (en handleBlockCollision)
//   - la bola rebota contra la paleta (en updateBall)
//   - se inicia/reinicia un nivel (en setupLevel)

// Cada frame, si ha pasado el timeout sin progreso:
elapsed = Date.now() - game.lastProgressTime
if ( elapsed > CONFIG.STUCK_TIMEOUT_MS ) {
  currentAngle = atan2( -ball.dy, ball.dx )
  nudge = random( -CONFIG.STUCK_NUDGE_MAX_DEGREES, CONFIG.STUCK_NUDGE_MAX_DEGREES ) en radianes
  newAngle = currentAngle + nudge
  speed = hypot( ball.dx, ball.dy )
  ball.dx = speed * cos( newAngle )
  ball.dy = -speed * sin( newAngle )
  game.lastProgressTime = Date.now()  // reinicia el contador
}
```

### Estado del juego (extendido)

```js
const game = {
  status: 'START',   // 'START' | 'PLAYING' | 'LEVEL_COMPLETE' | 'WON' | 'GAME_OVER'  (se agrega 'LEVEL_COMPLETE')
  lastProgressTime: null, // timestamp (ms) del último bloque destruido o rebote de paleta
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

2. **Generación de bloques indestructibles por nivel.** Crear una función que, dado `game.level`, genere las filas extra (máximo 2) con los materiales activos (`CONFIG.LEVEL_MATERIALS[level-1]`) y la cantidad (`CONFIG.INDESTRUCTIBLE_COUNTS[level-1]`), reservando una única columna libre por nivel (misma columna en todas las filas extra). Extender `createBlocks()`/`initGame()` para incluir estos bloques junto a los 48 rompibles existentes.
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

9. **Rebote con ángulo variable en la paleta (bug fix descubierto en el paso 8).** La simulación del paso 8 detectó que el rebote espejo puro (heredado del spec 01) puede producir trayectorias periódicas que nunca vuelven a pasar por la posición de uno o más bloques, dejando el nivel imposible de completar. Se implementa la fórmula de ángulo variable descrita en Data model, aplicada únicamente al rebote contra la paleta, para romper el determinismo de la trayectoria. Se repite la prueba de simulación del paso 8 para confirmar que ya no ocurren ciclos sin resolución.
   - *Deja el sistema funcional en:* los 10 niveles son completables de forma confiable; el rebote contra la paleta varía según el punto de impacto, y paredes/bloques mantienen el rebote espejo.

10. **Corredor de columna libre alineado entre filas extra (bug fix descubierto jugando manualmente).** Se detectó que columnas libres elegidas independientemente por fila podían encajonar la bola en un bolsillo cerrado por bloques indestructibles. Se corrige `createIndestructibleBlocks()` para reservar una única columna libre por nivel, compartida por todas las filas extra.
    - *Deja el sistema funcional en:* nunca existe un bolsillo cerrado entre filas de indestructibles; siempre hay un corredor vertical recto.

11. **Red de seguridad anti-atasco en tiempo de ejecución (bug fix: ciclos que no tocan la paleta).** Se detectó que la bola puede quedar en un ciclo cerrado rebotando solo entre paredes/bloques (rebote espejo puro, sin la variación del paso 9 porque nunca toca la paleta). Se implementa la detección descrita en Data model: si pasa `CONFIG.STUCK_TIMEOUT_MS` sin destruir un bloque ni tocar la paleta, se aplica un empujón aleatorio a la dirección de la bola. Se repite la prueba de simulación del paso 8 con esta salvaguarda activa para confirmar que todos los niveles se resuelven siempre.
    - *Deja el sistema funcional en:* ningún nivel puede quedar permanentemente atascado, sin importar la causa geométrica del ciclo.

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
- [ ] El rebote contra la paleta preserva el ángulo espejo puro al golpear el centro exacto, y lo ajusta hasta ±15° hacia las orillas (clamp de seguridad en 30°-150°); el rebote contra paredes y bloques sigue siendo espejo puro.
- [ ] La columna libre de las filas extra de indestructibles es la misma en todas las filas de un nivel, formando un corredor vertical continuo sin bolsillos cerrados.
- [ ] Si la bola pasa `CONFIG.STUCK_TIMEOUT_MS` sin destruir un bloque ni tocar la paleta, su dirección se ajusta automáticamente (empujón aleatorio) para evitar un atasco permanente.
- [ ] Una simulación de juego prolongada (paleta persiguiendo la bola) no deja bloques rompibles atrapados en una trayectoria cíclica sin resolución, incluso si el ciclo nunca involucra a la paleta.

## Decisiones tomadas y descartadas

- **10 niveles procedurales con tope fijo**, en vez de niveles infinitos o hechos a mano. Se prioriza tener un final claro ("ganar" en el nivel 10) y evitar el trabajo de diseñar niveles manualmente; queda abierto para un spec futuro extender o rediseñar el sistema si se desea.
- **Bloques indestructibles (no multi-golpe).** Se descartó que resistieran varios golpes antes de romperse porque no hay sprites de "daño progresivo" en el spritesheet para esos materiales, y porque simplifica la lógica de colisión (una sola condición booleana `destructible`).
- **Los indestructibles se agregan en filas extra, sin reemplazar bloques rompibles.** Se descartó la idea original de reemplazar bloques de color por indestructibles porque el usuario pidió explícitamente mantener siempre los 48 bloques rompibles por nivel, para no reducir el "contenido" jugable a medida que sube la dificultad.
- **Regla de accesibilidad: máximo 7 indestructibles por fila extra, mínimo 1 columna libre.** Se adoptó para garantizar que ninguna fila bloquee por completo el paso de la bola hacia los bloques rompibles. Esto obligó a bajar el tope original de 16 a 14 indestructibles en el nivel 10.
- **La columna libre es una sola por nivel, no independiente por fila.** Se descubrió jugando manualmente que, con columnas libres elegidas al azar de forma independiente por fila, la bola podía quedar encajonada en un bolsillo cerrado por bloques indestructibles cuando las columnas libres de ambas filas no coincidían — un bug de bloqueo real, no solo una molestia visual (contradice el criterio de accesibilidad ya documentado como riesgo). Se corrigió reservando una única columna libre por nivel, reutilizada en todas las filas extra, garantizando un corredor vertical continuo sin bolsillos posibles.
- **Patrón alterno de introducción de materiales** ("solo el nuevo" → "mezcla de los introducidos" → repetir). Se eligió para que el jugador reconozca visualmente cada material nuevo antes de verlo combinado con los demás, en vez de introducir los 4 de golpe.
- **Fórmula de velocidad de bola con incremento fijo y tope** (`4 + (nivel-1)*0.4`, máx `7`), en vez de una curva más compleja (exponencial, por tramos, etc.). Se prioriza simplicidad; el propio usuario indicó que estos valores son un punto de partida sujeto a ajuste tras prueba manual (ver paso 8 del plan de implementación).
- **Vidas se restauran por nivel, pero el score se acumula.** Decisión explícita del usuario: cada nivel da un "respiro" de vidas completas para que la dificultad creciente no se sienta punitiva, sin perder el progreso de puntuación ya conseguido.
- **Reiniciar desde "Game Over" siempre vuelve al nivel 1**, en vez de continuar desde el nivel alcanzado. Se mantiene consistente con el comportamiento de reinicio ya existente en el spec 01 (reinicio total del estado del juego).
- **Sin persistencia de nivel o progreso entre sesiones.** Heredado de la decisión del spec 01 de no usar `localStorage`; el progreso vive solo en memoria durante la partida.
- **Se revierte parcialmente la decisión del spec 01 de rebote espejo puro, solo para la paleta.** Descubierto durante la prueba de simulación del paso 8: con rebote espejo puro (`dx` constante en magnitud, solo cambia de signo), la trayectoria de la bola es determinista y puede entrar en un ciclo periódico que nunca vuelve a pasar por la posición de uno o más bloques, dejando el nivel incompletable — se confirmó esto en el nivel 1 con una simulación de paleta persiguiendo la bola durante 240s simulados, donde 1 bloque quedó atrapado en un ciclo exacto de 1160 frames. Se decidió agregar variación de ángulo solo en el rebote de la paleta, dejando paredes y bloques con rebote espejo intacto.
- **La variación de ángulo es una perturbación del rebote espejo, no un mapeo absoluto a un ángulo fijo.** Primera versión implementada mapeaba el punto de impacto directamente a un ángulo absoluto en 30°-150° (ignorando el ángulo de llegada de la bola), lo cual generaba demasiados rebotes exactamente verticales (90°) cada vez que la bola tocaba cerca del centro, sin importar su trayectoria previa. Se corrigió a petición del usuario: el ángulo base es siempre el rebote espejo normal (preserva la trayectoria de llegada), y el punto de impacto solo le suma o resta grados (orilla derecha resta, orilla izquierda suma), con clamp final de seguridad en 30°-150°. Esto conserva la sensación de "control real" del jugador sin perder la variedad necesaria para romper ciclos periódicos.
- **El máximo de ajuste subió de ±5° a ±15°.** Con ±5° ya no había ciclos exactos (verificado con detector de periodicidad), pero simulaciones de juego prolongado mostraron que algunos niveles podían tardar decenas de minutos simulados en resolver el último bloque, por ser un ajuste demasiado sutil. Se subió a ±15° como punto medio para que los niveles se resuelvan en tiempos razonables sin perder la sensación de que el ángulo base sigue siendo el rebote espejo original.
- **La columna libre de las filas extra es una sola por nivel, no independiente por fila.** Descubierto jugando manualmente: con columnas libres elegidas al azar de forma independiente por fila, la bola podía quedar encajonada en un bolsillo cerrado por bloques indestructibles (bug real de bloqueo, no solo una molestia visual). Se corrigió reservando una única columna libre por nivel, reutilizada en todas las filas extra.
- **Red de seguridad anti-atasco en tiempo de ejecución, en vez de agregar variación de ángulo también a paredes/bloques.** Incluso con la variación de ángulo en la paleta (±15°), la simulación del paso 8 encontró un ciclo cerrado exacto de 12 frames que nunca volvía a tocar la paleta (rebotando solo entre paredes/bloques con rebote espejo puro, donde la variación de la paleta nunca se aplica). Se descartó extender la variación de ángulo a paredes y bloques por ser un cambio más invasivo a la sensación general del rebote; en su lugar se implementó una detección de inactividad (sin romper bloque ni tocar paleta durante `CONFIG.STUCK_TIMEOUT_MS`) que aplica un empujón aleatorio a la bola, garantizando que ningún ciclo —sin importar su origen geométrico— pueda ser permanente.

## Riesgos identificados

- **Balance de dificultad incorrecto.** Pese al tope de velocidad (`BALL_SPEED_MAX = 7`) y la regla de accesibilidad, el nivel 10 podría resultar demasiado fácil o casi imposible en la práctica. Mitigación: el paso 8 del plan de implementación incluye prueba manual explícita y ajuste de `BALL_SPEED_INCREMENT`/`BALL_SPEED_MAX`/`INDESTRUCTIBLE_COUNTS` antes de dar el spec por terminado.
- **Columnas libres desalineadas entre filas extra (RESUELTO).** Originalmente cada fila elegía su columna libre de forma independiente, lo que podía dejar a la bola encajonada en un bolsillo cerrado por bloques indestructibles — confirmado jugando manualmente. Corregido reservando una única columna libre por nivel, compartida por todas las filas extra (ver Decisiones tomadas y descartadas).
- **Ciclos de trayectoria que nunca tocan la paleta (RESUELTO).** La variación de ángulo del paso 9 solo se aplica en el rebote de la paleta; un ciclo confinado a paredes/bloques (rebote espejo puro) podía persistir indefinidamente. Corregido con la red de seguridad anti-atasco del paso 11 (ver Decisiones tomadas y descartadas), que garantiza que cualquier ciclo, sin importar dónde ocurra, se rompe en un máximo de `CONFIG.STUCK_TIMEOUT_MS`.
- **Menor espacio de juego en niveles altos.** Los niveles 7-10 usan 2 filas extra, acercando los bloques indestructibles a la paleta y reduciendo el tiempo de reacción del jugador más de lo que el aumento de velocidad por sí solo sugiere. Mitigación: evaluar en la prueba manual del paso 8 si el nivel 10 sigue siendo jugable con ambos factores combinados (velocidad + espacio reducido), y ajustar si es necesario.
- **Confusión auditiva entre rebote en pared/paleta y rebote en bloque indestructible.** Al reutilizar `ball-bounce.mp3` para ambos casos, el jugador no distingue por sonido qué golpeó. Es una decisión aceptada explícitamente en el scope (fuera de este spec agregar sonido diferenciado), pero se documenta como riesgo de UX menor.
