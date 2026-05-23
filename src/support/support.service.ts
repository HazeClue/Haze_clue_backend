import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContactDto } from './dto/contact.dto';
import { SupportTicket, SupportTicketDocument } from './schemas/support-ticket.schema';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectModel(SupportTicket.name)
    private readonly ticketModel: Model<SupportTicketDocument>,
  ) {}

  async createTicket(dto: ContactDto) {
    const ticket = await this.ticketModel.create({
      fullName: dto.fullName,
      email: dto.email,
      subject: dto.subject,
      message: dto.message,
    });

    this.logger.log(`Support ticket created: ${ticket.id} from ${dto.email}`);
    return ticket;
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.ticketModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.ticketModel.countDocuments().exec(),
    ]);
    return { data, total, page, limit };
  }
}
