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

  MAX_LEVEL: 10,
  BALL_SPEED_BASE: 4,
  BALL_SPEED_INCREMENT: 0.4,
  BALL_SPEED_MAX: 7,               // tope, sujeto a ajuste tras prueba manual
  EXTRA_ROW_MAX_PER_ROW: 7,        // máximo de indestructibles por fila extra (deja ≥1 columna libre)

  INDESTRUCTIBLE_COUNTS: [ 0, 2, 4, 4, 7, 7, 10, 10, 12, 14 ], // índice 0 = nivel 1

  // Materiales activos (utilizables) por nivel, según el patrón alterno confirmado
  LEVEL_MATERIALS: [
    [],                                             // nivel 1
    [ 'wood' ],                                     // nivel 2 (solo el nuevo)
    [ 'wood' ],                                     // nivel 3 (mezcla de lo introducido)
    [ 'brick_red' ],                                // nivel 4 (solo el nuevo)
    [ 'wood', 'brick_red' ],                        // nivel 5 (mezcla)
    [ 'brick_purple' ],                             // nivel 6 (solo el nuevo)
    [ 'wood', 'brick_red', 'brick_purple' ],        // nivel 7 (mezcla)
    [ 'gray' ],                                      // nivel 8 (solo el nuevo)
    [ 'wood', 'brick_red', 'brick_purple', 'gray' ], // nivel 9 (mezcla, los 4)
    [ 'wood', 'brick_red', 'brick_purple', 'gray' ], // nivel 10 (mezcla, máxima dificultad)
  ],
};

const game = {
  status: 'START',   // 'START' | 'PLAYING' | 'LEVEL_COMPLETE' | 'WON' | 'GAME_OVER'
  level: 1,
  score: 0,
  lives: CONFIG.LIVES_START,
  blocks: [],          // array de Block, generado al iniciar/reiniciar
  paddle: null,        // Paddle
  ball: null,          // Ball
};

const canvas = document.getElementById( 'gameCanvas' );
const ctx = canvas.getContext( '2d' );

function blockGridMarginX() {
  const gridWidth = CONFIG.BLOCK_COLS * CONFIG.BLOCK_WIDTH + ( CONFIG.BLOCK_COLS - 1 ) * CONFIG.BLOCK_PADDING;
  return ( CONFIG.CANVAS_WIDTH - gridWidth ) / 2;
}

function createBlocks() {
  const blocks = [];
  const marginX = blockGridMarginX();

  for ( let row = 0; row < CONFIG.BLOCK_ROWS; row++ ) {
    for ( let col = 0; col < CONFIG.BLOCK_COLS; col++ ) {
      blocks.push( {
        x: marginX + col * ( CONFIG.BLOCK_WIDTH + CONFIG.BLOCK_PADDING ),
        y: CONFIG.BLOCK_TOP_OFFSET + row * ( CONFIG.BLOCK_HEIGHT + CONFIG.BLOCK_PADDING ),
        width: CONFIG.BLOCK_WIDTH,
        height: CONFIG.BLOCK_HEIGHT,
        color: CONFIG.ROW_COLORS[ row ],
        destructible: true,
        destroyed: false,
        exploding: false,
        explosionStartTime: null,
      } );
    }
  }

  return blocks;
}

function pickRandomColumns( count, totalCols ) {
  const columns = [];
  for ( let col = 0; col < totalCols; col++ ) columns.push( col );

  for ( let i = columns.length - 1; i > 0; i-- ) {
    const j = Math.floor( Math.random() * ( i + 1 ) );
    [ columns[ i ], columns[ j ] ] = [ columns[ j ], columns[ i ] ];
  }

  return columns.slice( 0, count );
}

function createIndestructibleBlocks( level ) {
  const blocks = [];
  const count = CONFIG.INDESTRUCTIBLE_COUNTS[ level - 1 ];
  const materials = CONFIG.LEVEL_MATERIALS[ level - 1 ];
  if ( count === 0 ) return blocks;

  const marginX = blockGridMarginX();
  let remaining = count;
  let rowIndex = 0;

  while ( remaining > 0 ) {
    const rowCount = Math.min( remaining, CONFIG.EXTRA_ROW_MAX_PER_ROW );
    const columns = pickRandomColumns( rowCount, CONFIG.BLOCK_COLS );

    for ( const col of columns ) {
      blocks.push( {
        x: marginX + col * ( CONFIG.BLOCK_WIDTH + CONFIG.BLOCK_PADDING ),
        y: CONFIG.BLOCK_TOP_OFFSET + ( CONFIG.BLOCK_ROWS + rowIndex ) * ( CONFIG.BLOCK_HEIGHT + CONFIG.BLOCK_PADDING ),
        width: CONFIG.BLOCK_WIDTH,
        height: CONFIG.BLOCK_HEIGHT,
        color: materials[ Math.floor( Math.random() * materials.length ) ],
        destructible: false,
        destroyed: false,
        exploding: false,
        explosionStartTime: null,
      } );
    }

    remaining -= rowCount;
    rowIndex++;
  }

  return blocks;
}

