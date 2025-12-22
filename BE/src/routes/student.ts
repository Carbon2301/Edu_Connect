import express, { Request, Response } from 'express';
import Message from '../models/Message';
import User from '../models/User';
import Notification from '../models/Notification';
import Class from '../models/Class';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Tất cả routes đều yêu cầu authentication
router.use(authenticate);

// Middleware kiểm tra role Student
const requireStudent = (req: AuthRequest, res: Response, next: any) => {
  if (req.user?.role !== 'Student') {
    return res.status(403).json({ message: 'Chỉ học sinh mới có quyền truy cập' });
  }
  next();
};

router.use(requireStudent);

// ========== MESSAGE MANAGEMENT ==========

// Lấy danh sách tin nhắn đã nhận (tin nhắn mới)
router.get('/messages', async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    const { filter } = req.query; // 'new' hoặc 'read'
    
    let query: any = { recipients: studentId };
    
    if (filter === 'read') {
      // Chỉ lấy tin nhắn đã đọc
      query['readStatus.userId'] = studentId;
      query['readStatus.isRead'] = true;
    } else if (filter === 'new') {
      // Chỉ lấy tin nhắn chưa đọc
      query['readStatus.userId'] = studentId;
      query['readStatus.isRead'] = false;
    }
    
    const messages = await Message.find(query)
      .populate('sender', 'fullName email')
      .populate('recipients', 'fullName email class')
      .sort({ createdAt: -1 });
    
    // Lọc messages dựa trên readStatus
    const filteredMessages = messages.filter((msg: any) => {
      const readStatus = msg.readStatus.find((rs: any) => 
        rs.userId.toString() === studentId
      );
      
      if (filter === 'read') {
        return readStatus && readStatus.isRead;
      } else if (filter === 'new') {
        return !readStatus || !readStatus.isRead;
      }
      return true;
    });
    
    res.json({ messages: filteredMessages, total: filteredMessages.length });
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Lấy chi tiết một tin nhắn
router.get('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    const messageId = req.params.id;
    
    const message = await Message.findOne({
      _id: messageId,
      recipients: studentId,
    })
      .populate('sender', 'fullName email')
      .populate('recipients', 'fullName email class')
      .populate('reactions.userId', 'fullName email');
    
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }
    
    res.json({ message });
  } catch (error: any) {
    console.error('Get message error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Đánh dấu tin nhắn là đã đọc
router.put('/messages/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    const messageId = req.params.id;
    
    const message = await Message.findOne({
      _id: messageId,
      recipients: studentId,
    });
    
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }
    
    // Cập nhật readStatus
    const readStatusIndex = message.readStatus.findIndex(
      (rs: any) => rs.userId.toString() === studentId
    );
    
    if (readStatusIndex >= 0) {
      message.readStatus[readStatusIndex].isRead = true;
      message.readStatus[readStatusIndex].readAt = new Date();
    } else {
      message.readStatus.push({
        userId: studentId,
        isRead: true,
        readAt: new Date(),
      });
    }
    
    await message.save();
    
    res.json({ message: 'Đã đánh dấu là đã đọc' });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Gửi phản hồi (reply)
router.post('/messages/:id/reply', async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    const messageId = req.params.id;
    const { content, attachments } = req.body;
    
    // Nội dung không bắt buộc, nhưng phải có ít nhất content hoặc attachments
    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ message: 'Phải có nội dung hoặc file đính kèm' });
    }
    
    // Lấy tin nhắn gốc
    const originalMessage = await Message.findOne({
      _id: messageId,
      recipients: studentId,
    }).populate('sender', '_id');
    
    if (!originalMessage) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }
    
    // Tạo tin nhắn phản hồi
    const replyMessage = await Message.create({
      sender: studentId,
      recipients: [originalMessage.sender],
      title: `Re: ${originalMessage.title}`,
      content: content || '',
      attachments: attachments || [],
      parentMessage: messageId,
    });
    
    const populatedReply = await Message.findById(replyMessage._id)
      .populate('sender', 'fullName email')
      .populate('recipients', 'fullName email class');
    
    // Xóa thông báo reply cũ của học sinh này cho tin nhắn gốc (nếu có)
    // Vì tất cả notification reply đều lưu original message ID, nên chỉ cần xóa notification cũ
    await Notification.deleteMany({
      recipient: originalMessage.sender,
      sender: studentId,
      type: 'message_reply',
      relatedMessage: messageId, // Xóa notification cũ cho cùng original message
    });
    
    // Tạo thông báo mới cho giáo viên
    // Lưu original message ID (không phải reply message ID) để teacher có thể xem chi tiết
    const student = await User.findById(studentId);
    await Notification.create({
      recipient: originalMessage.sender,
      sender: studentId,
      type: 'message_reply',
      relatedMessage: messageId, // Lưu original message ID, không phải reply message ID
      title: 'Phản hồi mới',
      content: `${student?.fullName} đã phản hồi tin nhắn "${originalMessage.title}"`,
      metadata: {
        senderName: student?.fullName,
        messageTitle: originalMessage.title,
      },
    });
    
    res.status(201).json({
      message: 'Phản hồi đã được gửi',
      data: populatedReply,
    });
  } catch (error: any) {
    console.error('Reply error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Lấy reply của học sinh cho một tin nhắn
router.get('/messages/:id/my-reply', async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    const messageId = req.params.id;
    
    // Tìm reply của học sinh cho tin nhắn này
    const reply = await Message.findOne({
      parentMessage: messageId,
      sender: studentId,
    }).select('content createdAt updatedAt _id attachments').sort({ createdAt: -1 });
    
    // Trả về reply: null nếu chưa có phản hồi (không phải lỗi)
    res.json({ reply: reply || null });
  } catch (error: any) {
    console.error('Get my reply error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Cập nhật reply (không gửi notification)
router.put('/messages/:id/reply', async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    const messageId = req.params.id;
    const { content, attachments } = req.body;
    
    // Phải có ít nhất content hoặc attachments
    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ message: 'Phải có nội dung hoặc file đính kèm' });
    }
    
    // Tìm reply của học sinh cho tin nhắn này
    const reply = await Message.findOne({
      parentMessage: messageId,
      sender: studentId,
    });
    
    if (!reply) {
      return res.status(404).json({ message: 'Không tìm thấy phản hồi' });
    }
    
    // Cập nhật nội dung và attachments
    reply.content = content || '';
    if (attachments !== undefined) {
      reply.attachments = attachments;
    }
    await reply.save();
    
    res.json({ message: 'Đã cập nhật phản hồi', reply });
  } catch (error: any) {
    console.error('Update reply error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Cập nhật reaction (không gửi notification)
router.put('/messages/:id/reaction', async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    const messageId = req.params.id;
    const { reaction } = req.body;
    
    const validReactions = ['like', 'thanks', 'understood', 'star', 'question', 'idea', 'great', 'done'];
    if (!validReactions.includes(reaction)) {
      return res.status(400).json({ message: 'Reaction không hợp lệ' });
    }
    
    const message = await Message.findOne({
      _id: messageId,
      recipients: studentId,
    });
    
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }
    
    const messageDoc = message as any;
    if (!messageDoc.reactions) {
      messageDoc.reactions = [];
    }
    
    const existingReactionIndex = messageDoc.reactions.findIndex(
      (r: any) => r.userId.toString() === studentId
    );
    
    if (existingReactionIndex >= 0) {
      // Cập nhật reaction
      messageDoc.reactions[existingReactionIndex].reaction = reaction;
      messageDoc.reactions[existingReactionIndex].createdAt = new Date();
      await messageDoc.save();
      res.json({ message: 'Đã cập nhật reaction' });
    } else {
      return res.status(404).json({ message: 'Chưa có reaction để cập nhật' });
    }
  } catch (error: any) {
    console.error('Update reaction error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Thêm reaction
router.post('/messages/:id/reaction', async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    const messageId = req.params.id;
    const { reaction } = req.body;
    
    const validReactions = ['like', 'thanks', 'understood', 'star', 'question', 'idea', 'great', 'done'];
    if (!validReactions.includes(reaction)) {
      return res.status(400).json({ message: 'Reaction không hợp lệ' });
    }
    
    const message = await Message.findOne({
      _id: messageId,
      recipients: studentId,
    });
    
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }
    
    // Kiểm tra xem user đã reaction chưa
    const messageDoc = message as any;
    if (!messageDoc.reactions) {
      messageDoc.reactions = [];
    }
    
    const existingReactionIndex = messageDoc.reactions.findIndex(
      (r: any) => r.userId.toString() === studentId
    );
    
    const isUpdate = existingReactionIndex >= 0;
    
    if (isUpdate) {
      // Cập nhật reaction
      messageDoc.reactions[existingReactionIndex].reaction = reaction;
      messageDoc.reactions[existingReactionIndex].createdAt = new Date();
    } else {
      // Thêm reaction mới
      messageDoc.reactions.push({
        userId: studentId,
        reaction,
        createdAt: new Date(),
      });
    }
    
    await messageDoc.save();
    
    // Chỉ tạo notification khi tạo mới, không tạo khi update
    if (!isUpdate) {
      // Xóa thông báo reaction cũ của học sinh này cho tin nhắn này (nếu có)
      await Notification.deleteMany({
        recipient: messageDoc.sender,
        sender: studentId,
        type: 'message_reaction',
        relatedMessage: messageId,
      });
      
      // Tạo thông báo mới cho giáo viên (sender của tin nhắn)
      const student = await User.findById(studentId);
      const reactionLabels: { [key: string]: string } = {
        like: 'thích',
        thanks: 'cảm ơn',
        understood: 'đã hiểu',
        star: 'yêu thích',
        question: 'có câu hỏi',
        idea: 'có ý tưởng',
        great: 'tuyệt vời',
        done: 'đã hoàn thành',
      };
      
      await Notification.create({
        recipient: messageDoc.sender,
        sender: studentId,
        type: 'message_reaction',
        relatedMessage: messageId,
        title: 'Phản ứng mới',
        content: `${student?.fullName} đã ${reactionLabels[reaction]} tin nhắn "${messageDoc.title}"`,
        metadata: {
          senderName: student?.fullName,
          messageTitle: messageDoc.title,
          reactionType: reaction,
        },
      });
    }
    
    res.json({ message: isUpdate ? 'Đã cập nhật reaction' : 'Đã thêm reaction' });
  } catch (error: any) {
    console.error('Add reaction error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Xóa tin nhắn (chỉ ẩn khỏi danh sách của học sinh)
router.delete('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    const messageId = req.params.id;
    
    const message = await Message.findOne({
      _id: messageId,
      recipients: studentId,
    });
    
    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }
    
    // Xóa student khỏi recipients (ẩn tin nhắn)
    message.recipients = message.recipients.filter(
      (r: any) => r.toString() !== studentId
    );
    
    await message.save();
    
    res.json({ message: 'Đã xóa tin nhắn' });
  } catch (error: any) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Lấy thống kê cho dashboard
router.get('/dashboard/stats', async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    
    // Đếm tin nhắn chưa đọc
    const messages = await Message.find({ recipients: studentId });
    const unreadCount = messages.filter((msg: any) => {
      const readStatus = msg.readStatus.find((rs: any) => 
        rs.userId.toString() === studentId
      );
      return !readStatus || !readStatus.isRead;
    }).length;
    
    res.json({ unreadCount });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// ========== PROFILE MANAGEMENT ==========

// Lấy thông tin profile của học sinh
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    
    const student = await User.findById(studentId)
      .populate('teacherInCharge', 'fullName email')
      .select('-password');
    
    if (!student) {
      return res.status(404).json({ message: 'Không tìm thấy học sinh' });
    }
    
    // Lấy danh sách các lớp mà học sinh tham gia
    const classes = await Class.find({ students: studentId })
      .populate('teacher', 'fullName email')
      .select('name description teacher createdAt');
    
    res.json({
      profile: student,
      classes: classes,
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

// Cập nhật thông tin profile của học sinh
router.put('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    const { avatar, nameKana, dateOfBirth, gender, phone, address, notificationSettings } = req.body;
    
    const student = await User.findById(studentId);
    
    if (!student) {
      return res.status(404).json({ message: 'Không tìm thấy học sinh' });
    }
    
    // Chỉ cho phép cập nhật các field được phép
    if (avatar !== undefined) {
      student.avatar = avatar || undefined;
    }
    if (nameKana !== undefined) {
      student.nameKana = nameKana || undefined;
    }
    if (dateOfBirth !== undefined) {
      student.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    }
    if (gender !== undefined) {
      // Chỉ set gender nếu có giá trị hợp lệ, nếu là chuỗi rỗng thì set undefined
      student.gender = gender && gender.trim() !== '' ? gender : undefined;
    }
    if (phone !== undefined) {
      student.phone = phone || undefined;
    }
    if (address !== undefined) {
      student.address = address || undefined;
    }
    if (notificationSettings !== undefined) {
      student.notificationSettings = {
        email: notificationSettings.email !== undefined ? notificationSettings.email : (student.notificationSettings?.email ?? true),
        app: notificationSettings.app !== undefined ? notificationSettings.app : (student.notificationSettings?.app ?? true),
      };
    }
    
    await student.save();
    
    const updatedStudent = await User.findById(studentId)
      .populate('teacherInCharge', 'fullName email')
      .select('-password');
    
    res.json({
      message: 'Cập nhật profile thành công',
      profile: updatedStudent,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

export default router;
