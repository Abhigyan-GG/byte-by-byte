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

    socketService.onGameFinished(({ winner }) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4 text-white flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-center mb-6">🪨📄✂️ Rock Paper Scissors - Multiplayer</h1>

        {gameState === 'menu' && (
          <div className="space-y-4">
            <input
              className="w-full px-4 py-2 rounded bg-white text-black"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <div className="flex space-x-2">
              <button
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded"
                onClick={createRoom}
              >
                Create Room
              </button>
              <input
                className="w-24 px-2 py-2 rounded bg-white text-black"
                placeholder="Code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
              />
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                onClick={joinRoom}
              >
                Join
              </button>
            </div>
          </div>
        )}

        {gameState === 'waiting' && (
          <div className="text-center space-y-4">
            <p>Waiting for opponent to join...</p>
            <p className="text-lg font-bold">Room Code: {roomCode}</p>
            <p className="italic">{message}</p>
            <button
              className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              onClick={resetToMenu}
            >
              Back to Menu
            </button>
          </div>
        )}

        {gameState === 'playing' && currentPlayer && opponent && (
          <div className="space-y-4 text-center">
            <div className="flex justify-between text-lg font-semibold">
              <div>{currentPlayer.name}: {currentPlayer.score}</div>
              <div>{opponent.name}: {opponent.score}</div>
            </div>

            <div className="flex justify-center space-x-4 text-3xl">
              {['rock', 'paper', 'scissors'].map((choice) => (
                <button
                  key={choice}
                  className="hover:scale-110 transition"
                  onClick={() => makeChoice(choice)}
                  disabled={!!playerChoice}
                >
                  {getChoiceEmoji(choice)}
                </button>
              ))}
            </div>

            {roundResult && (
              <div className="text-xl mt-4">
                You chose {getChoiceEmoji(roundResult.players.find(p => p.id === currentPlayer.id)?.choice!)}. <br />
                {opponent.name} chose {getChoiceEmoji(roundResult.players.find(p => p.id === opponent.id)?.choice!)}.
              </div>
            )}

            <p className="italic mt-4">{message}</p>
          </div>
        )}

        {gameState === 'finished' && (
          <div className="text-center space-y-4">
            <p className="text-2xl font-bold">{message}</p>
            <button
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
              onClick={startNewGame}
            >
              Start New Game
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              onClick={resetToMenu}
            >
              Back to Menu
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerGame;
