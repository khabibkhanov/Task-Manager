import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { WsUser } from './decorators/ws-user.decorator';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
@UseGuards(WsJwtGuard)
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  handleConnection(client: Socket) {
    const user = client.data.user;
    if (user && user.userId) {
      if (!this.userSockets.has(user.userId)) {
        this.userSockets.set(user.userId, new Set());
      }
      this.userSockets.get(user.userId)?.add(client.id);
      this.logger.log(`Client connected: ${client.id} (User: ${user.userId})`);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user && user.userId) {
      const sockets = this.userSockets.get(user.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(user.userId);
        }
      }
      this.logger.log(`Client disconnected: ${client.id} (User: ${user.userId})`);
    }
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @WsUser() user: any) {
    this.logger.log(`User ${user.userId} joined notifications room`);
    return { event: 'joined', data: { userId: user.userId } };
  }

  // Method to emit notification to specific user
  emitToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
      this.logger.log(`Notification sent to user ${userId}: ${event}`);
    }
  }

  // Method to emit notification to multiple users
  emitToUsers(userIds: string[], event: string, data: any) {
    userIds.forEach((userId) => {
      this.emitToUser(userId, event, data);
    });
  }

  // Method to emit to all connected clients
  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }
}

