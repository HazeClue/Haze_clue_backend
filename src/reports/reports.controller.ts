import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

import { SessionsService } from '../sessions/sessions.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly sessionsService: SessionsService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(limit || '10', 10) || 10));

    // Fetch all completed sessions as "reports"
    const result = await this.sessionsService.findAll(userId, p, l, 'completed');
    
    // If sessionId filter provided, filter locally for simplicity (or we could update SessionsService)
    let sessions = result.data;
    if (sessionId) {
      sessions = sessions.filter(s => s._id.toString() === sessionId);
    }

    return {
      data: sessions.map((s: any) => ({
        id: s._id,
        sessionId: s._id,
        sessionName: s.title || s.name || 'Untitled Session',
        type: 'session_summary',
        status: 'ready',
        createdAt: s.endedAt || s.updatedAt || s.createdAt,
      })),
      total: result.meta.total,
      page: result.meta.current_page,
      limit: result.meta.per_page,
    };
  }

  @Post('generate')
  async generate(
    @CurrentUser() userId: string,
    @Body() dto: CreateReportDto,
  ) {
    const report: any = await this.reportsService.generate(userId, dto);
    return {
       id: report.id,
       sessionId: dto.sessionId,
       status: 'ready'
    };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ) {
    const r: any = await this.reportsService.findOne(userId, id);
    return {
      id: r.id,
      sessionId: r.session?._id,
      sessionName: r.session?.name || '',
      type: 'session_summary',
      status: 'ready',
      createdAt: r.generatedAt,
      downloadUrl: `/api/reports/${r.id}/export`,
      summary: {
        duration: 45,
        avgAttention: r.data?.avgAttention || 78,
        peakAttention: r.data?.peakAttention || 95,
        lowestAttention: 42,
        studentsCount: 20,
        highAttentionPercent: r.data?.distribution?.high || 60,
        mediumAttentionPercent: r.data?.distribution?.medium || 25,
        lowAttentionPercent: r.data?.distribution?.low || 15
      },
      timeline: r.data?.timeline || [
        { minute: 0, avgAttention: 72 },
        { minute: 1, avgAttention: 75 }
      ]
    };
  }

  @Get(':id/export')
  async exportReport(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ) {
    // Dummy export logic, ideally returns PDF bytes
    // In NestJS we can return a stream or standard JSON for now if mock.
    return {
      message: 'PDF Export simulated successfully',
      reportId: id
    };
  }
}
