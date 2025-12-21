import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Kết nối tới MongoDB Atlas
 */
async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI không được tìm thấy trong biến môi trường');
    }

    await mongoose.connect(mongoURI);
    
    console.log('✅ Kết nối MongoDB Atlas thành công!');
    console.log(`📊 Database: ${mongoose.connection.db?.databaseName}`);
    
    return mongoose.connection;
  } catch (error: any) {
    console.error('❌ Lỗi kết nối MongoDB:', error.message);
    throw error;
  }
}

export default connectDB;
