import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:3000', 'http://localhost:3003', 'https://hazeclue.netlify.app'],
    credentials: true,
  },
})
export class EegGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EegGateway.name);
  
  private simulationIntervals: Map<string, NodeJS.Timeout> = new Map();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    const sessionId = client.handshake.query.sessionId as string;
    
    if (sessionId) {
      client.join(sessionId);
      this.logger.log(`Client ${client.id} joined session ${sessionId}`);
      
      // Only start simulation if USE_SIMULATION is enabled (default: true)
      const useSimulation = process.env.USE_SIMULATION !== 'false';
      if (useSimulation) {
        this.startSimulation(sessionId);
      }
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const sessionId = client.handshake.query.sessionId as string;
    if (sessionId) {
      client.leave(sessionId);
      
      // If no clients left in the room, stop simulation
      const room = this.server.sockets.adapter.rooms.get(sessionId);
      if (!room || room.size === 0) {
        this.stopSimulation(sessionId);
      }
    }
  }

  @SubscribeMessage('action')
  handleAction(client: Socket, payload: any): void {
    const sessionId = client.handshake.query.sessionId as string;
    if (!sessionId) return;

    if (payload.action === 'end') {
      this.logger.log(`Session ${sessionId} ended by client ${client.id}`);
      this.stopSimulation(sessionId);
      this.server.to(sessionId).emit('session_ended', { sessionId });
    } else if (payload.action === 'pause') {
      this.logger.log(`Session ${sessionId} paused by client ${client.id}`);
      this.stopSimulation(sessionId);
    } else if (payload.action === 'resume') {
      this.logger.log(`Session ${sessionId} resumed by client ${client.id}`);
      this.startSimulation(sessionId);
    }
  }

  // Helper method to emit alert to a session room
  broadcastAlert(sessionId: string, message: string) {
    this.server.to(sessionId).emit('class_alert', {
      timestamp: new Date().toISOString(),
      message,
    });
  }

  // Helper method to simulate incoming EEG data for a session
  private startSimulation(sessionId: string) {
    if (this.simulationIntervals.has(sessionId)) return;

    this.logger.debug(`Starting EEG simulation for session: ${sessionId}`);
    const interval = setInterval(() => {
      const data = {
        type: 'attention_update',
        timestamp: new Date().toISOString(),
        data: {
          classAvgAttention: Math.floor(Math.random() * 20) + 70, // 70-90
          connectedDevices: 18,
          totalDevices: 20,
          duration: '25:30', // In a real app, calculate this dynamically
          engagementLevel: 'high',
          perStudent: [
            {
              deviceId: 'dev123',
              studentName: 'Student A',
              attention: Math.floor(Math.random() * 20) + 70,
            },
            {
              deviceId: 'dev124',
              studentName: 'Student B',
              attention: Math.floor(Math.random() * 30) + 60,
            },
            {
              deviceId: 'dev125',
              studentName: 'Student C',
              attention: Math.floor(Math.random() * 40) + 50,
            }
          ]
        }
      };

      this.server.to(sessionId).emit('attention_update', data);
    }, 2000); // Emit every 2 seconds

    this.simulationIntervals.set(sessionId, interval);
  }

  private stopSimulation(sessionId: string) {
    if (this.simulationIntervals.has(sessionId)) {
      this.logger.debug(`Stopping EEG simulation for session: ${sessionId}`);
      clearInterval(this.simulationIntervals.get(sessionId));
      this.simulationIntervals.delete(sessionId);
    }
  }
}
