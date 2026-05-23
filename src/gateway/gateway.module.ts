import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EegGateway } from './eeg.gateway';
import { Telemetry, TelemetrySchema } from './schemas/telemetry.schema';
import { TelemetryController } from './telemetry.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Telemetry.name, schema: TelemetrySchema },
    ]),
  ],
  controllers: [TelemetryController],
  providers: [EegGateway],
  exports: [EegGateway, MongooseModule],
})
export class GatewayModule {}

