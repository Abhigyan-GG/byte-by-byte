// src/utils/socketService.ts

import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { MultiplayerPlayer, GameRoom, RoundResult } from '../types';

class SocketService {
  private socket: Socket | null = null;

  private serverUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://rps-backend-byxk.onrender.com'
      : 'http://localhost:3001';

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl);

      this.socket.on('connect', () => {
        console.log('🟢 Connected to server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        reject(error);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  createRoom(playerName: string) {
    this.socket?.emit('createRoom', playerName);
  }

  joinRoom(roomCode: string, playerName: string) {
    this.socket?.emit('joinRoom', roomCode, playerName);
  }

makeChoice({ roomCode, choice }: { roomCode: string; choice: string }) {
  this.socket?.emit('makeChoice', { roomCode, choice });
}

  startNewGame(roomCode: string) {
    this.socket?.emit('startNewGame', roomCode);
  }

  onRoomCreated(callback: (data: { roomCode: string; player: MultiplayerPlayer }) => void) {
    this.socket?.on('roomCreated', callback);
  }

  onPlayerJoined(callback: (data: { room: GameRoom; newPlayer: MultiplayerPlayer }) => void) {
    this.socket?.on('playerJoined', callback);
  }

  onRoundStarted(callback: () => void) {
    this.socket?.on('roundStarted', callback);
  }

  onPlayerMadeChoice(callback: (data: { playerName: string }) => void) {
    this.socket?.on('playerMadeChoice', callback);
  }

  onRoundResult(callback: (data: RoundResult) => void) {
    this.socket?.on('roundResult', callback);
  }

  onGameFinished(callback: (data: { winner: MultiplayerPlayer | null; finalScores: MultiplayerPlayer[] }) => void) {
    this.socket?.on('gameFinished', callback);
  }

  onGameReset(callback: (room: GameRoom) => void) {
    this.socket?.on('gameReset', callback);
  }

  onPlayerDisconnected(callback: (data: { playerName: string }) => void) {
    this.socket?.on('playerDisconnected', callback);
  }

  onError(callback: (error: string) => void) {
    this.socket?.on('error', callback);
  }

  onRoomUpdated(callback: (room: GameRoom) => void) {
    this.socket?.on('roomUpdated', callback);
  }

  removeAllListeners() {
    this.socket?.removeAllListeners();
  }

  get socketInstance() {
    return this.socket;
  }
}

export const socketService = new SocketService();
