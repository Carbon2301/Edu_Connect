import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';

const router = Router();

// Middleware xác thực cho tất cả routes
router.use(authenticate);

// Lấy danh sách thông báo của user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { limit, skip = 0 } = req.query;

    let query = Notification.find({ recipient: userId })
      .populate('sender', 'fullName nameKana email')
      .populate('relatedMessage', 'title')
      .sort({ createdAt: -1 })
      .skip(Number(skip));

    // Nếu có limit thì áp dụng, không có thì lấy tất cả
    if (limit) {
      query = query.limit(Number(limit));
    }

    const notifications = await query;

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    res.json({
      notifications,
      unreadCount,
      total: await Notification.countDocuments({ recipient: userId }),
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Đánh dấu một thông báo là đã đọc
router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }

    res.json({ notification });
  } catch (error: any) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Đánh dấu tất cả thông báo là đã đọc
router.put('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
  } catch (error: any) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Xóa một thông báo
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: userId,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo' });
    }

    res.json({ message: 'Đã xóa thông báo' });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Lấy số lượng thông báo chưa đọc
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    res.json({ unreadCount });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

export default router;

