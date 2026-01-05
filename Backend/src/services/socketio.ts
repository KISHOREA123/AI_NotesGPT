import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '@/utils/logger';
import { SocketUser, NoteUpdateEvent, AIJobUpdateEvent } from '@/types';

// Store connected users
const connectedUsers = new Map<string, SocketUser>();

/**
 * Setup Socket.IO server with event handlers
 */
export function setupSocketIO(io: SocketIOServer): void {
  logger.info('Setting up Socket.IO server');

  // Authentication middleware
  io.use(async (_socket, next) => {
    try {
      // TODO: Implement JWT token verification for WebSocket connections
      // const token = socket.handshake.auth.token;
      // const user = await verifyJWTToken(token);
      // socket.userId = user.id;
      
      // For now, allow all connections
      next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Handle new connections
  io.on('connection', (socket: Socket) => {
    logger.info('New socket connection', { socketId: socket.id });

    // Handle user identification
    socket.on('identify', (data: { userId: string }) => {
      try {
        const { userId } = data;
        
        // Store user connection
        const socketUser: SocketUser = {
          id: socket.id,
          socketId: socket.id,
          userId,
          connectedAt: new Date().toISOString(),
        };
        
        connectedUsers.set(socket.id, socketUser);
        
        // Join user-specific room
        socket.join(`user:${userId}`);
        
        logger.info('User identified', { userId, socketId: socket.id });
        
        socket.emit('identified', { success: true });
      } catch (error) {
        logger.error('User identification failed:', error);
        socket.emit('identified', { success: false, error: 'Identification failed' });
      }
    });

    // Handle note subscription
    socket.on('note:subscribe', (noteId: string) => {
      try {
        socket.join(`note:${noteId}`);
        logger.debug('User subscribed to note', { noteId, socketId: socket.id });
        socket.emit('note:subscribed', { noteId, success: true });
      } catch (error) {
        logger.error('Note subscription failed:', error);
        socket.emit('note:subscribed', { noteId, success: false });
      }
    });

    // Handle note unsubscription
    socket.on('note:unsubscribe', (noteId: string) => {
      try {
        socket.leave(`note:${noteId}`);
        logger.debug('User unsubscribed from note', { noteId, socketId: socket.id });
        socket.emit('note:unsubscribed', { noteId, success: true });
      } catch (error) {
        logger.error('Note unsubscription failed:', error);
        socket.emit('note:unsubscribed', { noteId, success: false });
      }
    });

    // Handle real-time note updates
    socket.on('note:update', async (data: { noteId: string; changes: any }) => {
      try {
        const { noteId, changes } = data;
        const socketUser = connectedUsers.get(socket.id);
        
        if (!socketUser) {
          socket.emit('error', { message: 'User not identified' });
          return;
        }

        // TODO: Validate user permissions for the note
        // TODO: Apply changes to database
        // TODO: Broadcast changes to other connected clients
        
        logger.debug('Note update received', { noteId, userId: socketUser.userId });
        
        // Broadcast to other users subscribed to this note
        socket.to(`note:${noteId}`).emit('note:updated', {
          noteId,
          changes,
          userId: socketUser.userId,
        });
        
        socket.emit('note:update:ack', { noteId, success: true });
      } catch (error) {
        logger.error('Note update failed:', error);
        socket.emit('note:update:ack', { 
          noteId: data.noteId, 
          success: false, 
          error: 'Update failed' 
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      const socketUser = connectedUsers.get(socket.id);
      
      if (socketUser) {
        connectedUsers.delete(socket.id);
        logger.info('User disconnected', { 
          userId: socketUser.userId, 
          socketId: socket.id, 
          reason 
        });
      } else {
        logger.info('Socket disconnected', { socketId: socket.id, reason });
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });

  logger.info('Socket.IO server setup completed');
}

/**
 * Broadcast note update to all connected clients
 */
export function broadcastNoteUpdate(event: NoteUpdateEvent): void {
  // TODO: Get io instance and broadcast
  logger.debug('Broadcasting note update', event);
}

/**
 * Broadcast AI job status update
 */
export function broadcastAIJobUpdate(event: AIJobUpdateEvent): void {
  // TODO: Get io instance and broadcast
  logger.debug('Broadcasting AI job update', event);
}

/**
 * Get connected users count
 */
export function getConnectedUsersCount(): number {
  return connectedUsers.size;
}

/**
 * Get connected users for a specific user ID
 */
export function getUserConnections(userId: string): SocketUser[] {
  return Array.from(connectedUsers.values()).filter(user => user.userId === userId);
}

/**
 * Disconnect user sessions
 */
export function disconnectUser(userId: string): void {
  const userConnections = getUserConnections(userId);
  
  userConnections.forEach(connection => {
    connectedUsers.delete(connection.socketId);
    // TODO: Disconnect socket
  });
  
  logger.info('Disconnected user sessions', { userId, count: userConnections.length });
}