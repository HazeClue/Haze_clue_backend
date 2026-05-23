import { Body, Controller, Post } from '@nestjs/common';
import { ContactDto } from './dto/contact.dto';
import { SupportService } from './support.service';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('contact')
  async contact(@Body() dto: ContactDto) {
    const ticket = await this.supportService.createTicket(dto);
    return {
      message: 'Your message has been sent successfully',
      ticketId: ticket.id,
    };
  }
}
