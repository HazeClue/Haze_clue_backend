import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SupportTicketDocument = HydratedDocument<SupportTicket>;

@Schema({ timestamps: true })
export class SupportTicket {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ required: true })
  message: string;

  @Prop({
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
  })
  status: string;
}

export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);

SupportTicketSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
