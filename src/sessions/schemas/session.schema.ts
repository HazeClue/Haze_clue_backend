import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type SessionDocument = HydratedDocument<Session>;

@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  user: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true, default: '' })
  className: string;

  @Prop({ trim: true, default: '' })
  subject: string;

  @Prop({ default: 0 })
  duration: number; // in minutes

  @Prop({ default: 0 })
  students: number;

  @Prop({
    type: String,
    enum: ['draft', 'scheduled', 'active', 'completed'],
    default: 'draft',
  })
  status: string;

  @Prop(
    raw({
      attentionTracking: { type: Boolean, default: true },
      alerts: { type: Boolean, default: true },
      recording: { type: Boolean, default: false },
    }),
  )
  monitoringSettings: Record<string, any>;

  @Prop()
  notes?: string;

  @Prop({ type: [{ timestamp: { type: Date, required: true }, label: { type: String, required: true } }], default: [] })
  markers: Array<{ timestamp: Date; label: string }>;

  @Prop({ default: false })
  isPaused: boolean;

  @Prop()
  startedAt?: Date;

  @Prop()
  endedAt?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// ── Indexes ──────────────────────────────────────────────────
SessionSchema.index({ user: 1, createdAt: -1 });
SessionSchema.index({ status: 1 });

// ── JSON transform ──────────────────────────────────────────
SessionSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
