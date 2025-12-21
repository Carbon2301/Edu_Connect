import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSetting extends Document {
  _id: mongoose.Types.ObjectId;
  defaultDeadline: number; // Số ngày deadline mặc định
  deadlineAction?: 'expired' | 'lock' | 'close'; // Hành động khi quá hạn: expired, lock, close
  notificationSettings: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    reminderBeforeDeadline: number; // Số ngày nhắc nhở trước deadline
    notificationTitle?: string; // Tiêu đề thông báo
    notificationContent?: string; // Nội dung thông báo
    notificationChannel?: 'email' | 'inapp'; // Kênh thông báo
    notificationTiming?: number; // Thời gian gửi (số ngày/giờ trước deadline)
  };
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    defaultDeadline: {
      type: Number,
      default: 7, // 7 ngày mặc định
      min: [1, 'Deadline phải lớn hơn 0'],
    },
    deadlineAction: {
      type: String,
      enum: ['expired', 'lock', 'close'],
      default: 'expired',
    },
    notificationSettings: {
      emailEnabled: {
        type: Boolean,
        default: true,
      },
      smsEnabled: {
        type: Boolean,
        default: false,
      },
      pushEnabled: {
        type: Boolean,
        default: true,
      },
      reminderBeforeDeadline: {
        type: Number,
        default: 1, // Nhắc nhở 1 ngày trước deadline
        min: [0, 'Số ngày nhắc nhở không được âm'],
      },
      notificationTitle: {
        type: String,
        trim: true,
      },
      notificationContent: {
        type: String,
        trim: true,
      },
      notificationChannel: {
        type: String,
        enum: ['email', 'inapp'],
      },
      notificationTiming: {
        type: Number,
        min: [0, 'Thời gian gửi không được âm'],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Đảm bảo chỉ có một bản ghi SystemSetting duy nhất
SystemSettingSchema.index({}, { unique: true });

const SystemSetting = mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);

export default SystemSetting;
