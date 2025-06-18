// src/components/ui/GameResult.tsx
import React from 'react';
import { GameMode, GameScore, Choice, GameResult as GameResultType } from '../../types';
import Scoreboard from './Scoreboard';

interface GameResultProps {
  gameMode: GameMode;
  result: GameResultType;
  playerChoice: Choice | null;
  player2Choice: Choice | null;
  computerChoice: Choice | null;
  score: GameScore;
  onPlayAgain: () => void;
  onNewGame: () => void;
}

const GameResult: React.FC<GameResultProps> = ({
  gameMode,
  result,
  playerChoice,
  player2Choice,
  computerChoice,
  score,
  onPlayAgain,
  onNewGame
}) => {
  const getResultMessage = (): string => {
    if (result === 'tie') return "It's a tie! 🤝";
    if (gameMode === 'computer') {
      return result === 'player1' ? "You win! 🎉" : "Computer wins! 🤖";
    } else {
      return result === 'player1' ? "Player 1 wins! 🎉" : "Player 2 wins! 🎉";
    }
  };

  const getOpponentChoice = () => {
    return gameMode === 'computer' ? computerChoice : player2Choice;
  };

  const getOpponentName = () => {
    return gameMode === 'computer' ? 'Computer' : 'Player 2';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-4xl w-full text-white shadow-2xl border border-white/20">
        {/* Result Message */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
            {getResultMessage()}
          </h1>
        </div>

        {/* Choices Display */}
        <div className="flex justify-center items-center gap-8 mb-8">
          <div className="text-center">
            <div className="bg-white/20 rounded-3xl p-8 mb-4">
              <div className="text-6xl">{playerChoice?.emoji}</div>
            </div>
            <div className="text-lg font-semibold">
              {gameMode === 'computer' ? 'You' : 'Player 1'}
            </div>
            <div className="text-sm opacity-80">{playerChoice?.name}</div>
          </div>

          <div className="text-4xl">VS</div>

          <div className="text-center">
            <div className="bg-white/20 rounded-3xl p-8 mb-4">
              <div className="text-6xl">{getOpponentChoice()?.emoji}</div>
            </div>
            <div className="text-lg font-semibold">{getOpponentName()}</div>
            <div className="text-sm opacity-80">{getOpponentChoice()?.name}</div>
          </div>
        </div>

        {/* Updated Score */}
        <div className="mb-8">
          <Scoreboard score={score} gameMode={gameMode} size="large" />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={onPlayAgain}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105"
          >
            Play Again
          </button>
          <button
            onClick={onNewGame}
            className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300"
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameResult;