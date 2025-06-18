// src/utils/gameLogic.ts
import { Choice, ChoiceId, GameResult } from '../types';

export const choices: Choice[] = [
  { id: 'rock', name: 'Rock', emoji: '🪨', beats: 'scissors' },
  { id: 'paper', name: 'Paper', emoji: '📄', beats: 'rock' },
  { id: 'scissors', name: 'Scissors', emoji: '✂️', beats: 'paper' }
];

export const getComputerChoice = (): Choice => {
  return choices[Math.floor(Math.random() * choices.length)];
};

export const determineWinner = (choice1: Choice, choice2: Choice): GameResult => {
  if (choice1.id === choice2.id) return 'tie';
  return choice1.beats === choice2.id ? 'player1' : 'player2';
};