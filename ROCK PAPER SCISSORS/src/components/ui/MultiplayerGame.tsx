import React, { useState, useEffect, useRef } from 'react';
import { socketService } from '../../utils/socketService';
import type { GameRoom, MultiplayerPlayer as Player, RoundResult } from '../../types';
import RoundTimer from './RoundTimer.tsx';

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
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
  const [bothPlayersReady, setBothPlayersReady] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ROUND_DURATION = 30000; // 30 seconds in milliseconds

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
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (roundStartTime && gameState === 'playing' && !roundResult) {
      timerRef.current = setTimeout(() => {
        if (!playerChoice && currentRoom) {
          const randomChoice = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
          setPlayerChoice(randomChoice);
          socketService.makeChoice(currentRoom.id, randomChoice);
          setMessage('Time up! Random choice submitted...');
        }
      }, ROUND_DURATION);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [roundStartTime, gameState, roundResult, playerChoice, currentRoom]);

  useEffect(() => {
    if (bothPlayersReady && playerChoice && opponentChoice && currentRoom && !roundResult) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setMessage('Both players ready! Revealing results...');
    }
  }, [bothPlayersReady, playerChoice, opponentChoice, currentRoom, roundResult]);

  const startNewRound = () => {
    setRoundStartTime(Date.now());
    setPlayerChoice(null);
    setOpponentChoice(null);
    setBothPlayersReady(false);
    setMessage('Make your choice! You have 30 seconds...');
  };

  const setupSocketListeners = () => {
    socketService.onRoomCreated(({ roomCode, player }) => {
      setRoomCode(roomCode);
      setCurrentPlayer(player);
      setGameState('waiting');
      setMessage(`Room created! Share code: ${roomCode}`);
    });

    socketService.onRoomUpdated((updatedRoom) => {
      setCurrentRoom(updatedRoom);
    });

    socketService.onPlayerJoined(({ room, newPlayer }) => {
      setCurrentRoom(room);
      const socketId = socketService.socketInstance?.id;
      if (!socketId) return;

      const joinedPlayer = room.players.find(p => p.id === socketId);
      const otherPlayer = room.players.find(p => p.id !== socketId);

      if (joinedPlayer) setCurrentPlayer(joinedPlayer);
      if (otherPlayer) setOpponent(otherPlayer);

      setGameState('playing');
      setMessage(`${newPlayer.name} joined the game!`);
    });

    socketService.onRoundStarted(() => {
      startNewRound();
    });

    socketService.onPlayerMadeChoice(({ playerName }) => {
      setMessage(`${playerName} made their choice...`);

      const socketId = socketService.socketInstance?.id;
      if (socketId && currentPlayer && opponent) {
        if (playerName === opponent.name) {
          setOpponentChoice('made');
        }
        if (playerChoice && playerName === opponent.name) {
          setBothPlayersReady(true);
        }
      }
    });

    socketService.onRoundResult((result) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setRoundResult(result);
      setPlayerChoice(null);
      setOpponentChoice(null);
      setBothPlayersReady(false);
      setRoundStartTime(null);

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
          startNewRound();
        }
      }, 3000);
    });

    socketService.onGameFinished(({ winner, finalScores }) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setGameState('finished');
      if (winner) {
        setMessage(`🎉 ${winner.name} wins the game!`);
      } else {
        setMessage("It's a tie game!");
      }
    });

    socketService.onPlayerDisconnected(({ playerName }) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
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
    const trimmedCode = roomCode.trim().toUpperCase();
    const trimmedName = playerName.trim();
    if (trimmedName && trimmedCode) {
      socketService.joinRoom(trimmedCode, trimmedName);
    }
  };

  const makeChoice = (choice: string) => {
    if (currentRoom && gameState === 'playing' && !playerChoice) {
      setPlayerChoice(choice);
      socketService.makeChoice(currentRoom.id, choice);

      if (opponentChoice) {
        setBothPlayersReady(true);
      } else {
        setMessage('Waiting for opponent...');
      }
    }
  };

  const startNewGame = () => {
    if (currentRoom) {
      socketService.startNewGame(currentRoom.id);
      setGameState('playing');
      setMessage('New game started!');
      setRoundResult(null);
      setTimeout(() => {
        startNewRound();
      }, 1000);
    }
  };

  const resetToMenu = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setGameState('menu');
    setCurrentRoom(null);
    setCurrentPlayer(null);
    setOpponent(null);
    setRoundResult(null);
    setRoomCode('');
    setMessage('');
    setPlayerChoice(null);
    setOpponentChoice(null);
    setRoundStartTime(null);
    setBothPlayersReady(false);
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

        {/* Your existing game UI remains unchanged */}
      </div>
    </div>
  );
};

export default MultiplayerGame;
