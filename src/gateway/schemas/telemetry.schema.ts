import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TelemetryDocument = HydratedDocument<Telemetry>;

@Schema({ timestamps: true })
export class Telemetry {
  @Prop({ type: Types.ObjectId, ref: 'Session', index: true })
  session?: Types.ObjectId;

  @Prop({ required: true, index: true })
  deviceId: string;

  @Prop({ required: true, min: 0, max: 100 })
  attention: number;

  @Prop({ min: 0, max: 100 })
  meditation?: number;

  @Prop()
  delta?: number;

  @Prop()
  theta?: number;

  @Prop()
  alpha?: number;

  @Prop()
  beta?: number;

  @Prop()
  gamma?: number;

  @Prop({ type: Date, default: Date.now })
  recordedAt: Date;
}

export const TelemetrySchema = SchemaFactory.createForClass(Telemetry);

// ── Indexes ──────────────────────────────────────────────────
TelemetrySchema.index({ session: 1, recordedAt: -1 });
TelemetrySchema.index({ deviceId: 1, recordedAt: -1 });

// ── JSON transform ──────────────────────────────────────────
TelemetrySchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
