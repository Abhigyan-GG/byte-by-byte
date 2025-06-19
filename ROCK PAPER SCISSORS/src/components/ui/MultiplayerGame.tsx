import React, { useState, useEffect } from 'react';
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
    const trimmedCode = roomCode.trim().toUpperCase();
    const trimmedName = playerName.trim();
    if (trimmedName && trimmedCode) {
      console.log(`🧪 Attempting to join room: ${trimmedCode}, player: ${trimmedName}`);
      socketService.joinRoom(trimmedCode, trimmedName);
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

        {gameState === 'menu' && (
          <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto space-y-4">
            <input
              className="w-full p-2 border rounded"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <div className="flex space-x-2">
              <button
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                onClick={createRoom}
              >
                Create Room
              </button>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={joinRoom}
              >
                Join Room
              </button>
            </div>
            <input
              className="w-full p-2 border rounded"
              type="text"
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            {message && <p className="text-center text-purple-700">{message}</p>}
          </div>
        )}

        {gameState === 'waiting' && (
          <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto text-center space-y-4">
            <h2 className="text-xl font-bold">Waiting for opponent...</h2>
            <p>Room Code: <span className="font-mono text-lg">{roomCode}</span></p>
            <p>{message}</p>
          </div>
        )}

        {gameState === 'playing' && currentPlayer && opponent && (
          <div className="bg-white p-6 rounded-lg shadow-md text-center space-y-6">
            <div className="flex justify-between text-lg font-bold">
              <span>{currentPlayer.name} <br /> {currentPlayer.score}</span>
              <span>Round {currentRoom?.currentRound}/{currentRoom?.maxRounds}</span>
              <span>{opponent.name} <br /> {opponent.score}</span>
            </div>

            {roundResult ? (
              <div className="text-xl font-semibold">
                <p>{message}</p>
                <p>{currentPlayer.name} chose {getChoiceEmoji(roundResult.playerChoices[currentPlayer.id])}</p>
                <p>{opponent.name} chose {getChoiceEmoji(roundResult.playerChoices[opponent.id])}</p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold">Make Your Choice</h3>
                <div className="flex justify-center gap-4 mt-4">
                  {['rock', 'paper', 'scissors'].map((choice) => (
                    <button
                      key={choice}
                      onClick={() => makeChoice(choice)}
                      className={`text-4xl p-4 rounded-full border-2 ${playerChoice === choice ? 'bg-purple-300' : 'hover:bg-purple-100'}`}
                      disabled={!!playerChoice}
                    >
                      {getChoiceEmoji(choice)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {gameState === 'finished' && (
          <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto text-center space-y-4">
            <h2 className="text-xl font-bold">Game Over</h2>
            <p>{message}</p>
            <button
              onClick={startNewGame}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Play Again
            </button>
            <button
              onClick={resetToMenu}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
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