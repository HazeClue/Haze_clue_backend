import { Module } from '@nestjs/common';
import { EegGateway } from './eeg.gateway';
import { TelemetryController } from './telemetry.controller';

@Module({
  controllers: [TelemetryController],
  providers: [EegGateway],
  exports: [EegGateway],
})
export class GatewayModule {}
