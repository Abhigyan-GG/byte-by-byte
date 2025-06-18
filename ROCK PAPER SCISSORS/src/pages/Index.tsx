// src/pages/Index.tsx
import React, { useState } from 'react';
import ModeSelector from '../components/ui/ModeSelector';
import GameScreen from '../components/ui/GameScreen';
import GameResult from '../components/ui/GameResult';
import MultiplayerGame from '../components/ui/MultiplayerGame';
import { GameMode, Screen, Choice, ChoiceId, GameResult as GameResultType, GameScore } from '../types';

// Game logic
export const choices: Choice[] = [
  { id: 'rock', name: 'Rock', emoji: '🪨', beats: 'scissors' },
  { id: 'paper', name: 'Paper', emoji: '📄', beats: 'rock' },
  { id: 'scissors', name: 'Scissors', emoji: '✂️', beats: 'paper' }
];

export const getComputerChoice = (): Choice => {
  return choices[Math.floor(Math.random() * choices.length)];
};

export const determineWinner = (choice1: Choice, choice2: Choice): GameResultType => {
  if (choice1.id === choice2.id) return 'tie';
  return choice1.beats === choice2.id ? 'player1' : 'player2';
};

const Index = () => {
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('modeSelect');
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [player2Choice, setPlayer2Choice] = useState<Choice | null>(null);
  const [computerChoice, setComputerChoice] = useState<Choice | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [result, setResult] = useState<GameResultType>(null);
  const [score, setScore] = useState<GameScore>({ player1: 0, player2: 0, computer: 0 });
  const [isRevealing, setIsRevealing] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);

  const handleModeSelect = (mode: GameMode) => {
    setGameMode(mode);
    if (mode === 'multiplayer') {
      setCurrentScreen('multiplayer');
    } else {
      setCurrentScreen('game');
    }
  };

  const handleChoice = (choice: Choice) => {
    if (gameMode === 'computer') {
      setPlayerChoice(choice);
      const compChoice = getComputerChoice();
      setComputerChoice(compChoice);
      
      setIsRevealing(true);
      setTimeout(() => {
        const winner = determineWinner(choice, compChoice);
        setResult(winner);
        
        if (winner === 'player1') {
          setScore(prev => ({ ...prev, player1: prev.player1 + 1 }));
        } else if (winner === 'player2') {
          setScore(prev => ({ ...prev, computer: prev.computer + 1 }));
        }
        
        setCurrentScreen('result');
        setIsRevealing(false);
      }, 1500);
    } else {
      // Two player mode
      if (currentPlayer === 1) {
        setPlayerChoice(choice);
        setCurrentPlayer(2);
      } else {
        setPlayer2Choice(choice);
        
        setIsRevealing(true);
        setTimeout(() => {
          const winner = determineWinner(playerChoice!, choice);
          setResult(winner);
          
          if (winner === 'player1') {
            setScore(prev => ({ ...prev, player1: prev.player1 + 1 }));
          } else if (winner === 'player2') {
            setScore(prev => ({ ...prev, player2: prev.player2 + 1 }));
          }
          
          setCurrentScreen('result');
          setIsRevealing(false);
        }, 1500);
      }
    }
  };

  const resetGame = () => {
    setPlayerChoice(null);
    setPlayer2Choice(null);
    setComputerChoice(null);
    setCurrentPlayer(1);
    setResult(null);
    setCurrentScreen('game');
    setRoundNumber(prev => prev + 1);
  };

  const resetAll = () => {
    setGameMode(null);
    setCurrentScreen('modeSelect');
    setPlayerChoice(null);
    setPlayer2Choice(null);
    setComputerChoice(null);
    setCurrentPlayer(1);
    setResult(null);
    setScore({ player1: 0, player2: 0, computer: 0 });
    setRoundNumber(1);
  };

  // Render different screens based on current state
  if (currentScreen === 'modeSelect') {
    return <ModeSelector onModeSelect={handleModeSelect} />;
  }

  if (currentScreen === 'multiplayer') {
    return <MultiplayerGame />;
  }

  if (currentScreen === 'game') {
    return (
      <GameScreen
        gameMode={gameMode}
        currentPlayer={currentPlayer}
        score={score}
        roundNumber={roundNumber}
        isRevealing={isRevealing}
        onChoice={handleChoice}
        onBackToModeSelection={resetAll}
      />
    );
  }

  if (currentScreen === 'result') {
    return (
      <GameResult
        gameMode={gameMode}
        result={result}
        playerChoice={playerChoice}
        player2Choice={player2Choice}
        computerChoice={computerChoice}
        score={score}
        onPlayAgain={resetGame}
        onNewGame={resetAll}
      />
    );
  }

  return null;
};

export default Index;