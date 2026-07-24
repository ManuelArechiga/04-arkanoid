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

const game = {
  status: 'START',   // 'START' | 'PLAYING' | 'WON' | 'GAME_OVER'
  score: 0,
  lives: CONFIG.LIVES_START,
  blocks: [],          // array de Block, generado al iniciar/reiniciar
  paddle: null,        // Paddle
  ball: null,          // Ball
};

const canvas = document.getElementById( 'gameCanvas' );
const ctx = canvas.getContext( '2d' );

function createBlocks() {
  const blocks = [];
  const gridWidth = CONFIG.BLOCK_COLS * CONFIG.BLOCK_WIDTH + ( CONFIG.BLOCK_COLS - 1 ) * CONFIG.BLOCK_PADDING;
  const marginX = ( CONFIG.CANVAS_WIDTH - gridWidth ) / 2;

  for ( let row = 0; row < CONFIG.BLOCK_ROWS; row++ ) {
    for ( let col = 0; col < CONFIG.BLOCK_COLS; col++ ) {
      blocks.push( {
        x: marginX + col * ( CONFIG.BLOCK_WIDTH + CONFIG.BLOCK_PADDING ),
        y: CONFIG.BLOCK_TOP_OFFSET + row * ( CONFIG.BLOCK_HEIGHT + CONFIG.BLOCK_PADDING ),
        width: CONFIG.BLOCK_WIDTH,
        height: CONFIG.BLOCK_HEIGHT,
        color: CONFIG.ROW_COLORS[ row ],
        destroyed: false,
        exploding: false,
        explosionStartTime: null,
      } );
    }
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
  game.blocks = createBlocks();
  game.paddle = createPaddle();
  game.ball = createBall( game.paddle );
}

function drawBlocks() {
  for ( const block of game.blocks ) {
    if ( block.destroyed ) continue;
    drawSprite( ctx, 'block_' + block.color, block.x, block.y, block.width, block.height );
  }
}

function drawPaddle() {
  drawSprite( ctx, 'paddle', game.paddle.x, game.paddle.y, game.paddle.width, game.paddle.height );
}

function drawBall() {
  drawSprite( ctx, 'ball', game.ball.x, game.ball.y, game.ball.size, game.ball.size );
}

function drawPlayingScreen() {
  ctx.fillStyle = '#000';
  ctx.fillRect( 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT );

  drawBlocks();
  drawPaddle();
  drawBall();
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

function render() {
  if ( game.status === 'START' ) {
    drawStartScreen();
  } else if ( game.status === 'PLAYING' ) {
    drawPlayingScreen();
  }
}

function startGame() {
  if ( game.status !== 'START' ) return;
  initGame();
  game.status = 'PLAYING';
  render();
}

const keys = {};
const PADDLE_KEYS = [ 'ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D' ];

window.addEventListener( 'keydown', ( e ) => {
  if ( PADDLE_KEYS.includes( e.key ) ) keys[ e.key ] = true;
  startGame();
} );

window.addEventListener( 'keyup', ( e ) => {
  if ( PADDLE_KEYS.includes( e.key ) ) keys[ e.key ] = false;
} );

canvas.addEventListener( 'click', startGame );

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
  }
  render();
  requestAnimationFrame( gameLoop );
}

loadSpritesheet( () => {
  requestAnimationFrame( gameLoop );
} );
