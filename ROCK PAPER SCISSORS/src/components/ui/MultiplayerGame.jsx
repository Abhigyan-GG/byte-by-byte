// React components for multiplayer Rock Paper Scissors game
import { useState, useEffect, useRef, useCallback } from 'react';
import { socketService } from '../../utils/socketService';

export const useMultiplayerGame = () => {
  // Game State
  const [gameState, setGameState] = useState('menu');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [playerChoice, setPlayerChoice] = useState(null);
  const [opponentChoice, setOpponentChoice] = useState(null);
  const [roundStartTime, setRoundStartTime] = useState(null);
  const [bothPlayersReady, setBothPlayersReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameHistory, setGameHistory] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [playerStats, setPlayerStats] = useState({ wins: 0, losses: 0, ties: 0 });
  const [reconnecting, setReconnecting] = useState(false);

  // Refs
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const ROUND_DURATION = 10000;

  // Sound effects
  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioCtx();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const sounds = {
      choice: { frequency: 800, duration: 0.1 },
      win: { frequency: 523, duration: 0.3 },
      lose: { frequency: 200, duration: 0.5 },
      tie: { frequency: 400, duration: 0.2 },
      countdown: { frequency: 1000, duration: 0.1 }
    };
    
    const sound = sounds[type];
    if (sound) {
      oscillator.frequency.setValueAtTime(sound.frequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + sound.duration);
    }
  }, [soundEnabled]);

  // Timer management
  useEffect(() => {
    if (roundStartTime && gameState === 'playing' && !roundResult) {
      const updateCountdown = () => {
        const remaining = Math.max(0, Math.ceil((roundStartTime + ROUND_DURATION - Date.now()) / 1000));
        setTimeLeft(remaining);
        
        if (remaining <= 0 && !playerChoice && currentRoom) {
          const randomChoice = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
          setPlayerChoice(randomChoice);
          socketService.makeChoice(currentRoom.id, randomChoice);
          setMessage('⏰ Time up! Random choice submitted...');
        }
      };

      updateCountdown();
      countdownRef.current = setInterval(updateCountdown, 100);

      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
      };
    }
  }, [roundStartTime, gameState, roundResult, playerChoice, currentRoom]);

  // Start new round
  const startNewRound = useCallback(() => {
    setRoundStartTime(Date.now());
    setPlayerChoice(null);
    setOpponentChoice(null);
    setBothPlayersReady(false);
    setTimeLeft(10);
    setMessage('🎯 Make your choice! You have 10 seconds...');
  }, []);

  // Socket listeners setup
  const setupSocketListeners = useCallback(() => {
    socketService.onRoomCreated(({ roomCode, player }) => {
      setRoomCode(roomCode);
      setCurrentPlayer(player);
      setGameState('waiting');
      setMessage(`🎉 Room created! Share code: ${roomCode}`);
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
      setMessage(`🎮 ${newPlayer.name} joined! Game starting...`);
      
      setTimeout(() => {
        startNewRound();
      }, 2000);
    });

    socketService.onRoundStarted(() => {
      startNewRound();
    });

    socketService.onPlayerMadeChoice(({ playerName }) => {
      const socketId = socketService.socketInstance?.id;
      if (socketId && currentPlayer && opponent) {
        if (playerName === opponent.name) {
          setOpponentChoice('made');
          setMessage(`⚡ ${playerName} made their choice! Waiting for results...`);
        }
      }
    });

    socketService.onRoundResult((result) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);

      setRoundResult(result);
      setBothPlayersReady(false);
      setRoundStartTime(null);
      setTimeLeft(0);

      const socketId = socketService.socketInstance?.id;
      const updatedCurrentPlayer = result.players.find(p => p.id === socketId);
      const updatedOpponent = result.players.find(p => p.id !== socketId);

      if (updatedCurrentPlayer) setCurrentPlayer(updatedCurrentPlayer);
      if (updatedOpponent) setOpponent(updatedOpponent);

      // Update game history
      const roundData = {
        round: result.round,
        playerChoice: result.playerChoices?.[0],
        opponentChoice: result.playerChoices?.[1],
        result: result.result,
        timestamp: new Date().toLocaleTimeString()
      };
      setGameHistory(prev => [...prev, roundData]);

      // Update player stats
      if (result.result === 'tie') {
        setPlayerStats(prev => ({ ...prev, ties: prev.ties + 1 }));
        playSound('tie');
      } else {
        const winner = result.result === 'player1' ? result.players[0] : result.players[1];
        const isCurrentPlayerWinner = winner.id === socketId;
        if (isCurrentPlayerWinner) {
          setPlayerStats(prev => ({ ...prev, wins: prev.wins + 1 }));
          playSound('win');
        } else {
          setPlayerStats(prev => ({ ...prev, losses: prev.losses + 1 }));
          playSound('lose');
        }
      }

      // Enhanced result messages
      let resultMessage = '';
      if (result.result === 'tie') {
        resultMessage = "🤝 It's a tie! Great minds think alike!";
      } else {
        const winner = result.result === 'player1' ? result.players[0] : result.players[1];
        const isCurrentPlayerWinner = winner.id === socketId;
        resultMessage = isCurrentPlayerWinner 
          ? `🎉 You win this round! Well played!`
          : `😅 ${winner.name} wins this round! Better luck next time!`;
      }
      setMessage(resultMessage);

      // Prepare for next round or finish game
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
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      
      setGameState('finished');
      const socketId = socketService.socketInstance?.id;
      
      if (winner) {
        const isCurrentPlayerWinner = winner.id === socketId;
        setMessage(isCurrentPlayerWinner 
          ? `🏆 Congratulations! You won the game!`
          : `🎯 ${winner.name} wins the game! Good game!`
        );
      } else {
        setMessage("🤝 It's a tie game! Excellent match!");
      }
    });

    socketService.onPlayerDisconnected(({ playerName }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      
      setMessage(`📱 ${playerName} disconnected. Waiting for reconnection...`);
      setGameState('waiting');
      setOpponent(null);
    });

    socketService.onError((error) => {
      setMessage(`❌ Error: ${error}`);
      setConnectionError(error);
    });
  }, [startNewRound, currentPlayer, opponent, currentRoom, playSound]);

  // Connection management
  useEffect(() => {
    const connectSocket = async () => {
      try {
        setIsLoading(true);
        setReconnecting(false);
        await socketService.connect();
        setIsConnected(true);
        setConnectionError('');
        setupSocketListeners();
      } catch (error) {
        setConnectionError('Failed to connect to server. Attempting to reconnect...');
        setReconnecting(true);
        setTimeout(() => {
          if (!isConnected) connectSocket();
        }, 3000);
        console.error('Connection error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    connectSocket();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [setupSocketListeners, isConnected]);

  // Game actions
  const createRoom = useCallback(() => {
    if (playerName.trim()) {
      setIsLoading(true);
      socketService.createRoom(playerName.trim());
      setTimeout(() => setIsLoading(false), 1000);
    }
  }, [playerName]);

  const joinRoom = useCallback(() => {
    const trimmedCode = roomCode.trim().toUpperCase();
    const trimmedName = playerName.trim();
    if (trimmedName && trimmedCode) {
      setIsLoading(true);
      socketService.joinRoom(trimmedCode, trimmedName);
      setTimeout(() => setIsLoading(false), 1000);
    }
  }, [roomCode, playerName]);

  const makeChoice = useCallback((choice) => {
    if (currentRoom && gameState === 'playing' && !playerChoice && !roundResult && timeLeft > 0) {
      setPlayerChoice(choice);
      socketService.makeChoice(currentRoom.id, choice);
      setMessage(`✅ Choice submitted: ${choice}! Waiting for opponent...`);
      
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      playSound('choice');
    }
  }, [currentRoom, gameState, playerChoice, roundResult, timeLeft, playSound]);

  const startNewGame = useCallback(() => {
    if (currentRoom) {
      socketService.startNewGame(currentRoom.id);
      setGameState('playing');
      setMessage('🎮 New game started!');
      setRoundResult(null);
      
      setTimeout(() => {
        startNewRound();
      }, 1000);
    }
  }, [currentRoom, startNewRound]);

  const resetToMenu = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
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
    setTimeLeft(0);
    setConnectionError('');
    setGameHistory([]);
  }, []);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setMessage('📋 Room code copied to clipboard!');
    setTimeout(() => setMessage(`🎉 Room created! Share code: ${roomCode}`), 2000);
  };

  const toggleSettings = () => setShowSettings(!showSettings);
  const toggleSound = () => setSoundEnabled(!soundEnabled);

  // Utility functions
  const getChoiceEmoji = (choice) => {
    const emojiMap = {
      rock: '🪨',
      paper: '📄',
      scissors: '✂️'
    };
    return emojiMap[choice] || '❓';
  };

  const getTimerColor = () => {
    if (timeLeft > 7) return 'text-green-600';
    if (timeLeft > 3) return 'text-yellow-600';
    return 'text-red-600 animate-pulse';
  };

  return {
    // State
    gameState,
    playerName,
    setPlayerName,
    roomCode,
    setRoomCode,
    currentRoom,
    currentPlayer,
    opponent,
    roundResult,
    message,
    isConnected,
    playerChoice,
    opponentChoice,
    roundStartTime,
    bothPlayersReady,
    isLoading,
    connectionError,
    timeLeft,
    gameHistory,
    soundEnabled,
    showSettings,
    playerStats,
    reconnecting,
    
    // Actions
    createRoom,
    joinRoom,
    makeChoice,
    startNewGame,
    resetToMenu,
    copyRoomCode,
    toggleSettings,
    toggleSound,
    
    // Utilities
    getChoiceEmoji,
    getTimerColor
  };
};


// React components for the multiplayer game UI


// Loading Screen Component
const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
      <div className="text-white text-xl">Connecting to server...</div>
    </div>
  </div>
);

// Connection Error Component
const ConnectionError = ({ connectionError, reconnecting }) => (
  <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-auto text-center">
      <div className="text-red-500 text-6xl mb-4">
        {reconnecting ? '🔄' : '⚠️'}
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        {reconnecting ? 'Reconnecting...' : 'Connection Error'}
      </h2>
      <p className="text-gray-600 mb-6">
        {connectionError || 'Unable to connect to game server'}
      </p>
      {reconnecting && (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
      )}
      <button
        onClick={() => window.location.reload()}
        disabled={reconnecting}
        className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
      >
        {reconnecting ? 'Reconnecting...' : 'Retry Connection'}
      </button>
    </div>
  </div>
);

// Header Component
const GameHeader = ({ soundEnabled, toggleSound, toggleSettings, playerStats, showSettings }) => (
  <div className="text-center mb-8">
    <h1 className="text-4xl font-bold text-white mb-2">
      🪨📄✂️ Multiplayer Battle
    </h1>
    <p className="text-purple-100">Real-time Rock Paper Scissors</p>
    
    <button
      onClick={toggleSettings}
      className="mt-2 text-purple-200 hover:text-white transition-colors"
    >
      ⚙️ Settings
    </button>
    
    {showSettings && (
      <div className="mt-4 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white">🔊 Sound Effects</span>
          <button
            onClick={toggleSound}
            className={`w-12 h-6 rounded-full transition-colors ${
              soundEnabled ? 'bg-green-500' : 'bg-gray-400'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
              soundEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}></div>
          </button>
        </div>
        
        {(playerStats.wins > 0 || playerStats.losses > 0 || playerStats.ties > 0) && (
          <div className="mt-4 text-white text-sm">
            <div className="font-semibold mb-2">📊 Session Stats</div>
            <div className="flex justify-between">
              <span>🏆 Wins: {playerStats.wins}</span>
              <span>😅 Losses: {playerStats.losses}</span>
              <span>🤝 Ties: {playerStats.ties}</span>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);

// Menu Screen Component
const MenuScreen = ({ playerName, setPlayerName, roomCode, setRoomCode, createRoom, joinRoom, message }) => (
  <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-auto">
    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
      🚀 Ready to Play?
    </h2>
    
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
        <input
          type="text"
          placeholder="Enter your epic name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          maxLength={20}
        />
      </div>
      
      <button
        onClick={createRoom}
        disabled={!playerName.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-400 transition-all transform hover:scale-105 disabled:scale-100"
      >
        🎮 Create New Room
      </button>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or join existing</span>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
        <input
          type="text"
          placeholder="Enter room code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center tracking-wider transition-all"
          maxLength={6}
        />
      </div>
      
      <button
        onClick={joinRoom}
        disabled={!playerName.trim() || !roomCode.trim()}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 transition-all transform hover:scale-105 disabled:scale-100"
      >
        🎯 Join Room
      </button>
    </div>
    
    {message && (
      <div className="mt-4 p-3 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 rounded-lg">
        {message}
      </div>
    )}
  </div>
);

// Waiting Screen Component
const WaitingScreen = ({ roomCode, copyRoomCode, resetToMenu }) => (
  <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-auto text-center">
    <div className="mb-6">
      <div className="text-6xl mb-4">⏳</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Waiting for Opponent
      </h2>
      <p className="text-gray-600">Finding a worthy challenger...</p>
    </div>
    
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg mb-6">
      <div className="text-sm text-gray-600 mb-2">Room Code</div>
      <div className="flex items-center justify-center space-x-2">
        <span className="font-mono font-bold text-2xl text-purple-600 tracking-wider">
          {roomCode}
        </span>
        <button
          onClick={copyRoomCode}
          className="p-2 text-purple-600 hover:bg-purple-100 rounded transition-colors"
          title="Copy to clipboard"
        >
          📋
        </button>
      </div>
    </div>
    
    <div className="animate-pulse flex justify-center space-x-1 mb-6">
      <div className="h-2 w-2 bg-purple-600 rounded-full animate-bounce"></div>
      <div className="h-2 w-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
      <div className="h-2 w-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
    </div>
    
    <button
      onClick={resetToMenu}
      className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
    >
      ← Back to Menu
    </button>
  </div>
);

// Score Display Component
const ScoreDisplay = ({ currentPlayer, opponent, currentRoom, timeLeft, getTimerColor }) => (
  <div className="bg-white rounded-lg shadow-xl p-6">
    <div className="flex justify-between items-center">
      <div className="text-center">
        <div className="font-semibold text-lg text-purple-700">{currentPlayer?.name}</div>
        <div className="text-3xl font-bold text-purple-600">{currentPlayer?.score}</div>
        <div className="text-sm text-gray-500">You</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl mb-1">⚔️</div>
        <div className="text-sm text-gray-600 font-medium">
          Round {currentRoom?.round || 1} of {currentRoom?.maxRounds || 3}
        </div>
        {timeLeft > 0 && (
          <div className={`text-sm font-bold ${getTimerColor()}`}>
            {timeLeft}s
          </div>
        )}
      </div>
      
      <div className="text-center">
        <div className="font-semibold text-lg text-blue-700">{opponent?.name}</div>
        <div className="text-3xl font-bold text-blue-600">{opponent?.score}</div>
        <div className="text-sm text-gray-500">Opponent</div>
      </div>
    </div>
  </div>
);

// Round Result Component
const RoundResult = ({ roundResult, currentPlayer, opponent, message, getChoiceEmoji }) => (
  <div className="text-center">
    <h3 className="text-2xl font-bold mb-6 text-gray-800">🎲 Round Result</h3>
    <div className="flex justify-center items-center space-x-8 mb-6">
      <div className="text-center">
        <div className="text-sm text-gray-600 mb-2">{currentPlayer?.name}</div>
        <div className="text-6xl animate-bounce">
          {getChoiceEmoji(roundResult.playerChoices?.[0] || 'rock')}
        </div>
      </div>
      <div className="text-4xl animate-pulse">⚡</div>
      <div className="text-center">
        <div className="text-sm text-gray-600 mb-2">{opponent?.name}</div>
        <div className="text-6xl animate-bounce" style={{animationDelay: '0.1s'}}>
          {getChoiceEmoji(roundResult.playerChoices?.[1] || 'rock')}
        </div>
      </div>
    </div>
    <div className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
      {message}
    </div>
  </div>
);

// Choice Selection Component
const ChoiceSelection = ({ 
  timeLeft, 
  makeChoice, 
  playerChoice, 
  roundResult, 
  getChoiceEmoji, 
  message, 
  opponentChoice, 
  bothPlayersReady 
}) => (
  <div className="text-center">
    <h3 className="text-2xl font-bold mb-6 text-gray-800">
      {timeLeft > 0 ? `⏰ ${timeLeft}s remaining` : '🎯 Make Your Choice'}
    </h3>
    
    <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mb-6">
      {['rock', 'paper', 'scissors'].map((choice) => (
        <button
          key={choice}
          onClick={() => makeChoice(choice)}
          disabled={!!playerChoice || !!roundResult || timeLeft <= 0}
          className={`p-6 rounded-xl border-2 text-5xl transition-all duration-200 ${
            playerChoice === choice
              ? 'border-purple-500 bg-gradient-to-br from-purple-100 to-purple-200 scale-110 shadow-lg'
              : playerChoice || roundResult || timeLeft <= 0
              ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-purple-400 hover:scale-105 hover:shadow-md cursor-pointer bg-gradient-to-br from-gray-50 to-white'
          }`}
        >
          {getChoiceEmoji(choice)}
          <div className="text-sm mt-2 capitalize font-medium text-gray-700">
            {choice}
          </div>
        </button>
      ))}
    </div>
    
    <div className="space-y-2">
      <div className="text-lg font-medium text-gray-700">{message}</div>
      {playerChoice && !roundResult && (
        <div className="text-green-600 font-semibold flex items-center justify-center space-x-2">
          <span>✅</span>
          <span>Your choice: {playerChoice}</span>
        </div>
      )}
      {opponentChoice === 'made' && !roundResult && (
        <div className="text-blue-600 font-semibold flex items-center justify-center space-x-2">
          <span>⚡</span>
          <span>Opponent ready!</span>
        </div>
      )}
      {bothPlayersReady && !roundResult && (
        <div className="text-purple-600 font-bold animate-pulse flex items-center justify-center space-x-2">
          <span>🎲</span>
          <span>Revealing results...</span>
        </div>
      )}
    </div>
  </div>
);

// Main Game Container Component
const MultiplayerGame = ({
  gameState,
  connectionError,
  reconnecting,
  playerName,
  setPlayerName,
  roomCode,
  setRoomCode,
  createRoom,
  joinRoom,
  message,
  copyRoomCode,
  resetToMenu,
  currentPlayer,
  opponent,
  currentRoom,
  timeLeft,
  getTimerColor,
  roundResult,
  getChoiceEmoji,
  makeChoice,
  playerChoice,
  opponentChoice,
  bothPlayersReady,
  gameHistory,
  showSettings,
  setShowSettings,
  startNewGame,
  soundEnabled,
  toggleSound,
  toggleSettings,
  playerStats
}) = MultiplayerGame();
   {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Connection states */}
        {gameState === 'connecting' && <LoadingScreen />}
        
        {(connectionError && !reconnecting) && (
          <ConnectionError connectionError={connectionError} reconnecting={reconnecting} />
        )}
        
        {/* Game states */}
        {gameState === 'menu' && (
          <div>
            <GameHeader 
              soundEnabled={soundEnabled}
              toggleSound={toggleSound}
              toggleSettings={toggleSettings}
              playerStats={playerStats}
              showSettings={showSettings}
            />
            <MenuScreen
              playerName={playerName}
              setPlayerName={setPlayerName}
              roomCode={roomCode}
              setRoomCode={setRoomCode}
              createRoom={createRoom}
              joinRoom={joinRoom}
              message={message}
            />
          </div>
        )}

        {gameState === 'waiting' && (
          <div>
            <GameHeader 
              soundEnabled={soundEnabled}
              toggleSound={toggleSound}
              toggleSettings={toggleSettings}
              playerStats={playerStats}
              showSettings={showSettings}
            />
            <WaitingScreen
              roomCode={roomCode}
              copyRoomCode={copyRoomCode}
              resetToMenu={resetToMenu}
            />
          </div>
        )}

        {gameState === 'ingame' && (
          <div className="space-y-6">
            <GameHeader 
              soundEnabled={soundEnabled}
              toggleSound={toggleSound}
              toggleSettings={toggleSettings}
              playerStats={playerStats}
              showSettings={showSettings}
            />
            
            <ScoreDisplay
              currentPlayer={currentPlayer}
              opponent={opponent}
              currentRoom={currentRoom}
              timeLeft={timeLeft}
              getTimerColor={getTimerColor}
            />

            <div className="bg-white rounded-lg shadow-xl p-8">
              {roundResult ? (
                <RoundResult
                  roundResult={roundResult}
                  currentPlayer={currentPlayer}
                  opponent={opponent}
                  message={message}
                  getChoiceEmoji={getChoiceEmoji}
                />
              ) : (
                <ChoiceSelection
                  timeLeft={timeLeft}
                  makeChoice={makeChoice}
                  playerChoice={playerChoice}
                  roundResult={roundResult}
                  getChoiceEmoji={getChoiceEmoji}
                  message={message}
                  opponentChoice={opponentChoice}
                  bothPlayersReady={bothPlayersReady}
                />
              )}
            </div>

            <div className="text-center">
              <button
                onClick={resetToMenu}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-8 py-3 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all transform hover:scale-105 mr-4"
              >
                🚪 Leave Game
              </button>
              
              {/* Game History Toggle */}
              {gameHistory.length > 0 && (
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105"
                >
                  📊 History
                </button>
              )}
            </div>
            
            {/* Game History Panel */}
            {showSettings && gameHistory.length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">🎲 Game History</h3>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {gameHistory.slice(-5).map((round, index) => (
                    <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                      <span className="font-medium">Round {round.round}</span>
                      <div className="flex items-center space-x-2">
                        <span>{getChoiceEmoji(round.playerChoice)}</span>
                        <span className="text-gray-500">vs</span>
                        <span>{getChoiceEmoji(round.opponentChoice)}</span>
                      </div>
                      <span className={`font-bold ${
                        round.result === 'tie' ? 'text-yellow-600' : 
                        round.result === 'player1' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {round.result === 'tie' ? 'TIE' : 
                         round.result === 'player1' ? 'WIN' : 'LOSS'}
                      </span>
                      <span className="text-xs text-gray-400">{round.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Finished State */}
        {gameState === 'finished' && (
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-auto text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Game Complete!</h2>
            
            {currentPlayer && opponent && (
              <div className="mb-6">
                <div className="text-lg mb-4 text-gray-700">Final Battle Results</div>
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <div className="font-bold text-lg text-purple-700">{currentPlayer.name}</div>
                      <div className="text-3xl font-bold text-purple-600">{currentPlayer.score}</div>
                    </div>
                    <div className="text-2xl">🆚</div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-blue-700">{opponent.name}</div>
                      <div className="text-3xl font-bold text-blue-600">{opponent.score}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-xl font-bold mb-8 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {message}
            </div>
            
            <div className="space-y-4">
              <button
                onClick={startNewGame}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-lg font-bold hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105"
              >
                🔄 Play Again
              </button>
              <button
                onClick={resetToMenu}
                className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-4 rounded-lg font-bold hover:from-gray-600 hover:to-gray-700 transition-all transform hover:scale-105"
              >
                🏠 Back to Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerGame;