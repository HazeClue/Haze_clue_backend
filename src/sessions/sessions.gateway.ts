import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { SessionsService } from './sessions.service';

@WebSocketGateway({ cors: true })
export class SessionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: any;

  private activeIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly sessionsService: SessionsService,
  ) {}

  async handleConnection(client: any) {
    const token = (client.handshake.query.token as string) || (client.handshake.headers.authorization?.split(' ')[1]);
    
    // We mock jwt verification to avoid failing if token isn't fully valid during demo
    if (!token && !client.handshake.query.sessionId) {
      // client.disconnect();
      // return;
    }

    const url = client.request.url || '';
    const match = url.match(/\/ws\/session\/([^/?]+)/);
    let sessionId = client.handshake.query.sessionId as string;
    
    if (match) {
      sessionId = match[1];
    } else if (!sessionId) {
      // To support generic namespace connection
      sessionId = 'demo-session'; 
    }

    client.join(`session_${sessionId}`);
    this.startSimulationForSession(sessionId);
  }

  handleDisconnect(client: any) {
    // Clean up if needed
  }

  @SubscribeMessage('action')
  handleAction(
    @MessageBody() data: { action: string },
    @ConnectedSocket() client: any,
  ) {
    for (const room of client.rooms) {
      if (room.startsWith('session_')) {
        const sessionId = room.replace('session_', '');
        
        switch (data.action) {
          case 'pause':
          case 'resume':
            break;
          case 'end':
             const interval = this.activeIntervals.get(sessionId);
             if (interval) {
               clearInterval(interval);
               this.activeIntervals.delete(sessionId);
             }
             break;
        }
      }
    }
  }

  private startSimulationForSession(sessionId: string) {
    if (this.activeIntervals.has(sessionId)) return;

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 2;
      
      const payload = {
        type: 'attention_update',
        timestamp: new Date().toISOString(),
        data: {
          classAvgAttention: Math.floor(Math.random() * 20) + 70,
          connectedDevices: 18,
          totalDevices: 20,
          duration: `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`,
          remainingTime: null,
          engagementLevel: 'high',
          perStudent: [
            {
              deviceId: 'dev123',
              studentName: 'Student A',
              attention: Math.floor(Math.random() * 20) + 70,
            }
          ]
        }
      };

      this.server.to(`session_${sessionId}`).emit('message', payload);
      this.server.to(`session_${sessionId}`).emit('attention_update', payload);

    }, 2000);

    this.activeIntervals.set(sessionId, interval);
  }

  // Helper method to emit alert to a session room
  broadcastAlert(sessionId: string, message: string) {
    this.server.to(`session_${sessionId}`).emit('class_alert', {
      timestamp: new Date().toISOString(),
      message,
    });
    // For clients connected directly to sessionId room (EegGateway compat)
    this.server.to(sessionId).emit('class_alert', {
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
