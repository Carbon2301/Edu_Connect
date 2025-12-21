import express from 'express';
import cors from 'cors';
import path from 'path';
import connectDB from './lib/mongodb';
import { initSystemSettings } from './lib/initSystemSettings';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import teacherRoutes from './routes/teacher';
import studentRoutes from './routes/student';
import aiRoutes from './routes/ai';
import notificationRoutes from './routes/notification';
import uploadRoutes from './routes/upload';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'EduConnect API đang chạy!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);

// Khởi động server và kết nối DB
async function startServer() {
  try {
    // Kết nối MongoDB
    await connectDB();
    
    // Khởi tạo cài đặt hệ thống
    await initSystemSettings();
    
    // Khởi động server
    app.listen(PORT, () => {
      console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Lỗi khởi động server:', error);
    process.exit(1);
  }
}

startServer();
