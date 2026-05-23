import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SessionsService } from '../sessions/sessions.service';
import { Telemetry, TelemetryDocument } from '../gateway/schemas/telemetry.schema';
import { CreateReportDto } from './dto/create-report.dto';
import { Report, ReportDocument } from './schemas/report.schema';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @InjectModel(Telemetry.name)
    private readonly telemetryModel: Model<TelemetryDocument>,
    private readonly sessionsService: SessionsService,
  ) {}

  async findAll(userId: string, page = 1, limit = 10, sessionId?: string) {
    const skip = (page - 1) * limit;
    const filter: any = { user: new Types.ObjectId(userId) };
    if (sessionId) {
      filter.session = new Types.ObjectId(sessionId);
    }

    const [data, total] = await Promise.all([
      this.reportModel
        .find(filter)
        .populate('session', 'name')
        .sort({ generatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reportModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page, limit };
  }

  async findOne(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Report not found');
    const report = await this.reportModel
      .findOne({ _id: id, user: new Types.ObjectId(userId) })
      .populate('session', 'name')
      .exec();
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async generate(userId: string, dto: CreateReportDto) {
    const session = await this.sessionsService.findOne(userId, dto.sessionId);
    
    // Try to get real telemetry data for the session
    const telemetryData = await this.telemetryModel
      .find({ session: new Types.ObjectId(dto.sessionId) })
      .sort({ recordedAt: 1 })
      .exec();

    let reportData: any;

    if (telemetryData.length > 0) {
      // Real data available — calculate actual stats
      this.logger.log(`Generating report from ${telemetryData.length} real telemetry data points`);
      
      const attentionValues = telemetryData.map(t => t.attention);
      const avgAttention = Math.round(attentionValues.reduce((a, b) => a + b, 0) / attentionValues.length);
      const peakAttention = Math.max(...attentionValues);

      // Build timeline (group by minute)
      const timelineMap = new Map<number, number[]>();
      const startTime = telemetryData[0].recordedAt.getTime();
      telemetryData.forEach(t => {
        const minuteOffset = Math.floor((t.recordedAt.getTime() - startTime) / 60000);
        if (!timelineMap.has(minuteOffset)) timelineMap.set(minuteOffset, []);
        timelineMap.get(minuteOffset)!.push(t.attention);
      });

      const timeline = Array.from(timelineMap.entries()).map(([minute, values]) => ({
        minute,
        avgAttention: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      }));

      // Calculate distribution
      const highCount = attentionValues.filter(v => v >= 80).length;
      const mediumCount = attentionValues.filter(v => v >= 50 && v < 80).length;
      const lowCount = attentionValues.filter(v => v < 50).length;
      const total = attentionValues.length;

      reportData = {
        avgAttention,
        peakAttention,
        totalDataPoints: telemetryData.length,
        timeline,
        distribution: {
          high: Math.round((highCount / total) * 100),
          medium: Math.round((mediumCount / total) * 100),
          low: Math.round((lowCount / total) * 100),
        },
        dataSource: 'real',
      };
    } else {
      // No real data — use simulated data with clear indicator
      this.logger.warn(`No telemetry data for session ${dto.sessionId}, using simulated data`);
      reportData = {
        avgAttention: Math.floor(Math.random() * 20) + 70,
        peakAttention: Math.floor(Math.random() * 10) + 90,
        totalDataPoints: 0,
        timeline: [
          { minute: 0, avgAttention: 72 },
          { minute: 1, avgAttention: 75 },
        ],
        distribution: {
          high: 60,
          medium: 25,
          low: 15,
        },
        dataSource: 'simulated',
      };
    }
    
    const report = await this.reportModel.create({
      user: new Types.ObjectId(userId),
      session: new Types.ObjectId(dto.sessionId),
      title: `${session.title || 'Session'} - ${dto.type === 'attention_analysis' ? 'Attention Analysis' : 'Session Summary'}`,
      data: reportData,
    });
    
    return this.findOne(userId, report._id.toString());
  }
}
