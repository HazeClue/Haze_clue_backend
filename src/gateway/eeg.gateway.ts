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
    origin: '*',
  },
})
export class EegGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  
  private simulationIntervals: Map<string, NodeJS.Timeout> = new Map();

  afterInit(server: Server) {
    console.log('WebSocket Gateway initialized.');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const sessionId = client.handshake.query.sessionId as string;
    
    if (sessionId) {
      client.join(sessionId);
      console.log(`Client ${client.id} joined session ${sessionId}`);
      
      // For demonstration, start emitting simulated data to this room if not already emitting
      this.startSimulation(sessionId);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
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
    if (payload.action === 'end' && sessionId) {
      console.log(`Session ${sessionId} ended by client ${client.id}`);
      this.stopSimulation(sessionId);
      this.server.to(sessionId).emit('session_ended', { sessionId });
    }
  }

  // Helper method to simulate incoming EEG data for a session
  private startSimulation(sessionId: string) {
    if (this.simulationIntervals.has(sessionId)) return;

    console.log(`Starting EEG simulation for session: ${sessionId}`);
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
      console.log(`Stopping EEG simulation for session: ${sessionId}`);
      clearInterval(this.simulationIntervals.get(sessionId));
      this.simulationIntervals.delete(sessionId);
    }
  }
}
