// src/components/ui/GameScreen.tsx
import React from 'react';
import { GameMode, GameScore, Choice } from '../../types';
import { choices } from '../../utils/gameLogic';
import Scoreboard from './Scoreboard';
import ChoiceButton from './ChoiceButton';

interface GameScreenProps {
  gameMode: GameMode;
  currentPlayer: 1 | 2;
  score: GameScore;
  roundNumber: number;
  isRevealing: boolean;
  onChoice: (choice: Choice) => void;
  onBackToModeSelection: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({
  gameMode,
  currentPlayer,
  score,
  roundNumber,
  isRevealing,
  onChoice,
  onBackToModeSelection
}) => {
  const getPlayerPrompt = () => {
    if (gameMode === 'computer') {
      return "Choose your weapon!";
    }
    return currentPlayer === 1 ? "Player 1's turn" : "Player 2's turn";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-4xl w-full text-white shadow-2xl border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
            Round {roundNumber}
          </h1>
          <p className="text-lg opacity-90">{getPlayerPrompt()}</p>
        </div>

        {/* Score Display */}
        <div className="mb-8">
          <Scoreboard score={score} gameMode={gameMode} />
        </div>

        {/* Choice Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {choices.map((choice) => (
            <ChoiceButton
              key={choice.id}
              choice={choice}
              onClick={onChoice}
              disabled={isRevealing}
            />
          ))}
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={onBackToModeSelection}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl transition-all duration-300"
          >
            ← Back to Mode Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;