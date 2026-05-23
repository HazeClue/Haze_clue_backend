import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { SessionsModule } from '../sessions/sessions.module';
import { GatewayModule } from '../gateway/gateway.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

import { MongooseModule } from '@nestjs/mongoose';
import { Session, SessionSchema } from '../sessions/schemas/session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    SessionsModule,
    DevicesModule,
    GatewayModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

