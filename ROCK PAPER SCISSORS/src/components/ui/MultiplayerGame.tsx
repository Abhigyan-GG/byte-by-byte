import React, { useState, useEffect } from 'react';
import { socketService } from '../../utils/socketService';
import type { GameRoom, MultiplayerPlayer as Player, RoundResult } from '../../types';

const MultiplayerGame: React.FC = () => {
  const [gameState, setGameState] = useState<'menu' | 'waiting' | 'playing' | 'finished'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [opponent, setOpponent] = useState<Player | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [playerChoice, setPlayerChoice] = useState<string | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<string | null>(null);

  useEffect(() => {
    const connectSocket = async () => {
      try {
        await socketService.connect();
        setIsConnected(true);
        setupSocketListeners();
      } catch (error) {
        setMessage('Failed to connect to server');
      }
    };

    connectSocket();

    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, []);

  const setupSocketListeners = () => {
    socketService.onRoomCreated(({ roomCode, player }) => {
      setRoomCode(roomCode);
      setCurrentPlayer(player);
      setGameState('waiting');
      setMessage(`Room created! Share code: ${roomCode}`);
    });

    socketService.onPlayerJoined(({ room, newPlayer }) => {
      setCurrentRoom(room);
      const socketId = socketService.socketInstance?.id;
      if (!socketId) return;

      const joinedPlayer = room.players.find(p => p.id === socketId);
      const otherPlayer = room.players.find(p => p.id !== socketId);

      if (joinedPlayer) setCurrentPlayer(joinedPlayer);
      if (otherPlayer) setOpponent(otherPlayer);

      setCurrentRoom(room);
      setGameState('playing');
      setMessage(`${newPlayer.name} joined the game!`);
    });

    socketService.onPlayerMadeChoice(({ playerName }) => {
      setMessage(`${playerName} made their choice...`);
    });

    socketService.onRoundResult((result) => {
      setRoundResult(result);
      setPlayerChoice(null);
      setOpponentChoice(null);

      let resultMessage = '';
      if (result.result === 'tie') {
        resultMessage = "It's a tie!";
      } else {
        const winnerName = result.result === 'player1' ? result.players[0].name : result.players[1].name;
        resultMessage = `${winnerName} wins this round!`;
      }
      setMessage(resultMessage);

      const updatedCurrentPlayer = result.players.find(p => p.id === currentPlayer?.id);
      const updatedOpponent = result.players.find(p => p.id === opponent?.id);

      if (updatedCurrentPlayer) setCurrentPlayer(updatedCurrentPlayer);
      if (updatedOpponent) setOpponent(updatedOpponent);

      setTimeout(() => {
        setRoundResult(null);
        if (result.round < currentRoom?.maxRounds!) {
          setMessage('Choose your next move!');
        }
      }, 3000);
    });

    socketService.onGameFinished(({ winner, finalScores }) => {
      setGameState('finished');
      if (winner) {
        setMessage(`🎉 ${winner.name} wins the game!`);
      } else {
        setMessage("It's a tie game!");
      }
    });

    socketService.onPlayerDisconnected(({ playerName }) => {
      setMessage(`${playerName} disconnected`);
      setGameState('waiting');
      setOpponent(null);
    });

    socketService.onError((error) => {
      setMessage(`Error: ${error}`);
    });
  };

  const createRoom = () => {
    if (playerName.trim()) {
      socketService.createRoom(playerName.trim());
    }
  };

  const joinRoom = () => {
    if (playerName.trim() && roomCode.trim()) {
      socketService.joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    }
  };

  const makeChoice = (choice: string) => {
    if (currentRoom && gameState === 'playing') {
      setPlayerChoice(choice);
      socketService.makeChoice(currentRoom.id, choice);
      setMessage('Waiting for opponent...');
    }
  };

  const startNewGame = () => {
    if (currentRoom) {
      socketService.startNewGame(currentRoom.id);
      setGameState('playing');
      setMessage('New game started!');
      setRoundResult(null);
    }
  };

  const resetToMenu = () => {
    setGameState('menu');
    setCurrentRoom(null);
    setCurrentPlayer(null);
    setOpponent(null);
    setRoundResult(null);
    setRoomCode('');
    setMessage('');
    setPlayerChoice(null);
    setOpponentChoice(null);
  };

  const getChoiceEmoji = (choice: string) => {
    switch (choice) {
      case 'rock': return '🪨';
      case 'paper': return '📄';
      case 'scissors': return '✂️';
      default: return '❓';
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Connecting to server...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          🪨📄✂️ Multiplayer Rock Paper Scissors
        </h1>

        {/* You can restore previous UI here */}
      </div>
    </div>
  );
};

export default MultiplayerGame;
