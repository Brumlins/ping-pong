const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let rooms = {};
let roomCodes = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('createRoom', () => {
    let roomCode = uuidv4().slice(0, 6);
    rooms[roomCode] = [socket.id];
    roomCodes[socket.id] = roomCode;
    socket.join(roomCode);
    socket.emit('waitingForPlayer', { room: roomCode });
  });

  socket.on('joinRoom', (data) => {
    let roomCode = data.roomCode;
    if (rooms[roomCode] && rooms[roomCode].length === 1) {
      rooms[roomCode].push(socket.id);
      roomCodes[socket.id] = roomCode;
      socket.join(roomCode);
      io.to(roomCode).emit('startGame');
      io.to(roomCode).emit('opponentName', { name: 'Opponent' });
    } else {
      socket.emit('roomError', { message: 'Room not found or full' });
    }
  });

  socket.on('opponentName', (data) => {
    let roomCode = roomCodes[socket.id];
    if (roomCode) {
      socket.to(roomCode).emit('opponentName', data);
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
