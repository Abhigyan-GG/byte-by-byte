
import React from 'react';
import { GameMode, GameScore } from '../../types';

interface ScoreboardProps {
  score: GameScore;
  gameMode: GameMode;
  size?: 'normal' | 'large';
}

const Scoreboard: React.FC<ScoreboardProps> = ({ score, gameMode, size = 'normal' }) => {
  const textSize = size === 'large' ? 'text-3xl' : 'text-2xl';
  const padding = size === 'large' ? 'p-6' : 'p-4';
  const gap = size === 'large' ? 'gap-12' : 'gap-8';

  return (
    <div className="flex justify-center">
      <div className={`bg-white/20 rounded-2xl ${padding} flex ${gap}`}>
        <div className="text-center">
          <div className={`${textSize} font-bold`}>{score.player1}</div>
          <div className="text-sm opacity-80">Player 1</div>
        </div>
        <div className="text-center">
          <div className={`${textSize} font-bold`}>
            {gameMode === 'computer' ? score.computer : score.player2}
          </div>
          <div className="text-sm opacity-80">
            {gameMode === 'computer' ? 'Computer' : 'Player 2'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;