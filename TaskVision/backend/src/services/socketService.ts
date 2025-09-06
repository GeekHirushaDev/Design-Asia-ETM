import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Chat, Message } from '../models/Chat';
import { LocationTracking } from '../models/LocationTracking';
import { Geofence } from '../models/Geofence';
import GeofenceService from './geofenceService';
import LocationValidator from '../utils/locationValidator';

interface AuthenticatedSocket extends Socket {
  user?: IUser;
  locationSubscription?: NodeJS.Timeout;
  lastLocation?: {
    lat: number;
    lng: number;
    timestamp: Date;
  };
}

class SocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private userLocations: Map<string, any> = new Map(); // userId -> latest location data
  private locationUpdateInterval: number = 30000; // 30 seconds
  private batteryLowThreshold: number = 20;
  private geofenceCheckInterval: number = 10000; // 10 seconds

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        credentials: true
      }
    });

    this.initializeAuth();
    this.initializeEventHandlers();
  }

  private initializeAuth() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        const user = await User.findById(decoded.userId);
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private initializeEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      if (socket.user) {
        console.log(`User ${socket.user.firstName} ${socket.user.lastName} connected`);
        
        // Store user connection
        this.connectedUsers.set(socket.user._id.toString(), socket.id);
        
        // Join user to their room
        socket.join(`user_${socket.user._id}`);
        
        // Join admin room if admin
        if (socket.user.role === 'admin') {
          socket.join('admin_room');
        }

        // Notify admin of user connection
        if (socket.user.role === 'employee') {
          this.notifyAdmins('user_connected', {
            userId: socket.user._id,
            userName: `${socket.user.firstName} ${socket.user.lastName}`,
            timestamp: new Date()
          });
        }

        this.handleLocationTracking(socket);
        this.handleRealtimeLocationUpdates(socket);
        this.handleGeofenceEvents(socket);
        this.handleBatteryMonitoring(socket);
        this.handleTaskEvents(socket);
        this.handleChatEvents(socket);
        this.handleDisconnection(socket);
      }
    });
  }

  private handleLocationTracking(socket: AuthenticatedSocket) {
    socket.on('location_update', async (data: { lat: number; lng: number; batteryLevel?: number }) => {
      try {
        if (socket.user) {
          // Update user location in database
          await User.findByIdAndUpdate(socket.user._id, {
            'location.lat': data.lat,
            'location.lng': data.lng,
            batteryLevel: data.batteryLevel || socket.user.batteryLevel,
            lastActive: new Date()
          });

          // Broadcast location to admins
          this.notifyAdmins('employee_location_update', {
            userId: socket.user._id,
            userName: `${socket.user.firstName} ${socket.user.lastName}`,
            location: {
              lat: data.lat,
              lng: data.lng
            },
            batteryLevel: data.batteryLevel,
            timestamp: new Date()
          });

          // Acknowledge the update
          socket.emit('location_updated', { success: true });
        }
      } catch (error) {
        socket.emit('location_update_error', { message: 'Failed to update location' });
      }
    });

    socket.on('battery_update', async (data: { batteryLevel: number }) => {
      try {
        if (socket.user) {
          await User.findByIdAndUpdate(socket.user._id, {
            batteryLevel: data.batteryLevel,
            lastActive: new Date()
          });

          // Notify admins if battery is low
          if (data.batteryLevel <= 20) {
            this.notifyAdmins('low_battery_alert', {
              userId: socket.user._id,
              userName: `${socket.user.firstName} ${socket.user.lastName}`,
              batteryLevel: data.batteryLevel,
              timestamp: new Date()
            });
          }
        }
      } catch (error) {
        console.error('Battery update error:', error);
      }
    });
  }

  private handleRealtimeLocationUpdates(socket: AuthenticatedSocket) {
    // Enhanced location tracking with real-time updates
    socket.on('start_location_tracking', (data: { interval?: number }) => {
      if (!socket.user) return;

      const interval = data.interval || this.locationUpdateInterval;
      
      // Clear existing interval if any
      if (socket.locationSubscription) {
        clearInterval(socket.locationSubscription);
      }

      // Start periodic location requests
      socket.locationSubscription = setInterval(() => {
        socket.emit('request_location_update');
      }, interval);

      socket.emit('location_tracking_started', { interval });
    });

    socket.on('stop_location_tracking', () => {
      if (socket.locationSubscription) {
        clearInterval(socket.locationSubscription);
        socket.locationSubscription = undefined;
      }
      socket.emit('location_tracking_stopped');
    });

    socket.on('location_update_enhanced', async (data: {
      lat: number;
      lng: number;
      accuracy: number;
      altitude?: number;
      heading?: number;
      speed?: number;
      timestamp: Date;
      batteryLevel?: number;
      deviceInfo?: any;
    }) => {
      try {
        if (!socket.user) return;

        const userId = socket.user._id.toString();
        const locationData = {
          lat: data.lat,
          lng: data.lng,
          accuracy: data.accuracy,
          altitude: data.altitude,
          heading: data.heading,
          speed: data.speed,
          timestamp: new Date(data.timestamp),
          batteryLevel: data.batteryLevel,
          deviceInfo: data.deviceInfo
        };

        // Store in memory for real-time access
        this.userLocations.set(userId, {
          ...locationData,
          userId,
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          lastUpdate: new Date()
        });

        // Check for geofence events
        await this.checkGeofenceEvents(socket.user, locationData);

        // Validate location quality
        const validation = await this.validateLocationUpdate(locationData, userId);

        // Save to database
        const locationEntry = new LocationTracking({
          userId: socket.user._id,
          location: {
            lat: data.lat,
            lng: data.lng,
            accuracy: data.accuracy,
            altitude: data.altitude,
            heading: data.heading,
            speed: data.speed
          },
          batteryLevel: data.batteryLevel,
          deviceInfo: data.deviceInfo,
          timestamp: locationData.timestamp,
          metadata: {
            source: 'realtime_socket',
            validation: validation.isValid,
            confidence: validation.confidence
          }
        });

        await locationEntry.save();

        // Update user's last location
        await User.findByIdAndUpdate(socket.user._id, {
          'lastLocation.coordinates': [data.lng, data.lat],
          'lastLocation.timestamp': locationData.timestamp,
          'lastLocation.batteryLevel': data.batteryLevel,
          lastActive: new Date()
        });

        // Broadcast to admins with real-time data
        this.notifyAdmins('realtime_location_update', {
          userId: socket.user._id,
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          location: locationData,
          validation,
          isOnline: true,
          lastUpdate: new Date()
        });

        // Acknowledge the update
        socket.emit('location_update_acknowledged', {
          success: true,
          validation,
          timestamp: new Date()
        });

        socket.lastLocation = {
          lat: data.lat,
          lng: data.lng,
          timestamp: locationData.timestamp
        };

      } catch (error) {
        console.error('Enhanced location update error:', error);
        socket.emit('location_update_error', {
          message: 'Failed to process location update',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  private handleGeofenceEvents(socket: AuthenticatedSocket) {
    socket.on('geofence_check', async (data: { lat: number; lng: number }) => {
      try {
        if (!socket.user) return;

        const currentGeofences = await GeofenceService.getUserCurrentGeofences(
          socket.user._id.toString(),
          { lat: data.lat, lng: data.lng }
        );

        socket.emit('geofence_status', {
          isInsideGeofence: currentGeofences.length > 0,
          geofences: currentGeofences.map(gf => ({
            id: gf._id,
            name: gf.name,
            type: gf.type
          })),
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Geofence check error:', error);
        socket.emit('geofence_check_error', { message: 'Failed to check geofences' });
      }
    });

    socket.on('geofence_event', async (data: {
      eventType: 'enter' | 'exit';
      geofenceId: string;
      location: { lat: number; lng: number };
      batteryLevel?: number;
    }) => {
      try {
        if (!socket.user) return;

        await GeofenceService.processGeofenceEvent({
          userId: socket.user._id.toString(),
          geofenceId: data.geofenceId,
          eventType: data.eventType,
          timestamp: new Date(),
          location: data.location,
          batteryLevel: data.batteryLevel
        });

        // Broadcast geofence event to admins
        this.notifyAdmins('geofence_event_occurred', {
          userId: socket.user._id,
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          eventType: data.eventType,
          geofenceId: data.geofenceId,
          location: data.location,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Geofence event processing error:', error);
      }
    });
  }

  private handleBatteryMonitoring(socket: AuthenticatedSocket) {
    socket.on('battery_status_update', async (data: {
      batteryLevel: number;
      isCharging: boolean;
      chargingTime?: number;
      dischargingTime?: number;
    }) => {
      try {
        if (!socket.user) return;

        // Update user battery info
        await User.findByIdAndUpdate(socket.user._id, {
          batteryLevel: data.batteryLevel,
          'batteryInfo.isCharging': data.isCharging,
          'batteryInfo.chargingTime': data.chargingTime,
          'batteryInfo.dischargingTime': data.dischargingTime,
          'batteryInfo.lastUpdate': new Date(),
          lastActive: new Date()
        });

        // Check for battery alerts
        const alertLevel = this.getBatteryAlertLevel(data.batteryLevel);
        
        if (alertLevel !== 'normal') {
          this.notifyAdmins('battery_alert', {
            userId: socket.user._id,
            userName: `${socket.user.firstName} ${socket.user.lastName}`,
            batteryLevel: data.batteryLevel,
            alertLevel,
            isCharging: data.isCharging,
            timestamp: new Date()
          });

          // Notify user if critical
          if (alertLevel === 'critical') {
            socket.emit('battery_critical_warning', {
              batteryLevel: data.batteryLevel,
              message: 'Critical battery level. Please charge your device.',
              timestamp: new Date()
            });
          }
        }

        // Update real-time location data with battery info
        const userId = socket.user._id.toString();
        const currentLocation = this.userLocations.get(userId);
        if (currentLocation) {
          currentLocation.batteryLevel = data.batteryLevel;
          currentLocation.batteryInfo = data;
          this.userLocations.set(userId, currentLocation);
        }

        socket.emit('battery_status_updated', { success: true });

      } catch (error) {
        console.error('Battery monitoring error:', error);
        socket.emit('battery_update_error', { message: 'Failed to update battery status' });
      }
    });

    socket.on('request_battery_optimization', () => {
      if (!socket.user) return;

      const optimizationTips = this.getBatteryOptimizationTips();
      socket.emit('battery_optimization_tips', {
        tips: optimizationTips,
        timestamp: new Date()
      });
    });
  }

  private async checkGeofenceEvents(user: IUser, locationData: any): Promise<void> {
    try {
      const userId = user._id.toString();
      const currentGeofences = await GeofenceService.getUserCurrentGeofences(
        userId,
        { lat: locationData.lat, lng: locationData.lng }
      );

      // Get previous location to detect entry/exit
      const previousLocation = this.userLocations.get(userId);
      if (previousLocation && previousLocation.geofences) {
        const previousGeofenceIds = previousLocation.geofences.map((gf: any) => gf.id.toString());
        const currentGeofenceIds = currentGeofences.map(gf => gf._id.toString());

        // Detect entries
        const entered = currentGeofenceIds.filter(id => !previousGeofenceIds.includes(id));
        const exited = previousGeofenceIds.filter((id: string) => !currentGeofenceIds.includes(id));

        // Process entry events
        for (const geofenceId of entered) {
          await GeofenceService.processGeofenceEvent({
            userId,
            geofenceId,
            eventType: 'enter',
            timestamp: new Date(),
            location: { lat: locationData.lat, lng: locationData.lng },
            batteryLevel: locationData.batteryLevel
          });
        }

        // Process exit events
        for (const geofenceId of exited) {
          await GeofenceService.processGeofenceEvent({
            userId,
            geofenceId,
            eventType: 'exit',
            timestamp: new Date(),
            location: { lat: locationData.lat, lng: locationData.lng },
            batteryLevel: locationData.batteryLevel
          });
        }
      }

      // Update current geofences in memory
      const currentLocationData = this.userLocations.get(userId) || {};
      currentLocationData.geofences = currentGeofences;
      this.userLocations.set(userId, currentLocationData);

    } catch (error) {
      console.error('Error checking geofence events:', error);
    }
  }

  private async validateLocationUpdate(locationData: any, userId: string): Promise<any> {
    try {
      const previousLocations = await LocationTracking.find({
        userId,
        timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Last 30 minutes
      })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

      const validation = LocationValidator.calculateLocationConfidence(
        locationData,
        previousLocations.map(loc => ({
          lat: loc.location.latitude,
          lng: loc.location.longitude,
          timestamp: loc.timestamp
        }))
      );

      return {
        isValid: validation.confidence > 0.6,
        confidence: validation.confidence,
        factors: validation.factors
      };
    } catch (error) {
      console.error('Location validation error:', error);
      return { isValid: true, confidence: 0.5, factors: {} };
    }
  }

  private getBatteryAlertLevel(batteryLevel: number): 'normal' | 'low' | 'critical' {
    if (batteryLevel <= 10) return 'critical';
    if (batteryLevel <= this.batteryLowThreshold) return 'low';
    return 'normal';
  }

  private getBatteryOptimizationTips(): string[] {
    return [
      'Reduce screen brightness',
      'Close unused apps',
      'Turn off Wi-Fi and Bluetooth when not needed',
      'Use airplane mode in low signal areas',
      'Disable background app refresh',
      'Turn off location services for non-essential apps'
    ];
  }

  // Method to get current real-time location data
  public getCurrentLocationData(): Map<string, any> {
    return this.userLocations;
  }

  // Method to emit to admin users
  public emitToAdmins(event: string, data: any): void {
    this.io.to('admin_room').emit(event, data);
  }

  // Method to emit to specific user
  public emitToUser(userId: string, event: string, data: any): void {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  private handleTaskEvents(socket: AuthenticatedSocket) {
    socket.on('task_status_update', (data: { taskId: string; status: string; timestamp: Date }) => {
      // Broadcast to admins and assigned user
      this.io.to('admin_room').emit('task_status_changed', {
        ...data,
        userId: socket.user?._id,
        userName: `${socket.user?.firstName} ${socket.user?.lastName}`
      });
    });

    socket.on('task_timer_start', (data: { taskId: string; timestamp: Date }) => {
      this.io.to('admin_room').emit('task_timer_started', {
        ...data,
        userId: socket.user?._id,
        userName: `${socket.user?.firstName} ${socket.user?.lastName}`
      });
    });

    socket.on('task_timer_stop', (data: { taskId: string; duration: number; timestamp: Date }) => {
      this.io.to('admin_room').emit('task_timer_stopped', {
        ...data,
        userId: socket.user?._id,
        userName: `${socket.user?.firstName} ${socket.user?.lastName}`
      });
    });

    socket.on('task_completed', (data: { taskId: string; timestamp: Date }) => {
      this.io.to('admin_room').emit('task_completion', {
        ...data,
        userId: socket.user?._id,
        userName: `${socket.user?.firstName} ${socket.user?.lastName}`
      });
    });

    socket.on('proof_submitted', (data: { taskId: string; proofType: string; timestamp: Date }) => {
      this.io.to('admin_room').emit('new_proof_submission', {
        ...data,
        userId: socket.user?._id,
        userName: `${socket.user?.firstName} ${socket.user?.lastName}`
      });
    });
  }

  private handleChatEvents(socket: AuthenticatedSocket) {
    socket.on('join_chat', (chatId: string) => {
      socket.join(`chat_${chatId}`);
    });

    socket.on('leave_chat', (chatId: string) => {
      socket.leave(`chat_${chatId}`);
    });

    socket.on('send_message', async (data: {
      chatId: string;
      content: string;
      type?: string;
      attachments?: any[];
    }) => {
      try {
        const message = await Message.create({
          chatId: data.chatId,
          sender: socket.user?._id,
          content: data.content,
          type: data.type || 'text',
          attachments: data.attachments || []
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'firstName lastName profileImage');

        // Update chat's last message
        await Chat.findByIdAndUpdate(data.chatId, {
          lastMessage: {
            content: data.content,
            sender: socket.user?._id,
            timestamp: new Date()
          }
        });

        // Broadcast to chat participants
        this.io.to(`chat_${data.chatId}`).emit('new_message', populatedMessage);
      } catch (error) {
        socket.emit('message_error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing_start', (data: { chatId: string }) => {
      socket.to(`chat_${data.chatId}`).emit('user_typing', {
        userId: socket.user?._id,
        userName: `${socket.user?.firstName} ${socket.user?.lastName}`
      });
    });

    socket.on('typing_stop', (data: { chatId: string }) => {
      socket.to(`chat_${data.chatId}`).emit('user_stopped_typing', {
        userId: socket.user?._id
      });
    });

    socket.on('mark_messages_read', async (data: { chatId: string; messageIds: string[] }) => {
      try {
        await Message.updateMany(
          { _id: { $in: data.messageIds } },
          { $addToSet: { readBy: { user: socket.user?._id, readAt: new Date() } } }
        );

        socket.to(`chat_${data.chatId}`).emit('messages_read', {
          userId: socket.user?._id,
          messageIds: data.messageIds
        });
      } catch (error) {
        console.error('Mark messages read error:', error);
      }
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket) {
    socket.on('disconnect', () => {
      if (socket.user) {
        console.log(`User ${socket.user.firstName} ${socket.user.lastName} disconnected`);
        
        // Remove from connected users
        this.connectedUsers.delete(socket.user._id.toString());

        // Notify admins of disconnection
        if (socket.user.role === 'employee') {
          this.notifyAdmins('user_disconnected', {
            userId: socket.user._id,
            userName: `${socket.user.firstName} ${socket.user.lastName}`,
            timestamp: new Date()
          });
        }
      }
    });
  }

  // Public methods for external use
  public notifyUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public notifyAdmins(event: string, data: any) {
    this.io.to('admin_room').emit(event, data);
  }

  public broadcastToAll(event: string, data: any) {
    this.io.emit(event, data);
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Notification methods
  public sendTaskNotification(userId: string, task: any) {
    this.notifyUser(userId, 'task_assigned', {
      task,
      message: `New task assigned: ${task.title}`,
      timestamp: new Date()
    });
  }

  public sendTaskUpdate(taskId: string, assignedUserId: string, update: any) {
    // Notify assigned user
    this.notifyUser(assignedUserId, 'task_updated', {
      taskId,
      update,
      timestamp: new Date()
    });

    // Notify admins
    this.notifyAdmins('task_update', {
      taskId,
      assignedUserId,
      update,
      timestamp: new Date()
    });
  }

  public sendApprovalNotification(userId: string, task: any, approved: boolean) {
    this.notifyUser(userId, 'task_approval', {
      taskId: task._id,
      taskTitle: task.title,
      approved,
      message: approved ? 'Task approved!' : 'Task rejected',
      timestamp: new Date()
    });
  }

  public sendSystemNotification(userIds: string[], message: string, type: string = 'info') {
    userIds.forEach(userId => {
      this.notifyUser(userId, 'system_notification', {
        message,
        type,
        timestamp: new Date()
      });
    });
  }
}

export default SocketService;
