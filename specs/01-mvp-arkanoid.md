# Spec 01 — MVP Jugable de Arkanoid

- **Estado:** Approved
- **Dependencias:** Ninguna (primer spec del proyecto)
- **Fecha:** 2026-07-24
- **Objetivo:** Implementar un MVP jugable de Arkanoid de un solo nivel, con controles de teclado y mouse, 3 vidas, sistema de puntos y sonido, usando HTML/CSS/JS vanilla sin dependencias.

## Scope

### Incluido en este spec

- Un único nivel con layout fijo de bloques: cuadrícula de 8 columnas x 6 filas, colores distribuidos por fila (usando los 7 colores disponibles en el spritesheet: gray, red, yellow, cyan, magenta, hotpink, green).
- Paleta controlable con teclado (flechas o A/D) y con mouse (moviendo el cursor sobre el canvas).
- Bola con rebote simple tipo espejo contra paredes, bloques y paleta (sin variación de ángulo por punto de impacto).
- Sistema de vidas: el jugador inicia con 3 vidas; pierde una vida cuando la bola cae por debajo de la paleta.
- Sistema de puntuación: 10 puntos por cada bloque destruido, visible en pantalla durante la partida. Sin persistencia de high scores.
- Animación de explosión al destruir un bloque, usando `EXPLOSION_FRAMES` de `assets/spritesheet.js`.
- Sonido de rebote (`ball-bounce.mp3`) y de rotura de bloque (`break-sound.mp3`).
- Pantallas de estado:
  - Pantalla inicial con título del juego y botón/opción "Iniciar".
  - Pantalla de "¡Ganaste!" al romper todos los bloques, con opción de reiniciar.
  - Pantalla de "Game Over" al quedarse sin vidas, con opción de reiniciar.
- Canvas de tamaño fijo (a definir en la sección de datos técnicos/plan).
- Estructura de archivos: `index.html`, `style.css`, `game.js` (todo el código de juego en un solo archivo), reutilizando los assets ya existentes en `assets/`.

### Explícitamente fuera de este spec (para specs futuros)

- Múltiples niveles o progresión entre niveles.
- Power-ups (bloques que sueltan mejoras).
- Rebote con ángulo variable según punto de impacto en la paleta.
- Persistencia de high scores (localStorage, tabla de puntuaciones, etc.).
- Opción de silenciar/mute del sonido.
- Responsive / canvas adaptable al tamaño de ventana.

## Data model

Todo vive en `game.js` como constantes y objetos planos (sin clases, sin frameworks).

### Configuración fija

```js
const CONFIG = {
  CANVAS_WIDTH: 480,
  CANVAS_HEIGHT: 640,
  PADDLE_WIDTH: 90,
  PADDLE_HEIGHT: 14,
  PADDLE_Y_OFFSET: 30,     // distancia desde el borde inferior del canvas
  PADDLE_SPEED: 7,          // px por frame al mover con teclado
  BALL_SIZE: 16,
  BALL_SPEED: 4,            // magnitud del vector de velocidad inicial
  BLOCK_ROWS: 6,
  BLOCK_COLS: 8,
  BLOCK_WIDTH: 52,
  BLOCK_HEIGHT: 20,
  BLOCK_PADDING: 4,
  BLOCK_TOP_OFFSET: 60,
  LIVES_START: 3,
  POINTS_PER_BLOCK: 10,
  ROW_COLORS: ['red', 'yellow', 'green', 'cyan', 'magenta', 'hotpink'], // una por fila, de arriba hacia abajo
};
```

### Estado del juego

```js
const game = {
  status: 'START',   // 'START' | 'PLAYING' | 'WON' | 'GAME_OVER'
  score: 0,
  lives: CONFIG.LIVES_START,
  blocks: [],          // array de Block, generado al iniciar/reiniciar
  paddle: null,        // Paddle
  ball: null,          // Ball
};
```

### Estructuras de entidades

```js
// Paddle
{ x, y, width, height }

// Ball
{ x, y, size, dx, dy }  // dx/dy = velocidad en px/frame

// Block
{
  x, y, width, height,
  color,               // uno de los colores en SPRITES.blocks
  destroyed,           // boolean
  exploding,           // boolean, true mientras se reproduce la animación
  explosionStartTime,  // timestamp (ms) de cuándo empezó a explotar, o null
}
```

### Notas de integración con assets existentes

- `Block.color` debe mapear directamente a las claves de `SPRITES.blocks` en `assets/spritesheet.js` (`gray, red, yellow, cyan, magenta, hotpink, green`), usadas también como `block_<color>` al llamar `drawSprite`.
- La animación de explosión usa `EXPLOSION_FRAMES[color]` y `EXPLOSION_DURATION` (150ms) ya definidos en `assets/spritesheet.js`; cuando `Date.now() - explosionStartTime > EXPLOSION_DURATION`, el bloque pasa a `destroyed = true` y deja de dibujarse.

## Implementation plan

1. **Scaffolding y pantalla inicial.** Crear `index.html` (canvas de 480x640, carga de `assets/spritesheet.js` y `game.js`), `style.css` básico y `game.js` con el objeto `CONFIG`/`game` inicial. Dibujar la pantalla de inicio (título + texto "Iniciar"). Al presionar una tecla o hacer click, cambiar `game.status` a `PLAYING`.
   - *Deja el sistema funcional en:* se ve la pantalla de inicio y se puede pasar a estado "jugando" (aunque el canvas quede vacío).

2. **Render estático del nivel.** Generar `game.blocks` (8x6, colores por fila según `CONFIG.ROW_COLORS`), crear `paddle` y `ball` con posición inicial, y dibujarlos usando `drawSprite`.
   - *Deja el sistema funcional en:* al iniciar, se ve el nivel completo (bloques, paleta, bola) en su posición de arranque.

3. **Movimiento de la paleta.** Implementar control con teclado (flechas/A-D) y con mouse (moviendo sobre el canvas), con clamp a los límites del canvas.
   - *Deja el sistema funcional en:* la paleta se mueve con ambos esquemas de control dentro del nivel ya renderizado.

4. **Movimiento de la bola, rebotes y pérdida de vidas.** Loop de animación (`requestAnimationFrame`) que mueve la bola, rebota tipo espejo contra paredes y paleta (reproduciendo `ball-bounce.mp3`), y cuando la bola cae debajo de la paleta resta una vida, reposiciona la bola/paleta, y si `lives` llega a 0 cambia `game.status` a `GAME_OVER`.
   - *Deja el sistema funcional en:* se puede jugar con la bola rebotando y perder hasta llegar a Game Over (sin poder romper bloques todavía).

5. **Colisión bola-bloque, explosión y puntuación.** Detectar colisión de la bola con bloques no destruidos: rebote de la bola, marcar el bloque como `exploding` con `explosionStartTime`, reproducir `break-sound.mp3`, sumar `CONFIG.POINTS_PER_BLOCK` a `score`. En el loop de render, mientras un bloque esté `exploding`, dibujar el frame correspondiente de `EXPLOSION_FRAMES` según el tiempo transcurrido; al superar `EXPLOSION_DURATION`, marcar `destroyed = true` y dejar de dibujarlo/colisionar con él.
   - *Deja el sistema funcional en:* el gameplay principal está completo — se pueden romper bloques, sumar puntos y perder vidas.

6. **Condición de victoria.** Cuando todos los bloques tengan `destroyed = true`, cambiar `game.status` a `WON` y mostrar pantalla "¡Ganaste!" con score final y opción de reiniciar.
   - *Deja el sistema funcional en:* el flujo de victoria está completo.

7. **Pantalla de Game Over y reinicio.** Mostrar pantalla "Game Over" con score final y opción de reiniciar cuando `game.status === 'GAME_OVER'`. Implementar `resetGame()` que reinicializa `score`, `lives`, `blocks`, `paddle` y `ball`, y regresa `game.status` a `PLAYING` directamente (sin volver a pasar por la pantalla de inicio), reutilizable tanto desde la pantalla de victoria como la de derrota.
   - *Deja el sistema funcional en:* el MVP completo — se puede jugar de principio a fin, ganar o perder, y reiniciar las veces que se quiera.

## Acceptance criteria

- [ ] Al abrir `index.html` en el navegador, se muestra la pantalla inicial con el título del juego y una opción de "Iniciar".
- [ ] Al iniciar, se renderiza el nivel completo: 8 columnas x 6 filas de bloques con colores distintos por fila, la paleta y la bola en sus posiciones iniciales.
- [ ] La paleta se mueve con las flechas del teclado (o A/D) dentro de los límites del canvas.
- [ ] La paleta se mueve siguiendo la posición del mouse dentro del canvas.
- [ ] La bola rebota correctamente (tipo espejo) contra las paredes superior, izquierda y derecha del canvas.
- [ ] La bola rebota correctamente contra la paleta cuando la golpea.
- [ ] Al golpear un bloque, el bloque reproduce la animación de explosión (`EXPLOSION_FRAMES`) y luego desaparece.
- [ ] Cada bloque destruido suma 10 puntos al score, visible en pantalla en todo momento durante `PLAYING`.
- [ ] Se reproduce `ball-bounce.mp3` en cada rebote de la bola contra paredes/paleta.
- [ ] Se reproduce `break-sound.mp3` cada vez que se destruye un bloque.
- [ ] Cuando la bola cae debajo de la paleta, se resta una vida y la bola/paleta se reposicionan para continuar jugando (mientras queden vidas).
- [ ] Al llegar a 0 vidas, se muestra la pantalla de "Game Over" con el score final y una opción de reiniciar.
- [ ] Al destruir los 48 bloques del nivel, se muestra la pantalla de "¡Ganaste!" con el score final y una opción de reiniciar.
- [ ] La opción de reiniciar (desde "Game Over" o "¡Ganaste!") reinicia score, vidas, bloques, paleta y bola, y vuelve a un estado jugable inmediatamente.
- [ ] El juego funciona abriendo `index.html` directamente en el navegador, sin dependencias externas ni paso de build.

## Decisiones tomadas y descartadas

- **Un solo nivel fijo, sin power-ups.** Se decidió mantener el MVP mínimo; niveles múltiples y power-ups quedan para specs futuros por ser piezas grandes con su propio diseño.
- **Rebote simple tipo espejo** en vez de ángulo variable según punto de impacto en la paleta. Se prioriza velocidad de implementación sobre "feel" de juego; se puede revisar en un spec posterior si se desea.
- **Canvas de tamaño fijo (480x640)** en vez de responsive. Simplifica el manejo de colisiones y coincide con los tamaños de sprite ya definidos en `assets/spritesheet.js`. Responsive queda fuera de este spec.
- **Sin persistencia de high scores.** El score vive solo en memoria durante la partida; no hay localStorage ni almacenamiento en este MVP.
- **Reiniciar va directo a `PLAYING`**, sin pasar de nuevo por la pantalla de inicio. Se eligió así por fluidez de rejugabilidad; si se prefiere volver a la pantalla de inicio, es un cambio menor a futuro.
- **Todo el código en un solo `game.js`**, sin módulos separados. El juego es pequeño y no hay bundler en el proyecto, así que separar módulos ES6 añadiría complejidad de carga sin beneficio real en este alcance.
- **Sin opción de mute de sonido.** Se integra el audio directo desde `assets/sounds/`, pero controlar/silenciar el audio queda fuera de este MVP.

## Riesgos identificados

- **Autoplay de audio bloqueado por el navegador.** Los navegadores modernos bloquean reproducir audio antes de una interacción del usuario. Mitigación: los sonidos solo se disparan después de que el usuario presiona "Iniciar" (ya es una interacción), lo cual debería ser suficiente, pero conviene verificar en el navegador de prueba.
- **Bola con trayectoria horizontal pura (loop infinito o atascada).** Con rebote tipo espejo, si la bola queda con `dy = 0` puede rebotar indefinidamente en horizontal sin nunca bajar. Mitigación: al lanzar la bola (inicio o tras perder vida), asignar siempre una componente vertical (`dy`) distinta de cero.
- **Carga asíncrona del spritesheet.** `loadSpritesheet` es asíncrono; si el loop de juego intenta dibujar antes de que cargue, `drawSprite`/`drawFrame` simplemente no dibujan nada (ya manejado por el `if (!ssLoaded) return` existente), pero hay que asegurar que el loop de juego no arranque su lógica de colisiones antes de que el spritesheet esté listo, para evitar una sensación de "juego congelado" al inicio.
