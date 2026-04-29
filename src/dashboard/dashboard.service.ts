import { Injectable } from '@nestjs/common';
import { DevicesService } from '../devices/devices.service';
import { SessionsService } from '../sessions/sessions.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly devicesService: DevicesService,
  ) {}

  async getStats(userId: string) {
    const [totalSessions, activeSessions, connectedDevices] =
      await Promise.all([
        this.sessionsService.countByUser(userId),
        this.sessionsService.countByUser(userId, 'active'),
        this.devicesService.countByUser(userId, 'connected'),
      ]);

    return {
      connectedDevices,
      totalSessions,
      activeSessions,
      avgAttention: 78.5,
      reportsGenerated: 0,
      attentionTrends: [
        { date: '2026-03-01', avgAttention: 78.5 },
        { date: '2026-03-02', avgAttention: 80.2 },
        { date: '2026-03-03', avgAttention: 75.1 },
        { date: '2026-03-04', avgAttention: 82.0 },
      ],
      attentionDistribution: {
        high: 45,
        medium: 35,
        low: 20,
      },
      recentActivity: [
        {
          id: 'activity-1',
          type: 'session_created',
          title: 'New Session',
          description: 'Session "Math 101" was created',
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }
}
