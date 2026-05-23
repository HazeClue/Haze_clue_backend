import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications/notifications.service';
import { Session } from './schemas/session.schema';
import { SessionsService } from './sessions.service';

// ── Mock session data ─────────────────────────────────
const mockSession = {
  _id: '507f1f77bcf86cd799439011',
  user: '507f1f77bcf86cd799439012',
  title: 'Test Session',
  className: 'CS101',
  subject: 'Computer Science',
  duration: 45,
  students: 30,
  status: 'draft',
  monitoringSettings: {
    attentionTracking: true,
    alerts: true,
    recording: false,
  },
  notes: '',
  toJSON: function () {
    return { id: this._id, title: this.title, status: this.status };
  },
  save: jest.fn().mockReturnThis(),
  deleteOne: jest.fn(),
};

// ── Mock model ────────────────────────────────────────
const mockSessionModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
};

// Mock NotificationsService
const mockNotificationsService = {
  createNotification: jest.fn().mockResolvedValue({}),
};

describe('SessionsService', () => {
  let service: SessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: getModelToken(Session.name),
          useValue: mockSessionModel,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── findAll ─────────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated sessions', async () => {
      const sessions = [mockSession];
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(sessions),
      };
      mockSessionModel.find.mockReturnValue(chainable);
      mockSessionModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAll('507f1f77bcf86cd799439012', 1, 10);

      expect(result.data).toEqual(sessions);
      expect(result.meta.total).toBe(1);
      expect(result.meta.current_page).toBe(1);
      expect(result.meta.per_page).toBe(10);
    });

    it('should calculate last_page correctly', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockSessionModel.find.mockReturnValue(chainable);
      mockSessionModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(25),
      });

      const result = await service.findAll('507f1f77bcf86cd799439012', 1, 10);

      expect(result.meta.last_page).toBe(3);
    });
  });

  // ── findOne ─────────────────────────────────────────
  describe('findOne', () => {
    it('should throw NotFoundException for invalid ObjectId', async () => {
      await expect(
        service.findOne('507f1f77bcf86cd799439012', 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when session not found', async () => {
      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.findOne(
          '507f1f77bcf86cd799439012',
          '507f1f77bcf86cd799439011',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return session when found', async () => {
      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSession),
      });

      const result = await service.findOne(
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439011',
      );

      expect(result).toEqual(mockSession);
    });
  });

  // ── create ──────────────────────────────────────────
  describe('create', () => {
    it('should create and return a session', async () => {
      mockSessionModel.create.mockResolvedValue(mockSession);

      const result = await service.create('507f1f77bcf86cd799439012', {
        title: 'Test Session',
        className: 'CS101',
        subject: 'Computer Science',
        duration: 45,
        students: 30,
      });

      expect(result).toEqual(mockSession);
      expect(mockSessionModel.create).toHaveBeenCalled();
    });
  });

  // ── start ───────────────────────────────────────────
  describe('start', () => {
    it('should throw BadRequestException if session is already active', async () => {
      const activeSession = { ...mockSession, status: 'active' };
      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(activeSession),
      });

      await expect(
        service.start(
          '507f1f77bcf86cd799439012',
          '507f1f77bcf86cd799439011',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if session is completed', async () => {
      const completedSession = { ...mockSession, status: 'completed' };
      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(completedSession),
      });

      await expect(
        service.start(
          '507f1f77bcf86cd799439012',
          '507f1f77bcf86cd799439011',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should start a draft session', async () => {
      const draftSession = {
        ...mockSession,
        status: 'draft',
        save: jest.fn().mockReturnThis(),
      };
      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(draftSession),
      });

      const result = await service.start(
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439011',
      );

      expect(result.status).toBe('active');
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(draftSession.save).toHaveBeenCalled();
    });
  });

  // ── end ─────────────────────────────────────────────
  describe('end', () => {
    it('should throw BadRequestException if session is not active', async () => {
      const draftSession = { ...mockSession, status: 'draft' };
      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(draftSession),
      });

      await expect(
        service.end(
          '507f1f77bcf86cd799439012',
          '507f1f77bcf86cd799439011',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should end an active session', async () => {
      const activeSession = {
        ...mockSession,
        status: 'active',
        save: jest.fn().mockReturnThis(),
      };
      mockSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(activeSession),
      });

      const result = await service.end(
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439011',
      );

      expect(result.status).toBe('completed');
      expect(result.endedAt).toBeInstanceOf(Date);
      expect(activeSession.save).toHaveBeenCalled();
    });
  });

  // ── countByUser ─────────────────────────────────────
  describe('countByUser', () => {
    it('should return count', async () => {
      mockSessionModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(5),
      });

      const result = await service.countByUser('507f1f77bcf86cd799439012');
      expect(result).toBe(5);
    });

    it('should filter by status when provided', async () => {
      mockSessionModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      });

      const result = await service.countByUser(
        '507f1f77bcf86cd799439012',
        'active',
      );
      expect(result).toBe(2);
      expect(mockSessionModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
      );
    });
  });
});
