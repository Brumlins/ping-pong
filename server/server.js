const express = require('express'); // importuje express
const http = require('http'); // importuje http
const socketIo = require('socket.io'); // importuje socket.io

const app = express(); // vytvori aplikaci express
const server = http.createServer(app); // vytvori server pomoci http
const io = socketIo(server); // vytvori socket.io server

app.use(express.static('public')); // slouzi staticke soubory z adresare 'public'

let rooms = {}; // objekt pro ulozeni mistnosti

// funkce pro nalezeni volne mistnosti
function findAvailableRoom() {
  for (let room in rooms) {
    if (rooms[room].players.length < 2) { // pokud ma mistnost mene nez 2 hrace
      return room; // vrati tuto mistnost
    }
  }
  // vytvori novou mistnost, pokud zadna neni volna
  const newRoom = `room-${Object.keys(rooms).length + 1}`;
  rooms[newRoom] = { players: [], ball: { x: 400, y: 300, radius: 10, speedX: 5, speedY: 5 }, score: [0, 0], paddles: [{ y: 250 }, { y: 250 }] };
  return newRoom; // vrati novou mistnost
}

// funkce pro aktualizaci pozice micku
function updateBallPosition(ball, paddles, score, room) {
  ball.x += ball.speedX; // posune micek v ose x
  ball.y += ball.speedY; // posune micek v ose y

  if (ball.y + ball.radius > 600 || ball.y - ball.radius < 0) { // pokud micek narazi na horni nebo dolni hranu
    ball.speedY = -ball.speedY; // zmeni smer v ose y
  }

  // pokud micek narazi na levou paddle
  if (ball.x - ball.radius < 20 && ball.y > paddles[0].y && ball.y < paddles[0].y + 100) {
    ball.speedX = -ball.speedX; // zmeni smer v ose x
  }

  // pokud micek narazi na pravou paddle
  if (ball.x + ball.radius > 780 && ball.y > paddles[1].y && ball.y < paddles[1].y + 100) {
    ball.speedX = -ball.speedX; // zmeni smer v ose x
  }

  // pokud micek projde levou hranou
  if (ball.x - ball.radius < 0) {
    score[1]++; // pridat bod pro souper
    resetBall(ball); // resetovat pozici micku
    io.to(room).emit('scoreUpdate', score); // odeslat aktualizaci skore
  }

  // pokud micek projde pravou hranou
  if (ball.x + ball.radius > 800) {
    score[0]++; // pridat bod pro hrace
    resetBall(ball); // resetovat pozici micku
    io.to(room).emit('scoreUpdate', score); // odeslat aktualizaci skore
  }
}

// funkce pro resetovani micku
function resetBall(ball) {
  ball.x = 400; // nastavit pozici x
  ball.y = 300; // nastavit pozici y
  ball.speedX = -ball.speedX; // zmenit smer v ose x
  ball.speedY = 5; // nastavit rychlost v ose y
}

// pri pripojeni noveho hrace
io.on('connection', socket => {
  console.log('New player connected:', socket.id);

  const room = findAvailableRoom(); // najde volnou mistnost
  socket.join(room); // pripoji hrace do mistnosti
  rooms[room].players.push(socket.id); // prida hrace do seznamu hracu mistnosti

  console.log(`Player ${socket.id} joined ${room}`);

  const playerIndex = rooms[room].players.indexOf(socket.id); // ziska index hrace
  socket.emit('roomJoined', { room, playerIndex }); // odesle informaci o pripojeni do mistnosti

  // pokud jsou v mistnosti dva hraci
  if (rooms[room].players.length === 2) {
    io.to(room).emit('startGame'); // zahaji hru

    // pokud neni nastaven interval
    if (!rooms[room].intervalId) {
      rooms[room].intervalId = setInterval(() => {
        updateBallPosition(rooms[room].ball, rooms[room].paddles, rooms[room].score, room); // aktualizuje pozici micku
        io.to(room).emit('ballUpdate', rooms[room].ball); // odesle aktualizaci pozice micku
      }, 1000 / 60); // aktualizace kazdych 1/60 sekundy
    }
  } else {
    socket.emit('waitingForPlayer'); // ceka na druheho hrace
  }

  // pri pohybu paddle
  socket.on('move', data => {
    rooms[room].paddles[data.playerIndex].y = data.y; // aktualizuje pozici paddle
    socket.to(room).emit('opponentMove', data); // odesle aktualizaci souperovi
  });

  // pri odpojeni hrace
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    rooms[room].players = rooms[room].players.filter(id => id !== socket.id); // odstrani hrace ze seznamu
    socket.to(room).emit('playerDisconnected'); // informuje soupere

    // pokud je mistnost prazdna
    if (rooms[room].players.length === 0) {
      clearInterval(rooms[room].intervalId); // zastavi interval
      delete rooms[room]; // odstrani mistnost
    }
  });
});

// server nasloucha na portu 3000
server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
