const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store game rooms
const gameRooms = new Map();

// Generate random room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Game logic
function determineWinner(choice1, choice2) {
  if (choice1 === choice2) return 'tie';
  
  const winConditions = {
    rock: 'scissors',
    paper: 'rock',
    scissors: 'paper'
  };
  
  return winConditions[choice1] === choice2 ? 'player1' : 'player2';
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('createRoom', (playerName) => {
    const roomCode = generateRoomCode();
    const room = {
      id: roomCode,
      players: [{
        id: socket.id,
        name: playerName,
        choice: null,
        score: 0
      }],
      gameState: 'waiting', // waiting, playing, finished
      round: 0,
      maxRounds: 5
    };
    
    gameRooms.set(roomCode, room);
    socket.join(roomCode);
    
    socket.emit('roomCreated', {
      roomCode,
      player: room.players[0]
    });
    
    console.log(`Room ${roomCode} created by ${playerName}`);
  });

  // Join existing room
  socket.on('joinRoom', (data) => {
    const { roomCode, playerName } = data;
    const room = gameRooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    
    if (room.players.length >= 2) {
      socket.emit('error', 'Room is full');
      return;
    }
    
    const newPlayer = {
      id: socket.id,
      name: playerName,
      choice: null,
      score: 0
    };
    
    room.players.push(newPlayer);
    room.gameState = 'playing';
    socket.join(roomCode);
    
    // Notify all players in the room
    io.to(roomCode).emit('playerJoined', {
      room,
      newPlayer
    });
    
    console.log(`${playerName} joined room ${roomCode}`);
  });

  // Player makes a choice
  socket.on('makeChoice', (data) => {
    const { roomCode, choice } = data;
    const room = gameRooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    
    // Find and update player's choice
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.choice = choice;
      
      // Check if both players have made their choices
      const allChoicesMade = room.players.every(p => p.choice !== null);
      
      if (allChoicesMade && room.players.length === 2) {
        // Determine winner
        const result = determineWinner(room.players[0].choice, room.players[1].choice);
        
        // Update scores
        if (result === 'player1') {
          room.players[0].score++;
        } else if (result === 'player2') {
          room.players[1].score++;
        }
        
        room.round++;
        
        // Send results to all players
        io.to(roomCode).emit('roundResult', {
          result,
          players: room.players,
          round: room.round,
          choices: {
            [room.players[0].name]: room.players[0].choice,
            [room.players[1].name]: room.players[1].choice
          }
        });
        
        // Check if game is finished
        if (room.round >= room.maxRounds) {
          const winner = room.players[0].score > room.players[1].score ? 
            room.players[0] : 
            room.players[0].score < room.players[1].score ? 
            room.players[1] : null;
          
          room.gameState = 'finished';
          io.to(roomCode).emit('gameFinished', { winner, finalScores: room.players });
        } else {
          // Reset choices for next round
          room.players.forEach(p => p.choice = null);
        }
      } else {
        // Notify room that player made a choice
        socket.to(roomCode).emit('playerMadeChoice', {
          playerName: player.name
        });
      }
    }
  });

  // Start new game
  socket.on('newGame', (roomCode) => {
    const room = gameRooms.get(roomCode);
    if (room) {
      room.players.forEach(p => {
        p.choice = null;
        p.score = 0;
      });
      room.round = 0;
      room.gameState = 'playing';
      
      io.to(roomCode).emit('gameReset', room);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find and remove player from any room
    for (let [roomCode, room] of gameRooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const disconnectedPlayer = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        
        if (room.players.length === 0) {
          // Delete empty room
          gameRooms.delete(roomCode);
        } else {
          // Notify remaining players
          socket.to(roomCode).emit('playerDisconnected', {
            playerName: disconnectedPlayer.name,
            room
          });
          room.gameState = 'waiting';
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});