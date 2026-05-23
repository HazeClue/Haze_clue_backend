import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DevicesModule } from './devices/devices.module';
import { LookupsModule } from './lookups/lookups.module';
import { ReportsModule } from './reports/reports.module';
import { SessionsModule } from './sessions/sessions.module';
import { SupportModule } from './support/support.module';
import { UsersModule } from './users/users.module';
import { GatewayModule } from './gateway/gateway.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    // ── Global Config ──────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ── Rate Limiting (global) ─────────────────────────────────
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 second window
        limit: 3,    // max 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000,  // 10 second window
        limit: 20,   // max 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000,  // 1 minute window
        limit: 100,  // max 100 requests per minute
      },
    ]),

    // ── MongoDB Connection ─────────────────────────────────────
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),

    // ── Feature Modules ────────────────────────────────────────
    AuthModule,
    UsersModule,
    SessionsModule,
    DevicesModule,
    ReportsModule,
    DashboardModule,
    LookupsModule,
    SupportModule,
    GatewayModule,
    NotificationsModule,
  ],
  providers: [
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}


