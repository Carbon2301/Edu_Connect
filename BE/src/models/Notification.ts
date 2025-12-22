import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId; // User nhận thông báo
  sender?: mongoose.Types.ObjectId; // User tạo hành động (optional)
  type: 'new_message' | 'message_reply' | 'message_reaction' | 'manual_reminder';
  relatedMessage?: mongoose.Types.ObjectId; // Tin nhắn liên quan
  title: string;
  content: string;
  metadata?: {
    senderName?: string;
    messageTitle?: string;
    reactionType?: string;
  };
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Người nhận là bắt buộc'],
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['new_message', 'message_reply', 'message_reaction', 'manual_reminder'],
      required: [true, 'Loại thông báo là bắt buộc'],
    },
    relatedMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    title: {
      type: String,
      required: [true, 'Tiêu đề là bắt buộc'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Nội dung là bắt buộc'],
      trim: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index để query nhanh
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;

