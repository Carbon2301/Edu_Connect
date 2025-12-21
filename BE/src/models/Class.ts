import mongoose, { Schema, Document } from 'mongoose';

export interface IClass extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  teacher: mongoose.Types.ObjectId; // Tham chiếu đến User (Teacher)
  students: mongoose.Types.ObjectId[]; // Danh sách học sinh trong lớp
  createdAt: Date;
  updatedAt: Date;
}

const ClassSchema = new Schema<IClass>(
  {
    name: {
      type: String,
      required: [true, 'Tên lớp là bắt buộc'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Giáo viên phụ trách là bắt buộc'],
    },
    students: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index để tìm kiếm nhanh
ClassSchema.index({ teacher: 1 });
ClassSchema.index({ name: 1 });

export default mongoose.model<IClass>('Class', ClassSchema);

