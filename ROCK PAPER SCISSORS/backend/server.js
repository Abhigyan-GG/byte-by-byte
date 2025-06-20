const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { nanoid } = require('nanoid');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const rooms = new Map();
const ROUND_DURATION = 10000; // 10 seconds

function createRoomCode() {
  return nanoid(6).toUpperCase();
}

function getRoundWinner(choice1, choice2) {
  if (choice1 === choice2) return 'tie';
  if (
    (choice1 === 'rock' && choice2 === 'scissors') ||
    (choice1 === 'paper' && choice2 === 'rock') ||
    (choice1 === 'scissors' && choice2 === 'paper')
  ) {
    return 'player1';
  }
  return 'player2';
}

function getRandomChoice() {
  const choices = ['rock', 'paper', 'scissors'];
  return choices[Math.floor(Math.random() * choices.length)];
}

function startRoundTimer(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  if (room.roundTimer) clearTimeout(room.roundTimer);

  room.roundTimer = setTimeout(() => {
    const [player1, player2] = room.players;

    if (!player1.choice) player1.choice = getRandomChoice();
    if (!player2.choice) player2.choice = getRandomChoice();

    console.log(`⏰ Time's up for room ${roomCode}. Auto-choices: ${player1.choice}, ${player2.choice}`);
    processRound(roomCode);
  }, ROUND_DURATION);
}

function processRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }

  const [player1, player2] = room.players;
  if (!player1.choice || !player2.choice) return;

  const resultKey = getRoundWinner(player1.choice, player2.choice);
  if (resultKey === 'player1') player1.score += 1;
  else if (resultKey === 'player2') player2.score += 1;

  room.round += 1;
  room.currentRound = room.round;

  const roundResult = {
    round: room.round,
    result: resultKey,
    playerChoices: {
      [player1.id]: player1.choice,
      [player2.id]: player2.choice,
    },
    players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
  };

  io.to(roomCode).emit('roundResult', roundResult);
  io.to(roomCode).emit('roomUpdated', room);

  player1.choice = null;
  player2.choice = null;

  if (room.round >= room.maxRounds) {
    let winner = null;
    if (player1.score > player2.score) winner = player1;
    else if (player2.score > player1.score) winner = player2;

    const finalScores = {
      [player1.id]: player1.score,
      [player2.id]: player2.score,
    };

    io.to(roomCode).emit('gameFinished', { winner, finalScores });
    console.log(`🏁 Game finished in ${roomCode}. Winner: ${winner ? winner.name : 'Tie'}`);
  } else {
    setTimeout(() => {
      startRoundTimer(roomCode);
      io.to(roomCode).emit('roundStarted', {
        startTime: Date.now(),
        duration: ROUND_DURATION
      });
      console.log(`➡️ Starting next round in room ${roomCode}`);
    }, 1000); // brief delay before next round
  }
}

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  socket.on('createRoom', (playerName) => {
    const roomCode = createRoomCode();
    const player = { id: socket.id, name: playerName, score: 0, choice: null };
    const room = {
      id: roomCode,
      players: [player],
      round: 0,
      currentRound: 0,
      maxRounds: 5,
      roundTimer: null,
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, player });
    console.log(`📦 Room created: ${roomCode}`);
  });

  socket.on('joinRoom', (roomCode, playerName) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('roomError', 'Room not found');
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('error', 'Room is full');
      return;
    }

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
    console.log(`👥 ${playerName} joined room ${roomCode}`);

    setTimeout(() => {
      startRoundTimer(roomCode);
      io.to(roomCode).emit('roundStarted', {
        startTime: Date.now(),
        duration: ROUND_DURATION
      });
    }, 2000);
  });

  socket.on('makeChoice', (roomCode, choice) => {
    const room = rooms.get(roomCode);
    if (!room || !['rock', 'paper', 'scissors'].includes(choice)) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.choice) return;

    player.choice = choice;
    socket.to(roomCode).emit('playerMadeChoice', { playerName: player.name });

    const [player1, player2] = room.players;
    if (player1.choice && player2.choice) {
      console.log(`⚔️ Both choices made in room ${roomCode}`);
      processRound(roomCode);
    }
  });

  socket.on('startNewGame', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    if (room.roundTimer) {
      clearTimeout(room.roundTimer);
      room.roundTimer = null;
    }

    room.round = 0;
    room.currentRound = 0;
    room.players.forEach(p => {
      p.score = 0;
      p.choice = null;
    });

    io.to(roomCode).emit('roomUpdated', room);
    console.log(`🔄 New game in room ${roomCode}`);

    setTimeout(() => {
      startRoundTimer(roomCode);
      io.to(roomCode).emit('roundStarted', {
        startTime: Date.now(),
        duration: ROUND_DURATION
      });
    }, 1000);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);

    for (const [roomCode, room] of rooms) {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        const [removed] = room.players.splice(idx, 1);

        if (room.roundTimer) {
          clearTimeout(room.roundTimer);
          room.roundTimer = null;
        }

        socket.to(roomCode).emit('playerDisconnected', { playerName: removed.name });
        console.log(`👤 Removed player ${removed.name} from room ${roomCode}`);

        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`🗑️ Deleted empty room ${roomCode}`);
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
