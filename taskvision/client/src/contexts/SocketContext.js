import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      // Initialize socket connection
      socketRef.current = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
        auth: {
          userId: user.id
        }
      });

      const socket = socketRef.current;

      // Join user room
      socket.emit('join', user.id);

      // Listen for connection
      socket.on('connect', () => {
        console.log('Connected to server');
      });

      // Listen for disconnection
      socket.on('disconnect', () => {
        console.log('Disconnected from server');
      });

      // Listen for notifications
      socket.on('newNotification', (notification) => {
        toast.success(notification.title, {
          description: notification.message
        });
      });

      // Listen for task updates
      socket.on('taskUpdated', (data) => {
        // Handle real-time task updates
        console.log('Task updated:', data);
      });

      // Listen for new tasks
      socket.on('taskCreated', (data) => {
        // Handle real-time task creation
        console.log('Task created:', data);
      });

      // Listen for task deletion
      socket.on('taskDeleted', (data) => {
        // Handle real-time task deletion
        console.log('Task deleted:', data);
      });

      // Listen for comments
      socket.on('commentAdded', (data) => {
        // Handle real-time comments
        console.log('Comment added:', data);
      });

      // Listen for typing indicators
      socket.on('userTyping', (data) => {
        // Handle typing indicators
        console.log('User typing:', data);
      });

      // Listen for location updates
      socket.on('locationUpdated', (data) => {
        // Handle location updates
        console.log('Location updated:', data);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  // Socket utility functions
  const joinProject = (projectId) => {
    if (socketRef.current) {
      socketRef.current.emit('joinProject', projectId);
    }
  };

  const leaveProject = (projectId) => {
    if (socketRef.current) {
      socketRef.current.emit('leaveProject', projectId);
    }
  };

  const emitTaskUpdate = (data) => {
    if (socketRef.current) {
      socketRef.current.emit('taskUpdate', data);
    }
  };

  const emitNewTask = (data) => {
    if (socketRef.current) {
      socketRef.current.emit('newTask', data);
    }
  };

  const emitDeleteTask = (data) => {
    if (socketRef.current) {
      socketRef.current.emit('deleteTask', data);
    }
  };

  const emitNewComment = (data) => {
    if (socketRef.current) {
      socketRef.current.emit('newComment', data);
    }
  };

  const emitUserTyping = (data) => {
    if (socketRef.current) {
      socketRef.current.emit('userTyping', data);
    }
  };

  const emitLocationUpdate = (data) => {
    if (socketRef.current) {
      socketRef.current.emit('locationUpdate', data);
    }
  };

  const value = {
    socket: socketRef.current,
    joinProject,
    leaveProject,
    emitTaskUpdate,
    emitNewTask,
    emitDeleteTask,
    emitNewComment,
    emitUserTyping,
    emitLocationUpdate
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
