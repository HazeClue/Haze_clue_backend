import { Controller, Post, Body, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EegGateway } from './eeg.gateway';
import { Telemetry, TelemetryDocument } from './schemas/telemetry.schema';

@Controller('telemetry')
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(
    private readonly eegGateway: EegGateway,
    @InjectModel(Telemetry.name) private readonly telemetryModel: Model<TelemetryDocument>,
  ) {}

  @Post()
  async receiveTelemetryData(
    @Body() data: {
      deviceId: string;
      sessionId?: string;
      attention: number;
      meditation?: number;
      delta?: number;
      theta?: number;
      alpha?: number;
      beta?: number;
      gamma?: number;
    },
  ) {
    // 1. Persist the telemetry data point
    const telemetryRecord = await this.telemetryModel.create({
      deviceId: data.deviceId,
      session: data.sessionId || undefined,
      attention: data.attention,
      meditation: data.meditation,
      delta: data.delta,
      theta: data.theta,
      alpha: data.alpha,
      beta: data.beta,
      gamma: data.gamma,
      recordedAt: new Date(),
    });

    this.logger.debug(`Telemetry received from device ${data.deviceId}: attention=${data.attention}`);

    // 2. Broadcast to session-specific room if sessionId provided, otherwise to device channel
    const payload = {
      deviceId: data.deviceId,
      attention: data.attention,
      meditation: data.meditation,
      timestamp: telemetryRecord.recordedAt.toISOString(),
    };

    if (data.sessionId) {
      // Route to specific session room
      this.eegGateway.server.to(data.sessionId).emit('device:data', payload);
    } else {
      // Fallback: broadcast to device-specific channel
      this.eegGateway.server.emit(`device:${data.deviceId}`, payload);
    }

    return { success: true, message: 'Telemetry data received and broadcasted' };
  }
}
