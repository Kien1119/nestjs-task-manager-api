import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3001',
    credentials: true,
  },
})
export class TasksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TasksGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitTaskCreated(userId: number, task: unknown) {
    this.server.emit(`task:created:${userId}`, task);
  }

  emitTaskUpdated(userId: number, task: unknown) {
    this.server.emit(`task:updated:${userId}`, task);
  }

  emitTaskDeleted(userId: number, taskId: number) {
    this.server.emit(`task:deleted:${userId}`, taskId);
  }

  emitTaskRestored(userId: number, task: unknown) {
    this.server.emit(`task:restored:${userId}`, task);
  }
}
