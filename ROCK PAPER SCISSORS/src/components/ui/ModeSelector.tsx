import React from 'react';
import { GameMode } from '../../types';

interface ModeSelectorProps {
  onModeSelect: (mode: GameMode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ onModeSelect }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-lg w-full text-white shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
            Rock Paper Scissors
          </h1>
          <p className="text-xl opacity-90">Choose your weapon wisely!</p>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-center mb-6">Select Game Mode</h2>
          
          <button
            onClick={() => onModeSelect('computer')}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3 text-lg"
          >
            <span className="text-2xl">🤖</span>
            vs Computer
          </button>
          
          <button
            onClick={() => onModeSelect('twoPlayer')}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3 text-lg"
          >
            <span className="text-2xl">👥</span>
            Two Players
          </button>

          <button
            onClick={() => onModeSelect('multiplayer')}
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3 text-lg relative overflow-hidden"
          >
            <span className="text-2xl">🌐</span>
            Online Multiplayer
            <div className="absolute top-1 right-1 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full font-bold">
              NEW
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModeSelector;