import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    const dbState = this.connection.readyState;
    const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'];

    return {
      status: dbState === 1 ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus[dbState] || 'unknown',
    };
  }
}

