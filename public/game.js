const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

// nastaveni sirky a vysky padu a jejich pocatecni pozice
let paddleWidth = 10, paddleHeight = 100;
let playerPaddle = { x: 10, y: canvas.height / 2 - paddleHeight / 2 };
let opponentPaddle = { x: canvas.width - paddleWidth - 10, y: canvas.height / 2 - paddleHeight / 2 };

// nastaveni pocatecni pozice a rychlosti micku
let ball = { x: canvas.width / 2, y: canvas.height / 2, radius: 10, speedX: 5, speedY: 5 };

// nastaveni pocatecnich skore hracu
let playerScore = 0;
let opponentScore = 0;

const socket = io();

// stav hry a informace o hraci
let isWaitingForPlayer = true;
let playerIndex = -1;
let playerName = localStorage.getItem('playerName') || 'You';
let opponentName = 'Opponent';

// funkce pro vykresleni obdelniku
function drawRect(x, y, w, h, color) {
  context.fillStyle = color;
  context.fillRect(x, y, w, h);
}

// funkce pro vykresleni kruhu
function drawCircle(x, y, r, color) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2, false);
  context.closePath();
  context.fill();
}

// funkce pro vykresleni textu
function drawText(text, x, y, color, size = '30px') {
  context.fillStyle = color;
  context.font = size + ' Arial';
  context.fillText(text, x, y);
}

// funkce pro vykresleni hry
function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (isWaitingForPlayer) {
    context.fillStyle = 'black';
    context.font = '30px Arial';
    context.fillText('Waiting for other player', canvas.width / 2 - 150, canvas.height / 2);
  } else {
    if (playerIndex === 0) {
      drawRect(playerPaddle.x, playerPaddle.y, paddleWidth, paddleHeight, 'blue');
      drawRect(opponentPaddle.x, opponentPaddle.y, paddleWidth, paddleHeight, 'red');
      drawText(`${playerName}: ${playerScore}`, 50, 50, 'blue');
      drawText(`${opponentName}: ${opponentScore}`, canvas.width - 200, 50, 'red');
    } else if (playerIndex === 1) {
      drawRect(opponentPaddle.x, opponentPaddle.y, paddleWidth, paddleHeight, 'blue');
      drawRect(playerPaddle.x, playerPaddle.y, paddleWidth, paddleHeight, 'red');
      drawText(`${opponentName}: ${opponentScore}`, 50, 50, 'red');
      drawText(`${playerName}: ${playerScore}`, canvas.width - 200, 50, 'blue');
    }
    drawCircle(ball.x, ball.y, ball.radius, 'green');
  }
}

// funkce pro aktualizaci herni logiky, rizena serverem
function update() {}

// hlavni herni smycka
function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// udalost pro pohyb mysi, aktualizuje pozici padu a odesle na server
canvas.addEventListener('mousemove', event => {
  let rect = canvas.getBoundingClientRect();
  let root = document.documentElement;
  let mouseY = event.clientY - rect.top - root.scrollTop;

  if (playerIndex === 0) {
    playerPaddle.y = mouseY - paddleHeight / 2;
    socket.emit('move', { y: playerPaddle.y, playerIndex });
  } else if (playerIndex === 1) {
    opponentPaddle.y = mouseY - paddleHeight / 2;
    socket.emit('move', { y: opponentPaddle.y, playerIndex });
  }
});

// udalost pro prijeti pohybu soupere
socket.on('opponentMove', data => {
  if (data.playerIndex !== playerIndex) {
    if (playerIndex === 0) {
      opponentPaddle.y = data.y;
    } else if (playerIndex === 1) {
      playerPaddle.y = data.y;
    }
  }
});

// udalost pro aktualizaci pozice micku
socket.on('ballUpdate', data => {
  ball.x = data.x;
  ball.y = data.y;
});

// udalost pro aktualizaci skore
socket.on('scoreUpdate', data => {
  playerScore = data[playerIndex];
  opponentScore = data[1 - playerIndex];
  render(); // vykresleni zmeny skore
});

// udalost pro pripojeni do mistnosti
socket.on('roomJoined', data => {
  console.log(`Joined room: ${data.room}`);
  playerIndex = data.playerIndex;
  if (playerIndex === 1) {
    socket.emit('opponentName', { name: playerName });
  }
});

// udalost pro prijeti jmena soupere
socket.on('opponentName', data => {
  opponentName = data.name;
  displayPlayerNames(); // aktualizace zobrazeni jmen hracu
});

// udalost pro zacatek hry
socket.on('startGame', () => {
  isWaitingForPlayer = false;
});

// udalost pro cekani na hrace
socket.on('waitingForPlayer', data => {
  isWaitingForPlayer = true;
  const partyCodeDisplay = document.getElementById('partyCodeDisplay');
  if (data.room) {
    partyCodeDisplay.innerText = `Party Code: ${data.room}`;
    partyCodeDisplay.style.display = 'block';
  }
});

// udalost pro odpojeni hrace
socket.on('playerDisconnected', () => {
  console.log('Opponent disconnected');
  window.location.href = '/'; // presmerovani na domovskou stranku po odpojeni
});

// funkce pro ziskani jmen hracu, zatim nevyuzita
function getPlayerNames() {}

// funkce pro zobrazeni jmen hracu, zatim neimplementovana
function displayPlayerNames() {
  const playerNamesDiv = document.getElementById('playerNames');
}

// spusteni herni smycky
gameLoop();
