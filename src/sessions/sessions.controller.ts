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
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CreateMarkerDto } from './dto/create-marker.dto';
import { SendAlertDto } from './dto/send-alert.dto';
import { SessionsService } from './sessions.service';
import { SessionsGateway } from './sessions.gateway';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionsGateway: SessionsGateway,
  ) {}

  // ── GET /sessions ──────────────────────────────────────────
  @Get()
  async findAll(
    @CurrentUser() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(limit || '10', 10) || 10));

    const result = await this.sessionsService.findAll(userId, p, l, status);

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

  // ── POST /sessions/:id/markers ─────────────────────────────
  @Post(':id/markers')
  async addMarker(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: CreateMarkerDto,
  ) {
    const session = await this.sessionsService.addMarker(userId, id, dto.label);
    return session.toJSON();
  }

  // ── POST /sessions/:id/pause ───────────────────────────────
  @Post(':id/pause')
  async togglePause(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ) {
    const session = await this.sessionsService.togglePause(userId, id);
    return session.toJSON();
  }

  // ── POST /sessions/:id/alert ───────────────────────────────
  @Post(':id/alert')
  @HttpCode(HttpStatus.OK)
  async sendAlert(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: SendAlertDto,
  ) {
    // We can check if session exists/belongs to user first
    await this.sessionsService.findOne(userId, id);
    this.sessionsGateway.broadcastAlert(id, dto.message);
    return { success: true, message: 'Alert sent' };
  }

  // ── GET /sessions/:id/export/pdf ───────────────────────────
  @Get(':id/export/pdf')
  async exportPdf(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const doc = await this.sessionsService.generatePdfExport(userId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="session-report-${id}.pdf"`,
    });
    doc.pipe(res);
  }

  // ── GET /sessions/:id/export/csv ───────────────────────────
  @Get(':id/export/csv')
  async exportCsv(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const csvData = await this.sessionsService.generateCsvExport(userId, id);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="session-data-${id}.csv"`,
    });
    res.send(csvData);
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
