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
  }
}

function startGame() {
  if ( game.status !== 'START' ) return;
  game.status = 'PLAYING';
  render();
}

window.addEventListener( 'keydown', startGame );
canvas.addEventListener( 'click', startGame );

loadSpritesheet( () => {
  render();
} );
