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

export default MultiplayerGame;