# Juego de Arkanoid

Un clon de Arkanoid/Breakout construido con HTML, CSS y JavaScript puro, sin dependencias externas ni pasos de build. Basta con abrir `index.html` en el navegador (o servirlo con cualquier servidor estático) para jugar.

## Estado del proyecto

- **MVP jugable** (spec `01-mvp-arkanoid`): un nivel con cuadrícula de bloques de colores, control de la paleta por teclado y mouse, rebote de la bola, sistema de vidas y puntuación, animación de explosión al romper bloques, sonido, y pantallas de inicio/victoria/derrota con reinicio.
- **Niveles progresivos** (spec `02-niveles-progresivos`): 10 niveles generados automáticamente con dificultad creciente. Cada nivel agrega bloques indestructibles de distintos materiales (madera, ladrillo rojizo, ladrillo morado, piedra) y aumenta la velocidad de la bola. Completar el nivel 10 gana el juego. El score se acumula entre niveles; las vidas se restauran al pasar de nivel.

Ambos specs están completamente implementados. El detalle de alcance, decisiones y criterios de aceptación de cada uno vive en `specs/`.

## Cómo jugar

- **Teclado:** flechas izquierda/derecha o A/D para mover la paleta.
- **Mouse:** mover el cursor sobre el canvas mueve la paleta.
- Presiona cualquier tecla o haz click para iniciar/reiniciar desde las pantallas de estado.

## Estructura del proyecto

- `index.html` — punto de entrada, define el canvas y carga los scripts.
- `style.css` — estilos básicos del canvas.
- `game.js` — todo el código del juego (estado, física, niveles, render).
- `assets/spritesheet.js` — helper para leer sprites del spritesheet.
- `assets/spritesheet-breakout.png` — spritesheet con paleta, bola, bloques y animación de explosión.
- `assets/sounds/` — efectos de sonido (rebote y rotura de bloque).
- `specs/` — specs del proyecto siguiendo el flujo spec-driven (`/spec`, `/spec-impl`).
