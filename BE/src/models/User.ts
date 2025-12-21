import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  password: string;
  role: 'Admin' | 'Teacher' | 'Student';
  class?: string; // Chỉ dành cho học sinh
  teacherInCharge?: mongoose.Types.ObjectId; // Chỉ dành cho học sinh, tham chiếu đến User (Teacher)
  mssv?: string; // Mã số sinh viên, chỉ dành cho học sinh
  avatar?: string; // Ảnh đại diện
  nameKana?: string; // Tên Kana (tiếng Nhật)
  dateOfBirth?: Date; // Ngày sinh
  gender?: 'male' | 'female' | 'other'; // Giới tính
  phone?: string; // Số điện thoại
  address?: string; // Địa chỉ
  notificationSettings?: {
    email: boolean; // Nhận thông báo qua email
    app: boolean; // Nhận thông báo qua app
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, 'Họ tên là bắt buộc'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
    },
    password: {
      type: String,
      required: [true, 'Mật khẩu là bắt buộc'],
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
    },
    role: {
      type: String,
      enum: ['Admin', 'Teacher', 'Student'],
      required: [true, 'Vai trò là bắt buộc'],
    },
    class: {
      type: String,
      trim: true,
    },
    teacherInCharge: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    mssv: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
    nameKana: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    notificationSettings: {
      email: {
        type: Boolean,
        default: true,
      },
      app: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  }
);

// Hash password trước khi lưu
UserSchema.pre('save', async function (next) {
  // Hash password nếu đã được thay đổi
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error: any) {
      return next(error);
    }
  }
  
  next();
});

// Method để so sánh password
UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
