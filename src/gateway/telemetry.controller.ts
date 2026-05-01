import { Controller, Post, Body } from '@nestjs/common';
import { EegGateway } from './eeg.gateway';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly eegGateway: EegGateway) {}

  @Post()
  receiveTelemetryData(@Body() data: { deviceId: string; attention: number; meditation: number; delta?: number; theta?: number; alpha?: number; beta?: number; gamma?: number }) {
    // Expected structure:
    // {
    //    "deviceId": "DEVICE-1234",
    //    "attention": 85,
    //    "meditation": 60,
    //    "delta": 0.5, "theta": 0.4, ...
    // }
    
    // Push the received data to all connected clients listening on this device's room
    // For now, we broadcast to everyone or a specific device channel
    this.eegGateway.server.emit('device:data', {
      deviceId: data.deviceId,
      attention: data.attention,
      meditation: data.meditation,
      timestamp: new Date().toISOString()
    });

    return { success: true, message: 'Telemetry data broadcasted' };
  }
}
