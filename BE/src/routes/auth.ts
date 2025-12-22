import express, { Request, Response } from 'express';
import User from '../models/User';
import { generateToken } from '../lib/jwt';
import { authenticate, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Đăng nhập
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
    }

    // Xử lý đăng nhập bằng "admin" (username) hoặc email đầy đủ
    let emailToSearch = email.toLowerCase();
    if (email.toLowerCase() === 'admin') {
      emailToSearch = 'admin@sis.hust.edu.vn';
    }

    // Tìm user theo email
    const user = await User.findOne({ email: emailToSearch });
    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Kiểm tra password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Tạo token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Gửi OTP (mặc định 123456)
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại trong hệ thống' });
    }

    // OTP mặc định là 123456
    res.json({
      message: 'Mã OTP đã được gửi đến email của bạn',
      otp: '123456', // Trong production, nên gửi OTP thực qua email
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Xác thực OTP và đặt lại mật khẩu
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP và mật khẩu mới là bắt buộc' });
    }

    // Kiểm tra OTP (mặc định 123456)
    if (otp !== '123456') {
      return res.status(400).json({ message: 'Mã OTP không đúng' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Cập nhật mật khẩu (sẽ được hash tự động bởi pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Đổi mật khẩu (yêu cầu đăng nhập)
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Mật khẩu cũ và mật khẩu mới là bắt buộc' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Không tìm thấy thông tin người dùng' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra mật khẩu cũ
    const isOldPasswordValid = await user.comparePassword(oldPassword);
    if (!isOldPasswordValid) {
      return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });
    }

    // Cập nhật mật khẩu mới (sẽ được hash tự động bởi pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

export default router;