function createPaddle() {
  return {
    x: ( CONFIG.CANVAS_WIDTH - CONFIG.PADDLE_WIDTH ) / 2,
    y: CONFIG.CANVAS_HEIGHT - CONFIG.PADDLE_Y_OFFSET - CONFIG.PADDLE_HEIGHT,
    width: CONFIG.PADDLE_WIDTH,
    height: CONFIG.PADDLE_HEIGHT,
  };
}

function createBall( paddle ) {
  return {
    x: CONFIG.CANVAS_WIDTH / 2 - CONFIG.BALL_SIZE / 2,
    y: paddle.y - CONFIG.BALL_SIZE,
    size: CONFIG.BALL_SIZE,
    dx: CONFIG.BALL_SPEED,
    dy: -CONFIG.BALL_SPEED,
  };
}

function initGame() {
  game.score = 0;
  game.lives = CONFIG.LIVES_START;
  game.blocks = createBlocks().concat( createIndestructibleBlocks( game.level ) );
  game.paddle = createPaddle();
  game.ball = createBall( game.paddle );
}

function drawBlocks() {
  for ( const block of game.blocks ) {
    if ( block.destroyed ) continue;

    if ( block.exploding ) {
      const elapsed = Date.now() - block.explosionStartTime;
      if ( elapsed > EXPLOSION_DURATION ) {
        block.destroyed = true;
        continue;
      }
      const frameIndex = Math.min( 3, Math.floor( elapsed / ( EXPLOSION_DURATION / 4 ) ) );
      drawFrame( ctx, EXPLOSION_FRAMES[ block.color ][ frameIndex ], block.x, block.y, block.width, block.height );
      continue;
    }

    drawSprite( ctx, 'block_' + block.color, block.x, block.y, block.width, block.height );
  }
}

function drawPaddle() {
  drawSprite( ctx, 'paddle', game.paddle.x, game.paddle.y, game.paddle.width, game.paddle.height );
}

function drawBall() {
  drawSprite( ctx, 'ball', game.ball.x, game.ball.y, game.ball.size, game.ball.size );
}

function drawHud() {
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText( 'Score: ' + game.score, 10, 20 );
  ctx.textAlign = 'right';
  ctx.fillText( 'Vidas: ' + game.lives, CONFIG.CANVAS_WIDTH - 10, 20 );
}

function drawPlayingScreen() {
  ctx.fillStyle = '#000';
  ctx.fillRect( 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT );

  drawBlocks();
  drawPaddle();
  drawBall();
  drawHud();
}

const ballBounceSound = new Audio( 'assets/sounds/ball-bounce.mp3' );
const breakSound = new Audio( 'assets/sounds/break-sound.mp3' );

function playBallBounceSound() {
  ballBounceSound.cloneNode().play();
}

function playBreakSound() {
  breakSound.cloneNode().play();
}

function repositionBallAndPaddle() {
  game.paddle = createPaddle();
  game.ball = createBall( game.paddle );
}

function loseLife() {
  game.lives -= 1;
  if ( game.lives <= 0 ) {
    game.status = 'GAME_OVER';
    return;
  }
  repositionBallAndPaddle();
}

function updateBall() {
  const ball = game.ball;

  ball.x += ball.dx;
  ball.y += ball.dy;

  if ( ball.x <= 0 ) {
    ball.x = 0;
    ball.dx = -ball.dx;
    playBallBounceSound();
  } else if ( ball.x + ball.size >= CONFIG.CANVAS_WIDTH ) {
    ball.x = CONFIG.CANVAS_WIDTH - ball.size;
    ball.dx = -ball.dx;
    playBallBounceSound();
  }

  if ( ball.y <= 0 ) {
    ball.y = 0;
    ball.dy = -ball.dy;
    playBallBounceSound();
  }

  const paddle = game.paddle;
  const hitsPaddle = ball.dy > 0 &&
    ball.x + ball.size >= paddle.x &&
    ball.x <= paddle.x + paddle.width &&
    ball.y + ball.size >= paddle.y &&
    ball.y + ball.size <= paddle.y + paddle.height;

  if ( hitsPaddle ) {
    ball.y = paddle.y - ball.size;
    ball.dy = -ball.dy;
    playBallBounceSound();
  }

  handleBlockCollision();

  if ( ball.y > CONFIG.CANVAS_HEIGHT ) {
    loseLife();
  }
}

