import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
// @ts-ignore
const PDFDocument = require('pdfkit');
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Session, SessionDocument } from './schemas/session.schema';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
  ) {}

  // ── List (paginated) ───────────────────────────────────────
  async findAll(
    userId: string,
    page = 1,
    limit = 10,
    status?: string,
  ): Promise<{
    data: SessionDocument[];
    meta: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const filter: any = { user: new Types.ObjectId(userId) };
    if (status) {
      filter.status = status;
    }

    const [data, total] = await Promise.all([
      this.sessionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.sessionModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: {
        current_page: page,
        last_page: Math.ceil(total / limit) || 1,
        per_page: limit,
        total,
      },
    };
  }

  // ── Find one ───────────────────────────────────────────────
  async findOne(userId: string, id: string): Promise<SessionDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Session not found');
    }

    const session = await this.sessionModel
      .findOne({ _id: id, user: new Types.ObjectId(userId) })
      .exec();

    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  // ── Create ─────────────────────────────────────────────────
  async create(
    userId: string,
    dto: CreateSessionDto,
  ): Promise<SessionDocument> {
    return this.sessionModel.create({
      ...dto,
      user: new Types.ObjectId(userId),
    });
  }

  // ── Update ─────────────────────────────────────────────────
  async update(
    userId: string,
    id: string,
    dto: UpdateSessionDto,
  ): Promise<SessionDocument> {
    const session = await this.findOne(userId, id);

    Object.assign(session, dto);
    return session.save();
  }

  // ── Remove ─────────────────────────────────────────────────
  async remove(userId: string, id: string): Promise<void> {
    const session = await this.findOne(userId, id);
    await session.deleteOne();
  }

  // ── Start session ──────────────────────────────────────────
  async start(userId: string, id: string): Promise<SessionDocument> {
    const session = await this.findOne(userId, id);

    if (session.status === 'active') {
      throw new BadRequestException('Session is already active');
    }
    if (session.status === 'completed') {
      throw new BadRequestException('Session is already completed');
    }

    session.status = 'active';
    session.startedAt = new Date();
    return session.save();
  }

  // ── End session ────────────────────────────────────────────
  async end(userId: string, id: string): Promise<SessionDocument> {
    const session = await this.findOne(userId, id);

    if (session.status !== 'active') {
      throw new BadRequestException('Session is not active');
    }

    session.status = 'completed';
    session.endedAt = new Date();
    return session.save();
  }

  // ── Count (for dashboard) ─────────────────────────────────
  async countByUser(
    userId: string,
    status?: string,
  ): Promise<number> {
    const filter: any = { user: new Types.ObjectId(userId) };
    if (status) filter.status = status;
    return this.sessionModel.countDocuments(filter).exec();
  }

  // ── Add Marker ─────────────────────────────────────────────
  async addMarker(userId: string, id: string, label: string): Promise<SessionDocument> {
    const session = await this.findOne(userId, id);
    if (!session.markers) session.markers = [];
    session.markers.push({ timestamp: new Date(), label });
    return session.save();
  }

  // ── Toggle Pause ───────────────────────────────────────────
  async togglePause(userId: string, id: string): Promise<SessionDocument> {
    const session = await this.findOne(userId, id);
    session.isPaused = !session.isPaused;
    return session.save();
  }

  // ── Export CSV ─────────────────────────────────────────────
  async generateCsvExport(userId: string, id: string): Promise<string> {
    const session = await this.findOne(userId, id);
    
    // In a real application, you'd fetch the timeline data from a time-series DB.
    // For demo purposes, we'll generate mock timeline data matching the frontend's pattern.
    const csvRows = ['Time,Class Average Attention (%)'];
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 60000);
      const timeStr = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
      const avg = Math.floor(70 + Math.random() * 20);
      csvRows.push(`${timeStr},${avg}`);
    }
    
    return csvRows.join('\n');
  }

  async generatePdfExport(userId: string, id: string): Promise<any> {
    const session = await this.findOne(userId, id);
    
    // Enable bufferPages to allow us to add footers at the very end
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    
    // --- Colors & Branding ---
    const primaryColor = '#6C4EFD';
    const textColor = '#333333';
    const lightGray = '#F3F4F6';
    const darkGray = '#6B7280';
    
    // --- Header Background ---
    doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);
    
    // --- Header Text ---
    doc.fillColor('#FFFFFF')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text('Session Analytics Report', 50, 40);
       
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Generated on ${new Date().toLocaleDateString()}`, 50, 80);
       
    // --- Reset for Body ---
    doc.fillColor(textColor);
    
    // --- Session Overview Section ---
    doc.fontSize(18).font('Helvetica-Bold').text('Overview', 50, 150);
    
    // Draw an overview box
    doc.rect(50, 180, 495, 100).fillAndStroke(lightGray, '#E5E7EB');
       
    doc.fillColor(textColor).fontSize(12).font('Helvetica-Bold');
    
    // Column 1
    doc.text('Session Name:', 70, 200);
    doc.font('Helvetica').text(session.title || 'Untitled', 70, 215);
    
    doc.font('Helvetica-Bold').text('Class/Grade:', 70, 240);
    doc.font('Helvetica').text(session.className || 'N/A', 70, 255);
    
    // Column 2
    doc.font('Helvetica-Bold').text('Subject:', 230, 200);
    doc.font('Helvetica').text(session.subject || 'N/A', 230, 215);
    
    doc.font('Helvetica-Bold').text('Status:', 230, 240);
    doc.font('Helvetica').text(session.status.toUpperCase(), 230, 255);
    
    // Column 3
    doc.font('Helvetica-Bold').text('Started At:', 390, 200);
    doc.font('Helvetica').text(session.startedAt ? session.startedAt.toLocaleString() : 'N/A', 390, 215);
    
    doc.font('Helvetica-Bold').text('Ended At:', 390, 240);
    doc.font('Helvetica').text(session.endedAt ? session.endedAt.toLocaleString() : 'N/A', 390, 255);
    
    // --- Engagement Chart Section ---
    let y = 320;
    doc.fillColor(textColor).fontSize(18).font('Helvetica-Bold').text('Engagement Summary', 50, y);
    y += 40;
    
    // Realistic mocked data for chart based on typical attention spans
    const highlyAttentive = 65;
    const neutral = 25;
    const distracted = 10;
    
    doc.fontSize(12).font('Helvetica').text('Attention Breakdown:', 50, y);
    y += 25;
    
    // Draw Bar Background
    doc.rect(50, y, 495, 30).fill('#E5E7EB');
    
    // Highly Attentive (Primary Color)
    const w1 = 495 * (highlyAttentive / 100);
    doc.rect(50, y, w1, 30).fill(primaryColor);
    
    // Neutral (Gray)
    const w2 = 495 * (neutral / 100);
    doc.rect(50 + w1, y, w2, 30).fill('#9CA3AF');
    
    // Distracted (Red/Orange)
    const w3 = 495 * (distracted / 100);
    doc.rect(50 + w1 + w2, y, w3, 30).fill('#EF4444');
    
    y += 40;
    
    // Legend
    doc.circle(60, y + 5, 5).fill(primaryColor);
    doc.fillColor(textColor).fontSize(10).text(`Highly Attentive (${highlyAttentive}%)`, 75, y + 2);
    
    doc.circle(200, y + 5, 5).fill('#9CA3AF');
    doc.fillColor(textColor).text(`Neutral (${neutral}%)`, 215, y + 2);
    
    doc.circle(320, y + 5, 5).fill('#EF4444');
    doc.fillColor(textColor).text(`Distracted (${distracted}%)`, 335, y + 2);
    
    y += 50;

    // --- Markers Timeline Table ---
    doc.fontSize(18).font('Helvetica-Bold').text('Timeline Markers', 50, y);
    y += 30;
    
    if (!session.markers || session.markers.length === 0) {
      doc.fontSize(12).font('Helvetica-Oblique').text('No markers recorded during this session.', 50, y);
    } else {
      // Table Header
      doc.rect(50, y, 495, 25).fill(primaryColor);
      doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold');
      doc.text('Time', 60, y + 7);
      doc.text('Event Description', 180, y + 7);
      y += 25;
      
      // Table Rows
      session.markers.forEach((marker: any, index: number) => {
        // Page break if needed
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
          doc.rect(50, y, 495, 25).fill(primaryColor);
          doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold');
          doc.text('Time', 60, y + 7);
          doc.text('Event Description', 180, y + 7);
          y += 25;
        }
        
        // Zebra striping
        if (index % 2 === 0) {
          doc.rect(50, y, 495, 25).fill(lightGray);
        }
        
        doc.fillColor(textColor).font('Helvetica');
        doc.text(new Date(marker.timestamp).toLocaleTimeString(), 60, y + 7);
        doc.text(marker.label, 180, y + 7);
        y += 25;
      });
      
      // Table bottom border
      doc.moveTo(50, y).lineTo(545, y).stroke(primaryColor);
    }

    // --- Footer ---
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(10)
         .fillColor(darkGray)
         .text(`Page ${i + 1} of ${pages.count}`, 0, doc.page.height - 30, { align: 'center' });
      doc.text('Generated by Haze Clue Analytics', 50, doc.page.height - 30);
    }

    doc.end();
    
    return doc;
  }
}
