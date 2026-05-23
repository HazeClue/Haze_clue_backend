import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { DevicesService } from '../devices/devices.service';
import { SessionsService } from '../sessions/sessions.service';
import { Session } from '../sessions/schemas/session.schema';
import { Telemetry } from '../gateway/schemas/telemetry.schema';
import { DashboardService } from './dashboard.service';

// Mock session model
const mockSessionModel = {
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
      limit: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    }),
  }),
};

// Mock telemetry model
const mockTelemetryModel = {
  find: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    }),
  }),
};

describe('DashboardService', () => {
  let service: DashboardService;
  let sessionsService: Partial<SessionsService>;
  let devicesService: Partial<DevicesService>;

  beforeEach(async () => {
    sessionsService = {
      countByUser: jest.fn(),
    };

    devicesService = {
      countByUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: SessionsService, useValue: sessionsService },
        { provide: DevicesService, useValue: devicesService },
        { provide: getModelToken(Session.name), useValue: mockSessionModel },
        { provide: getModelToken(Telemetry.name), useValue: mockTelemetryModel },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should return aggregated stats', async () => {
      (sessionsService.countByUser as jest.Mock)
        .mockResolvedValueOnce(10) // total sessions
        .mockResolvedValueOnce(2); // active sessions
      (devicesService.countByUser as jest.Mock).mockResolvedValue(3); // connected devices

      const result = await service.getStats('507f1f77bcf86cd799439012');

      expect(result.connectedDevices).toBe(3);
      expect(result.totalSessions).toBe(10);
      expect(result.activeSessions).toBe(2);
      expect(result.avgAttention).toBeNull();
      expect(result.reportsGenerated).toBe(0);
    });

    it('should return zeros when empty', async () => {
      (sessionsService.countByUser as jest.Mock).mockResolvedValue(0);
      (devicesService.countByUser as jest.Mock).mockResolvedValue(0);

      const result = await service.getStats('507f1f77bcf86cd799439012');

      expect(result.connectedDevices).toBe(0);
      expect(result.totalSessions).toBe(0);
      expect(result.activeSessions).toBe(0);
    });

    it('should call services with correct userId', async () => {
      (sessionsService.countByUser as jest.Mock).mockResolvedValue(0);
      (devicesService.countByUser as jest.Mock).mockResolvedValue(0);

      await service.getStats('507f1f77bcf86cd799439012');

      expect(sessionsService.countByUser).toHaveBeenCalledWith('507f1f77bcf86cd799439012');
      expect(sessionsService.countByUser).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439012',
        'active',
      );
      expect(devicesService.countByUser).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439012',
        'connected',
      );
    });
  });
});
