const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

let paddleWidth = 10, paddleHeight = 100;
let playerPaddle = { x: 10, y: canvas.height / 2 - paddleHeight / 2 };
let opponentPaddle = { x: canvas.width - paddleWidth - 10, y: canvas.height / 2 - paddleHeight / 2 };
let ball = { x: canvas.width / 2, y: canvas.height / 2, radius: 10, speedX: 5, speedY: 5 };
let playerScore = 0;
let opponentScore = 0;

const socket = io();

let isWaitingForPlayer = true;
let playerIndex = -1;

function drawRect(x, y, w, h, color) {
  context.fillStyle = color;
  context.fillRect(x, y, w, h);
}

function drawCircle(x, y, r, color) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2, false);
  context.closePath();
  context.fill();
}

function drawText(text, x, y, color) {
  context.fillStyle = color;
  context.font = '30px Arial';
  context.fillText(text, x, y);
}

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  if (isWaitingForPlayer) {
    context.fillStyle = 'black';
    context.font = '30px Arial';
    context.fillText('Waiting for other player', canvas.width / 2 - 150, canvas.height / 2);
  } else {
    // Determine paddle positions based on player index
    if (playerIndex === 0) {
      drawRect(playerPaddle.x, playerPaddle.y, paddleWidth, paddleHeight, 'blue');
      drawRect(opponentPaddle.x, opponentPaddle.y, paddleWidth, paddleHeight, 'red');
    } else if (playerIndex === 1) {
      drawRect(opponentPaddle.x, opponentPaddle.y, paddleWidth, paddleHeight, 'blue');
      drawRect(playerPaddle.x, playerPaddle.y, paddleWidth, paddleHeight, 'red');
    }
    drawCircle(ball.x, ball.y, ball.radius, 'green');
    drawText(`Player: ${playerScore}`, 50, 50, 'blue');
    drawText(`Opponent: ${opponentScore}`, canvas.width - 200, 50, 'red');
  }
}

function update() {
  // Update logic is handled by the server
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener('mousemove', event => {
  let rect = canvas.getBoundingClientRect();
  let root = document.documentElement;
  let mouseY = event.clientY - rect.top - root.scrollTop;
  playerPaddle.y = mouseY - paddleHeight / 2;

  // Emit move event with playerIndex
  socket.emit('move', { y: playerPaddle.y, playerIndex });
});

socket.on('opponentMove', data => {
  if (data.playerIndex !== playerIndex) {
    opponentPaddle.y = data.y;
  }
});

socket.on('ballUpdate', data => {
  ball.x = data.x;
  ball.y = data.y;
});

socket.on('scoreUpdate', data => {
  playerScore = data[playerIndex];
  opponentScore = data[1 - playerIndex];
});

socket.on('roomJoined', data => {
  console.log(`Joined room: ${data.room}`);
  playerIndex = data.playerIndex;
});

socket.on('startGame', () => {
  isWaitingForPlayer = false;
});

socket.on('waitingForPlayer', () => {
  isWaitingForPlayer = true;
});

socket.on('playerDisconnected', () => {
  console.log('Opponent disconnected');
  isWaitingForPlayer = true;
  // Additional logic to handle the disconnection
});

gameLoop();
