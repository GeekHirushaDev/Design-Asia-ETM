import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { socketManager } from '../../lib/socket';

interface Message {
  _id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  type: 'text' | 'file';
  fileUrl?: string;
  fileName?: string;
}

interface ChatInterfaceProps {
  roomId: string;
  roomType: 'task' | 'dm';
  roomName: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ roomId, roomType, roomName }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;

    // Join the chat room
    socket.emit('join-chat', { roomId, roomType });

    // Listen for messages
    socket.on('chat-message', handleNewMessage);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stopped-typing', handleUserStoppedTyping);

    return () => {
      socket.off('chat-message', handleNewMessage);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-stopped-typing', handleUserStoppedTyping);
      socket.emit('leave-chat', { roomId });
    };
  }, [roomId, roomType]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleUserTyping = (data: { userId: string; userName: string }) => {
    if (data.userId !== user?._id) {
      setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userName]);
    }
  };

  const handleUserStoppedTyping = (data: { userId: string }) => {
    if (data.userId !== user?._id) {
      setTypingUsers(prev => prev.filter(name => name !== data.userId));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const socket = socketManager.getSocket();
    if (!socket) return;

    const message = {
      roomId,
      roomType,
      content: newMessage.trim(),
      type: 'text' as const,
    };

    socket.emit('send-message', message);
    setNewMessage('');
    handleStopTyping();
  };

  const handleTyping = () => {
    const socket = socketManager.getSocket();
    if (!socket) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('start-typing', { roomId });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  };

  const handleStopTyping = () => {
    const socket = socketManager.getSocket();
    if (!socket) return;

    if (isTyping) {
      setIsTyping(false);
      socket.emit('stop-typing', { roomId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">{roomName}</h3>
        <p className="text-sm text-gray-600">
          {roomType === 'task' ? 'Task Discussion' : 'Direct Message'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`flex ${message.senderId === user?._id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.senderId === user?._id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.senderId !== user?._id && (
                <p className="text-xs font-medium mb-1 opacity-75">
                  {message.senderName}
                </p>
              )}
              <p className="text-sm">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.senderId === user?._id ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <p className="text-sm text-gray-600">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Paperclip size={20} />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Smile size={20} />
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};