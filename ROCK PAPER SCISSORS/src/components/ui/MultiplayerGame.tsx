import React, { useState, useEffect, useRef } from 'react';
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
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null);
  const [bothPlayersReady, setBothPlayersReady] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ROUND_DURATION = 10000; // 10 seconds in milliseconds

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
    if (playerChoice && opponentChoice && opponentChoice === 'made' && currentRoom && !roundResult) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setBothPlayersReady(true);
      setMessage('Both players ready! Revealing results...');
    }
  }, [playerChoice, opponentChoice, currentRoom, roundResult]);

  const startNewRound = () => {
    setRoundStartTime(Date.now());
    setPlayerChoice(null);
    setOpponentChoice(null);
    setBothPlayersReady(false);
    setMessage('Make your choice! You have 10 seconds...');
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
      const socketId = socketService.socketInstance?.id;
      if (socketId && currentPlayer && opponent) {
        if (playerName === opponent.name) {
          setOpponentChoice('made');
          setMessage(`${playerName} made their choice...`);
        }
      }
    });

    socketService.onRoundResult((result) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setRoundResult(result);
      setBothPlayersReady(false);
      setRoundStartTime(null);

      // Update player scores immediately
      const socketId = socketService.socketInstance?.id;
      const updatedCurrentPlayer = result.players.find(p => p.id === socketId);
      const updatedOpponent = result.players.find(p => p.id !== socketId);

      if (updatedCurrentPlayer) setCurrentPlayer(updatedCurrentPlayer);
      if (updatedOpponent) setOpponent(updatedOpponent);

      let resultMessage = '';
      if (result.result === 'tie') {
        resultMessage = "It's a tie!";
      } else {
        const winner = result.result === 'player1' ? result.players[0] : result.players[1];
        resultMessage = `${winner.name} wins this round!`;
      }
      setMessage(resultMessage);

      // Clear choices and prepare for next round
      setTimeout(() => {
        setRoundResult(null);
        setPlayerChoice(null);
        setOpponentChoice(null);
        
        if (currentRoom && result.round < currentRoom.maxRounds) {
          startNewRound();
        }
      }, 3000);
    });

    socketService.onGameFinished(({ winner }) => {
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
    if (currentRoom && gameState === 'playing' && !playerChoice && !roundResult) {
      setPlayerChoice(choice);
      socketService.makeChoice(currentRoom.id, choice);
      setMessage('Choice submitted! Waiting for opponent...');
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

        {/* Menu State */}
        {gameState === 'menu' && (
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Join or Create Game
            </h2>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              
              <button
                onClick={createRoom}
                disabled={!playerName.trim()}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
              >
                Create Room
              </button>
              
              <div className="text-center text-gray-500">or</div>
              
              <input
                type="text"
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              
              <button
                onClick={joinRoom}
                disabled={!playerName.trim() || !roomCode.trim()}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                Join Room
              </button>
            </div>
            
            {message && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {message}
              </div>
            )}
          </div>
        )}

        {/* Waiting State */}
        {gameState === 'waiting' && (
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Waiting for Opponent
            </h2>
            <div className="text-lg mb-4">Room Code: <span className="font-mono font-bold text-purple-600">{roomCode}</span></div>
            <div className="text-gray-600 mb-6">Share this code with a friend!</div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <button
              onClick={resetToMenu}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
            >
              Back to Menu
            </button>
          </div>
        )}

        {/* Playing State */}
        {gameState === 'playing' && (
          <div className="space-y-6">
            {/* Score Display */}
            {currentPlayer && opponent && (
              <div className="bg-white rounded-lg shadow-xl p-6">
                <div className="flex justify-between items-center">
                  <div className="text-center">
                    <div className="font-semibold text-lg">{currentPlayer.name} (You)</div>
                    <div className="text-2xl font-bold text-purple-600">{currentPlayer.score}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500">VS</div>
                    <div className="text-sm">Round {currentRoom?.round || 1} of {currentRoom?.maxRounds || 3}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg">{opponent.name}</div>
                    <div className="text-2xl font-bold text-blue-600">{opponent.score}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Timer */}
            {roundStartTime && !roundResult && (
              <div className="bg-white rounded-lg shadow-xl p-4 text-center">
                <div className="text-lg font-semibold text-gray-700">
                  Time Remaining: {Math.max(0, Math.ceil((roundStartTime + ROUND_DURATION - Date.now()) / 1000))}s
                </div>
              </div>
            )}

            {/* Game Area */}
            <div className="bg-white rounded-lg shadow-xl p-8">
              {roundResult ? (
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-4">Round Result</h3>
                  <div className="flex justify-center items-center space-x-8 mb-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600">{currentPlayer?.name}</div>
                      <div className="text-4xl">{getChoiceEmoji(roundResult.playerChoices?.[0] || 'rock')}</div>
                    </div>
                    <div className="text-2xl">VS</div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">{opponent?.name}</div>
                      <div className="text-4xl">{getChoiceEmoji(roundResult.playerChoices?.[1] || 'rock')}</div>
                    </div>
                  </div>
                  <div className="text-xl font-semibold text-green-600">{message}</div>
                </div>
              ) : (
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-6">Make Your Choice</h3>
                  
                  <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                    {['rock', 'paper', 'scissors'].map((choice) => (
                      <button
                        key={choice}
                        onClick={() => makeChoice(choice)}
                        disabled={!!playerChoice || !!roundResult}
                        className={`p-6 rounded-lg border-2 text-4xl transition-all ${
                          playerChoice === choice
                            ? 'border-purple-500 bg-purple-100 scale-110'
                            : playerChoice || roundResult
                            ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                            : 'border-gray-300 hover:border-purple-400 hover:scale-105 cursor-pointer'
                        }`}
                      >
                        {getChoiceEmoji(choice)}
                        <div className="text-sm mt-2 capitalize">{choice}</div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-6">
                    <div className="text-lg font-medium">{message}</div>
                    {playerChoice && !roundResult && (
                      <div className="text-green-600 mt-2 font-semibold">✓ Your choice: {playerChoice}</div>
                    )}
                    {opponentChoice && opponentChoice === 'made' && !roundResult && (
                      <div className="text-blue-600 mt-1">✓ Opponent has chosen</div>
                    )}
                    {bothPlayersReady && !roundResult && (
                      <div className="text-purple-600 mt-2 font-semibold animate-pulse">
                        🎲 Calculating results...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center">
              <button
                onClick={resetToMenu}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Leave Game
              </button>
            </div>
          </div>
        )}

        {/* Finished State */}
        {gameState === 'finished' && (
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Game Over!</h2>
            
            {currentPlayer && opponent && (
              <div className="mb-6">
                <div className="text-lg mb-4">Final Scores:</div>
                <div className="flex justify-between items-center bg-gray-100 p-4 rounded">
                  <div>
                    <div className="font-semibold">{currentPlayer.name}</div>
                    <div className="text-2xl font-bold text-purple-600">{currentPlayer.score}</div>
                  </div>
                  <div>
                    <div className="font-semibold">{opponent.name}</div>
                    <div className="text-2xl font-bold text-blue-600">{opponent.score}</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-xl font-semibold mb-6">{message}</div>
            
            <div className="space-y-3">
              <button
                onClick={startNewGame}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={resetToMenu}
                className="w-full bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Back to Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerGame;