// components/RoundTimer.tsx
import { useEffect, useState } from 'react';

interface RoundTimerProps {
  round: number;
  duration?: number;
}

const RoundTimer = ({ round, duration = 30 }: RoundTimerProps) => {
  const [secondsLeft, setSecondsLeft] = useState(duration);

  useEffect(() => {
    setSecondsLeft(duration);
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [round]);

  return (
    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '10px' }}>
      ⏳ Time Left: {secondsLeft}s
    </div>
  );
};

export default RoundTimer;
