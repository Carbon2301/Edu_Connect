import express, { Request, Response } from 'express';
import User from '../models/User';
import SystemSetting from '../models/SystemSetting';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Tất cả routes đều yêu cầu authentication và role Admin
router.use(authenticate);

// Middleware kiểm tra role Admin
const requireAdmin = (req: AuthRequest, res: Response, next: any) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ message: 'Chỉ Admin mới có quyền truy cập' });
  }
  next();
};

router.use(requireAdmin);

// ========== USER MANAGEMENT ==========

// Lấy danh sách tất cả users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { search, role, class: className, page = '1', limit = '10' } = req.query;
    
    let query: any = {};
    
    // Tìm kiếm theo tên, tên Kana, email, hoặc MSSV
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { nameKana: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mssv: { $regex: search, $options: 'i' } },
        { class: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Lọc theo role nếu có
    if (role && role !== 'all') {
      query.role = role;
    }
    
    // Lọc theo class nếu có
    if (className && className !== 'all') {
      query.class = className;
    }
    
    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Đếm tổng số users
    const total = await User.countDocuments(query);
    
    // Lấy users với pagination
    const users = await User.find(query)
      .select('-password') // Không trả về password
      .populate('teacherInCharge', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    res.json({ 
      users, 
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Lấy thông tin chi tiết một user
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('teacherInCharge', 'fullName email');
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    res.json({ user });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Tạo user mới (Giáo viên hoặc Học sinh)
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { role, fullName, nameKana, email, password, mssv, class: className, teacherInCharge, sendNotification } = req.body;
    
    // Validation
    if (!role || !fullName || !email || !password) {
      return res.status(400).json({ message: 'Vai trò, họ tên, email và mật khẩu là bắt buộc' });
    }
    
    if (role !== 'Teacher' && role !== 'Student') {
      return res.status(400).json({ message: 'Vai trò phải là Teacher hoặc Student' });
    }
    
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }
    
    // Tạo user mới
    const userData: any = {
      fullName,
      email: email.toLowerCase(),
      password,
      role,
    };
    
    // Thêm thông tin cho học sinh
    if (role === 'Student') {
      if (className) {
        userData.class = className;
      }
      if (teacherInCharge) {
        userData.teacherInCharge = teacherInCharge;
      }
      if (mssv) {
        userData.mssv = mssv;
      }
      if (nameKana) {
        userData.nameKana = nameKana;
      }
    }
    
    const newUser = await User.create(userData);
    
    // TODO: Gửi email thông báo nếu sendNotification = true
    
    res.status(201).json({
      message: 'Tạo tài khoản thành công',
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Cập nhật thông tin user
router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { fullName, nameKana, email, role, mssv, class: className, teacherInCharge } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    // Không cho phép sửa role của Admin
    if (user.role === 'Admin') {
      return res.status(400).json({ message: 'Không thể sửa thông tin tài khoản Admin' });
    }
    
    // Validation
    if (fullName) {
      user.fullName = fullName;
    }
    
    // Cập nhật nameKana (chỉ cho học sinh)
    if (nameKana !== undefined) {
      if (role === 'Student' || user.role === 'Student') {
        user.nameKana = nameKana || undefined;
      } else {
        user.nameKana = undefined;
      }
    }
    
    if (email) {
      // Kiểm tra email đã tồn tại chưa (trừ chính user này)
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: userId }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email đã tồn tại' });
      }
      user.email = email.toLowerCase();
    }
    
    if (role && role !== 'Admin') {
      // Chỉ cho phép thay đổi role giữa Teacher và Student
      if (role === 'Teacher' || role === 'Student') {
        user.role = role;
      }
    }
    
    // Cập nhật MSSV nếu có (chỉ cho học sinh)
    if (mssv !== undefined) {
      if (role === 'Student' || user.role === 'Student') {
        user.mssv = mssv || undefined;
      } else {
        user.mssv = undefined;
      }
    }
    
    await user.save();
    
    // Lấy lại user
    const updatedUser = await User.findById(userId).select('-password');
    
    res.json({ 
      message: 'Cập nhật thông tin thành công',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Xóa user
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    
    // Không cho phép xóa chính mình
    if (userId === req.user?.userId) {
      return res.status(400).json({ message: 'Không thể xóa tài khoản của chính bạn' });
    }
    
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    res.json({ message: 'Xóa tài khoản thành công' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// ========== SYSTEM SETTINGS ==========

// Lấy system settings
router.get('/settings', async (req: Request, res: Response) => {
  try {
    let settings = await SystemSetting.findOne();
    
    // Nếu chưa có settings, tạo mặc định
    if (!settings) {
      settings = await SystemSetting.create({
        defaultDeadline: 7,
        notificationSettings: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: true,
          reminderBeforeDeadline: 1,
        },
      });
    }
    
    res.json({ settings });
  } catch (error: any) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Cập nhật system settings
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const {
      defaultDeadline,
      deadlineAction,
      notificationTitle,
      notificationContent,
      notificationChannel,
      notificationTiming,
    } = req.body;
    
    let settings = await SystemSetting.findOne();
    
    const updateData: any = {};
    
    if (defaultDeadline !== undefined) {
      updateData.defaultDeadline = defaultDeadline;
    }
    
    if (deadlineAction) {
      updateData.deadlineAction = deadlineAction;
    }
    
    if (notificationTitle || notificationContent || notificationChannel || notificationTiming) {
      updateData.notificationSettings = {
        ...settings?.notificationSettings,
        ...(notificationTitle && { notificationTitle }),
        ...(notificationContent && { notificationContent }),
        ...(notificationChannel && { notificationChannel }),
        ...(notificationTiming && { notificationTiming }),
      };
    }
    
    if (!settings) {
      settings = await SystemSetting.create({
        defaultDeadline: defaultDeadline || 7,
        deadlineAction: deadlineAction || 'expired',
        notificationSettings: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: true,
          reminderBeforeDeadline: 1,
          ...updateData.notificationSettings,
        },
      });
    } else {
      Object.assign(settings, updateData);
      await settings.save();
    }
    
    res.json({ message: 'Cập nhật cài đặt thành công', settings });
  } catch (error: any) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

export default router;
