import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  // ── GET /devices ───────────────────────────────────────────
  @Get()
  async findAll(
    @CurrentUser() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(limit || '10', 10) || 10));

    const result = await this.devicesService.findAll(userId, p, l, search);

    return {
      data: result.data.map((d) => d.toJSON()),
      meta: result.meta,
    };
  }

  // ── POST /devices ──────────────────────────────────────────
  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreateDeviceDto,
  ) {
    const device = await this.devicesService.create(userId, dto);
    return device.toJSON();
  }

  // ── GET /devices/:id ───────────────────────────────────────
  @Get(':id')
  async findOne(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ) {
    const device = await this.devicesService.findOne(userId, id);
    return device.toJSON();
  }

  // ── PATCH /devices/:id ─────────────────────────────────────
  @Patch(':id')
  async update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    const device = await this.devicesService.update(userId, id, dto);
    return device.toJSON();
  }

  // ── DELETE /devices/:id ────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ) {
    await this.devicesService.remove(userId, id);
    return { message: 'Device removed' };
  }
}
