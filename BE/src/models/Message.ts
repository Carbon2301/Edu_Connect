import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId; // Tham chiếu đến User
  recipients: mongoose.Types.ObjectId[]; // Mảng tham chiếu đến User
  title: string;
  content: string;
  attachments?: string[]; // Mảng URL hoặc path đến file đính kèm
  readStatus: {
    userId: mongoose.Types.ObjectId;
    isRead: boolean;
    readAt?: Date;
  }[];
  deadline?: Date;
  lockResponseAfterDeadline?: boolean;
  reminder?: {
    enabled: boolean;
    reminderDate?: Date;
    message?: string;
    remindIfNoReply?: boolean;
    frequency?: string; // 'once', 'custom'
    customFrequency?: number; // số giờ giữa các lần nhắc (khi frequency = 'custom')
    timing?: Array<{
      type: 'after_send' | 'before_deadline';
      value: number; // số giờ sau khi gửi hoặc trước deadline
    }>;
    target?: 'unread' | 'read_no_reply'; // đối tượng nhắc nhở
  };
  reactions?: {
    userId: mongoose.Types.ObjectId;
    reaction: string; // 'like', 'thanks', 'understood', 'star', 'question', 'idea', 'great', 'done'
    createdAt: Date;
  }[];
  parentMessage?: mongoose.Types.ObjectId; // Tham chiếu đến tin nhắn gốc (cho reply)
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Người gửi là bắt buộc'],
    },
    recipients: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
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
    attachments: [
      {
        type: String,
        trim: true,
      },
    ],
    readStatus: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
        readAt: {
          type: Date,
        },
      },
    ],
    deadline: {
      type: Date,
    },
    lockResponseAfterDeadline: {
      type: Boolean,
      default: false,
    },
    reminder: {
      enabled: {
        type: Boolean,
        default: false,
      },
      reminderDate: {
        type: Date,
      },
      message: {
        type: String,
        trim: true,
      },
      remindIfNoReply: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ['once', 'periodic', 'custom'],
      },
      customFrequency: {
        type: Number,
      },
      timing: [{
        type: {
          type: String,
          enum: ['after_send', 'before_deadline'],
        },
        value: {
          type: Number,
        },
      }],
      target: {
        type: String,
        enum: ['unread', 'read_no_reply'],
      },
    },
    reactions: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        reaction: {
          type: String,
          enum: ['like', 'thanks', 'understood', 'star', 'question', 'idea', 'great', 'done'],
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    parentMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  {
    timestamps: true,
  }
);

// Tự động tạo readStatus cho mỗi recipient khi tạo message mới
MessageSchema.pre('save', function (next) {
  if (this.isNew) {
    this.readStatus = this.recipients.map((recipientId) => ({
      userId: recipientId,
      isRead: false,
    }));
  }
  next();
});

const Message = mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
