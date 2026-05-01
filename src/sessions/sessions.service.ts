import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
// @ts-ignore
const PDFDocument = require('pdfkit');
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Session, SessionDocument } from './schemas/session.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    private readonly notificationsService: NotificationsService,
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
    
    // Check if label contains keywords that imply an issue
    const lowerLabel = label.toLowerCase();
    let type = 'info';
    let title = 'New Timeline Marker';
    if (lowerLabel.includes('attention drop') || lowerLabel.includes('low')) {
      type = 'warning';
      title = 'Attention Alert';
    } else if (lowerLabel.includes('disconnected') || lowerLabel.includes('error') || lowerLabel.includes('distracted')) {
      type = 'error';
      title = 'Critical Alert';
    } else if (lowerLabel.includes('excellent') || lowerLabel.includes('high')) {
      type = 'success';
      title = 'Positive Milestone';
    }
    
    // Create notification
    await this.notificationsService.createNotification(
      userId,
      title,
      `Session "${session.title}": ${label}`,
      type,
      `/dashboard/live`
    );

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
    const secondaryColor = '#8B5CF6';
    const textColor = '#1F2937';
    const lightGray = '#F9FAFB';
    const borderColor = '#E5E7EB';
    const darkGray = '#6B7280';
    
    // --- Header Background (Rounded) ---
    doc.roundedRect(40, 40, doc.page.width - 80, 100, 10).fill(primaryColor);
    
    // --- Header Text ---
    doc.fillColor('#FFFFFF')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('Session Analytics Report', 60, 60);
       
    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('#E0E7FF')
       .text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 60, 95);
       
    // --- Reset for Body ---
    doc.fillColor(textColor);
    
    // --- Session Overview Section ---
    doc.fontSize(16).font('Helvetica-Bold').fillColor(primaryColor).text('SESSION OVERVIEW', 50, 170);
    
    // Draw an overview box with rounded corners
    doc.roundedRect(50, 195, 495, 90, 8).fillAndStroke(lightGray, borderColor);
       
    doc.fillColor(textColor).fontSize(11).font('Helvetica-Bold');
    
    // Column 1
    doc.text('Session Name:', 70, 215);
    doc.font('Helvetica').fillColor(darkGray).text(session.title || 'Untitled', 70, 230);
    
    doc.font('Helvetica-Bold').fillColor(textColor).text('Class/Grade:', 70, 255);
    doc.font('Helvetica').fillColor(darkGray).text(session.className || 'N/A', 70, 270);
    
    // Column 2
    doc.font('Helvetica-Bold').fillColor(textColor).text('Subject:', 230, 215);
    doc.font('Helvetica').fillColor(darkGray).text(session.subject || 'N/A', 230, 230);
    
    doc.font('Helvetica-Bold').fillColor(textColor).text('Status:', 230, 255);
    doc.font('Helvetica').fillColor(primaryColor).text(session.status.toUpperCase(), 230, 270);
    
    // Column 3
    doc.font('Helvetica-Bold').fillColor(textColor).text('Started At:', 390, 215);
    doc.font('Helvetica').fillColor(darkGray).text(session.startedAt ? session.startedAt.toLocaleString() : 'N/A', 390, 230);
    
    doc.font('Helvetica-Bold').fillColor(textColor).text('Ended At:', 390, 255);
    doc.font('Helvetica').fillColor(darkGray).text(session.endedAt ? session.endedAt.toLocaleString() : 'N/A', 390, 270);
    
    // --- Engagement Chart Section ---
    let y = 320;
    doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text('ENGAGEMENT SUMMARY', 50, y);
    y += 35;
    
    // Realistic mocked data for chart based on typical attention spans
    const highlyAttentive = 65;
    const neutral = 25;
    const distracted = 10;
    
    doc.fillColor(textColor).fontSize(11).font('Helvetica-Bold').text('Attention Breakdown:', 50, y);
    y += 20;
    
    // Draw Bar Background (Rounded)
    doc.roundedRect(50, y, 495, 24, 12).fill(borderColor);
    
    // Highly Attentive (Primary Color)
    const w1 = 495 * (highlyAttentive / 100);
    doc.roundedRect(50, y, w1, 24, 12).fill(primaryColor);
    
    // Neutral (Gray)
    const w2 = 495 * (neutral / 100);
    // Draw normal rect to connect to the rounded one
    doc.rect(50 + w1 - 10, y, w2 + 10, 24).fill('#9CA3AF');
    
    // Distracted (Red/Orange)
    const w3 = 495 * (distracted / 100);
    // Use rounded rect for the end part
    doc.roundedRect(50 + w1 + w2 - 10, y, w3 + 10, 24, 12).fill('#EF4444');
    // Overwrite the connecting edge
    doc.rect(50 + w1 + w2 - 10, y, 10, 24).fill('#EF4444');
    
    y += 35;
    
    // Legend
    doc.circle(60, y + 5, 5).fill(primaryColor);
    doc.fillColor(textColor).fontSize(10).font('Helvetica').text(`Highly Attentive (${highlyAttentive}%)`, 75, y + 1);
    
    doc.circle(200, y + 5, 5).fill('#9CA3AF');
    doc.fillColor(textColor).text(`Neutral (${neutral}%)`, 215, y + 1);
    
    doc.circle(320, y + 5, 5).fill('#EF4444');
    doc.fillColor(textColor).text(`Distracted (${distracted}%)`, 335, y + 1);
    
    y += 50;

    // --- Markers Timeline Table ---
    doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text('TIMELINE MARKERS', 50, y);
    y += 25;
    
    if (!session.markers || session.markers.length === 0) {
      doc.fillColor(darkGray).fontSize(11).font('Helvetica-Oblique').text('No timeline markers were recorded during this session.', 50, y);
    } else {
      // Table Header
      doc.rect(50, y, 495, 28).fill(primaryColor);
      doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold');
      doc.text('Time', 65, y + 9);
      doc.text('Event Description', 180, y + 9);
      y += 28;
      
      // Table Rows
      session.markers.forEach((marker: any, index: number) => {
        // Page break if needed
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
          doc.rect(50, y, 495, 28).fill(primaryColor);
          doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold');
          doc.text('Time', 65, y + 9);
          doc.text('Event Description', 180, y + 9);
          y += 28;
        }
        
        // Zebra striping
        if (index % 2 === 0) {
          doc.rect(50, y, 495, 28).fill(lightGray);
        }
        
        doc.fillColor(textColor).fontSize(10).font('Helvetica');
        doc.text(new Date(marker.timestamp).toLocaleTimeString(), 65, y + 9);
        doc.text(marker.label, 180, y + 9);
        
        // Add a subtle bottom border to the row
        doc.moveTo(50, y + 28).lineTo(545, y + 28).lineWidth(0.5).stroke(borderColor);
        
        y += 28;
      });
      
      // Table bottom border
      doc.moveTo(50, y).lineTo(545, y).lineWidth(1.5).stroke(primaryColor);
    }

    // --- Footer (Fixing the blank pages issue) ---
    const pages = doc.bufferedPageRange();
    
    // Temporarily turn off bottom margin so the text doesn't trigger a new page break
    const bottomMargin = doc.page.margins.bottom;
    
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      // Reset margins for this page safely
      doc.page.margins.bottom = 0;
      
      doc.fontSize(9)
         .fillColor('#9CA3AF')
         .font('Helvetica');
         
      // Left footer
      doc.text('Generated by Haze Clue Analytics', 50, doc.page.height - 35, { lineBreak: false });
      
      // Right footer (Page numbers)
      doc.text(`Page ${i + 1} of ${pages.count}`, 0, doc.page.height - 35, { align: 'right', width: doc.page.width - 50, lineBreak: false });
      
      doc.page.margins.bottom = bottomMargin;
    }

    doc.end();
    
    return doc;
  }
}
