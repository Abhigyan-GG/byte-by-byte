import React, { useEffect, useState } from 'react';
import { socketService } from '../../utils/socketService';

interface RoundTimerProps {
  round: number;
  duration: number;
  playerChoice: string | null;
  roomId: string;
  isDisabled: boolean;
}

const RoundTimer: React.FC<RoundTimerProps> = ({ round, duration, playerChoice, roomId, isDisabled }) => {
  const [secondsLeft, setSecondsLeft] = useState(duration);

  useEffect(() => {
    if (isDisabled) return;

    setSecondsLeft(duration);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          if (!playerChoice) {
            socketService.makeChoice(roomId, 'rock');
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [round, playerChoice, roomId, duration, isDisabled]);

  return (
    <div className="text-xl font-semibold text-red-600">
      Time Left: {secondsLeft}s
    </div>
  );
};

export default RoundTimer;
