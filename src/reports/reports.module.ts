import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Report, ReportSchema } from './schemas/report.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { SessionsModule } from '../sessions/sessions.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Report.name, schema: ReportSchema }]),
    SessionsModule,
    GatewayModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [MongooseModule, ReportsService],
})
export class ReportsModule {}

