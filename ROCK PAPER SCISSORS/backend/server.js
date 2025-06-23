
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { nanoid } = require('nanoid');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const ROUND_DURATION = 10000;
const MAX_PLAYERS = 2;
const MAX_ROUNDS = 5;

const rooms = new Map();

const beatsMap = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper'
};

function createRoomCode() {
  return nanoid(6).toUpperCase();
}

function getRandomChoice() {
  const options = ['rock', 'paper', 'scissors'];
  return options[Math.floor(Math.random() * options.length)];
}

function getRoundWinner(choice1, choice2) {
  if (choice1 === choice2) return 'tie';
  return beatsMap[choice1] === choice2 ? 'player1' : 'player2';
}

function startRoundTimer(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  clearTimeout(room.roundTimer);
  room.roundResolved = false;

  room.roundTimer = setTimeout(() => {
    const [p1, p2] = room.players;

    if (!p1.choice) p1.choice = getRandomChoice();
    if (!p2.choice) p2.choice = getRandomChoice();

    if (!room.roundResolved && p1.choice && p2.choice) {
      console.log(`\u23F0 Auto choices for room ${roomCode}: ${p1.choice}, ${p2.choice}`);
      processRound(roomCode);
    }
  }, ROUND_DURATION);
}

function processRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.roundResolved) return;

  clearTimeout(room.roundTimer);
  room.roundTimer = null;
  room.roundResolved = true;

  const [p1, p2] = room.players;
  if (!p1.choice || !p2.choice) return;

  const winnerKey = getRoundWinner(p1.choice, p2.choice);
  if (winnerKey === 'player1') p1.score += 1;
  else if (winnerKey === 'player2') p2.score += 1;

  room.round += 1;
  room.currentRound = room.round;

  const resultPayload = {
    round: room.round,
    result: winnerKey,
    playerChoices: {
      [p1.id]: p1.choice,
      [p2.id]: p2.choice
    },
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score
    }))
  };

  io.to(roomCode).emit('roundResult', resultPayload);
  io.to(roomCode).emit('roomUpdated', room);

  p1.choice = null;
  p2.choice = null;

  if (room.round >= room.maxRounds) {
    let winner = null;
    if (p1.score > p2.score) winner = p1;
    else if (p2.score > p1.score) winner = p2;

    io.to(roomCode).emit('gameFinished', {
      winner,
      finalScores: {
        [p1.id]: p1.score,
        [p2.id]: p2.score
      }
    });
    console.log(`\uD83C\uDFC1 Game finished in ${roomCode}. Winner: ${winner ? winner.name : 'Tie'}`);
  } else {
    setTimeout(() => {
      io.to(roomCode).emit('roundStarted', {
        startTime: Date.now(),
        duration: ROUND_DURATION
      });
      startRoundTimer(roomCode);
      console.log(`\u25B6\uFE0F Round ${room.round + 1} started in room ${roomCode}`);
    }, 1000);
  }
}

io.on('connection', socket => {
  console.log(`\uD83D\uDD0C Connected: ${socket.id}`);

  socket.on('createRoom', playerName => {
    const roomCode = createRoomCode();
    const player = { id: socket.id, name: playerName, score: 0, choice: null };
    const room = {
      id: roomCode,
      players: [player],
      round: 0,
      currentRound: 0,
      maxRounds: MAX_ROUNDS,
      roundTimer: null,
      roundResolved: false
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, player });
    console.log(`\uD83D\uDCE6 Room created: ${roomCode}`);
  });

  socket.on('joinRoom', (roomCode, playerName) => {
    const room = rooms.get(roomCode);
    if (!room) return socket.emit('roomError', 'Room not found');
    if (room.players.length >= MAX_PLAYERS) return socket.emit('error', 'Room is full');

    const newPlayer = { id: socket.id, name: playerName, score: 0, choice: null };
    room.players.push(newPlayer);
    room.round = 0;
    room.currentRound = 0;
    room.players.forEach(p => {
      p.choice = null;
      p.score = 0;
    });

    socket.join(roomCode);
    io.to(roomCode).emit('playerJoined', { room, newPlayer });
    console.log(`\uD83D\uDC65 ${playerName} joined room ${roomCode}`);

    setTimeout(() => {
      io.to(roomCode).emit('roundStarted', {
        startTime: Date.now(),
        duration: ROUND_DURATION
      });
      startRoundTimer(roomCode);
    }, 2000);
  });

  socket.on('makeChoice', (roomCode, choice) => {
    const room = rooms.get(roomCode);
    if (!room || !['rock', 'paper', 'scissors'].includes(choice)) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.choice) return;

    player.choice = choice;
    socket.to(roomCode).emit('playerMadeChoice', { playerName: player.name });

    const [p1, p2] = room.players;
    if (p1.choice && p2.choice && !room.roundResolved) {
      console.log(`\u2694\uFE0F Both choices made in ${roomCode}`);
      processRound(roomCode);
    }
  });

  socket.on('startNewGame', roomCode => {
    const room = rooms.get(roomCode);
    if (!room) return;

    clearTimeout(room.roundTimer);
    room.round = 0;
    room.currentRound = 0;
    room.roundResolved = false;
    room.players.forEach(p => {
      p.score = 0;
      p.choice = null;
    });

    io.to(roomCode).emit('roomUpdated', room);
    console.log(`\uD83D\uDD01 New game started in ${roomCode}`);

    setTimeout(() => {
      io.to(roomCode).emit('roundStarted', {
        startTime: Date.now(),
        duration: ROUND_DURATION
      });
      startRoundTimer(roomCode);
    }, 1000);
  });

  socket.on('disconnect', () => {
    console.log(`\u274C Disconnected: ${socket.id}`);

    for (const [roomCode, room] of rooms.entries()) {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        const [leftPlayer] = room.players.splice(idx, 1);
        clearTimeout(room.roundTimer);
        room.roundTimer = null;

        socket.to(roomCode).emit('playerDisconnected', { playerName: leftPlayer.name });
        console.log(`\uD83D\uDC64 Removed ${leftPlayer.name} from room ${roomCode}`);

        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`\uD83D\uDDD1️ Room ${roomCode} deleted (empty)`);
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\uD83D\uDE80 Server running on port ${PORT}`);
});
