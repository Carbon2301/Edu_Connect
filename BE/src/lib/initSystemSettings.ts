import connectDB from './mongodb';
import SystemSetting from '../models/SystemSetting';

/**
 * Khởi tạo cài đặt hệ thống mặc định nếu chưa có
 * Đảm bảo chỉ có một bản ghi cài đặt hệ thống duy nhất
 */
export async function initSystemSettings() {
  try {
    // Sử dụng findOneAndUpdate với upsert để đảm bảo atomic operation
    // và chỉ có một bản ghi duy nhất
    const settings = await SystemSetting.findOneAndUpdate(
      {}, // Tìm bất kỳ bản ghi nào (sẽ chỉ có một)
      {
        $setOnInsert: {
          // Chỉ set khi insert (không update nếu đã tồn tại)
          defaultDeadline: 7,
          notificationSettings: {
            emailEnabled: true,
            smsEnabled: false,
            pushEnabled: true,
            reminderBeforeDeadline: 1,
          },
        },
      },
      {
        upsert: true, // Tạo mới nếu chưa có
        new: true, // Trả về document sau khi update
        setDefaultsOnInsert: true, // Áp dụng default values khi insert
      }
    );
    
    if (settings) {
      console.log('✅ Cài đặt hệ thống đã sẵn sàng');
    }
    
    return settings;
  } catch (error: any) {
    console.error('❌ Lỗi khi khởi tạo cài đặt hệ thống:', error);
    throw error;
  }
}
