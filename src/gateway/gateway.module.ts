import { Module } from '@nestjs/common';
import { EegGateway } from './eeg.gateway';

@Module({
  providers: [EegGateway],
  exports: [EegGateway],
})
export class GatewayModule {}
