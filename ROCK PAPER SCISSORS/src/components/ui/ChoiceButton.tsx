import React from 'react';
import { Choice } from '../../types';

interface ChoiceButtonProps {
  choice: Choice;
  onClick: (choice: Choice) => void;
  disabled?: boolean;
}

const ChoiceButton: React.FC<ChoiceButtonProps> = ({ choice, onClick, disabled = false }) => {
  return (
    <button
      onClick={() => onClick(choice)}
      disabled={disabled}
      className="bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-3xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-white/30 group"
    >
      <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
        {choice.emoji}
      </div>
      <div className="text-xl font-semibold">{choice.name}</div>
    </button>
  );
};

export default ChoiceButton;