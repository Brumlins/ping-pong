const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname + '/public'));

let rooms = {};
let roomCodes = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7);
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('createRoom', () => {
    let roomCode = generateRoomCode();
    rooms[roomCode] = [socket.id];
    roomCodes[socket.id] = roomCode;
    socket.join(roomCode);
    socket.emit('roomCreated', { room: roomCode });
  });

  socket.on('joinRoom', (data) => {
    let roomCode = data.room;
    if (rooms[roomCode] && rooms[roomCode].length === 1) {
      rooms[roomCode].push(socket.id);
      roomCodes[socket.id] = roomCode;
      socket.join(roomCode);
      io.to(roomCode).emit('startGame');
    } else {
      socket.emit('roomError', { message: 'Room not found or full' });
    }
  });

  socket.on('move', (data) => {
    let roomCode = roomCodes[socket.id];
    if (roomCode) {
      socket.to(roomCode).emit('opponentMove', data);
    }
  });

  socket.on('disconnect', () => {
    let roomCode = roomCodes[socket.id];
    if (roomCode) {
      let room = rooms[roomCode];
      if (room) {
        room = room.filter(id => id !== socket.id);
        if (room.length === 0) {
          delete rooms[roomCode];
        } else {
          rooms[roomCode] = room;
          io.to(roomCode).emit('playerDisconnected');
        }
      }
      delete roomCodes[socket.id];
    }
    console.log('A user disconnected:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Listening on port 3000');
});
