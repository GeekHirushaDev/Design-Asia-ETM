import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config/config.js';
import { SocketAuthData } from '../types/index.js';

export const initializeSocket = (io: SocketServer) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
      const user = await User.findById(decoded.userId);

      if (!user || user.status !== 'active') {
        return next(new Error('Authentication error'));
      }

      socket.data = {
        userId: user._id.toString(),
        role: user.role,
      } as SocketAuthData;

      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, role } = socket.data as SocketAuthData;
    console.log(`User ${userId} connected`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Admin gets access to all rooms
    if (role === 'admin') {
      socket.join('admin');
    }

    // Handle task room joining
    socket.on('join-task', (taskId: string) => {
      socket.join(`task:${taskId}`);
    });

    socket.on('leave-task', (taskId: string) => {
      socket.leave(`task:${taskId}`);
    });

    // Handle task updates
    socket.on('task-updated', (data) => {
      socket.to(`task:${data.taskId}`).emit('task-updated', data);
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
      socket.to(`task:${data.taskId}`).emit('typing-start', {
        userId,
        taskId: data.taskId,
      });
    });

    socket.on('typing-stop', (data) => {
      socket.to(`task:${data.taskId}`).emit('typing-stop', {
        userId,
        taskId: data.taskId,
      });
    });

    // Handle location updates
    socket.on('location-update', (data) => {
      if (role === 'employee') {
        socket.to('admin').emit('location-update', {
          userId,
          ...data,
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
    });
  });

  return io;
};