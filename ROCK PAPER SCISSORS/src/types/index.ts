
export type GameMode = 'computer' | 'twoPlayer' | 'multiplayer' | null;
export type Screen = 'modeSelect' | 'game' | 'result' | 'multiplayer';
export type ChoiceId = 'rock' | 'paper' | 'scissors';
export type GameResult = 'player1' | 'player2' | 'tie' | null;

export interface Choice {
  id: ChoiceId;
  name: string;
  emoji: string;
  beats: ChoiceId;
}

export interface GameScore {
  player1: number;
  player2: number;
  computer: number;
}

// Multiplayer-specific types
export interface MultiplayerPlayer {
  id: string;
  name: string;
  choice: string | null;
  score: number;
}

export interface GameRoom {
  id: string;
  players: MultiplayerPlayer[];
  gameState: 'waiting' | 'playing' | 'finished';
  round: number;
  maxRounds: number;
  currentRound: number;
}

export interface RoundResult {
  round: number;
  result: 'player1' | 'player2' | 'tie';
  players: MultiplayerPlayer[];
  playerChoices: {
    [playerId: string]: string;
  };
}
