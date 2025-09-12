import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io('http://localhost:3001', {
      auth: {
        token,
      },
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.handleReconnection();
    });

    return this.socket;
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.socket?.connect();
      }, 1000 * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  joinTask(taskId: string) {
    this.socket?.emit('join-task', taskId);
  }

  leaveTask(taskId: string) {
    this.socket?.emit('leave-task', taskId);
  }

  emitTaskUpdate(data: any) {
    this.socket?.emit('task-updated', data);
  }

  emitTypingStart(taskId: string) {
    this.socket?.emit('typing-start', { taskId });
  }

  emitTypingStop(taskId: string) {
    this.socket?.emit('typing-stop', { taskId });
  }

  emitLocationUpdate(data: { location: { lat: number; lng: number }; batteryLevel?: number }) {
    this.socket?.emit('location-update', data);
  }
}

export const socketManager = new SocketManager();