function handleBlockCollision() {
  const ball = game.ball;

  for ( const block of game.blocks ) {
    if ( block.destroyed || block.exploding ) continue;

    const hits = ball.x < block.x + block.width &&
      ball.x + ball.size > block.x &&
      ball.y < block.y + block.height &&
      ball.y + ball.size > block.y;

    if ( !hits ) continue;

    const overlapX = Math.min( ball.x + ball.size, block.x + block.width ) - Math.max( ball.x, block.x );
    const overlapY = Math.min( ball.y + ball.size, block.y + block.height ) - Math.max( ball.y, block.y );

    if ( overlapX < overlapY ) {
      ball.dx = -ball.dx;
    } else {
      ball.dy = -ball.dy;
    }

    block.exploding = true;
    block.explosionStartTime = Date.now();
    game.score += CONFIG.POINTS_PER_BLOCK;
    playBreakSound();

    break;
  }
}

function checkWinCondition() {
  if ( game.blocks.every( ( block ) => block.destroyed ) ) {
    game.status = 'WON';
  }
}

function drawStartScreen() {
  ctx.fillStyle = '#000';
  ctx.fillRect( 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';

  ctx.font = 'bold 40px sans-serif';
  ctx.fillText( 'ARKANOID', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 20 );

  ctx.font = '20px sans-serif';
  ctx.fillText( 'Presiona una tecla o click para Iniciar', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 30 );
}

function drawWonScreen() {
  ctx.fillStyle = '#000';
  ctx.fillRect( 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';

  ctx.font = 'bold 40px sans-serif';
  ctx.fillText( '¡Ganaste!', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 20 );

  ctx.font = '20px sans-serif';
  ctx.fillText( 'Score final: ' + game.score, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 20 );
  ctx.fillText( 'Presiona una tecla o click para reiniciar', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 50 );
}

function drawGameOverScreen() {
  ctx.fillStyle = '#000';
  ctx.fillRect( 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT );

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';

  ctx.font = 'bold 40px sans-serif';
  ctx.fillText( 'Game Over', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 20 );

  ctx.font = '20px sans-serif';
  ctx.fillText( 'Score final: ' + game.score, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 20 );
  ctx.fillText( 'Presiona una tecla o click para reiniciar', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 50 );
}

function render() {
  if ( game.status === 'START' ) {
    drawStartScreen();
  } else if ( game.status === 'PLAYING' ) {
    drawPlayingScreen();
  } else if ( game.status === 'WON' ) {
    drawWonScreen();
  } else if ( game.status === 'GAME_OVER' ) {
    drawGameOverScreen();
  }
}

function startGame() {
  if ( game.status !== 'START' ) return;
  initGame();
  game.status = 'PLAYING';
  render();
}

function resetGame() {
  if ( game.status !== 'WON' && game.status !== 'GAME_OVER' ) return;
  initGame();
  game.status = 'PLAYING';
  render();
}

const keys = {};
const PADDLE_KEYS = [ 'ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D' ];

window.addEventListener( 'keydown', ( e ) => {
  if ( PADDLE_KEYS.includes( e.key ) ) keys[ e.key ] = true;
  startGame();
  resetGame();
} );

window.addEventListener( 'keyup', ( e ) => {
  if ( PADDLE_KEYS.includes( e.key ) ) keys[ e.key ] = false;
} );

canvas.addEventListener( 'click', () => {
  startGame();
  resetGame();
} );

canvas.addEventListener( 'mousemove', ( e ) => {
  if ( game.status !== 'PLAYING' ) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = ( e.clientX - rect.left ) * ( CONFIG.CANVAS_WIDTH / rect.width );
  game.paddle.x = clamp( mouseX - game.paddle.width / 2, 0, CONFIG.CANVAS_WIDTH - game.paddle.width );
} );

function clamp( value, min, max ) {
  return Math.max( min, Math.min( max, value ) );
}

function updatePaddle() {
  if ( keys[ 'ArrowLeft' ] || keys[ 'a' ] || keys[ 'A' ] ) {
    game.paddle.x -= CONFIG.PADDLE_SPEED;
  }
  if ( keys[ 'ArrowRight' ] || keys[ 'd' ] || keys[ 'D' ] ) {
    game.paddle.x += CONFIG.PADDLE_SPEED;
  }
  game.paddle.x = clamp( game.paddle.x, 0, CONFIG.CANVAS_WIDTH - game.paddle.width );
}

function gameLoop() {
  if ( game.status === 'PLAYING' ) {
    updatePaddle();
    updateBall();
  }
  render();
  if ( game.status === 'PLAYING' ) {
    checkWinCondition();
  }
  requestAnimationFrame( gameLoop );
}

loadSpritesheet( () => {
  requestAnimationFrame( gameLoop );
} );
