import { io, Socket } from 'socket.io-client';
import type { ChatMessage } from '@org/types';

/** Origine du serveur Socket.IO (sans `/api`). Vide en dev → même origine que la page (Vite proxy `/socket.io`). */
const SOCKET_ORIGIN =
  typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
    ? (import.meta as { env?: { VITE_API_URL?: string } }).env!.VITE_API_URL!.replace(/\/api\/?$/, '')
    : '';

type MessageListener = (message: ChatMessage) => void;

class ChatSocketClient {
  private socket: Socket | null = null;
  private messageListeners: Set<MessageListener> = new Set();
  private connectedClubId: string | null = null;

  connect(token: string, clubId: string): void {
    // Disconnect if connected to a different club
    if (this.socket?.connected && this.connectedClubId !== clubId) {
      this.disconnect();
    }

    if (this.socket?.connected) {
      return;
    }

    this.connectedClubId = clubId;

    const opts = {
      auth: { token },
      transports: ['websocket', 'polling'] as const,
      autoConnect: true,
    };
    this.socket = SOCKET_ORIGIN ? io(SOCKET_ORIGIN, opts) : io(opts);

    this.socket.on('connect', () => {
      // Connected — rooms are joined automatically in gateway handleConnection
    });

    this.socket.on('chat:message', (message: ChatMessage) => {
      this.messageListeners.forEach((listener) => listener(message));
    });

    this.socket.on('disconnect', () => {
      // Basic disconnect handling — reconnection strategy handled in story 8.3
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectedClubId = null;
    }
  }

  sendMessage(channelId: string, content: string): void {
    if (!this.socket?.connected) {
      return;
    }
    this.socket.emit('chat:send', { channelId, content });
  }

  joinChannel(channelId: string): void {
    if (!this.socket?.connected) {
      return;
    }
    this.socket.emit('chat:join-channel', { channelId });
  }

  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getConnectedClubId(): string | null {
    return this.connectedClubId;
  }
}

export const chatSocket = new ChatSocketClient();
