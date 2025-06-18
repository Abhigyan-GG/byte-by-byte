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
      const otherPlayer = room.players.find(p => p.id !== socketService.socketInstance?.id);
      if (otherPlayer) {
        setOpponent(otherPlayer);
        setGameState('playing');
        setMessage(`${newPlayer.name} joined the game!`);
      }
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

      // Update player states
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

        {gameState === 'menu' && (
          <div className="bg-white rounded-lg p-8 shadow-2xl max-w-md mx-auto">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              
              <button
                onClick={createRoom}
                disabled={!playerName.trim()}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Room
              </button>
              
              <div className="text-center text-gray-500">or</div>
              
              <input
                type="text"
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <button
                onClick={joinRoom}
                disabled={!playerName.trim() || !roomCode.trim()}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Join Room
              </button>
            </div>
          </div>
        )}

        {gameState === 'waiting' && (
          <div className="bg-white rounded-lg p-8 shadow-2xl max-w-md mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Waiting for Player</h2>
            <div className="text-3xl font-mono bg-gray-100 p-4 rounded-lg mb-4">
              {roomCode}
            </div>
            <p className="text-gray-600 mb-4">Share this code with your friend!</p>
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-purple-600 rounded-full mx-auto mb-2"></div>
              <p>Waiting...</p>
            </div>
            <button
              onClick={resetToMenu}
              className="mt-4 text-gray-500 hover:text-gray-700 underline"
            >
              Back to Menu
            </button>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'finished') && currentPlayer && opponent && (
          <div className="space-y-6">
            {/* Score Board */}
            <div className="bg-white rounded-lg p-6 shadow-2xl">
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <h3 className="font-bold text-lg">{currentPlayer.name}</h3>
                  <div className="text-3xl font-bold text-purple-600">{currentPlayer.score}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Round {currentRoom?.round || 0}/{currentRoom?.maxRounds}</div>
                  <div className="text-lg font-semibold">VS</div>
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg">{opponent.name}</h3>
                  <div className="text-3xl font-bold text-blue-600">{opponent.score}</div>
                </div>
              </div>
            </div>

            {/* Game Message */}
            <div className="bg-white rounded-lg p-4 shadow-2xl text-center">
              <p className="text-lg font-semibold">{message}</p>
            </div>

            {/* Round Result */}
            {roundResult && (
              <div className="bg-white rounded-lg p-6 shadow-2xl">
                <div className="flex justify-center space-x-8 items-center">
                  <div className="text-center">
                    <div className="text-6xl mb-2">
                      {getChoiceEmoji(roundResult.choices[currentPlayer.name])}
                    </div>
                    <p className="font-semibold">{currentPlayer.name}</p>
                  </div>
                  <div className="text-4xl">⚔️</div>
                  <div className="text-center">
                    <div className="text-6xl mb-2">
                      {getChoiceEmoji(roundResult.choices[opponent.name])}
                    </div>
                    <p className="font-semibold">{opponent.name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Game Controls */}
            {gameState === 'playing' && !roundResult && (
              <div className="bg-white rounded-lg p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-center mb-4">Make Your Choice</h3>
                <div className="flex justify-center space-x-4">
                  {['rock', 'paper', 'scissors'].map((choice) => (
                    <button
                      key={choice}
                      onClick={() => makeChoice(choice)}
                      disabled={playerChoice !== null}
                      className={`w-20 h-20 rounded-full text-4xl transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                        playerChoice === choice 
                          ? 'bg-green-500 text-white scale-110' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {getChoiceEmoji(choice)}
                    </button>
                  ))}
                </div>
                <div className="text-center mt-4 text-sm text-gray-600">
                  {playerChoice ? `You chose ${getChoiceEmoji(playerChoice)}` : 'Click to choose'}
                </div>
              </div>
            )}

            {/* Game Finished */}
            {gameState === 'finished' && (
              <div className="bg-white rounded-lg p-6 shadow-2xl text-center">
                <div className="space-y-4">
                  <button
                    onClick={startNewGame}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={resetToMenu}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors ml-4"
                  >
                    Back to Menu
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerGame;