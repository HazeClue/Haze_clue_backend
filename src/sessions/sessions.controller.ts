import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  // ── GET /sessions ──────────────────────────────────────────
  @Get()
  async findAll(
    @CurrentUser() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(limit || '10', 10) || 10));

    const result = await this.sessionsService.findAll(userId, p, l);

    return {
      data: result.data.map((s) => s.toJSON()),
      meta: result.meta,
    };
  }


  // ── POST /sessions ─────────────────────────────────────────
  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreateSessionDto,
  ) {
    const session = await this.sessionsService.create(userId, dto);
    return session.toJSON();
  }

  // ── GET /sessions/:id ──────────────────────────────────────
  @Get(':id')
  async findOne(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.findOne(userId, id);
    return session.toJSON();
  }

  // ── PATCH /sessions/:id ────────────────────────────────────
  @Patch(':id')
  async update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    const session = await this.sessionsService.update(userId, id, dto);
    return session.toJSON();
  }

  // ── DELETE /sessions/:id ───────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ) {
    await this.sessionsService.remove(userId, id);
    return { message: 'Session deleted' };
  }

  // ── POST /sessions/:id/start ───────────────────────────────
  @Post(':id/start')
  async start(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.start(userId, id);
    return session.toJSON();
  }

  // ── POST /sessions/:id/end ─────────────────────────────────
  @Post(':id/end')
  async end(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.end(userId, id);
    return session.toJSON();
  }

  // ── GET /sessions/:id/live-data ────────────────────────────
  @Get(':id/live-data')
  async getLiveData(@Param('id') id: string) {
    return {
      type: 'attention_update',
      timestamp: new Date().toISOString(),
      data: {
        classAvgAttention: Math.floor(Math.random() * 20) + 70, // 70-90
        connectedDevices: 18,
        totalDevices: 20,
        duration: '25:30',
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
  }
}
